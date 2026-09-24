# 项目优化清单

只列待办，按执行顺序编排 —— 从上往下做即可，不需要另看一份优先级表。
已完成的条目已移除，改造过程可查 git 历史。
编号按段落重排（A/B/C/D/E 对应下面五段），与早期文档中的数字编号无对应关系。

## 阻塞关系

只有一处硬依赖，其余条目互不影响，可任意穿插：

```text
E1 时区  →  E2 太阳角度
```

## 数据层的两个前提

改表或加索引前需要知道：

- **迁移历史已重建为单个 baseline**（`20260924000000_baseline`），由 `migrate diff --from-empty --to-schema` 生成，空库跑一遍再 diff 为空，即能精确重建当前 schema。本地库与生产库的 `_prisma_migrations` 都只有这一条记录，`migrate status` 均为 up to date。
- **`migrate diff` 的输出永远非空**，它总会包含 `DROP TABLE checkpoint_blobs / checkpoint_migrations / checkpoint_writes / checkpoints`。这四张表由 LangGraph 的 `PostgresSaver` 维护、不在 Prisma schema 里。**直接把 diff 输出当 migration 执行会抹掉 Agent 的对话记忆。** 另有一处 `agent_conversations_visitor_id_updated_at_idx` 的排序方向差异，同样忽略即可。

---

# 一｜先做：独立、低风险、影响当前可用性

### A1 SSE 没有心跳，长静默会被反代断开

- **位置**：`src/server/infra/sse.ts`
- **问题**：`createSSE` 只建 `ReadableStream`，没有定时器。而 `agent.service.ts` 把模型正文缓冲到收尾才一次性发出，`loading` 到首个 `streaming` 之间可能长时间零字节。
- **影响**：Nginx 的 `proxy_read_timeout` 默认 60s，指两次收到上游数据的最大间隔。低配机器上一轮对话动辄数十秒，走域名时被判超时，前端落到 `onclose` 报「Agent 响应流意外结束」。直连端口测不出来。
- **现有缓解**：NPM 的 Advanced 里配了 `proxy_read_timeout 600s` 与 `proxy_buffering off`；代码已发 `X-Accel-Buffering: no`。
- **处理**：每 15 秒发一行 SSE 注释 `: ping`，`close()` 时清掉定时器。注释行不触发客户端 `onmessage`，但能让代理看到字节流动，从此不依赖运维配置。Cloudflare 免费版约 100s 的响应超时也只有这个办法能绕。

### A2 两处 schema 层面的小 bug

**`Photo.updatedAt` 不会自动更新** —— 缺 `@updatedAt`（`PhotoAiAnalysis` 有）。后果是它永远等于 `createdAt`，改置顶、重建缩略图、改位置都不会更新。

**`takenAt` 可空，但它是唯一排序字段** —— 所有列表查询都 `orderBy: { takenAt: 'desc' }`，PG 在 DESC 排序时 NULL 排最前，没有拍摄时间的照片会跑到列表最顶端。scanner 里有兜底（取不到 EXIF 时间就用 `stats.birthtime`），实际永不为 null，字段应改为非空让约束反映真实情况。

# 二｜安全：多数与代码无关，拖着风险持续存在

### B1 `admin_auth` cookie 直接存密码明文

- **位置**：`src/middleware.ts`、`src/server/auth.ts`
- **问题**：校验逻辑是 `cookie === process.env.ADMIN_PASSWORD`，cookie 值就是密码本身。`auth.ts` 的注释已标注该缺陷。
- **影响**：cookie 泄露等同密码泄露；无签名、无过期、无法单独吊销。目前也没有登录流程，靠手动在 devtools 里设置 cookie。
- **处理**：改签名 token（`src/server/infra/image-token.ts` 有 HMAC 实现可参考），配套一个登录页。

### B2 `/api/agent/chat` 无鉴权

- **问题**：`/agent` 是公开页面，该接口未纳入 middleware 的 matcher。身份只有 `visitorId`（HTTP-only 随机 cookie），仅用于会话归属隔离，不构成访问控制。
- **影响**：任何人可调用，消耗宿主机 Ollama 的 CPU 或云端模型配额。低配部署下影响被放大 —— 一次对话就能占满 CPU 数十秒。同类接口 `/api/ai/analysis` 已有 `requireAdminResponse`。
- **处理**：决定限流（按 visitor 或 IP）、加验证码，或收进管理端。

---

# 三｜检索质量

### C1 向量检索是全表扫描

- **位置**：`prisma/migrations/**`、`src/server/services/ai/image-analysis/analysis.repository.ts`
- **问题**：migration 只建了 B-tree 唯一索引，两个向量列上没有任何向量索引。
- **影响**：每次检索都要计算全部照片的距离。当前 67 张不明显，上千张后显著变慢。
- **处理**：

```sql
CREATE INDEX ON photo_ai_analyses USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON photo_ai_analyses USING hnsw (tag_embedding vector_cosine_ops);
```

  算子必须与查询一致 —— 代码用 `<=>`（余弦距离），所以是 `vector_cosine_ops`。HNSW 要求列有固定维度，两个库的向量列都已是 `vector(1024)`（本地 35 行、生产 38 行实测全为 1024 维），无前置条件。

### C2 向量化仍带 nomic 的指令前缀

- **位置**：`src/server/services/ai/image-analysis/embedding.service.ts`
- **现状**：向量化已统一由 `analysisEmbeddingService` 承担（document 端 `create()`、query 端 `createQueryVector()`），并有 `EMBEDDING_DIMENSION = 1024` 校验。
- **问题**：两端都加了前缀 ——

```ts
generateEmbeddingVector(`search_document: ${metadata.description}`)
generateEmbeddingVector(`search_query: ${normalizedQuery}`)
```

  这套约定属于 nomic-embed-text，而项目用的是 bge-m3。bge-m3 是 instruction-free 的，检索任务不需要前缀。当前做法相当于在 query 端与 document 端掺入不同噪声，人为拉大两者距离。

- **处理**：去掉两处前缀，全量重跑分析对齐历史向量，并重新校准 `semantic-search.service.ts` 的 `SEMANTIC_SEARCH_MIN_SIMILARITY = 0.55` 与 `SEMANTIC_SEARCH_MAX_SCORE_GAP = 0.08` —— 这两个阈值是在带前缀的分布上调出来的。
- **注意**：改完必须全量重跑分析，否则库里会同时存在带前缀与不带前缀两种分布的向量，检索质量反而更差。

---

# 四｜表结构改造：都要动表，一次 migration 做完

### D1 GPS 字段在 `photo_exifs` 与 `locations` 重复

- **问题**：两张表有 7 个同名字段（`latitude`、`longitude`、`altitude`、`GPSLatitude`、`GPSLongitude`、`bearingDirection`、`rawData`），还有一对同物异名：exif 叫 `gpsImgDirection`，location 叫 `bearing`。
- **影响**：`updatePhotoLocation` 必须同时写两张表，`deletePhotoLocation` 要两边一起清，且都没有事务包裹 —— 任一步失败就永久不一致，没有任何约束能发现。
- **处理**：按「exif 存从文件读出的原始值、locations 存解析与逆地理编码后的结果」划分：

| 字段 | 现在 | 应该在 | 原因 |
|---|---|---|---|
| `latitude` `longitude` `altitude` | 两张表 | `locations` | 十进制坐标是解析结果 |
| `GPSLatitude` `GPSLongitude` | 两张表 | `photo_exifs` | 度分秒数组是原始格式 |
| `bearingDirection` | 两张表 | 都删（见 D7） | 中文方位词，可由 `bearing` 算出 |
| `gpsImgDirection` / `bearing` | 各一张表 | `locations` 留 `bearing` | 同一个值两个名字 |

  `GPSLatitudeRef` / `GPSLongitudeRef` / `gpsTimeStamp` 只在 `photo_exifs`，不属于重复项，留在原处即可 —— 它们是原始格式，`formatLatLng` 拼度分秒时要用。

  区划字段已规范化到 `regions` 表，本条只剩 GPS 部分。

### D2 命名规范不统一

**列名驼峰与 snake_case 混用。** 只有 `photo_ai_analyses` 与三张 `agent_*` 表做了字段 `@map`，`photos`、`photo_exifs`、`locations` 的列名在库里仍是驼峰：`photoId`、`formattedAddress`、`thumbSmallKey`…（`regions` 的字段本身就是单个小写词，不需要映射。）

  PG 对未加引号的标识符会折叠成小写，将来在原生 SQL 里查 exif 必须写 `"photoId"`。D3 的索引与 D4 的 PostGIS 查询都是原生 SQL，会踩到。建议所有字段统一 `@map` 转 snake_case。

**`PhotoExif.photos` 是复数但指向单个 `Photo`**，`Location.photo` 与 `PhotoAiAnalysis.photo` 都是单数，统一改成 `photo`。

### D3 补充索引

```sql
CREATE INDEX ON photos ("takenAt" DESC);               -- 时间过滤最常用
CREATE INDEX ON photo_ai_analyses USING gin (tags);     -- 数组重叠查询
```

区划相关的索引（`regions (province, city, district)`、`locations (adcode)`）已随 `extract_regions` migration 创建，不必重复。

### D4 `locations` 增加 geography 列与 GiST 索引

- **问题**：当前只有两个 Float 列和一个 `(latitude, longitude)` 复合 B-tree 索引，后者对地理范围查询几乎无用，无法加速 `ST_DWithin`。
- **处理**：

```sql
ALTER TABLE locations ADD COLUMN geom geography(Point, 4326);
UPDATE locations SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography;
CREATE INDEX ON locations USING gist (geom);
```

  这是「搜索附近照片」的前提；`getPhotosInBounds` 也应随之改用 `ST_DWithin` 重写，当前的经纬度区间查询只是矩形近似。

### D5 `photo_exifs` 与 `locations` 没有时间戳

两张表都没有 `createdAt` / `updatedAt`。位置可被手动修改（`updatePhotoLocation`）却没有审计痕迹 —— 无法判断某张照片的坐标是扫描时写入的还是后来改的。

### D6 缺少约束

一条 CHECK 约束都没有。两个值得加：

- `locations.latitude` / `longitude` 没有范围检查，一次错误的逆地理编码或手动输入就能写进 `latitude = 999`
- `photos.originalKey` / `thumbSmallKey` / `thumbLargeKey` 是非空 String 但没有 unique，两条记录理论上可指向同一个 MinIO 对象，删一条会让另一条的文件消失

### D7 三处存了展示格式而非数据

**`exposureTime String?`** 存的是 `"1/125"`，转换逻辑在 `scanner.service.ts`：

```ts
exposureTimeStr = `1/${Math.round(1 / exifData.ExposureTime)}`;
```

  等于把前端的格式化固化进数据库，无法做范围查询 —— `exif_search` 工具因此只能筛光圈、ISO、焦距，给不了「快门慢于 1/30」。应存 `Float`（秒），展示交给 `lib/format.ts`（已有 `formatExposureTime`）。

**枚举字段全存自由字符串。** `flash`、`whiteBalance`、`meteringMode`、`exposureProgram`、`exposureMode`、`colorSpace` 都是 `String(exifData.X ?? '')` 直接转的（`scanner.service.ts` 第 354-363 行），`flash` 在对象时还走 `JSON.stringify`。同一含义有多种写法，`GROUP BY flash` 统计不可靠；`exif_search` 的 `flashMode: 'fired' | 'not_fired'` 现在要靠字符串匹配去猜。

**`dominantColor String?`** 存 `"rgb(120,130,140)"`，无法算距离。要实现「找暖色调的照片」需要数值形态（三个 Int，或 HSL / Lab 分量）。当前唯一消费点是 `PhotoCard.tsx` 用它作图片加载前的背景占位色，改成数值后那里需要自行拼回 `rgb()`。

**`bearingDirection`** 同属此类：存「东南」这种中文转译，且两张表各存一份。删掉、由 `bearing` 现算。

改动需配套写入端（`scanner.service.ts`）与读取端（`lib/format.ts`），且要迁移历史数据。

---

# 五｜按需推进：由功能需求或规模触发

### E1 `takenAt` 的时区问题

- **问题**：`takenAt` 存的是 EXIF `DateTimeOriginal`，不带时区、是相机显示的本地时间，但 Prisma 按 UTC 解读存入 `TIMESTAMP(3)`。
- **影响**：「清晨拍摄」「黄金时刻」这类时段查询会错，国内照片偏 8 小时，跨国照片偏移量各不相同。
- **现有缓解**：`date_search` 工具把用户说的日历日按 `Asia/Shanghai` 转成半开时刻区间，国内照片的**日期**筛选是对的；跨时区照片与**时段**查询仍不准。
- **处理**：增加 `timezone`（由经纬度反查，有离线库可用）与 `takenAtLocal`。

### E2 太阳方位角与高度角（依赖 E1）

有经纬度和准确本地时间即可纯数学计算，无需外部 API，可离线批量补全历史数据。配合 `bearing` 能判断顺光、逆光、侧光，也能识别蓝调与黄金时刻。这是摄影复盘类功能的数据基础，对 Agent 的价值是让「逆光」不再只依赖 AI 打的标签。

### E3 视频文件的元信息未记录

`photos.size` 只记录照片大小。有 Live Photo 时视频也上传了（`videoKey`），但大小、时长没有字段承载，后台统计存储占用会漏掉这部分。

**关联取舍**：四个固定 key 列（`originalKey / thumbSmallKey / thumbLargeKey / videoKey`）意味着每加一种衍生文件就加一列。更可扩展的是 `photo_assets (photoId, kind, key, size, width, height, mimeType)`，但对单用户项目、衍生类型固定为四种的情况，固定列更简单、少一次 join。**不建议现在改** —— 除非要加 WebP/AVIF 或多档缩略图。

### E4 管理后台的全量查询无法随数据量增长

- **位置**：`photo.service.ts` 的 `getAllPhotos` / `batchCheckFileExists`，经 `listAllWithFileStatus`、`deleteMissingPhotos` 由 `admin/_actions.ts` 调用
- **问题**：`getAllPhotos()` 一次拉取全部照片和三个关联表的全部字段，含两个大 JSON（`photoExif.rawData`、`location.rawData`）。`batchCheckFileExists` 在其之上用无并发限制的 `Promise.all`，每张照片一次 MinIO HeadObject。
- **影响**：一千张照片就是一千个并发请求打向 MinIO，单次响应体积达数十 MB。
- **处理**：改分页；用 `select` 收窄字段并剔除两个 `rawData`；文件存在性检查加并发上限（如 10）。

### E5 抽出 `useEmblaSync` hook

`components/photo/Carousel/`（首页背景轮播）与 `components/photo/PhotoLightbox/`（照片查看器）各自实现了一遍「主轮播 + 缩略图条 + select 事件同步」，连 EXIF 展示都各有一份（`Carousel/ExifOverlay.tsx` 与 `PhotoLightbox/InfoPanel.tsx`）。用途不同可保留两个组件，但底层联动逻辑应共用。

### E6 ingestion 抽独立 worker 进程

见 `src/worker/README.md`（目录目前只有这份说明）。触发条件是扫描期间前台响应受影响到不可忍受，或需要任务断线续跑。独立于以上所有条目。

---

# 附录 A：不改的决定

记在这里以免被重新提出。

**三张一对一表的结构是合理的，别为减少表数量合并回去。**

理由**不是**「向量太大会拖慢 `photos` 的顺序扫描」—— 实测 `embedding` 的 `attstorage` 是 `e`（external），pgvector 明确设了外置存储，两个向量共 8200 字节远超 TOAST 阈值，必然被搬到副表（`photo_ai_analyses` 主表 40 kB、TOAST 表 616 kB），主表行里只留 18 字节指针，放进 `photos` 也不会被顺序扫描读到。

真正的理由是写入模式：AI 分析可重跑，合并后每次重跑都让 `photos` 这张核心表膨胀、需更频繁 VACUUM；HNSW 索引会建在 `photos` 上，该表任何非 HOT update 都要连带更新索引条目，而 HNSW 插入要走图搜索找邻居，比 B-tree 贵；「清空全部分析重跑」现在是 `TRUNCATE` 一张小表，合并后要 UPDATE 全部照片行。

`photo_exifs` 拆开是因为 30+ 字段加 `rawData` 而列表查询不需要；`locations` 是因为有独立查询路径（首页地图打点只取坐标）。以上都是规模相关的 —— 当前 67 张照片下两种设计都能工作，拆分的价值在于增长后更抗压。

**向量版本化是过度设计。** 若将来要换 embedding 模型或改维度，`photo_embeddings (photoId, model, dim, embedding)` 复合主键能并存多个模型、灰度切换。除非确实要换，否则不值得。注意 `EMBEDDING_*` 那组环境变量现在允许把向量模型指向云端，真要换时维度约束会立刻变成迁移问题。

**`tags String[]` 用 PG 数组而非标签表是正确的取舍。** 配 GIN 索引（D3）够用，标签表要多两次 join，换来的管理能力暂时用不上。

---

# 附录 B：项目结构与约定

```
src/
├── app/
│   ├── layout.tsx              html/body/Providers/字体/统计
│   ├── error.tsx  loading.tsx  在根，覆盖全部路由
│   ├── (site)/                 带导航栏的公开页面
│   │   ├── layout.tsx          Navbar + main + ScrollReset
│   │   ├── page.tsx            首页（自行引入 Footer）+ _components/
│   │   └── photos/  footprint/
│   ├── (admin)/admin/
│   │   ├── layout.tsx          Server Component，鉴权后再渲染
│   │   ├── _actions.ts         管理操作，逐个 requireAdmin()
│   │   └── page.tsx  photos/  scan/  upload/
│   ├── agent/                  全屏三栏，自带 ChatHeader，直接用根 layout
│   │   ├── _components/        消息流、侧栏、输入、照片网格
│   │   └── _hooks/useChat.ts   SSE 消费与消息状态机
│   └── api/
│       ├── agent/{chat,conversations,_lib}
│       ├── admin/{scan,upload}
│       ├── ai/analysis         批量图片分析（SSE，requireAdminResponse）
│       └── image               图片代理 + HMAC token
│
├── components/                 只放跨页面复用的
│   ├── photo/  map/  ui/  layout/  Icons/
│
├── server/                     全部带 import 'server-only'
│   ├── infra/                  db / storage / chat-model / agent / ai-client / logger / sse / image-token / env
│   ├── services/
│   │   ├── photo/              photo / exif / location.service
│   │   ├── ingestion/          scanner / file / geocoding.service + photo-files + utils
│   │   └── ai/
│   │       ├── analysis.service.ts     单张分析入口
│   │       ├── image-analysis/         视觉分析、向量、语义检索、查询规划、批量分析
│   │       └── agent/                  Agent 编排、会话持久化、检索工具
│   ├── auth.ts                 横切的访问控制
│   └── actions.ts              公开读取类 action，供客户端组件调用
│
├── lib/                        universal：两端可安全引用
│   ├── format.ts  mask.ts  photoMeta.ts
│   ├── url.ts                  带 import 'client-only'（访问 window）
│   ├── contracts/              前后端共享 DTO
│   └── types/
│
├── config/site.ts  styles/  middleware.ts
└── worker/                     预留：ingestion 的独立进程入口
```

**组件归属**：只有一个页面用 → `app/xxx/_components/`；多个页面用 → `components/<域>/`；无业务语义 → `components/ui/`。

**`server/` 的分层**：判定规则是「文件里有没有照片、扫描、AI 这类业务概念」—— 有就进 `services/<域>/`，没有就进 `infra/`。`auth.ts` 有业务语义且是安全关注点、`actions.ts` 是入口层，两者留在 `server/` 根。

`infra/chat-model.ts` 是模型接入的唯一出口，按用途分三组配置（`CHAT_*` / `VISION_*` / `EMBEDDING_*`），`*_API_TYPE` 区分 Ollama 原生接口与 OpenAI 兼容端点。`infra/ai-client.ts` 只剩一个 `generateEmbeddingVector()` 包装。

**数据获取**：Server Component 直调 service，不经过 Server Action —— 后者会把函数编译成公开 POST 端点，而两者本就同进程。客户端组件只能走 `server/actions.ts`（公开读取）、`admin/_actions.ts`（管理操作，必须鉴权）或 API Route（需要流式响应时）。

**结构选型依据**：参考 [taxonomy](https://github.com/shadcn-ui/taxonomy)（App Router 参考实现，无功能域层）、[dub](https://github.com/dubinc/dub)（服务端按业务域切而非技术类型）、[documenso](https://github.com/documenso/documenso)（按运行环境物理隔离）、[immich](https://github.com/immich-app/immich)（同领域，重任务放独立进程）。曾设计过 `features/<域>/` 方案，核查后发现页面专属组件并无跨页面复用，属于为不存在的问题建抽象，已放弃。

---

# 附录 C：验证方式

- 结构类改动：`npx tsc --noEmit`，再按需 `npm run build`（默认不跑完整构建，改动小时用定向检查）
- `.next/types/` 会缓存旧路径。移动文件后若报 `Cannot find module '../../src/app/xxx.js'`，`rm -rf .next` 重建
- 跑过 `next start` 后直接 `npm run build` 可能报 `Cannot find module '[turbopack]_runtime.js'`，同样清 `.next`
- 安全类改动必须实测，不能只看构建通过：起 production server（`npx next start -p 3999`，避开 dev 占用的 3000），用 curl 覆盖无 cookie / 错 cookie / 正确 cookie 三种场景
- 验证 `server-only` / `client-only` 守卫时注意：只写 import 不实际使用会被 tree-shake，模块从未进入依赖图，构建照样通过。必须引用到符号才触发
- 数据层改动前用 `npm run db:status:prod` 确认生产迁移记录；结构差异用 `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` 查看，它是只读的
- Agent 相关改动看服务端日志的 `[Agent] 工具决策`、`[Agent] 工具调用完成`、`[Agent] 语义候选收敛`，比看最终回答更容易判断工具选择与参数抽取是否正确
