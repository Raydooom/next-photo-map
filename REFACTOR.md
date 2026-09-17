# 项目优化清单

本文档记录当前代码库的问题、每项的成因与处理方式。所有条目都对应到具体文件，可逐项核对。

分批依据：安全和 bug 优先，类型收敛先于目录迁移（编译器能帮忙抓漏改），结构调整放最后。

---

## 第 0 批：安全

这批与结构无关，但优先级最高，因为服务已经暴露在公网（`raydom.wang`）。

### 0.1 `/api/admin/*` 与 `/api/ai/*` 完全没有鉴权

- **位置**：`src/middleware.ts`、`src/app/api/admin/**`、`src/app/api/ai/**`
- **成因**：middleware 的 matcher 只写了 `'/admin/:path*'`，而实际执行操作的接口路径是 `/api/admin/scan`、`/api/admin/upload`、`/api/ai/analysis`，不匹配该规则，请求根本不经过校验。
- **影响**：任何人可以直接 GET `/api/admin/scan` 触发全量扫描，或 POST `/api/admin/upload` 上传文件。
- **处理**：matcher 扩展为 `['/admin/:path*', '/api/admin/:path*', '/api/ai/:path*']`，并在 `src/server/auth.ts` 中提供统一的校验函数供路由复用。

### 0.2 上传接口存在路径穿越

- **位置**：`src/app/api/admin/upload/route.ts`
- **成因**：`path.join(PHOTO_BASE_DIR, file.name)` 直接使用客户端提供的文件名，未做任何校验。
- **影响**：`file.name` 含 `../` 即可写入 `PHOTO_BASE_DIR` 之外的位置。该容器挂载了宿主机 `/mnt/map-photos`。
- **处理**：用 `path.basename()` 剥离目录部分，再校验解析后的绝对路径仍以 `PHOTO_BASE_DIR` 开头。同时限制扩展名白名单和单文件大小。

### 0.3 `admin_auth` cookie 直接存密码明文

- **位置**：`src/middleware.ts`
- **成因**：校验逻辑是 `authCookie !== process.env.ADMIN_PASSWORD`，即 cookie 的值就是密码本身。
- **影响**：cookie 泄露等同于密码泄露；无签名、无过期时间、无法单独吊销。
- **处理**：改为签名 token（HMAC 或 JWT），带过期时间。`src/server/lib/image-token.ts` 里已有 HMAC 签名的实现可参考。

### 0.4 Server Actions 的写操作没有身份检查

- **位置**：`src/server/actions/admin.ts`
- **成因**：`deletePhoto`、`deleteMissingPhotos`、`updatePhotoLocation` 等都是 `'use server'` 导出，没有任何鉴权。Server Action 可以被直接 POST 调用，不依赖页面。
- **影响**：`deleteMissingPhotos` 会删除数据库记录、MinIO 对象和 `photos` 目录下的源文件，不可恢复。
- **处理**：在每个写操作入口调用统一鉴权函数。

---

## 第 1 批：Bug

### 1.1 `transformPhoto` 里关系名拼写错误

- **位置**：`src/server/services/photo.services.ts`，`transformPhoto` 方法末尾
- **成因**：写的是 `if (transformed.locations)`，但 `prisma/schema.prisma` 中 Photo 上的关系名是 `location`（单数）。该分支永远不会进入。
- **影响**：`location.rawData`（高德逆地理编码的完整原始 JSON）一直全量下发给前端。注释写的"排除 rawData 字段以减小响应体积"只对 `photoExif` 生效了。
- **处理**：改为 `location`。同时建议在 Prisma 查询层用 `select` 排除 `rawData`，比在转换层 delete 更可靠。

### 1.2 `getPhotosInBounds` 缺少 `Promise.all`

- **位置**：`src/server/services/photo.services.ts`
- **成因**：`return photos.map((photo) => this.transformPhoto(photo))`，而 `transformPhoto` 是 async，返回的是 Promise 数组而非数据。同文件的 `getPhotosByIds` 写法正确。
- **影响**：目前无调用方，属于潜在缺陷。
- **处理**：补 `Promise.all`，或直接删除该方法（PostGIS 方案落地后会用 `ST_DWithin` 重写）。

### 1.3 `ScannerService` 被做成模块级单例

- **位置**：`src/server/actions/admin.ts` 顶部 `const scannerService = new ScannerService()`
- **成因**：`ScannerService` 持有可变实例状态 —— `successCount`、`failedCount`、`skippedCount`、`scanStartTime`、`progressCallback`，但被以模块单例方式复用。
- **影响**：并发调用时计数互相覆盖；更严重的是 `progressCallback` 会被后一次调用直接替换，导致前一个 SSE 连接静默失联。
- **参照**：`src/app/api/admin/scan/route.ts` 里是每次请求 `new ScannerService()`，写法正确。两处不一致说明这是无意的。
- **处理**：改为每次调用时新建实例。

### 1.4 管理后台的全量查询无法随数据量增长

- **位置**：`src/server/services/photo.services.ts` 的 `getAllPhotos` / `batchCheckFileExists`；调用方在 `src/server/actions/admin.ts` 和 `src/app/api/ai/analysis/route.ts`
- **成因**：`getAllPhotos()` 一次拉取全部照片和三个关联表的全部字段，包含 `photoExif.rawData` 和 `location.rawData` 两个大 JSON。`batchCheckFileExists` 在其之上用无并发限制的 `Promise.all`，每张照片一次 MinIO HeadObject。
- **影响**：一千张照片就是一千个并发请求打向 MinIO，同时单次响应体积达到数十 MB。
- **处理**：改为分页；用 `select` 收窄字段并剔除两个 `rawData`；文件存在性检查加并发上限（如 10）。

### 1.5 向量检索是全表扫描

- **位置**：`prisma/migrations/**`、`src/server/services/chat.services.ts`
- **成因**：migration 中只创建了 B-tree 唯一索引，`embedding` 和 `tag_embedding` 上没有任何向量索引。
- **影响**：每次检索都要计算全部照片的距离。数百张时不明显，上千张后显著变慢。
- **处理**：

```sql
CREATE INDEX ON photo_ai_analyses USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON photo_ai_analyses USING hnsw (tag_embedding vector_cosine_ops);
```

算子必须与查询一致 —— 代码里用的是 `<=>`（余弦距离），所以是 `vector_cosine_ops`。

### 1.6 同一份描述有两条不一致的向量化路径

- **位置**：`src/server/services/ai.services.ts`
- **成因**：两处对同一份描述做向量化，一处带前缀一处不带：

```ts
// analysis()：带 search_document: 前缀
const embeddingStr = await generateEmbedding(`search_document: ${description}`);

// updateEmbedding()：不带前缀
const vectorString = await generateEmbedding(photo.description || '');
```

- **影响**：库中向量落在两个不同分布上，取决于该照片是首次入库还是后来重跑过 `updateEmbedding`。检索质量不稳定，且难以从现象上察觉。
- **附加问题**：`search_document:` / `search_query:` 这套前缀是 nomic-embed-text 的约定，而项目用的是 bge-m3。bge-m3 是 instruction-free 的，检索任务不需要前缀。当前做法相当于在 query 端和 document 端掺入了不同的噪声，会人为拉大两者距离。
- **处理**：统一去掉前缀，两条路径共用同一个向量生成函数。改完后全量重跑一次 `updateEmbedding` 对齐历史数据，并重新校准 `chat.services.ts` 里 `< 0.8` 这个距离阈值。

### 1.7 `getImageUrl` 的无谓 async 传染

- **位置**：`src/server/lib/oss.ts`
- **成因**：`getImageUrl` 内部只有 HMAC 签名和字符串拼接，没有任何 IO，却声明为 `async`。
- **影响**：`transformPhoto` 被迫 async，进而每个列表方法都要包一层 `Promise.all`。整条链路的异步是虚假的。
- **处理**：去掉 `async`，同步返回。连带简化 `transformPhoto` 和所有调用方。

---

## 第 2 批：死代码

以下均已确认在 `src/` 内无任何引用。

### 2.1 `src/server/http.ts`

一个 `FetchService` 类，无人引用。项目使用 Server Actions 而非 REST 客户端，这套 `{code, message, data}` 风格的封装与实际架构不符。**删除。**

### 2.2 `src/server/lib/sse.ts`

无人引用。两个 API 路由实际用的是 `src/utils/request.ts` 里的 `createSSE`。**删除该文件，改为把 `createSSE` 迁到此处**（见 4.7）。

### 2.3 `src/config/fonts.ts`

`fontSans` / `fontMono` 无人引用。项目实际使用 `public/fonts/` 下的 GeistMono 和 TASAOrbiter，这套 Google Fonts 配置是 HeroUI 模板残留。**删除。**

### 2.4 `src/types/common.d.ts`

四个类型全部可删：`CommonResponse` 和 `RequestOptions` 仅被 `server/http.ts` 使用，而后者本身是死代码；`PagerResponse` 和 `PagerRequest` 完全无人引用，且字段与 `listPhotos` 实际返回的 `{ total, list }` 不一致。**删除整个文件。**

### 2.5 `src/utils/map.ts`

仅含 `convertToDecimal`，无人引用。相关的坐标转换逻辑在 `src/server/utils/index.ts` 的 `toDMS` / `formatDMSFromRaw` 中。**删除。**

### 2.6 `src/utils/url.ts` 的 `getParams`

无人引用，且实现有缺陷：`Array.isArray(searchParams.get(key))` 恒为 false（`URLSearchParams.get()` 只返回 `string | null`），支持逗号分隔多值的意图从未生效。功能与同文件的 `readUrlParam` 重叠。**删除该函数。**

### 2.7 `src/types/global.d.ts`

只有一个空的 `interface Window {}`。**删除。**

### 2.8 `src/server/lib/oss.ts` 中的 presigned URL 残留

`externalClient`、`EXTERNAL_ENDPOINT`、`getSignedUrl` 的 import 全部未使用。`getImageUrl` 已改为走 `/api/image` 代理加 HMAC token，旧方案的代码留下未清。**删除这三处。**

### 2.9 `src/server/utils/index.ts` 的 `getExifMetadata`

无人引用。`admin.services.ts` 用的是自己实现的 `readExifData`，两处都在调 `exifr.parse`，属重复实现。**删除，保留 service 内的实现。**

### 2.10 `src/config/site.ts` 的 `links`

仍是 HeroUI 模板默认值（`heroui-inc` 的 github、`hero_ui` 的 twitter、他人的 patreon 和 discord）。**替换为真实链接或删除。**

### 2.11 模板遗留页面

`src/app/about/page.tsx`、`src/app/blog/page.tsx` 及它们依赖的 `src/components/primitives.ts` 都是 HeroUI 模板原样。**实现或删除，不要留着。**

---

## 第 3 批：类型收敛

### 3.1 `src/types/photo.d.ts` 手抄了 Prisma 类型且已漂移

- **成因**：Prisma 已生成准确类型，此处又手写了一份平行定义，两边随 schema 演进逐渐脱节。
- **已发现的漂移**：
  - `PhotoAiAnalysis` 手写版只有 `tags` 和 `description`，缺 `theme` —— 而 `photo.services.ts` 的 select 查了 `theme`
  - `PhotoLocation` 手写版有 `address`、`street`，schema 中不存在；schema 中的 `formattedAddress`、`type` 手写版没有
  - `PhotoItem` 声明了 `thumbSmallKey` / `thumbLargeKey` / `videoKey`，但 `transformPhoto` 结尾把这三个字段 `delete` 了 —— 类型宣称存在，运行时保证不存在
  - `PhotoItem.tags` 是早期 migration 遗留，schema 的 Photo 模型中已无此字段
- **影响**：叠加 `transformPhoto` 里的 `as any`，服务端返回 `any`、前端用漂移的手写类型接收，这条链路上类型系统完全失效。
- **处理**：删除该文件，改为从 Prisma 派生：

```ts
// src/lib/types/photo.ts
import type { Prisma } from '@prisma/client';

/** 服务端查询形状，由 Prisma 推导，schema 改动自动同步 */
export type PhotoWithRelations = Prisma.PhotoGetPayload<{
  include: { photoExif: true; location: true; photoAiAnalysis: true };
}>;

/** 下发给前端的形状：去掉存储键、加上签名 URL */
export type PhotoItem = Omit<
  PhotoWithRelations,
  'thumbSmallKey' | 'thumbLargeKey' | 'videoKey' | 'originalKey'
> & {
  thumbSmallUrl: string;
  thumbLargeUrl: string;
  videoUrl?: string;
};
```

### 3.2 去掉 `transformPhoto` 的 `as any`

- **位置**：`src/server/services/photo.services.ts`
- **成因**：`const transformed = { ...photo } as any` 之后所有字段操作都失去检查。
- **处理**：配合 3.1 的 `PhotoItem` 类型，给 `transformPhoto` 明确的返回类型。`delete` 操作改为构造新对象（同时避免 V8 对象降级为字典模式）。

### 3.3 业务类型不应放在 `.d.ts`

- **位置**：`src/types/photo.d.ts`、`common.d.ts`、`mapMarker.d.ts`、`src/components/Map/type.d.ts`
- **成因**：`.d.ts` 的语义是环境声明，不参与编译产物。放会被 import 的业务类型在部分工具链下会有意外行为。而 `src/types/index.ts` 又是 `.ts`，两种写法并存。
- **处理**：业务类型统一用 `.ts`，`.d.ts` 只保留真正的全局声明。

### 3.4 `types/index.ts` 与 `mapMarker.d.ts` 循环引用

- **成因**：`index.ts` 中 `export * from './mapMarker'`，而 `mapMarker.d.ts` 中 `import { PhotoLocation } from '@/types'`。
- **处理**：改为从具体模块直接导入，不经过 barrel 文件。

---

## 第 4 批：结构重组

### 背景：为什么现在的结构会乱

**原因一：HeroUI 模板残留与自有代码混杂。** `navbar.tsx`、`footer.tsx`、`primitives.ts`、`config/fonts.ts`、`about`、`blog` 都是模板原样，它们的小写命名和 REST 风格类型与后来写的 PascalCase 加 Server Actions 风格并存。

**原因二：`components/` 缺少"是否跨页面复用"这条划分线。** 经核查，`components/Home/` 下 14 个组件**没有一个被首页之外引用**（`AreaMap` 甚至零引用），`PhotoMasonry/InfinitePhotoGrid` 也只被 `app/photos/page.tsx` 使用 —— 它们都是页面专属组件，却放在了全局位置。同时 `footprint`、`chat`、`admin` 用的是 `app/xxx/_components/` 就近组织。同一项目并存两套规则，于是产生了三处独立的 `PhotoCard` 和 `common` / `modules` / `ui` 三个边界说不清的分类目录。

**原因三：缺少 universal 层，服务端与客户端边界失守。** `src/utils/` 本意是通用工具，却装进了使用 `NextResponse` 的 `createSSE`。客户端组件从 `@/utils/request` 引入任何东西都会把 `next/server` 拖进 bundle。同时 `src/server/lib/sse.ts` 闲置未用。

### 参考：几个开源项目的实际做法

调整方案前核对了四个可对照的项目：

| 项目 | star | 类型 |
|---|---|---|
| [taxonomy](https://github.com/shadcn-ui/taxonomy) | 19k | shadcn 本人的 App Router 参考实现，单应用 |
| [dub](https://github.com/dubinc/dub) | 24.7k | 商业级 SaaS，Next.js monorepo |
| [documenso](https://github.com/documenso/documenso) | 15k | Next.js monorepo |
| [immich](https://github.com/immich-app/immich) | 114k | 自托管照片管理，与本项目同领域 |

**路由组是通用做法。** taxonomy 的 app 下全部是路由组：`(auth)`、`(dashboard)`、`(docs)`、`(editor)`、`(marketing)`；immich web 有 `routes/(user)`。

**共享组件层保持扁平，不需要 `features/`。** taxonomy 的完整结构只有 `app/(分组)` + `components/` + `components/ui/` + `config/` `hooks/` `lib/` `types/`。页面专属组件放在路由组内，跨页面的放 `components/`，纯展示的放 `components/ui/`。19k star 的参考实现没有引入功能域层。

**服务端按业务域切分，不按技术类型。** dub 的 `apps/web/lib/` 下是 60 多个业务域目录 —— `links`、`partners`、`payouts`、`customers`、`analytics`、`folder`、`ai`、`cron`、`jobs`、`actions`、`fetchers`，没有 `services/` `utils/` `helpers/` 这类按技术类型的划分。immich 走的是经典分层：`controllers/` + `services/`（扁平的 `xxx.service.ts`）+ `repositories/` + `dtos/`。前者更适合本项目，因为 Next.js 的 `app/` 已经承担了 controller 的角色。

**服务端与客户端代码按运行环境物理隔离。** documenso 的做法是 `packages/lib/server-only/`、`packages/lib/client-only/`、`packages/lib/universal/`，以及 `packages/auth/server/` 与 `packages/auth/client/`。边界体现在目录名上，而不只靠约定。

**重任务放独立进程。** immich 顶层是物理分离的服务：`server/`（NestJS）、`web/`、`machine-learning/`（独立 Python 服务）、`mobile/`、`packages/cli/`。`server/src/workers/` 下有三个进程入口：`api.ts`（HTTP）、`microservices.ts`（缩略图、元数据提取、AI 等后台任务）、`maintenance.ts`。同一代码库、不同进程入口，与本项目 ingestion 的拆分方向一致。immich 还有 `duplicate.service.ts`，对应 5.x 中提到的重复检测能力。

### 目标结构

```
src/
├── app/                          # 路由 + 页面专属实现
│   ├── (site)/                   # 公开页面路由组
│   │   ├── layout.tsx            #   带 navbar / footer
│   │   ├── _components/          #   首页专属组件（原 components/Home/）
│   │   ├── page.tsx
│   │   ├── photos/
│   │   │   ├── _components/      #   原 PhotoMasonry/InfinitePhotoGrid
│   │   │   ├── _actions.ts       #   无限滚动加载下一页
│   │   │   └── page.tsx
│   │   ├── footprint/_components/    # 位置不变
│   │   └── chat/{_components,_hooks}/ # 位置不变
│   │
│   ├── (admin)/admin/            # 后台路由组，独立 layout 与鉴权
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── photos/{_components,_hooks,_actions.ts}
│   │   ├── scan/{_components,_hooks}
│   │   └── upload/{_components,_hooks}
│   │
│   ├── api/
│   ├── layout.tsx
│   ├── providers.tsx
│   ├── loading.tsx
│   └── error.tsx
│
├── components/                   # 只放真正跨页面复用的组件
│   ├── photo/                    # MasonryGrid / PhotoCard / Lightbox / LivePhoto / ExifInfo
│   ├── map/                      # 原 components/Map（hooks + markers）
│   ├── ui/                       # 无业务语义：LabButton / NumberRoll / Reveal / StatCell
│   └── layout/                   # Navbar / Footer / ThemeSwitch
│
├── server/                       # 服务端，按业务域切分，全部 server-only
│   ├── photo/
│   │   ├── photo.service.ts
│   │   ├── exif.service.ts
│   │   └── location.service.ts
│   ├── ingestion/                # 照片入库域，未来整体迁往 worker
│   │   ├── scanner.service.ts    #   原 admin.services.ts 的扫描编排
│   │   ├── processor.service.ts   #   原 processPhoto 单张流水线
│   │   ├── file.service.ts
│   │   └── geocoding.service.ts
│   ├── ai/
│   │   ├── analysis.service.ts
│   │   ├── chat.service.ts
│   │   └── tools/                # agent 工具集
│   ├── db.ts
│   ├── storage.ts                # 原 lib/oss.ts
│   ├── ai-client.ts              # 原 lib/ai.ts
│   ├── sse.ts                    # 原 utils/request.ts 的 createSSE
│   ├── image-token.ts
│   ├── auth.ts                   # 新增：统一鉴权
│   ├── logger.ts
│   └── env.ts                    # 原 server/config.ts
│
├── lib/                          # universal：两端都可安全引用的纯代码
│   ├── format.ts
│   ├── url.ts
│   ├── photoMeta.ts
│   ├── mask.ts
│   └── types/                    # 从 Prisma 派生的纯类型
│
├── config/site.ts
├── styles/globals.css
├── middleware.ts
└── worker/                       # 预留：ingestion 的独立进程入口
```

### 设计要点

**组件归属只有三条规则：** 只有一个页面用 → `app/xxx/_components/`；多个页面用 → `components/<域>/`；没有业务语义 → `components/ui/`。这三条同时解决了 `components/Home` 的定位、三处 `PhotoCard`、以及 `common`/`modules`/`ui` 的边界问题。

**`src/lib/` 是新增的 universal 层。** 现有 `src/utils/` 混装了服务端代码（`createSSE`），根因就是缺这一层 —— `format`、`url`、`photoMeta` 这类两端都要用的纯函数无处安放，只能和服务端工具挤在一起。`lib/` 下必须只有纯函数和纯类型，不含任何运行时的服务端依赖。

**`src/server/` 下每个文件顶部加 `import 'server-only'`。** 把边界从约定变成编译期强制，客户端误引用会直接构建失败，而不是静默打进 bundle。目录已按运行环境分开是第一层保护，这是第二层。

**不建跨层 barrel。** 不要出现同时 re-export 服务端与客户端代码的 `index.ts`。barrel 只在同层内建（`components/photo/index.ts` 可以有，`server/photo/index.ts` 可以有，但不能有把两边合并的入口）。

**action 与 service 职责分离。** service 是内部实现，有四类调用方（Server Component、action、API route、未来的 worker），因此必须放在共享的 `src/server/`。action 是客户端交互的服务端入口，与页面一对一，因此就近放 `app/xxx/_actions.ts`，内容限于鉴权 + 参数校验 + 调 service。

### 具体条目

**4.1 首页组件迁到 `app/(site)/_components/`**
`components/Home/` 下 14 个组件经核查全部只被 `app/page.tsx` 或 Home 目录内部引用，无一跨页面复用。其中 `AreaMap.tsx` 零引用，直接删除。

**4.2 `PhotoMasonry/InfinitePhotoGrid` 迁到 `app/(site)/photos/_components/`**
只被 `app/photos/page.tsx` 使用。

**4.3 重划 `components/` 剩余内容**
`common/` + `modules/` + `ui/` 三个分类边界说不清（`modules/ExifInfo.tsx` 与 `ui/StatCell.tsx` 的区别是什么？），`MasonryGrid.tsx` 还直接躺在 `components/` 根下。按新规则重新落位：

- `components/photo/` ← `MasonryGrid`、`PhotoMasonry/PhotoCard`、`common/PhotoPreview`、`common/PhotoLightbox/`、`common/LivePhoto`、`modules/ExifInfo`、`modules/ExifTag`、`modules/LivePhotoIndicate`、`Carousel/`
- `components/map/` ← `Map/`（经核查被 footprint 页、admin/photos 的 LocationModal、Home/FootprintMap、PhotoLightbox/InfoPanel 四处引用，是真正的跨页面组件）
- `components/ui/` ← 现有 `ui/` 内容
- `components/layout/` ← `navbar.tsx`、`footer.tsx`、`theme-switch.tsx`

**4.4 `admin.services.ts` 更名并拆分**
文件名与内容严重不符：572 行的文件里是 `ScannerService`，包含 HEIC 转换、缩略图生成、EXIF 解析、逆地理编码、入库的完整流水线，而且它不是 admin 专属 —— `api/admin/upload/route.ts` 也依赖它的 `processPhoto`。这是最容易导致定位错误的一处命名。拆为 `server/ingestion/scanner.service.ts`（扫描编排）+ `processor.service.ts`（单张处理流水线）。

**4.5 `server/services/` 按业务域拆分**
现有七个文件混了照片查询、AI、扫描、文件管理，依赖关系要读代码才清楚。拆成 `server/photo/`、`server/ingestion/`、`server/ai/` 后，`ingestion → photo` 是明确的单向依赖。

**4.6 Server Component 不再经过 Server Action**
`app/page.tsx` 是 Server Component，却调用 `@/server/actions` 中带 `'use server'` 的函数。这些函数因此被编译成 Server Action，各自生成一个公开可访问的 POST 端点，而 page 与 service 本就在同一进程内。改为直接 import service 调用。

同一 pattern 用在 `server/actions/admin.ts` 上就是安全问题的根源 —— `deletePhoto`、`deleteMissingPhotos` 因 `'use server'` 成了任何人可 POST 的公开端点，而它们会删除数据库记录、MinIO 对象和源文件。这与 0.4 是同一件事。

**4.7 `server/actions/` 拆散下沉**
按 4.6 的结论重新归类：Server Component 用不到的删除；客户端组件确实需要的下沉到对应页面的 `_actions.ts`，并逐个补鉴权。拆散过程中每个 action 都要重新判断"是否该暴露给客户端"，这是 0.4 的实际执行路径。

**4.8 建立 `src/lib/` universal 层**
迁入 `utils/format.ts`、`utils/url.ts`、`utils/photoMeta.ts`、`utils/mask.ts` 和从 Prisma 派生的纯类型。`utils/request.ts` 的 `createSSE` 反向迁到 `server/sse.ts`（它使用 `NextResponse`，是纯服务端代码）。

**4.9 引入 `(site)` / `(admin)` 路由组**
前后台的 layout 与鉴权需求完全不同，路由组可让 admin 拥有独立 layout 且不改变 URL。同时删除 `layout-wrapper.tsx` 中"哪个页面显示 navbar"的条件判断 —— 那本应由 layout 层级表达。

**4.10 统一服务实例化方式**
当前混用两种：`locationService`、`photoExifService` 导出单例实例（小写），`PhotoService`、`ScannerService`、`AIService`、`FileManageService` 导出类。调用方每次都要回去确认该 `new` 还是直接用。建议统一导出类，生命周期由调用方决定 —— 单例模式在 `ScannerService` 上已造成过实际问题（见 1.3）。

**4.11 命名风格统一**
`navbar.tsx`、`footer.tsx`、`layout-wrapper.tsx`、`theme-switch.tsx` 改为 PascalCase 并迁入 `components/layout/`。这几个是模板残留的小写命名，自有代码全是 PascalCase。

**4.12 抽出 `useEmblaSync` hook**
`components/Carousel/`（首页背景轮播）和 `components/common/PhotoLightbox/`（照片查看器）各自实现了一遍"主轮播 + 缩略图条 + select 事件同步"，连 EXIF 展示都各有一份（`Carousel/ExifOverlay.tsx` 与 `PhotoLightbox/InfoPanel.tsx`）。用途不同可以保留两个组件，但底层联动逻辑应共用。

**4.13 删除空的 `src/hooks/` 目录**
实际 hooks 分散在 `app/*/_hooks/` 和 `components/Map/hooks/`。迁移后归入 `app/xxx/_hooks/`（页面专属）和 `components/<域>/hooks/`（跨页面），该空目录删除。

**4.14 `server/config.ts` 更名为 `server/env.ts`**
与 `src/config/` 同名容易误导，且它的实际职责是读取环境变量。

**4.15 建立 `src/worker/` 占位目录**
ingestion 抽出为独立进程时的入口位置。参照 immich 的 `server/src/workers/`：同一代码库、不同进程入口，worker 只 import `server/ingestion/` 下的 service，不接触任何 `.tsx`。这也是 `server/ingestion/` 必须与 UI 物理分离的原因。

---

## 第 5 批：数据层

### 5.1 migration 与 schema 已严重漂移

- **成因**：中途使用了 `prisma db push`（`package.json` 中的 `db:push:prod` / `db:push:local`），绕过了 migration 记录。
- **已发现的差异**：
  - migration 中 `embedding` 是 `vector(768)`，schema 中是 `vector(1024)`
  - migration 中 `photos` 表有 `description` 和 `tags` 两列，schema 的 Photo 模型中没有
  - migration 中有 `chineseDescription`，schema 中没有
  - schema 中的 `theme`、`tagEmbedding` 在 migration 中不存在
- **影响**：现有 migration 已无法重建数据库，换机器或重装时会失败。
- **处理**：用 `prisma migrate diff` 生成一个对齐当前实际库结构的 baseline migration。

### 5.2 补充索引

除 1.5 的向量索引外：

```sql
CREATE INDEX ON photos ("takenAt" DESC);                    -- 时间过滤最常用
CREATE INDEX ON photo_ai_analyses USING gin (tags);          -- 数组重叠查询
CREATE INDEX ON locations (province, city, district);        -- 行政区划过滤
```

### 5.3 `locations` 增加 geography 列与 GiST 索引

- **成因**：当前只有 `latitude` / `longitude` 两个 Float 列和一个 `(latitude, longitude)` 复合 B-tree 索引，后者对地理范围查询几乎无用，无法加速 `ST_DWithin`。
- **处理**：

```sql
ALTER TABLE locations ADD COLUMN geom geography(Point, 4326);
UPDATE locations SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography;
CREATE INDEX ON locations USING gist (geom);
```

这是"搜索附近照片"功能的前提。

### 5.4 处理 `photo_ai_analyses.location` 死字段

- **成因**：定义为 `geography(Point, 4326)`，但 `ai.services.ts` 的 INSERT 语句从未写入该字段。
- **影响**：开启了 PostGIS 扩展却未实际使用。
- **处理**：填充它，或直接删除（位置数据已在 `locations` 表，建议删除，改用 5.3 的方案）。

### 5.5 增加 `visibility` 字段

当前所有入库照片一律对外可见，没有任何私密控制。若扫描目录中包含私人照片，此项优先级高于其他数据层改动。

### 5.6 `takenAt` 的时区问题

- **成因**：`takenAt` 存的是 EXIF `DateTimeOriginal`，该值不带时区，是相机显示的本地时间，但 Prisma 按 UTC 解读存入 `TIMESTAMP(3)`。
- **影响**：做"清晨拍摄""黄金时刻"这类时间维度查询时会出错，国内照片偏 8 小时；跨国照片偏移量还各不相同。
- **处理**：增加 `timezone`（由经纬度反查，有离线库可用）和 `takenAtLocal` 字段。

### 5.7 可选：太阳方位角与高度角

有经纬度和准确本地时间即可纯数学计算，无需外部 API，可离线批量补全历史数据。配合已有的 `bearingDirection` 能判断顺光、逆光、侧光，也能识别蓝调时刻和黄金时刻。这是摄影复盘类功能的数据基础，依赖 5.6 先完成。

---

## 推进顺序

**可立即执行且互不依赖**：第 0 批、第 1 批、第 2 批。改动都很局部，合起来大约十几处，但堵掉了全部已知安全洞和确凿 bug。

**第 3 批是第 4 批的前提。** 先把类型收敛到 Prisma 单一来源，再迁目录 —— 编译器会帮你抓出所有漏改的引用。顺序颠倒会痛苦得多。

**第 4 批内部也有依赖顺序**，建议按此推进，每步跑一次 `npm run build` 验证：

1. **4.8 建 `src/lib/`** —— 先把 universal 层立起来，后续迁移才有地方放共享的纯函数和类型
2. **4.6 + 4.7 处理 action 层** —— 这两条同时解决 0.4 的安全问题，且会牵动所有页面的数据获取方式，越早做后面越省事
3. **4.4 + 4.5 拆 `server/`** —— 服务端先稳定，组件迁移时不会两头同时变
4. **4.1 + 4.2 迁页面专属组件** —— 纯移动，风险最低
5. **4.3 重划 `components/`** —— 放在最后，此时哪些是真跨页面复用已经很清楚
6. **4.9 - 4.15 收尾** —— 路由组、命名、占位目录等独立小改动

**第 5 批中 5.1（baseline migration）和 5.5（visibility）建议提前**，其余可按功能需求推进。
