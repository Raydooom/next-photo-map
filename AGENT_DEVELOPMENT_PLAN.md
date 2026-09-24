# 摄影档案 Agent：产品与开发计划

> 状态：批次 0 至批次 2 已上线；批次 3 至批次 5 规划中。
> 定位：基于个人照片库的**可追溯影像档案助手**，而不是泛聊天机器人。
> 范围：产品能力、数据与服务架构、工具体系、会话与证据模型、分批交付计划。
> 原则：先做单一 Agent 与可验证工具；只读能力先行；写操作必须显式确认；不因“看起来像 Agent”而过早引入多 Agent。

---

## 1. 产品定义

### 1.1 Agent 是什么

项目已有的核心资产不是通用知识，而是个人照片档案：

- `Photo`：文件、拍摄时间、精选状态、缩略图与媒体资源；
- `PhotoExif`：相机、镜头、焦距、快门、光圈、ISO 等拍摄参数；
- `Location` 与 `Region`：坐标、行政区与地图足迹；
- `PhotoAiAnalysis`：图片描述、主题、标签与两个向量索引；
- 扫描、上传、AI 分析与后台管理链路：持续为档案补充数据。

因此，Agent 的正确定位是：

> **帮助用户在自己的影像档案中查找、理解、连接和整理照片；任何关于照片的事实性回答都应能追溯到具体照片、地点、时间、参数或 AI 分析记录。**

它不是“什么都能回答”的聊天窗口，也不是自动执行管理操作的入口。

### 1.2 核心承诺

1. **找得到**：用自然语言检索人物、场景、地点、时间、光线与拍摄参数。
2. **说得清**：回答附带照片引用与检索依据；没有证据时明确说明不知道。
3. **连得起来**：从单张照片延伸到地点、时段、相机使用习惯与相似主题。
4. **整理得动**：在用户确认后，把结果保存为叙事、清单、候选集或后台任务。
5. **不越权**：模型只能请求白名单工具；权限、确认和数据范围由服务端决定。

### 1.3 不做什么

- 不用模型编造照片未记录的拍摄事实、地点、人物关系或时间。
- 不默认开放删除照片、修改位置、重跑 AI 分析等写操作。
- 不把所有问题拆给多个“子 Agent”；工具足够前不引入模型之间的协作。
- 不把原始 EXIF、对象存储 key、向量、私密地点原始数据直接发送给浏览器或模型。
- 不将“通用聊天能力”置于档案检索与证据之上。

---

## 2. 用户价值与能力地图

### 2.1 五类能力，而非五个 Agent

下面是用户感知到的能力域。运行时由一个 `AgentService` 编排 LangGraph Agent，能力域通过工具集合与提示词约束实现。

| 能力域 | 用户获得的价值 | 示例问题 | 首要数据依据 | 状态 |
| --- | --- | --- | --- | --- |
| 找到（Find） | 从大量照片中找出候选 | “故宫附近拍过什么”“找雪山照片” | 向量、标签、地点、时间、EXIF | 已上线 |
| 读懂（Read） | 理解单张或一组照片的事实与画面 | “第二张什么时候拍的”“这组用了什么镜头” | Photo、EXIF、Location、AI 分析 | 部分：照片详情由前端查看器承担，Agent 侧无单图工具 |
| 连接（Connect） | 发现地点、时间、主题、参数之间的关系 | “我去年秋天都去了哪里”“哪些照片是逆光” | 时间、Region、EXIF、标签 | 未开始（批次 3） |
| 策展（Curate） | 形成可保存、可复看的叙事和候选集 | “挑 12 张做杭州秋天相册” | 检索结果、偏好、用户确认 | 未开始（批次 4） |
| 维护（Steward） | 补齐或修复档案信息 | “重新分析这张”“哪些照片没有地点” | 后台任务、扫描与 AI 分析 | 未开始（批次 5，仅管理员） |

### 2.2 典型用户旅程

#### A. 查找：从模糊记忆到具体照片（已上线）

```text
“哪些照片是在北京拍的”
  → 模型选择 location_search，填入 province / city
  → 服务端查询照片并生成画面概述
  → SSE 下发照片网格与一句概述
```

当前回答形态是「一句画面概述 + 照片网格」。地点时间线、照片数量口径说明属于批次 3 的聚合能力。

#### B. 读图：从单张照片到拍摄上下文（部分）

用户点击照片网格中的任意一张，由 `PhotoPreview` 展示拍摄时间、地点、EXIF 与 AI 描述。Agent 侧尚无单图工具，因此「第二张是什么时候拍的」这类会话内指代还不能回答。

引用语义属于 Agent 上下文；领域服务只接收明确 `photoId`，不应知道 UI 中的相对序号。

#### C. 复盘：从一组照片到摄影习惯（批次 3）

```text
“我最常在什么时间拍夜景？”
  → 查询夜景候选照片
  → 汇总拍摄时间、地点、曝光参数
  → 输出带样本数、时间分布与代表照片的结论
```

此类结论必须标明样本范围与数据缺失情况，不能将少量已分析照片当作整个档案的统计事实。

#### D. 策展：从检索结果到可保存成果（批次 4）

```text
“从这批照片里选 12 张做杭州秋天相册”
  → 在已有候选集上筛选、去重并说明选择标准
  → 生成“候选相册”草稿
  → 用户确认后保存为 collection / album
```

Agent 先生成建议，持久化和任何写操作必须经过明确确认。

---

## 3. 体验原则

`/agent` 采用单栏、记录式的消息流，而不是普通 IM 的左右气泡。这和产品定位一致：它应更像一份可查阅的档案研究记录。

### 3.1 回答必须有证据

事实性回答至少满足其一：

- 引用具体照片；
- 引用时间、地点、EXIF 或 AI 分析字段；
- 声明是基于哪些检索结果的归纳；
- 明确告知数据缺失、置信度不足或未找到结果。

当前实现采取的做法是**服务端接管正文**：命中照片时输出由 `getPhotoResultSummary()` 依据工具返回的 `theme` 生成的画面概述，照片网格承担引用；未命中时输出固定文案并给出可调整的方向。模型正文只在本轮没有调用任何照片工具时才回放，且会先剔除指向界面操作的引导语。

这样做的原因是模型不稳定：它会复述照片数量、编号、拍摄参数，或让用户「点击查看详细信息」，而界面上并没有对应的东西。把事实性叙述收回服务端，比反复调提示词更可靠。

示例（批次 3 的目标形态）：

```text
你在 2025 年秋天有 38 张带地点记录的照片，主要集中在杭州与黄山。
其中杭州 24 张，拍摄时间集中在 10 月 18 日至 20 日。
[查看 24 张杭州照片]
```

不应输出：

```text
你去年秋天一定过得很惬意，应该去过很多地方。
```

### 3.2 过程可解释，但不暴露思维链

前端应看到简短、可验证的过程状态，而不是模型内部推理。当前等待态是一个统一的「正在检索照片档案」指示（竖条波形 + 文案高光 + 不定进度游标），阶段化的过程记录属于后续批次。

服务端已有结构化日志可供排查：`[Agent] 工具决策：调用工具`、`[Agent] 工具调用完成`、`[Agent] 自动查询规划`、`[Agent] 语义候选收敛`。这些不下发到前端。

需要展示的是**执行事实**：调用了什么工具、返回多少结果、依据哪些照片；不展示 prompt、模型思维链、SQL 或原始工具参数。

### 3.3 渐进式信息密度

一个回答由三层组成：

1. **结论**：一句到三句，直接回答问题；
2. **证据**：照片卡片、数量、时间、地点、参数或统计；
3. **继续探索**：例如“按城市展开”“查看夜景样本”“生成候选相册”。

当前实现了前两层。第三层依赖聚合与策展能力。

### 3.4 Agent 不确定时应如何回答

- 未找到：说明未在当前已索引照片中找到，并给出可放宽的方向（时间、地点、画面描述）；
- 数据不完整：区分“无 EXIF”“无地点”“未进行 AI 分析”；
- 结果歧义：提供两三个澄清选项，而非机械返回固定兜底；
- 工具失败：说明当前无法检索并给出可重试的下一步。

其中「未找到」已实现为固定文案 `NO_PHOTO_RESULT_REPLY`；数据完整性说明与澄清选项尚未实现。

---

## 4. 当前实现

### 4.1 调用链

```text
src/app/agent/_hooks/useChat.ts                       # fetchEventSource，单条消息原地更新
  → POST /api/agent/chat
    → resolveAgentVisitor()                           # HTTP-only cookie 提供 visitorId
    → conversationService.startTurn()                 # 落库 user 消息，必要时建会话
    → agentService.stream()                           # LangGraph createAgent，streamMode: 'messages'
      → 五个照片检索工具                                # date / location / ai_metadata / semantic / exif
      → photoService.getPhotosByIds()                 # 补全照片并生成签名 URL
    → conversationService.appendAssistantMessage()    # 落库 assistant 消息与照片引用
    → SSE: loading → photo-results → streaming → done
```

会话历史另有两个只读接口：`GET /api/agent/conversations` 列表、`GET|DELETE /api/agent/conversations/[conversationId]` 详情与删除。

### 4.2 已落地的模块

| 模块 | 位置 | 职责 |
| --- | --- | --- |
| HTTP / SSE 适配 | `src/app/api/agent/chat/route.ts` | 校验输入、建立 SSE、补全照片、落库、编码事件 |
| 访客身份 | `src/app/api/agent/_lib/visitor.ts` | 随机 cookie 提供 `visitorId`，会话按此隔离 |
| Agent 编排 | `src/server/services/ai/agent/agent.service.ts` | 系统提示词、工具集、流事件、正文接管 |
| 检索工具 | `src/server/services/ai/agent/tools/search-photo.tool.ts` | 五个只读工具及入参 schema |
| 会话持久化 | `src/server/services/ai/agent/conversation.service.ts` | 会话、消息、照片引用的唯一入口 |
| 共享契约 | `src/lib/contracts/agent-conversation.ts` | 会话与消息 DTO，前后端共用 |
| 语义检索 | `src/server/services/ai/image-analysis/semantic-search.service.ts` | 查询规划、向量召回、相似度收敛 |
| 模型接入 | `src/server/infra/chat-model.ts` | 按用途分组的模型配置与客户端缓存 |
| Agent 工厂 | `src/server/infra/agent.ts` | LangGraph Agent 与 PostgresSaver checkpoint |

### 4.3 模型配置

模型按**用途**配置，不按平台配置。三组环境变量，每组四项：

| 组 | 用途 | 说明 |
| --- | --- | --- |
| `CHAT_*` | Agent 对话与语义查询规划 | 模型必须支持 function calling |
| `VISION_*` | 入库时的图片分析 | 与对话独立，可落在不同平台 |
| `EMBEDDING_*` | 向量嵌入 | 输出维度须为 1024，与 `vector(1024)` 对应 |

`*_API_TYPE` 取 `ollama`（本地原生接口）或 `openai`（兼容端点，覆盖百炼、魔搭等），只区分调用协议。接入新平台只改环境变量，不改代码。

### 4.4 会话与引用模型

三张表已落地：

| 模型 | 用途 |
| --- | --- |
| `AgentConversation` | 标题、`visitorId`、创建与最后活动时间 |
| `AgentMessage` | 角色、`kind`（TEXT / PHOTO_RESULTS）、`status`（COMPLETED / INTERRUPTED / ERROR）、正文、`photoTotal`、会话内 `sequence` |
| `AgentMessagePhoto` | 一条消息引用的照片及其顺序，按 `(messageId, position)` 唯一 |

落库只存 `photoId` 与顺序，签名 URL 在读取时重新生成。完整 prompt、思维链、原始工具结果、向量都不持久化。

LangGraph 的对话上下文由 `PostgresSaver` 独立维护，`thread_id` 为 `conversation:${conversationId}`。它服务于模型记忆，不作为界面历史的数据源——界面历史一律来自上面三张表。

### 4.5 已实施的稳定性与性能约束

| 约束 | 位置 | 目的 |
| --- | --- | --- |
| 命中照片后丢弃后续检索结果 | `agent.service.ts` | 模型会拿返回的 `theme` 另编查询二次检索，各次结果并集后会混入未经原条件筛选的照片 |
| 工具只回 `id` / `theme` / `tags` | `search-photo.tool.ts` | 12 张照片的 `description` 约 3K token，是工具回填那一轮耗时的主体 |
| `think: false`（仅 Ollama） | `chat-model.ts` | qwen3 默认先产出大段思考，本 Agent 只需一次工具决策 |
| 缓冲模型正文至收尾 | `agent.service.ts` | 避免工具调用前的规划 JSON 抢先流向界面 |
| checkpoint 建表懒初始化 | `agent.ts` | 模块顶层连库会让 `next build` 的 collect page data 阶段失败 |
| 语义结果相对收敛 | `semantic-search.service.ts` | 绝对下限 0.55，再只保留与最佳结果差距 0.08 以内的，上限 6 条 |

### 4.6 实测性能与瓶颈

NUC 第 6 代、8G 内存、纯 CPU、`qwen3:4b-q4_K_M` 的实测数据：

```text
生成速度        5.23 tokens/s
LangSmith 单轮  42.45s = 首轮 8.00s + 工具 0.07s + 工具回填轮 33.83s
两轮输入量      1.762K token → 4.865K token
```

结论是瓶颈在工具回填那一轮的输入量，而非系统提示词，也不在数据库或工具本身（工具只花了 0.07s）。已据此精简工具返回。若仍不达预期，按收益排序的后续手段是：换更小的对话模型、把 `CHAT_*` 指向云端、压缩系统提示词。

### 4.7 主要缺口

1. 没有单图详情与 EXIF 问答工具，「第二张是什么时候拍的」这类会话内指代无法回答。
2. 没有服务端聚合能力，统计类问题（时间分布、城市分布、设备习惯）无法给出带样本范围的结论。
3. 照片引用未参与模型上下文，跨轮指代（“这组”“上一批”）不可靠。
4. 上下文完全交给 LangGraph checkpoint，没有有限历史与会话摘要策略，长会话成本会持续增长。
5. 复合条件查询退化为单条件：多次工具结果做并集而非交集，因此只保留第一组。
6. 没有身份体系，只有 `visitorId` 隔离；无登录、无角色、无字段级可见性策略。
7. 没有 artifact / 候选集，也没有任何写工具与确认流程。
8. 数据覆盖率（有时间、有地点、有 EXIF、有 AI 分析、有向量的照片比例）尚未成为可观测指标。
9. 没有离线评测集，提示词与模型变更缺少回归依据。
10. 流式是「缓冲后一次性下发」，不是 token 级流。

---

## 5. 目标架构

### 5.1 单 Agent、多个工具

服务端只有一个编排器 `AgentService`，基于 LangChain 的 `createAgent` 构建 LangGraph Agent。

```text
app/api
  → AgentService
    → tools（LangChain tool + zod schema）
      → photo / location / exif / semantic-search / analysis services
        → infra
```

模型负责决定“需要哪种已允许的能力”；服务端负责决定“这个能力能否执行、以何种权限和参数执行”。

工具白名单由 `createAgent({ tools })` 的入参与 `PHOTO_SEARCH_TOOL_NAMES` 共同界定：前者决定模型能看到什么，后者决定哪些工具的结果会被识别为照片结果。

不要建立：

```text
SearchAgent → CuratorAgent → MapAgent → AnalysisAgent
```

除非未来某个工作流真的需要独立的长任务、不同权限、不同模型或不同队列。即使如此，优先拆为确定性的后台工作流，而不是让多个模型互相对话。

### 5.2 当前目录

```text
src/
├── app/
│   ├── agent/
│   │   ├── page.tsx                                # 全屏三栏布局，走根 layout
│   │   ├── _components/                            # 消息流、侧栏、输入、照片网格
│   │   └── _hooks/useChat.ts                       # SSE 消费与消息状态机
│   └── api/
│       └── agent/
│           ├── chat/route.ts                       # HTTP / SSE 适配层
│           ├── conversations/                      # 会话列表、详情、删除
│           └── _lib/visitor.ts                     # 访客 cookie
│
├── lib/
│   └── contracts/
│       └── agent-conversation.ts                   # 前后端共享、可序列化 DTO
│
└── server/
    ├── infra/
    │   ├── agent.ts                                # LangGraph Agent 与 checkpointer
    │   ├── chat-model.ts                           # 按用途分组的模型接入
    │   └── sse.ts                                  # SSE 编码
    └── services/
        ├── photo/                                  # photo / location / exif / region
        └── ai/
            ├── image-analysis/                     # 视觉分析、向量、语义检索、查询规划
            └── agent/
                ├── agent.service.ts                # 编排、提示词、流事件、正文接管
                ├── conversation.service.ts         # 会话与消息持久化
                └── tools/
                    └── search-photo.tool.ts        # 五个只读检索工具
```

后续批次预计新增：`archive-insight.service.ts`（聚合）、`collection.service.ts`（候选集）、`evaluation.service.ts`（评测），以及独立的 `agent.prompt.ts`（当前提示词内联在 `agent.service.ts`）。

### 5.3 严格依赖边界

- `src/app/agent` 只处理浏览器状态和渲染；不得 import Prisma、存储客户端、服务端 service 或工具。
- `route.ts` 只校验 HTTP 输入、建立 SSE、传入访客身份与取消信号、编码 Agent 事件；不得拥有 prompt、业务分支或工具实现。
- `AgentService` 不认识 `NextRequest`、`NextResponse`、SSE、React `Message` 或 Prisma。
- `tools/*` 只做工具描述、schema 校验、结果投影与 service 调用；不得写 SSE 或复制领域查询。
- `photoService`、`locationService`、`photoExifService`、分析服务不得反向依赖 Agent、Route 或前端。
- `src/server/infra/chat-model.ts` 只做模型接入；不得 import 照片、地点或 Agent。

---

## 6. 工具体系

### 6.1 工具的统一约束

工具用 LangChain 的 `tool()` 定义，入参由 zod schema 校验，`.describe()` 承担模型可见的参数说明。

工具必须：

- 输入可由 schema 校验，非法入参直接被拒；
- 只访问明确声明的数据范围；
- 返回最小、可引用、可序列化的结果；
- 记录工具名、查询条件、结果数量等可观测信息；
- 经领域服务读取数据，由服务层负责脱敏与签名 URL。

工具不得：

- 根据模型文本自行扩大权限；
- 直接执行散落的 Prisma 查询；
- 返回完整原始 EXIF、对象存储 key、向量或私密原始地点数据；
- 工具之间互相调用形成隐藏工作流；
- 把模型内部推理或 SQL 暴露为前端过程信息。

### 6.2 工具路线图

| 工具 | 能力域 | 下层依赖 | 权限 | 状态 |
| --- | --- | --- | --- | --- |
| `date_search` | 找到 | `photoService.listPhotos()` | 只读 | 已上线 |
| `location_search` | 找到 | `photoService.listPhotos()` | 只读 | 已上线 |
| `ai_metadata_search` | 找到 | `photoService` + 语义兜底 | 只读 | 已上线 |
| `semantic_photo_search` | 找到 | `semanticPhotoSearchService` | 只读 | 已上线 |
| `exif_search` | 找到 | `photoService.listPhotos()` | 只读 | 已上线 |
| `get_photo_detail` | 读懂 | `photoService.getPhotoById()` | 只读 | 批次 3 |
| `get_photo_exif` | 读懂 | `photoExifService` | 只读 | 批次 3 |
| `summarize_photo_set` | 连接 | `archiveInsightService` | 只读 | 批次 3 |
| `compare_photo_sets` | 连接 | `archiveInsightService` | 只读 | 批次 4 |
| `draft_collection` | 策展 | `collectionService` | 草稿写入 | 批次 4 |
| `save_collection` | 策展 | `collectionService` | 确认后写入 | 批次 4 |
| `find_metadata_gaps` | 维护 | 管理 service | 管理员 | 批次 5 |
| `request_photo_analysis` | 维护 | 分析服务 + 后台任务 | 管理员 | 批次 5 |

### 6.3 已上线的五个检索工具

工具按**检索维度**划分，而不是按「一个通用搜索工具 + 多种过滤参数」。这样模型的选择更明确，每个工具的入参也能各自约束。

#### `date_search`

入参 `startDate` / `endDate`（`YYYY-MM-DD`）与 `limit`。用户说的是日历日，数据库按 `Asia/Shanghai` 的半开时刻区间筛选；结束日会加一天取次日零点。提示词中给出当前日期，相对时间由模型换算。

#### `location_search`

入参为 `province` / `city` / `district` / `township` / `keyword` 与 `limit`，至少提供一项。行政区分级填写，景区、地标、详细地址片段走 `keyword`。

#### `ai_metadata_search`

按 AI 标签、主题、描述关键词检索，支持 `tagsAny` / `tagsAll` / `tagsExclude`。纯标签条件命中 0 条且没有 `tagsExclude` 时，自动把条件拼成文本转语义向量兜底——排除是硬条件，向量检索保不住它，因此有 `tagsExclude` 时不兜底。

#### `semantic_photo_search`

处理无法落为明确标签的自然语言描述：主体关系、动作、空间层次、氛围、抽象风格。查询先经 `photoQueryPlannerService` 改写为 `semanticQuery` 与不超过 6 个关联词，三者拼成不超过 600 字符的文本再算向量。

筛选是两道：绝对下限 `SEMANTIC_SEARCH_MIN_SIMILARITY = 0.55`，再保留与最佳结果差距在 `SEMANTIC_SEARCH_MAX_SCORE_GAP = 0.08` 以内的候选，上限 `SEMANTIC_SEARCH_MAX_RESULTS = 6`。相似度由描述向量与标签向量加权得出。

#### `exif_search`

按相机、镜头、光圈、ISO、焦距区间、闪光灯状态检索。提示词中说明「大光圈对应较小的 f-number」，模型需把「大光圈」落成 `fNumberMax`。

#### 返回结构

五个工具统一返回 `{ query, total, photos }`，其中 `photos` 每项只有 `id`、`theme`、`tags`。`theme` 供服务端生成画面概述；`description`、`filename`、`takenAt`、`location`、EXIF 都不回给模型。

---

## 7. 数据、引用与会话模型

### 7.1 引用是 Agent 的基础对象

持久化层已以 `AgentMessagePhoto` 记录「哪条消息引用了哪些照片、顺序如何」。尚未实现的是把引用喂回模型上下文，因此跨轮指代还不可用。批次 3 引入的引用 DTO 建议为：

```ts
export type PhotoReference = {
  photoId: number;
  label: string;
  position?: number;
  reason: 'search-result' | 'evidence' | 'representative' | 'comparison';
};
```

`position` 仅用于当前消息内的“第 1 张 / 第 2 张”引用；跨消息和持久化只以 `photoId` 为准。

### 7.2 会话持久化

已落地 `AgentConversation`、`AgentMessage`、`AgentMessagePhoto`，见 4.4。批次 4 需要新增 `AgentArtifact` 承载候选相册、地点时间线、对比报告等可继续操作的成果。

不要持久化：完整模型 prompt、思维链、原始工具结果、签名 URL、完整 EXIF 或 embedding。

会话标题取首条用户输入的前 30 字，列表预览取最后一条消息的前 72 字。会话按 `visitorId` 过滤，所有读写都带该条件。

### 7.3 上下文窗口策略

当前上下文完全由 LangGraph checkpoint 累积，没有裁剪。这是已知缺口：长会话的输入量会持续增长，而在 CPU 推理下输入量直接等于等待时间。

建议的组成优先级：

1. 当前用户问题；
2. 当前消息正在引用的照片；
3. 最近有限轮的用户问题与最终回答摘要；
4. 会话级简短摘要；
5. 必要时按需读取的档案事实。

---

## 8. 流式事件与前端映射

### 8.1 两层事件

服务端内部事件由 `agent.service.ts` 定义，只有两种：

```ts
export type AgentStreamEvent =
  | { type: 'text'; delta: string }
  | {
      type: 'photo-results';
      toolCallId: string;
      toolName: string;
      query: Record<string, unknown>;
      total: number;
      photoIds: number[];
    };
```

对外的 SSE 事件由 `route.ts` 编码，形状为 `SSEMessage`，用 `status` 判别：

| status | 载荷 | 前端行为 |
| --- | --- | --- |
| `loading` | `conversationId`、`userMessage` | 用持久化版本替换乐观插入的用户消息，插入 assistant 占位并展示等待态 |
| `photo-results` | `photoResult`（含 `photos` 与 `total`） | 照片进内存但先不显示，等文字到达后一起揭示 |
| `streaming` | `message`（文本增量） | 追加正文，状态转为 `streaming` |
| `done` | `assistantMessage` | 用持久化消息整体替换该条，揭示照片并播放一次出现动画 |
| `error` | `message`，可能带 `assistantMessage` | 结束等待态，展示可理解的错误 |

`photo-results` 先到、文字后到是常态，因此前端以 `status === 'loading'` 优先渲染等待态，避免照片先闪出来。

### 8.2 前端消息状态机

`useChat.ts` 中同一条 assistant 消息全程原地更新，本地 id 在 `done` 时被服务端 id 替换：

```text
乐观插入 user 消息
  → loading：reconcile user，插入 assistant（status: 'loading'）
  → photo-results：填入 data，photoResultsVisible: false
  → streaming：status: 'streaming'，追加 content
  → done：reconcile assistant，揭示照片（animatePhotoResults: true）
```

异常路径（`error` 事件、`onclose` 未收到终态、`catch`）都会先揭示已有照片，再把消息收束为 `done`，保证不会永久停在 `loading`。切换会话时，`activeConversationRef` 与请求所属会话不一致的事件一律丢弃。

### 8.3 待补齐的协议能力

- 阶段化 `status` 事件（planning / searching / reading / summarizing）与工具级 `tool-call` / `tool-result` 记录；
- `artifact` 事件；
- 结构化 `error.code` 与 `retryable`，当前错误只有文案；
- token 级流式（服务端目前缓冲到收尾一次性下发）。

展示工具调用事实，不展示模型思维链、完整 prompt、SQL 或敏感参数。

---

## 9. 安全、数据质量与可观测性

### 9.1 权限与确认

当前身份只有 `visitorId`（HTTP-only 随机 cookie），会话按此隔离，没有登录与角色体系。所有已注册工具均为只读。

引入写工具前必须先补齐：身份来源、角色、可访问照片范围、明确的用户确认、可审计记录、可取消或可回滚策略。若照片档案不是公开内容，聊天入口必须与照片页使用一致的访问控制。

### 9.2 数据质量是能力上限

Agent 的质量受档案覆盖率约束。需要在管理端持续观测：

- 有拍摄时间的照片比例；
- 有地点、Region、EXIF、AI 分析、embedding 的照片比例；
- 失败或过期的 AI 分析数量；
- 无法定位到 Region 的坐标记录；
- 重复、疑似重复或无可用缩略图的照片。

其中「有向量」尤其关键：`photo_ai_analyses.embedding` 为空的照片对语义检索等于不存在。

### 9.3 运行限制

已有：单工具最多返回 20 张（默认 12），语义检索上限 6 条；浏览器 `AbortSignal` 经 `request.signal` 传入 Agent 执行链，中断时不再落库已发送内容以外的数据；命中照片后不再接受后续工具结果。

待补：每回合最大工具调用次数与总耗时上限；模型调用、向量检索、图片分析的独立超时；与扫描/导入任务的并发治理；工具耗时、错误码、取消率的指标化。

反向代理层需要放宽读超时（Nginx 的 `proxy_read_timeout` 默认 60s），否则模型静默期会被判为超时断连。更稳妥的做法是在 SSE 中加入周期性心跳，不依赖运维配置。

### 9.4 离线评测集

批次 5 前应逐步积累“问题 → 应有证据 → 预期工具 → 可接受答案”的评测样本，例如：

```text
问题：去年秋天我在哪些城市拍过？
依据：2025-09-01 至 2025-11-30、有地点的照片
预期工具：location_search / date_search
可接受答案：列城市、照片数、时间范围与至少一张代表照片
不可接受答案：无依据地推测城市、遗漏数据覆盖率说明
```

评测集用于提示词、工具、模型或排序策略变更后的回归。当前可直接复用的观测点是日志里的 `toolName` 与 `arguments`，比看最终答案更容易判断工具选择与参数抽取是否正确。

---

## 10. 分批开发计划

每一批都应能够独立上线、观察和回滚。批次按用户可获得的完整价值划分。

### 批次 0：基础盘点与验收基线 —— 已完成

访问策略确定为访客 cookie 隔离；现有行为与失败方式已在改造中逐步固化为固定文案与状态机。数据覆盖率报表尚未建立，顺延到批次 5 的观测工作中。

### 批次 1：可上线的“找与读” Agent —— 已完成

**用户能做什么**：按时间、地点、AI 标签、画面语义、拍摄参数五个维度找到照片；看到统一的检索等待态；无结果时得到带调整建议的说明。

**已交付**：五个只读检索工具；`AgentService` 基于 LangGraph 编排；`route.ts` 收敛为 SSE 适配层；语义检索独立为 `semantic-search.service.ts`，含查询规划与相似度收敛；`request.signal` 贯穿执行链；服务端接管正文以保证事实性表述。

**未达成的原定目标**：单图详情与 EXIF 问答工具未实现（照片详情由前端查看器承担）。

### 批次 2：会话与历史 —— 已完成

**用户能做什么**：侧栏查看真实历史会话，切换、删除；刷新后恢复消息与照片；移动端通过抽屉访问历史。

**已交付**：三张表与 `conversation.service.ts`；`src/lib/contracts/agent-conversation.ts` 共享 DTO；会话列表与详情接口；LangGraph checkpoint 独立承担模型记忆。

**未达成的原定目标**：照片引用未回流到模型上下文，「第 N 张」「这组」仍不可解析；没有有限历史与会话摘要策略；统计类回答缺席。这些顺延到批次 3。

### 批次 3：引用、聚合与“连接”能力

**目标**：从单次检索升级为能理解会话内指代、并给出可验证统计的档案对话。

**用户能做什么**：

- “第二张是什么时候拍的”“这组用了什么镜头”；
- “我去年秋天都去了哪里”“我常在哪些城市拍夜景”；
- 对统计类回答看到样本数与筛选范围。

**后端工作**：

- 实现 `get_photo_detail`、`get_photo_exif`；
- 新增 `archive-insight.service.ts`，把分组、计数、时间范围、参数分布固定在服务端；
- 实现 `summarize_photo_set`；
- 把 `AgentMessagePhoto` 的引用回流到模型上下文，支持 `position` 解析；
- 引入有限历史与会话摘要，替代 checkpoint 全量累积。

**完成标准**：会话内指代可稳定解析；统计结论均含样本与范围说明；长会话的输入量不随轮数线性增长。

### 批次 4：策展产物与主动探索

**目标**：把对话结果转化为用户可保存、可复用的档案成果。

**后端工作**：设计 `AgentArtifact` 与 collection 数据模型；新增 `collection.service.ts` 区分草稿与确认写入；实现 `compare_photo_sets`、`draft_collection`、`save_collection`；引入确认令牌防止模型自动保存；为候选集建立可解释的选择规则。

**前置条件**：写操作需要先有身份与权限体系，见 9.1。

**完成标准**：Agent 只能创建草稿；每个候选集说明筛选依据；artifact 可在会话外再次打开。

### 批次 5：档案维护、评测与规模化

**目标**：让 Agent 成为后台管理的辅助入口，并在档案增长、模型变化后保持可验证质量。

**后端工作**：

- 实现 `find_metadata_gaps`、`request_photo_analysis`（接入可取消的异步任务）；
- 建立数据覆盖率报表与工具级指标（耗时、零结果率、失败率、取消率）；
- 演进混合检索：结构化过滤 + 关键词 + 向量召回 + 可解释重排；
- 建立离线评测集与回归流程；
- 处理长期任务队列、缓存、限流与资源隔离。

**长远但暂不默认实施的方向**：人物、相册、旅行、设备等专门实体模型；用户偏好反馈影响排序；更精细的隐私区域策略；多模态重复图检测；仅当任务确实独立、长时且权限不同时才拆独立 worker。

---

## 11. 交付顺序与依赖

```text
批次 0：访问策略 + 现有行为基线                                  ✅
  ↓
批次 1：五个只读检索工具 + LangGraph 编排 + SSE 适配层            ✅
  ↓
批次 2：会话持久化 + 历史侧栏 + 共享 DTO                          ✅
  ↓
批次 3：照片引用回流 + 单图工具 + 可验证聚合 + 上下文裁剪          ← 下一步
  ↓
批次 4：身份与权限 → 候选集 / 对比报告等策展产物
  ↓
批次 5：管理员维护工具 + 评测 + 观测 + 混合检索
```

批次 4 的写工具依赖身份与权限体系，不应在只有访客 cookie 的前提下开工。

---

## 12. 验收清单

### 产品与体验

- [x] 用户能从一句自然语言得到照片答案，而不是固定兜底文本。
- [x] 未找到结果时给出基于检索条件的说明与可调整方向。
- [x] 过程记录不泄露模型思维链和敏感内部信息。
- [x] 照片结果可点击查看详情，作为回答的可追溯引用。
- [ ] 每个事实性结论可以追溯到照片、时间、地点、EXIF 或统计范围（统计类结论缺席）。
- [ ] 数据缺失、权限不足有明确反馈。
- [ ] 候选集、时间线等产物在用户确认前不会写入档案（尚无写能力）。

### 架构

- [x] `app/api → Agent → tools → services → infra` 保持单向依赖。
- [x] 所有可调用工具在 `createAgent({ tools })` 显式注册。
- [x] Route 不含 prompt、工具定义、业务查询或固定意图分支。
- [x] 工具不复制 Prisma 查询、签名 URL 和脱敏逻辑。
- [x] `src/lib/contracts/agent-conversation.ts` 只含共享序列化契约。
- [ ] 提示词独立为 `agent.prompt.ts`（当前内联在 `agent.service.ts`）。

### 协议与数据

- [x] 前后端会话契约无 `any`。
- [x] 文本与照片结果在同一条消息上携带独立字段，消息 id 稳定。
- [x] 会话引用使用稳定 `photoId`，而非 UI 中的临时顺序。
- [x] 查询结果保留相关度排序，筛选条件实际参与检索。
- [x] 工具输出不包含 rawData、embedding、对象存储 key 或未授权字段。
- [ ] SSE 事件有结构化错误码与可判别的过程事件类型（`data` 仍为宽类型）。

### 安全、质量与运行

- [x] 会话按服务端签发的 `visitorId` 隔离，客户端不能指定归属。
- [x] 默认工具集只读。
- [x] 浏览器取消会停止后续模型和工具执行。
- [x] 单次检索有结果数量上限。
- [ ] 身份、角色与照片访问范围来自完整认证体系。
- [ ] 模型、检索、图片分析都有独立超时与并发限制。
- [ ] 数据覆盖率、工具耗时、失败率、零结果率可观测。
- [ ] 评测集覆盖检索、单图、统计、无结果、取消等关键场景。

---

## 13. 决策记录与待定项

### 已决定

1. **身份**：当前为访客 cookie 隔离，不要求登录。引入写工具前需重新评估。
2. **编排框架**：采用 LangChain / LangGraph 的 `createAgent`，而非自研工具循环。会话记忆由 `PostgresSaver` 承担，界面历史由应用表承担，两者不混用。
3. **工具划分**：按检索维度拆成五个工具，而非一个通用搜索工具带多种过滤参数。
4. **正文归属**：命中照片时的事实性叙述由服务端生成，模型正文不直接呈现。
5. **流式粒度**：先保障工具阶段事件与完整回答，token 级流式顺延。
6. **模型接入**：按用途分三组配置，平台由 `*_API_TYPE` 区分协议，不在代码里枚举平台。

### 待定

1. 不同角色可见的地点精度、EXIF 字段与照片范围分别是什么？
2. 会话、候选集和相册是否需要长期保存与分享？
3. 复合条件查询（“去年在杭州拍的逆光照片”）采用哪种形态：让模型一次性输出全部条件交由单个工具组合查询，还是实现多工具结果的交集？当前实现只保留第一组结果。
4. 重新分析图片是同步执行、后台队列执行，还是跳转到既有后台任务？建议使用可取消的后台任务。
5. 语义查询规划是否需要独立于 `CHAT_*` 的模型配置？当前与对话共用，云端配置下该步骤同样出网。
6. 低配部署的长期方案：本地小模型、云端推理，还是把推理放到局域网内另一台机器？
