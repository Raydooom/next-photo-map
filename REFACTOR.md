# 项目优化清单

待处理事项。已完成的条目已移除，改造过程可查 git 历史。

| 批次 | 剩余 |
|---|---|
| 安全 | 0.3 |
| Bug | 1.2 1.4 1.5 1.6 1.7（1.1 随 5.8 修掉） |
| 死代码 | 2.10 |
| 类型收敛 | 3.1 3.2 3.3 |
| 结构 | 4.12（4.10 已完成） |
| 数据层 | 5.1 – 5.7、5.9 – 5.16（5.8 已完成） |

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
│   ├── infra/                  技术设施：db / storage / ai-client / logger / sse / image-token / env
│   ├── services/               业务服务，按域切分
│   │   ├── photo/              photo / exif / location.service
│   │   ├── ingestion/          scanner / file / geocoding.service + photo-files + utils
│   │   └── ai/                 analysis / chat.service
│   ├── auth.ts                 横切的访问控制
│   └── actions.ts              公开读取类 action，供客户端组件调用
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

**`server/` 的分层**：`infra/` 放技术设施，`services/` 放业务服务。判定规则是"文件里有没有照片、扫描、AI 这类业务概念" —— 有就进 `services/<域>/`，没有就进 `infra/`。`auth.ts` 有业务语义且是安全关注点、`actions.ts` 是入口层，两者都不属于上述任一类，留在 `server/` 根。

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

### ✅ 1.1 `transformPhoto` 里关系名拼写错误

- **位置**：`src/server/services/photo/photo.service.ts`，`transformPhoto` 方法末尾
- **成因**：写的是 `if (transformed.locations)`，但 schema 中 Photo 上的关系名是 `location`（单数）。该分支永远不会进入。
- **影响**：`location.rawData`（高德逆地理编码的完整原始 JSON）一直全量下发给前端。注释写的"排除 rawData 字段以减小响应体积"只对 `photoExif` 生效了。
- **旁证**：`npm run build` 的 ESLint 警告里有两处 `'rawData' is assigned a value but never used`，其中一处就是这个永不执行的分支。
- **实际做法**：随 5.8 一起改为 `location`。更进一步的做法（在 Prisma 查询层用 `select` 排除 `rawData`）仍未做。

### 1.2 `getPhotosInBounds` 缺少 `Promise.all`

- **位置**：`src/server/services/photo/photo.service.ts`
- **成因**：`return photos.map((photo) => this.transformPhoto(photo))`，而 `transformPhoto` 是 async，返回的是 Promise 数组而非数据。同文件的 `getPhotosByIds` 写法正确。
- **影响**：目前无调用方，属潜在缺陷。
- **处理**：补 `Promise.all`，或直接删除（5.3 的 PostGIS 方案落地后会用 `ST_DWithin` 重写）。

### 1.4 管理后台的全量查询无法随数据量增长

- **位置**：`src/server/services/photo/photo.service.ts` 的 `getAllPhotos` / `batchCheckFileExists`；调用方在 `src/app/(admin)/admin/_actions.ts` 和 `src/app/api/ai/analysis/route.ts`
- **成因**：`getAllPhotos()` 一次拉取全部照片和三个关联表的全部字段，含 `photoExif.rawData` 与 `location.rawData` 两个大 JSON。`batchCheckFileExists` 在其之上用无并发限制的 `Promise.all`，每张照片一次 MinIO HeadObject。
- **影响**：一千张照片就是一千个并发请求打向 MinIO，单次响应体积达数十 MB。
- **处理**：改分页；用 `select` 收窄字段并剔除两个 `rawData`；文件存在性检查加并发上限（如 10）。

### 1.5 向量检索是全表扫描

- **位置**：`prisma/migrations/**`、`src/server/services/ai/chat.service.ts`
- **成因**：migration 中只创建了 B-tree 唯一索引，`embedding` 和 `tag_embedding` 上没有任何向量索引。
- **影响**：每次检索都要计算全部照片的距离。数百张不明显，上千张后显著变慢。
- **处理**：

```sql
CREATE INDEX ON photo_ai_analyses USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON photo_ai_analyses USING hnsw (tag_embedding vector_cosine_ops);
```

算子必须与查询一致 —— 代码里用的是 `<=>`（余弦距离），所以是 `vector_cosine_ops`。

### 1.6 同一份描述有两条不一致的向量化路径

- **位置**：`src/server/services/ai/analysis.service.ts`
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

- **位置**：`src/server/services/photo/photo.service.ts`
- **成因**：`const transformed = { ...photo } as any` 之后所有字段操作都失去检查。
- **处理**：配合 3.1 的 `PhotoItem` 给出明确返回类型。`delete` 操作改为构造新对象（同时避免 V8 对象降级为字典模式）。

### 3.3 `src/components/map/type.d.ts` 仍是 `.d.ts`

tsconfig 里 `skipLibCheck: true` **会跳过 `.d.ts` 的类型检查** —— 放在里面的业务类型从来没被检查过。此前把 `types/photo.d.ts` 改成 `.ts` 时，立刻冒出一个一直隐藏的类型错误（`PhotoDetail` 不兼容地扩展 `PhotoItem`，该 interface 零引用已删）。这个文件是同类隐患的最后一处，改成 `.ts`。

---

## 结构

### ✅ 4.10 统一服务实例化方式

- **成因**：原先并存两种风格 —— 六个 service 导出类由调用方 `new`，`locationService` / `photoExifService` 导出对象字面量。调用方每次都要确认该不该 `new`。
- **实际做法**：统一为 **class 不导出、只导出单例实例**，判断标准是状态的生命周期而非有无状态：

| 导出形态 | 含义 | 谁 |
|---|---|---|
| `export const xxx = new XxxService()`，class 不导出 | 进程级单例，外部拿不到构造器 | 其余六个 |
| `export class XxxService` | 任务级状态，调用方每次新建 | 只有 `ScannerService` |

  `ScannerService` 是唯一例外，因为它的计数器与 `progressCallback` 属于**一次扫描任务**，两次扫描必须隔离 —— 1.3 那个 bug 正是它被做成模块级单例导致的。它不再持有其他 service 的实例字段（那些都是进程级单例，直接用导入的即可），构造函数随之删除。

  为什么不用对象字面量：`location.service.ts` 里 `listLocations` 要调 `getAllLocations` 时只能写 `locationService.getAllLocations(...)` 自引用模块级常量，改成 class 后是 `this.getAllLocations(...)`，且能有真正的 `private`（`flattenRegion` 已收为私有方法）。

  为什么不用静态方法：`ScannerService` 必须是实例，若其余改成静态 class，代码里会出现 `AIService.analysis()` 与 `new ScannerService().startScanner()` 两种相反用法而外观都是 class。现在"导出实例 vs 导出类"本身就区分了用法。

- **顺带清掉两处死代码**：
  - `PhotoService` 的 `constructor(appUrl?: string)` 与 `appUrl` / `photosBaseUrl` 字段 —— `appUrl` 只在构造函数里赋值、全文从未读取，`photosBaseUrl` 也未使用，而 `ScannerService` 还在往里传这个读不到的值
  - `FileManageService` 的 `private STORAGE_TYPE = 'minio'` 及 `if (this.STORAGE_TYPE === 'minio')` —— 永远为真且无 else 分支，导致 `uploadFile` 返回类型被推导成 `{...} | undefined`，调用方得处理永不出现的 `undefined`（scanner 里那些 `res?.key` 和 `uploadRes[0]!.key` 就是为此写的，已一并简化）

### 4.12 抽出 `useEmblaSync` hook

`components/photo/Carousel/`（首页背景轮播）与 `components/photo/PhotoLightbox/`（照片查看器）各自实现了一遍"主轮播 + 缩略图条 + select 事件同步"，连 EXIF 展示都各有一份（`Carousel/ExifOverlay.tsx` 与 `PhotoLightbox/InfoPanel.tsx`）。用途不同可保留两个组件，但底层联动逻辑应共用。

---

## 数据层

分两类，顺序不能颠倒：**5.8 – 5.14 是表结构与字段归属**，改的是表本身；
**5.2 – 5.7 是索引与新增字段**，建在结构之上。结构未定就加索引，等于改两次表。

而两者都必须排在 5.1 之后 —— 现有 migration 已与 schema 漂移，
在漂移的基础上叠新 migration 会越来越难收拾。

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

### ✅ 5.8 行政区划规范化为 `regions` 表

- **位置**：`prisma/schema.prisma` 的 `Location`
- **成因**：`country / province / city / district / township / adcode / formattedAddress` 全部按行存在 `locations` 里。同一个城市拍 100 张照片，"河南省 / 郑州市 / 金水区" 就重复存 100 次。
- **代价已经显现**：首页统计城市数是把全部位置记录拉到 Node 里算 distinct ——

```ts
// app/(site)/page.tsx
const cityCount = new Set(locations.map((item) => item.city)).size;
```

  照片上千张后，为得到一个数字要传输上千行。

- **实际做法**：

```
regions   (adcode PK, country, province, city, district)
locations (photoId, latitude, longitude, adcode → regions, township, neighborhood, formattedAddress, bearing)
```

  **`township` 没有进 `regions`** —— 这与最初设计不同。探查数据时发现两个 adcode 有"冲突"：`110102` 下有西长安街街道与金融街街道，`110105` 下有奥运村街道与孙河乡。原因是 adcode 是**区县级**代码，一个区下自然有多个街道，把 township 放进去会破坏主键唯一性。去掉它之后 13 个 adcode 全部唯一。

  迁移 SQL 在 `prisma/migrations/20260918000000_extract_regions/`，顺序是建表 → 迁数据 → 加外键 → 删旧列。不能直接 `db push`，那会先删列、区划数据就丢了。

  **代码侧的兼容处理**：区划字段的读取点分布在九处组件里（`PhotoCard`、`PhotoLightbox`、`InfoPanel`、`HeroReadout`、`photoMeta` 等），逐个改成 `location.region.city` 代价过大。改为在 service 层查询时 `include: { region: true }`，再把 region 字段摊平回 location 对象，前端读 `location.city` 的写法保持不变。摊平逻辑在 `location.service.ts` 的 `flattenRegion` 与 `photo.service.ts` 的 `transformPhoto`。

  **收益已落地**：首页城市数改为 `locationService.countDistinctRegions()`，在 `regions` 上做 SQL 聚合，不再把全部位置记录拉到 Node 里 `new Set`。

  **顺带修掉 1.1** —— `transformPhoto` 里 `transformed.locations` 的拼写错误（关系名是单数 `location`），那个分支从来没执行过，`location.rawData` 一直全量下发。改对之后 rawData 才真正被剔除。

  本地库已迁移并验证：13 行 regions、零外键孤儿、外键与 RESTRICT 约束均生效、首页与足迹页正常渲染出城市与区县名。**生产库尚未迁移。**

### 5.9 GPS 字段在 `photo_exifs` 与 `locations` 重复

- **成因**：两张表有 7 个同名字段 —— `latitude`、`longitude`、`altitude`、`GPSLatitude`、`GPSLongitude`、`bearingDirection`、`rawData`。还有一对同物异名：exif 里叫 `gpsImgDirection`，location 里叫 `bearing`。
- **影响**：`updatePhotoLocation` 必须同时写两张表，`deletePhotoLocation` 要两边一起清，且都没有事务包裹 —— 任一步失败就永久不一致，没有任何约束能发现。
- **处理**：按"exif 存从文件读出的原始值、locations 存解析与逆地理编码后的结果"划分：

| 字段 | 现在 | 应该在 | 原因 |
|---|---|---|---|
| `latitude` `longitude` `altitude` | 两张表 | `locations` | 十进制坐标是解析结果 |
| `GPSLatitude` `GPSLongitude` | 两张表 | `photo_exifs` | 度分秒数组是原始格式 |
| `bearingDirection` | 两张表 | 都删（见 5.11） | 中文方位词，可由 `bearing` 算出 |
| `gpsImgDirection` / `bearing` | 各一张表 | `locations` 留 `bearing` | 同一个值两个名字 |

  5.8 已先行完成（只动了区划字段），本条的 GPS 字段去重仍待做。

### 5.10 两处 schema 层面的小 bug

**`Photo.updatedAt` 不会自动更新。**

```prisma
model Photo {
  updatedAt  DateTime  @default(now())             // 缺 @updatedAt
}
model PhotoAiAnalysis {
  updatedAt  DateTime  @default(now()) @updatedAt   // 有
}
```

  后果是它永远等于 `createdAt`，改置顶、重建缩略图、改位置都不会更新。补 `@updatedAt` 即可。

**`takenAt` 可空，但它是唯一的排序字段。** 所有列表查询都 `orderBy: { takenAt: 'desc' }`，而 PG 在 DESC 排序时 NULL 排最前 —— 没有拍摄时间的照片会跑到列表最顶端。实际上 scanner 里有兜底（取不到 EXIF 时间就用 `stats.birthtime`），永远不会为 null，字段应改为非空让约束反映真实情况。

### 5.11 三处存了展示格式而非数据

**`exposureTime String?`** 存的是 `"1/125"`，转换逻辑在 `scanner.service.ts`：

```ts
exposureTimeStr = `1/${Math.round(1 / exifData.ExposureTime)}`;
```

  等于把前端的格式化固化进数据库。代价是无法做范围查询 —— "找快门慢于 1/30 的照片"没法写，字符串比较对 `"1/125"` 和 `"1/30"` 无意义。应存 `Float`（秒），展示交给 `lib/format.ts`（那里已有 `formatExposureTime`）。

**枚举字段全存自由字符串。** `flash`、`whiteBalance`、`meteringMode`、`exposureProgram`、`colorSpace` 都是 `String(exifData.X ?? '')` 直接转的，`flash` 在对象时还走 `JSON.stringify`。这些本质是有限取值，存自由字符串意味着同一含义有多种写法，`GROUP BY flash` 统计"用了多少次闪光灯"结果不可靠。

**`dominantColor String?`** 存 `"rgb(120,130,140)"`，无法做颜色查询。若要实现"找暖色调的照片"，需要数值形态（三个 Int，或 HSL / Lab 分量）才能算距离。

**`bearingDirection`** 同属此类：存的是"东南"这种中文转译，且两张表各存一份。删掉、由 `bearing` 现算。

### 5.12 命名规范不统一

**列名驼峰与 snake_case 混用。** 只有 `photo_ai_analyses` 做了字段映射（`photo_id`、`tag_embedding`、`created_at`、`updated_at`），其余所有表的列名在库里就是驼峰：`photoId`、`formattedAddress`、`thumbSmallKey`…

  现在能正常工作是因为原生 SQL 只碰了映射过的那张表：

```sql
JOIN "photo_ai_analyses" pa ON p.id = pa.photo_id   -- 能直接写
```

  但 PG 对未加引号的标识符会折叠成小写，将来在原生 SQL 里查 exif 必须写 `"photoId"`。5.2 的索引和 5.3 的 PostGIS 查询都是原生 SQL，会踩到。建议所有字段统一加 `@map` 转 snake_case。

**关系字段名 `PhotoExif.photos` 是复数**，但它指向单个 `Photo`。`Location.photo` 与 `PhotoAiAnalysis.photo` 都是单数，统一改成 `photo`。

### 5.13 `photo_exifs` 与 `locations` 没有时间戳

两张表都没有 `createdAt` / `updatedAt`。位置可以被手动修改（`updatePhotoLocation`），却没有任何审计痕迹 —— 无法判断某张照片的坐标是扫描时写入的还是后来手动改的。

### 5.14 缺少约束

一条 CHECK 约束都没有。两个值得加的：

- `locations.latitude` / `longitude` 没有范围检查。一次错误的逆地理编码或手动输入就能写进 `latitude = 999`
- `photos.originalKey` / `thumbSmallKey` / `thumbLargeKey` 是非空 String 但没有 unique。两条记录理论上可指向同一个 MinIO 对象，删一条会让另一条的文件消失

### 5.15 `exifImageWidth` 被前端误用（bug）

- **成因**：`photos.width/height` 与 `photo_exifs.exifImageWidth/Height` 是两个不同的值 —— 前者来自 `metadata.autoOrient.width`（sharp 解码并应用旋转后的实际尺寸），后者是 EXIF 标签原始值（不含旋转）。
- **影响**：前端三处都在用后者展示尺寸（`PhotoLightbox/InfoPanel.tsx`、`photo/ExifInfo.tsx`、`lib/photoMeta.ts`），竖拍照片的详情面板会显示成横向尺寸。
- **处理**：展示改用 `photos.width/height`，`exifImageWidth` 仅作原始记录保留在 exif 表。这条独立于其他数据层改动，可随时修。

### 5.16 视频文件的元信息未记录

`photos.size` 只记录照片大小。有 Live Photo 时视频也上传了（`videoKey`），但它的大小、时长都没有字段承载，管理后台统计存储占用会漏掉这部分。

**关联的可扩展性取舍**：四个固定的 key 列（`originalKey / thumbSmallKey / thumbLargeKey / videoKey`）意味着每增加一种衍生文件就要加一列。更可扩展的是 assets 表：

```
photo_assets (photoId, kind, key, size, width, height, mimeType)
```

但对单用户项目、衍生类型固定为这四种的情况，固定列更简单、少一次 join。**不建议现在改** —— 除非要加 WebP/AVIF 版本或多档缩略图。

### 不建议改动的部分

- **三张一对一表的整体结构是合理的**，别为减少表数量合并回去。

  注意理由**不是**"向量太大会拖慢 `photos` 的顺序扫描" —— 实测 `embedding` 的 `attstorage` 是 `e`（external），pgvector 明确设了外置存储，两个向量共 8200 字节远超 TOAST 阈值，必然被搬到副表（`photo_ai_analyses` 主表 40 kB、TOAST 表 616 kB），主表行里只留 18 字节指针。放进 `photos` 也不会被顺序扫描读到。

  真正的理由是写入模式：AI 分析可重跑（`updateEmbedding` / `analysis` 都会重写），合并后每次重跑都让 `photos` 这张核心表膨胀、需更频繁 VACUUM；HNSW 索引会跟着建在 `photos` 上，该表任何非 HOT update 都要连带更新索引条目，而 HNSW 插入要走图搜索找邻居，比 B-tree 贵；此外"清空全部分析重跑"现在是 `TRUNCATE` 一张小表，合并后要 UPDATE 全部照片行。

  `photo_exifs` 拆开是因为 30+ 字段加 `rawData` 而列表查询不需要；`locations` 是因为有独立查询路径（首页地图打点只取坐标）。

  以上都是规模相关的 —— 当前 67 张照片下两种设计都能正常工作，拆分的价值在于照片增长后更抗压。

- **向量的版本化是过度设计，现在不做。** 若将来要换 embedding 模型或改维度，`photo_embeddings (photoId, model, dim, embedding, ...)` 复合主键的设计能并存多个模型、灰度切换。除非确实要换模型，否则不值得。
- **`tags String[]` 用 PG 数组而非标签表**是正确的取舍。配 GIN 索引（5.2）够用，标签表要多两次 join，换来的管理能力暂时用不上。
---

## 建议顺序

**先做这些，代价小、无连带影响**

1. **1.1** 拼写修正、**1.5** 两条 HNSW 索引、**5.10** 两行 schema 修正、**5.15** 尺寸显示 bug
2. **5.1 baseline migration** —— 后续所有表结构改动的前置。现有 migration 已与 schema 漂移，不先对齐会越滚越难
3. **5.5 `visibility`** —— 关系到私人照片是否对外可见，不依赖其他条目

**表结构改造，一次 migration 做完**

4. **5.8 + 5.9** —— 都要动 `locations`（拆 `regions`、GPS 字段去重），分两次改表不值得
5. **5.12 列名统一** + **5.2 索引** + **5.3 PostGIS 列** + **5.13 时间戳** + **5.14 约束** —— 同样都是改表，跟上一步合并或紧随其后
6. **5.11 展示格式改数值** —— 需要配套改写入端（`scanner.service.ts`）与读取端（`lib/format.ts`），且要迁移历史数据

**其余按需推进**

7. **3.1 类型收敛** —— 做完 `lib/types/` 的定位才清晰（从 schema 派生的类型层），1.7 与 3.2 会顺带变简单。注意它依赖 schema 稳定，宜在上一组之后
8. **1.4 / 1.2 / 1.6** —— 各自独立
9. **0.3 登录流程** —— 需要新增登录页，是个独立小功能
10. **5.6 + 5.7** —— 时区与太阳角度，后者依赖前者
11. **4.10 / 4.12 / 2.10 / 3.3 / 5.4 / 5.16** —— 一致性与清理，无功能影响
12. **ingestion 抽 worker 进程** —— 见 `src/worker/README.md`。触发条件是扫描期间前台响应受影响到不可忍受，或需要任务断线续跑。独立于以上所有条目

## 验证方式

- 结构类改动：`npx tsc --noEmit`，再 `npm run build`
- `.next/types/` 会缓存旧路径。移动文件后若报 `Cannot find module '../../src/app/xxx.js'`，`rm -rf .next` 重建
- 跑过 `next start` 之后直接 `npm run build` 可能报 `Cannot find module '[turbopack]_runtime.js'`，同样清 `.next`
- 安全类改动必须实测，不能只看构建通过：起 production server（`npx next start -p 3999`，避开 dev 占用的 3000），用 curl 覆盖无 cookie / 错 cookie / 正确 cookie 三种场景
- 验证 `server-only` / `client-only` 守卫时注意：只写 import 不实际使用会被 tree-shake 掉，模块从未进入依赖图，构建照样通过。必须引用到符号才触发
