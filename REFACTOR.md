# 项目优化清单

待处理事项。已完成的条目已移除，改造过程可查 git 历史。

| 批次 | 剩余 |
|---|---|
| 安全 | 0.3 |
| Bug | 1.1 1.2 1.4 1.5 1.6 1.7 |
| 死代码 | 2.10 |
| 类型收敛 | 3.1 3.2 3.3 |
| 结构 | 4.10 4.12 |
| 数据层 | 5.1 – 5.7 |

---

## 当前结构与约定

```
src/
├── app/
│   ├── layout.tsx              html/body/Providers/字体/统计
│   ├── error.tsx  loading.tsx  在根，覆盖全部路由
│   ├── (site)/                 带导航栏的公开页面
│   │   ├── layout.tsx          Navbar + main + ScrollReset
│   │   ├── _components/        首页专属组件
│   │   ├── page.tsx            首页（自行引入 Footer）
│   │   ├── photos/{_components,page.tsx}
│   │   └── footprint/{_components,page.tsx}
│   ├── (admin)/admin/
│   │   ├── layout.tsx          Server Component，鉴权后再渲染
│   │   ├── _components/AdminTabs.tsx
│   │   ├── _actions.ts         管理操作，逐个 requireAdmin()
│   │   └── page.tsx  photos/  scan/  upload/
│   ├── chat/                   全屏，自带 ChatHeader，直接用根 layout
│   └── api/
│
├── components/                 只放跨页面复用的
│   ├── photo/                  MasonryGrid / PhotoCard / PhotoLightbox/ / LivePhoto / ExifInfo / Carousel/
│   ├── map/                    hooks + markers
│   ├── ui/                     无业务语义
│   ├── layout/                 Navbar / Footer / ThemeSwitch / ScrollReset
│   └── Icons/
│
├── server/                     全部带 import 'server-only'
│   ├── infra/                  db / storage / ai-client / logger / sse / image-token / env
│   ├── auth.ts                 横切的访问控制
│   ├── actions.ts              公开读取类 action，供客户端组件调用
│   ├── photo/                  photo / exif / location.service
│   ├── ingestion/              scanner / file / geocoding.service + photo-files + utils
│   └── ai/                     analysis / chat.service
│
├── lib/                        universal：两端可安全引用
│   ├── format.ts  mask.ts  photoMeta.ts
│   ├── url.ts                  带 import 'client-only'（访问 window）
│   └── types/
│
├── config/site.ts  styles/  middleware.ts
└── worker/                     预留：ingestion 的独立进程入口
```

**组件归属**：只有一个页面用 → `app/xxx/_components/`；多个页面用 → `components/<域>/`；无业务语义 → `components/ui/`。

**`server/infra/` 的判定**：文件里有没有照片、扫描、AI 这类业务概念？没有就进 `infra/`。`auth.ts` 有业务语义且是安全关注点、`actions.ts` 是入口层，两者留在 `server/` 根。

**数据获取**：Server Component 直调 service，不经过 Server Action —— 后者会把函数编译成公开 POST 端点，而两者本就同进程。客户端组件运行在浏览器里，只能走 `server/actions.ts`（公开读取）或 `app/(admin)/admin/_actions.ts`（管理操作，必须鉴权）或 API Route（需要流式响应时）。

**结构选型依据**：参考了 [taxonomy](https://github.com/shadcn-ui/taxonomy)（App Router 参考实现，无功能域层）、[dub](https://github.com/dubinc/dub)（服务端按业务域切而非技术类型）、[documenso](https://github.com/documenso/documenso)（按运行环境物理隔离）、[immich](https://github.com/immich-app/immich)（同领域，重任务放独立进程）。曾设计过 `features/<域>/` 方案，核查后发现页面专属组件并无跨页面复用，属于为不存在的问题建抽象，已放弃。

---

## 安全

### 0.3 `admin_auth` cookie 直接存密码明文

- **位置**：`src/middleware.ts`、`src/server/auth.ts`
- **成因**：校验逻辑是 `cookie === process.env.ADMIN_PASSWORD`，即 cookie 值就是密码本身。
- **影响**：cookie 泄露等同密码泄露；无签名、无过期、无法单独吊销。
- **补充**：`admin_auth` 在代码里没有任何写入点，目前靠手动在浏览器 devtools 里设置，没有登录流程。
- **处理**：改签名 token（`src/server/infra/image-token.ts` 有 HMAC 实现可参考），需要配套一个登录页。

### 附：`/api/ai/chat` 未鉴权

`/chat` 是公开页面，所以这个接口没有纳入 middleware 的 matcher。但它会消耗 ModelScope 配额与宿主机 Ollama 的 CPU，任何人可调用。需决定是否限流或收进管理端。

---

## Bug

### 1.1 `transformPhoto` 里关系名拼写错误

- **位置**：`src/server/photo/photo.service.ts`，`transformPhoto` 方法末尾
- **成因**：写的是 `if (transformed.locations)`，但 schema 中 Photo 上的关系名是 `location`（单数）。该分支永远不会进入。
- **影响**：`location.rawData`（高德逆地理编码的完整原始 JSON）一直全量下发给前端。注释写的"排除 rawData 字段以减小响应体积"只对 `photoExif` 生效了。
- **旁证**：`npm run build` 的 ESLint 警告里有两处 `'rawData' is assigned a value but never used`，其中一处就是这个永不执行的分支。
- **处理**：改为 `location`。更好的做法是在 Prisma 查询层用 `select` 排除 `rawData`，比在转换层 delete 更可靠。

### 1.2 `getPhotosInBounds` 缺少 `Promise.all`

- **位置**：`src/server/photo/photo.service.ts`
- **成因**：`return photos.map((photo) => this.transformPhoto(photo))`，而 `transformPhoto` 是 async，返回的是 Promise 数组而非数据。同文件的 `getPhotosByIds` 写法正确。
- **影响**：目前无调用方，属潜在缺陷。
- **处理**：补 `Promise.all`，或直接删除（5.3 的 PostGIS 方案落地后会用 `ST_DWithin` 重写）。

### 1.4 管理后台的全量查询无法随数据量增长

- **位置**：`src/server/photo/photo.service.ts` 的 `getAllPhotos` / `batchCheckFileExists`；调用方在 `src/app/(admin)/admin/_actions.ts` 和 `src/app/api/ai/analysis/route.ts`
- **成因**：`getAllPhotos()` 一次拉取全部照片和三个关联表的全部字段，含 `photoExif.rawData` 与 `location.rawData` 两个大 JSON。`batchCheckFileExists` 在其之上用无并发限制的 `Promise.all`，每张照片一次 MinIO HeadObject。
- **影响**：一千张照片就是一千个并发请求打向 MinIO，单次响应体积达数十 MB。
- **处理**：改分页；用 `select` 收窄字段并剔除两个 `rawData`；文件存在性检查加并发上限（如 10）。

### 1.5 向量检索是全表扫描

- **位置**：`prisma/migrations/**`、`src/server/ai/chat.service.ts`
- **成因**：migration 中只创建了 B-tree 唯一索引，`embedding` 和 `tag_embedding` 上没有任何向量索引。
- **影响**：每次检索都要计算全部照片的距离。数百张不明显，上千张后显著变慢。
- **处理**：

```sql
CREATE INDEX ON photo_ai_analyses USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON photo_ai_analyses USING hnsw (tag_embedding vector_cosine_ops);
```

算子必须与查询一致 —— 代码里用的是 `<=>`（余弦距离），所以是 `vector_cosine_ops`。

### 1.6 同一份描述有两条不一致的向量化路径

- **位置**：`src/server/ai/analysis.service.ts`
- **成因**：两处对同一份描述做向量化，一处带前缀一处不带：

```ts
// analysis()：带 search_document: 前缀
const embeddingStr = await generateEmbedding(`search_document: ${description}`);

// updateEmbedding()：不带前缀
const vectorString = await generateEmbedding(photo.description || '');
```

- **影响**：库中向量落在两个不同分布上，取决于该照片是首次入库还是后来重跑过 `updateEmbedding`。检索质量不稳定，且难以从现象上察觉。
- **附加问题**：`search_document:` / `search_query:` 这套前缀是 nomic-embed-text 的约定，而项目用的是 bge-m3。bge-m3 是 instruction-free 的，检索任务不需要前缀。当前做法相当于在 query 端与 document 端掺入了不同的噪声，人为拉大两者距离。
- **处理**：统一去掉前缀，两条路径共用同一个向量生成函数。改完后全量重跑 `updateEmbedding` 对齐历史数据，并重新校准 `chat.service.ts` 里 `< 0.8` 这个距离阈值。

### 1.7 `getImageUrl` 的无谓 async 传染

- **位置**：`src/server/infra/storage.ts`
- **成因**：`getImageUrl` 内部只有 HMAC 签名与字符串拼接，没有任何 IO，却声明为 `async`。
- **影响**：`transformPhoto` 被迫 async，进而每个列表方法都要包一层 `Promise.all`。整条链路的异步是虚假的。
- **处理**：去掉 `async`，连带简化 `transformPhoto` 和所有调用方。

---

## 死代码

### 2.10 `src/config/site.ts` 的 `links`

仍是 HeroUI 模板默认值（`heroui-inc` 的 github、`hero_ui` 的 twitter、他人的 patreon 和 discord）。替换为真实链接或删除。

---

## 类型收敛

### 3.1 `lib/types/photo.ts` 手抄了 Prisma 类型且已漂移

- **成因**：Prisma 已生成准确类型，此处又手写了一份平行定义，两边随 schema 演进逐渐脱节。
- **已发现的漂移**：
  - `PhotoAiAnalysis` 手写版只有 `tags` 和 `description`，缺 `theme` —— 而 `photo.service.ts` 的 select 查了 `theme`
  - `PhotoLocation` 手写版有 `address`、`street`，schema 中不存在；schema 中的 `formattedAddress`、`type` 手写版没有
  - `PhotoItem` 声明了 `thumbSmallKey` / `thumbLargeKey` / `videoKey`，但 `transformPhoto` 结尾把这三个字段 `delete` 了 —— 类型宣称存在，运行时保证不存在
  - `PhotoItem.tags` 是早期 migration 遗留，schema 的 Photo 模型中已无此字段
- **影响**：叠加 `transformPhoto` 里的 `as any`，服务端返回 `any`、前端用漂移的手写类型接收，这条链路上类型系统完全失效。
- **处理**：改为从 Prisma 派生：

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

必须用 `import type`。写成 `import { Prisma }` 会把运行时对象带进 bundle —— 本文件两端都会引用。

### 3.2 去掉 `transformPhoto` 的 `as any`

- **位置**：`src/server/photo/photo.service.ts`
- **成因**：`const transformed = { ...photo } as any` 之后所有字段操作都失去检查。
- **处理**：配合 3.1 的 `PhotoItem` 给出明确返回类型。`delete` 操作改为构造新对象（同时避免 V8 对象降级为字典模式）。

### 3.3 `src/components/map/type.d.ts` 仍是 `.d.ts`

tsconfig 里 `skipLibCheck: true` **会跳过 `.d.ts` 的类型检查** —— 放在里面的业务类型从来没被检查过。此前把 `types/photo.d.ts` 改成 `.ts` 时，立刻冒出一个一直隐藏的类型错误（`PhotoDetail` 不兼容地扩展 `PhotoItem`，该 interface 零引用已删）。这个文件是同类隐患的最后一处，改成 `.ts`。

---

## 结构

### 4.10 统一服务实例化方式

仍并存两种风格：`PhotoService` / `ScannerService` / `AIService` / `AiChatService` / `FileManageService` / `GeocodingService` 导出类，`locationService` / `photoExifService` 导出单例对象。调用方每次都要确认该 `new` 还是直接用。

建议统一导出类，生命周期由调用方决定 —— 单例模式此前在 `ScannerService` 上造成过实际问题：它持有可变实例状态（计数器、`progressCallback`），被做成模块级单例后并发调用会互相覆盖，`progressCallback` 被替换会导致前一个 SSE 连接静默失联。

### 4.12 抽出 `useEmblaSync` hook

`components/photo/Carousel/`（首页背景轮播）与 `components/photo/PhotoLightbox/`（照片查看器）各自实现了一遍"主轮播 + 缩略图条 + select 事件同步"，连 EXIF 展示都各有一份（`Carousel/ExifOverlay.tsx` 与 `PhotoLightbox/InfoPanel.tsx`）。用途不同可保留两个组件，但底层联动逻辑应共用。

---

## 数据层

### 5.1 migration 与 schema 已严重漂移

- **成因**：中途使用了 `prisma db push`（`package.json` 中的 `db:push:prod` / `db:push:local`），绕过 migration 记录。
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

这是"搜索附近照片"功能的前提，也是 1.2 重写的依据。

### 5.4 处理 `photo_ai_analyses.location` 死字段

- **成因**：定义为 `geography(Point, 4326)`，但 `analysis.service.ts` 的 INSERT 从未写入该字段。
- **影响**：开启了 PostGIS 扩展却未实际使用。
- **处理**：填充它，或直接删除（位置数据已在 `locations` 表，建议删除，改用 5.3 的方案）。

### 5.5 增加 `visibility` 字段

当前所有入库照片一律对外可见，没有任何私密控制。若扫描目录中包含私人照片，此项优先级高于其他数据层改动。

### 5.6 `takenAt` 的时区问题

- **成因**：`takenAt` 存的是 EXIF `DateTimeOriginal`，该值不带时区，是相机显示的本地时间，但 Prisma 按 UTC 解读存入 `TIMESTAMP(3)`。
- **影响**：做"清晨拍摄""黄金时刻"这类时间维度查询时会出错，国内照片偏 8 小时；跨国照片偏移量各不相同。
- **处理**：增加 `timezone`（由经纬度反查，有离线库可用）和 `takenAtLocal` 字段。

### 5.7 可选：太阳方位角与高度角

有经纬度和准确本地时间即可纯数学计算，无需外部 API，可离线批量补全历史数据。配合已有的 `bearingDirection` 能判断顺光、逆光、侧光，也能识别蓝调时刻与黄金时刻。这是摄影复盘类功能的数据基础，依赖 5.6 先完成。

---

## 建议顺序

1. **1.1 与 1.5** —— 一个拼写修正、一条加索引的 SQL，改动最小、收益直接，且无连带影响
2. **3.1 类型收敛** —— 做完 `lib/types/` 的定位才清晰（从 schema 派生的类型层），1.7 和 3.2 会顺带变简单
3. **5.1 与 5.5** —— baseline migration 关系到能否重建数据库；`visibility` 关系到私人照片是否对外可见。两者不依赖其他条目
4. **1.4 / 1.2 / 1.6** —— 各自独立，按需推进
5. **0.3 登录流程** —— 需要新增登录页，是个独立小功能
6. **4.10 / 4.12 / 2.10 / 3.3** —— 一致性与清理，无功能影响
7. **ingestion 抽 worker 进程** —— 见 `src/worker/README.md`。触发条件是扫描期间前台响应受影响到不可忍受，或需要任务断线续跑。独立于以上所有条目

## 验证方式

- 结构类改动：`npx tsc --noEmit`，再 `npm run build`
- `.next/types/` 会缓存旧路径。移动文件后若报 `Cannot find module '../../src/app/xxx.js'`，`rm -rf .next` 重建
- 跑过 `next start` 之后直接 `npm run build` 可能报 `Cannot find module '[turbopack]_runtime.js'`，同样清 `.next`
- 安全类改动必须实测，不能只看构建通过：起 production server（`npx next start -p 3999`，避开 dev 占用的 3000），用 curl 覆盖无 cookie / 错 cookie / 正确 cookie 三种场景
- 验证 `server-only` / `client-only` 守卫时注意：只写 import 不实际使用会被 tree-shake 掉，模块从未进入依赖图，构建照样通过。必须引用到符号才触发
