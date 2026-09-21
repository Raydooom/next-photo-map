# 摄影档案 Agent：产品与开发计划

> 状态：规划中  
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

下面是用户感知到的能力域。运行时仍由一个 `ArchiveAgentService` 编排，能力域通过工具集合与提示词约束实现。

| 能力域 | 用户获得的价值 | 示例问题 | 首要数据依据 | 首次交付批次 |
| --- | --- | --- | --- | --- |
| 找到（Find） | 从大量照片中找出候选 | “故宫附近拍过什么”“找雪山照片” | 向量、标签、地点、时间 | 批次 1 |
| 读懂（Read） | 理解单张或一组照片的事实与画面 | “第二张什么时候拍的”“这组用了什么镜头” | Photo、EXIF、Location、AI 分析 | 批次 1 |
| 连接（Connect） | 发现地点、时间、主题、参数之间的关系 | “我去年秋天都去了哪里”“哪些照片是逆光” | 时间、Region、EXIF、标签 | 批次 2 |
| 策展（Curate） | 形成可保存、可复看的叙事和候选集 | “挑 12 张做杭州秋天相册” | 检索结果、偏好、用户确认 | 批次 3 |
| 维护（Steward） | 补齐或修复档案信息 | “重新分析这张”“哪些照片没有地点” | 后台任务、扫描与 AI 分析 | 批次 4，仅管理员 |

### 2.2 典型用户旅程

#### A. 查找：从模糊记忆到具体照片

```text
“去年秋天我去哪儿拍过？”
  → Agent 解析为时间范围与地点聚合需求
  → 查询时间、Region 与照片数量
  → 返回地点时间线、代表照片和“继续展开”的入口
```

回答不应只说“你去过杭州”，而应附带：时间范围、照片数量、代表照片 id / 卡片；如数据不足，要说明仅基于有地点或有拍摄时间的照片。

#### B. 读图：从单张照片到拍摄上下文

```text
“第二张是什么时候拍的？用什么镜头？”
  → 从本回合照片引用中解析“第二张”
  → 读取照片详情与脱敏 EXIF
  → 返回拍摄时间、地点、镜头与画面说明
```

“第二张”是会话引用语义，属于 Agent 上下文；`photoService` 只接收明确 `photoId`，不应知道 UI 中的相对序号。

#### C. 复盘：从一组照片到摄影习惯

```text
“我最常在什么时间拍夜景？”
  → 查询夜景候选照片
  → 汇总拍摄时间、地点、曝光参数
  → 输出带样本数、时间分布与代表照片的结论
```

此类结论必须标明样本范围与数据缺失情况，不能将少量已分析照片当作整个档案的统计事实。

#### D. 策展：从检索结果到可保存成果

```text
“从这批照片里选 12 张做杭州秋天相册”
  → 在已有候选集上筛选、去重并说明选择标准
  → 生成“候选相册”草稿
  → 用户确认后保存为 collection / album
```

Agent 先生成建议，持久化和任何写操作必须经过明确确认。

---

## 3. 体验原则

当前 `/agent` 已采用单栏、记录式的消息流，而不是普通 IM 的左右气泡。这和产品定位一致：它应更像一份可查阅的档案研究记录。

### 3.1 回答必须有证据

事实性回答至少满足其一：

- 引用具体照片；
- 引用时间、地点、EXIF 或 AI 分析字段；
- 声明是基于哪些检索结果的归纳；
- 明确告知数据缺失、置信度不足或未找到结果。

示例：

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

前端应看到简短、可验证的过程状态，而不是模型内部推理：

```text
正在理解问题
→ 正在检索照片档案
→ 找到 24 张杭州相关照片
→ 正在整理时间与地点
```

需要展示的是**执行事实**：调用了什么工具、返回多少结果、依据哪些照片；不展示 prompt、模型思维链、SQL 或原始工具参数。

### 3.3 渐进式信息密度

一个回答由三层组成：

1. **结论**：一句到三句，直接回答问题；
2. **证据**：照片卡片、数量、时间、地点、参数或统计；
3. **继续探索**：例如“按城市展开”“查看夜景样本”“生成候选相册”。

先让用户获得答案，再按需展开证据和后续动作。照片卡片不是装饰，而是可追溯引用。

### 3.4 Agent 不确定时应如何回答

- 未找到：说明未在当前已索引照片中找到，而非断言不存在；
- 数据不完整：区分“无 EXIF”“无地点”“未进行 AI 分析”；
- 结果歧义：提供两三个澄清选项，而非机械返回固定兜底；
- 工具失败：说明当前无法检索并给出可重试的下一步。

---

## 4. 当前实现与主要缺口

当前调用链：

```text
src/app/agent/_hooks/useChat.ts
  → POST /api/ai/chat
    → src/app/api/ai/chat/route.ts
      → aiChatService.queryIntention()
        → PHOTO_SEARCH 时生成 embedding
          → pgvector 查询 photo_ai_analyses
            → photoService.listPhotos()
      → SSE 返回 text / photoCard
```

关键事实：

| 已有资产 | 当前状态 | 对 Agent 的价值 |
| --- | --- | --- |
| `photoService` | 已提供列表、详情、签名 URL 与脱敏 | 所有照片工具的统一输出入口 |
| `locationService` | 已提供地点详情、范围查询、区域统计 | 地点、足迹与地图能力基础 |
| `photoExifService` | 已提供 EXIF 查询 | 设备、镜头、曝光与摄影习惯问答基础 |
| `aiService` | 已提供图片分析与 embedding 写入 | 管理员维护、索引补齐能力 |
| `aiChatService` | 固定意图 + 语义检索 | 过渡期兼容入口，应抽出检索能力 |
| `createSSE` | 已提供 SSE 编码 | HTTP 传输基础，不应承载 Agent 业务 |
| `/agent` 页面 | 已有记录式消息流和照片卡片位 | 可承接过程事件、引用和行动项 |

主要缺口：

1. 当前不是工具调用 Agent，只是固定意图分支；普通问题会落到固定兜底。
2. SSE 的 `status`、`type` 与 `data: any` 没有前后端共享契约。
3. 现有 Hook 可能出现照片卡片与 AI 文本复用同一 id、最终状态未收束的问题。
4. 浏览器 abort 没有完整传给服务端执行链，断连后模型与检索可能继续运行。
5. `queryPhotosByEmbedding()` 的 `_params` 没有参与筛选；向量排序会被 `listPhotos` 的时间排序覆盖；新实现不能复制 `$queryRawUnsafe`。
6. 没有真实会话、照片引用、候选集或 Agent 产物的持久化模型。
7. 没有访问策略、工具级权限、写操作确认和审计边界。
8. 照片的 AI 分析、地点与 EXIF 覆盖率尚未成为可观测的数据质量指标。

---

## 5. 目标架构

### 5.1 单 Agent、多个工具

首期只引入一个服务端编排器：`ArchiveAgentService`。

```text
app/api
  → ArchiveAgentService
    → ToolRegistry
      → AgentTool
        → photo / location / exif / semantic-search / analysis services
          → infra
```

模型负责决定“需要哪种已允许的能力”；服务端负责决定“这个能力能否执行、以何种权限和参数执行”。

不要建立：

```text
SearchAgent → CuratorAgent → MapAgent → AnalysisAgent
```

除非未来某个工作流真的需要独立的长任务、不同权限、不同模型或不同队列。即使如此，优先拆为确定性的后台工作流，而不是让多个模型互相对话。

### 5.2 推荐目录

```text
src/
├── app/
│   ├── agent/                                      # 浏览器页面、组件、Hook
│   └── api/
│       └── ai/
│           └── chat/
│               └── route.ts                        # HTTP / SSE 适配层
│
├── lib/
│   └── contracts/
│       └── agent.ts                                # 前后端共享、可序列化 DTO
│
└── server/
    └── services/
        ├── photo/
        │   ├── photo.service.ts                    # 已有：照片读取、URL、脱敏
        │   ├── location.service.ts                 # 已有：地点和区域
        │   ├── exif.service.ts                     # 已有：EXIF
        │   └── collection.service.ts               # 批次 3：候选集与相册
        │
        └── ai/
            ├── analysis.service.ts                 # 已有：图片分析和索引写入
            ├── chat.service.ts                     # 旧固定意图入口，过渡期保留
            ├── semantic-photo-search.service.ts    # 批次 1：embedding + 混合检索
            ├── archive-insight.service.ts          # 批次 2：可验证聚合与统计
            │
            └── agent/
                ├── archive-agent.service.ts        # 单回合编排、工具循环、领域事件
                ├── agent.types.ts                  # 仅服务端内部上下文与类型
                ├── agent.prompt.ts                 # 系统提示词、回答与引用规则
                ├── tool.types.ts                   # 工具统一接口
                ├── tool-registry.ts                # 白名单注册、权限与策略
                ├── conversation.service.ts         # 批次 2：会话与引用上下文
                ├── evaluation.service.ts           # 批次 5：离线评测与质量回归
                └── tools/
                    ├── search-photos.tool.ts
                    ├── get-photo-detail.tool.ts
                    ├── get-photo-exif.tool.ts
                    ├── query-locations.tool.ts
                    ├── summarize-photo-set.tool.ts
                    ├── draft-collection.tool.ts
                    └── request-photo-analysis.tool.ts
```

### 5.3 严格依赖边界

- `src/app/agent` 只处理浏览器状态和渲染；不得 import Prisma、存储客户端、服务端 service 或工具。
- `route.ts` 只校验 HTTP 输入、建立 SSE、传入认证与取消信号、编码 Agent 事件；不得拥有 prompt、业务分支或工具实现。
- `ArchiveAgentService` 不认识 `NextRequest`、`NextResponse`、SSE、React `Message` 或 Prisma。
- `tools/*` 只做工具描述、schema 校验、工具级授权、结果投影与 service 调用；不得写 SSE 或复制领域查询。
- `photoService`、`locationService`、`exif.service`、`analysis.service` 不得反向依赖 Agent、Route 或前端。
- `src/server/infra/ai-client.ts` 只做模型供应商与 embedding 调用；不得 import 照片、地点或 Agent。

---

## 6. 工具体系

### 6.1 工具的统一约束

```ts
export interface AgentTool<TInput, TResult> {
  name: string;
  description: string;
  readOnly: boolean;
  inputSchema: unknown;
  execute(
    input: TInput,
    context: AgentExecutionContext
  ): Promise<TResult>;
}
```

工具必须：

- 输入可由 schema 校验；
- 只访问明确声明的数据范围；
- 返回最小、可引用、可序列化的结果；
- 记录工具名、耗时、结果数量、错误码等可观测信息；
- 接收服务端生成的权限与取消上下文。

工具不得：

- 根据模型文本自行扩大权限；
- 直接执行散落的 Prisma 查询；
- 返回完整原始 EXIF、对象存储 key、向量或私密原始地点数据；
- 工具之间互相调用形成隐藏工作流；
- 把模型内部推理或 SQL 暴露为前端过程信息。

### 6.2 工具路线图

| 工具 | 能力域 | 下层依赖 | 权限 | 批次 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `search_photos` | 找到 | `semanticPhotoSearchService` | 只读 | 1 | 语义、时间、地点、标签等受限过滤 |
| `get_photo_detail` | 读懂 | `photoService.getPhotoById()` | 只读 | 1 | 单图事实与可渲染引用 |
| `get_photo_exif` | 读懂 | `photoExifService` | 只读 | 1 | 默认脱敏，支持参数问答 |
| `query_locations` | 找到 / 连接 | `locationService` | 只读 | 1 | 地点、区域、范围与统计 |
| `summarize_photo_set` | 连接 | `archiveInsightService` | 只读 | 2 | 受控聚合，不让模型直接猜统计结论 |
| `compare_photo_sets` | 连接 | `archiveInsightService` | 只读 | 3 | 对比时间、地点、设备或主题 |
| `draft_collection` | 策展 | `collectionService` | 草稿写入 | 3 | 先生成草稿，确认后持久化 |
| `save_collection` | 策展 | `collectionService` | 确认后写入 | 3 | 单独确认，不由模型自动触发 |
| `request_photo_analysis` | 维护 | `aiService` + 后台任务 | 管理员 | 4 | 高成本、可取消、可审计 |
| `find_metadata_gaps` | 维护 | 管理 service | 管理员 | 4 | 找缺地点、缺 EXIF、缺 AI 分析照片 |

### 6.3 首期四个只读工具

#### `search_photos`

处理：地点、时间、主题、光线、画面描述等照片检索。

```ts
{
  query: string;
  limit?: number;
  dateRange?: { from?: string; to?: string };
  region?: { province?: string; city?: string; district?: string };
  light?: 'backlit' | 'night' | 'golden_hour' | 'unknown';
  tags?: string[];
}
```

实现要求：

- 从旧 `AiChatService.queryPhotosByEmbedding()` 抽出 `semantic-photo-search.service.ts`；
- 参数化向量查询，不复制 `$queryRawUnsafe`；
- 真正使用 `dateRange`、`region`、`light` 与 `tags`；
- 保留语义相似度排序，不能在 `photoService.listPhotos({ ids })` 中被时间排序覆盖；
- 结果通过 `photoService` 的脱敏与签名 URL 出口返回。

长期演进为**混合检索**：先用明确结构条件缩小范围，再做向量召回；后续加入关键词、标签、地点、时间、EXIF 的可解释排序，而不是只依赖一个向量距离阈值。

#### `get_photo_detail`

输入仅为明确的 `photoId`。若用户说“第二张”，Agent 根据本回合或会话保存的引用将其解析为 id。

返回可引用的照片事实：文件名、拍摄时间、归一化地点、可见 EXIF 摘要、AI 描述、缩略图 URL。领域服务不应知道“第几张”的 UI 语义。

#### `get_photo_exif`

用于相机、镜头、焦距、曝光、ISO 等问题。默认使用脱敏结果；后续可扩展受限筛选能力，例如“找 35mm 拍的照片”“有哪些长曝光”。

#### `query_locations`

用于城市、区域、范围、照片足迹与地点统计。当前缺少按城市名、行政区名、半径查询照片的领域方法时，应先扩展 `location.service.ts` 或 `photo.service.ts`，再由工具调用；不得在工具内散落 Prisma 查询。

---

## 7. 数据、引用与会话模型

### 7.1 引用是 Agent 的基础对象

Agent 的回答要可追溯，因此不能只保存纯文本。建议从批次 2 开始引入稳定的引用 DTO：

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

当侧栏历史从 mock 转为真实能力时，新增 Prisma 模型：

```text
AgentConversation
AgentMessage
AgentMessagePhotoReference
AgentArtifact
```

建议职责：

| 模型 | 用途 |
| --- | --- |
| `AgentConversation` | 标题、所有者、归档状态、最后活动时间 |
| `AgentMessage` | 用户消息、最终 Agent 回答、错误或系统摘要 |
| `AgentMessagePhotoReference` | 一条消息引用哪些照片及引用理由 |
| `AgentArtifact` | 候选相册、地点时间线、对比报告等可继续操作的成果 |

不要默认持久化：完整模型 prompt、思维链、原始工具结果、签名 URL、完整 EXIF 或 embedding。持久化的是可恢复会话需要的最小事实。

### 7.3 上下文窗口策略

多轮会话不等于把全部历史发送给模型。建议上下文按优先级组成：

1. 当前用户问题；
2. 当前消息正在引用的照片；
3. 最近有限轮的用户问题与最终回答摘要；
4. 由 `AgentConversation` 保存的简短会话摘要；
5. 必要时按需读取的档案事实。

这能控制成本、避免旧结论污染新检索，并使“第二张”“这组照片”等指代有明确来源。

---

## 8. 流式事件与前端映射

### 8.1 共享协议位置

`src/lib/contracts/agent.ts` 只放前后端都需要、可 JSON 序列化的契约：请求 DTO、流式事件、结果摘要、引用和错误码。

`src/server/services/ai/agent/agent.types.ts` 放服务端内部上下文、模型消息、工具执行结果、权限对象等；不让客户端 import。

### 8.2 事件协议

```ts
export type AgentStreamEvent =
  | {
      type: 'status';
      phase: 'planning' | 'searching' | 'reading' | 'summarizing' | 'answering';
      message: string;
    }
  | {
      type: 'tool-call';
      callId: string;
      tool: string;
      label: string;
    }
  | {
      type: 'tool-result';
      callId: string;
      tool: string;
      summary: string;
      count?: number;
    }
  | {
      type: 'text-delta';
      messageId: string;
      delta: string;
    }
  | {
      type: 'photo-results';
      messageId: string;
      summary: string;
      result: PhotoSearchResult;
      references: PhotoReference[];
    }
  | {
      type: 'artifact';
      artifact: AgentArtifactSummary;
    }
  | {
      type: 'error';
      code:
        | 'INVALID_INPUT'
        | 'FORBIDDEN'
        | 'TOOL_FAILED'
        | 'MODEL_FAILED'
        | 'CANCELLED';
      message: string;
      retryable: boolean;
    }
  | {
      type: 'completed';
      messageId: string;
    };
```

前端映射：

| 领域事件 | 记录式对话界面行为 |
| --- | --- |
| `status` | 显示短暂状态：“正在检索照片档案” |
| `tool-call` | 显示可折叠的执行记录：“正在读取拍摄参数” |
| `tool-result` | 显示事实摘要：“找到 24 张杭州相关照片” |
| `text-delta` | 追加正式回答；后续可支持 token 流 |
| `photo-results` | 渲染照片卡片与可引用的编号 |
| `artifact` | 显示候选相册、时间线或比较报告入口 |
| `error` | 停止 loading，给出可重试、可理解的错误 |
| `completed` | 统一收束状态、释放发送锁 |

展示工具调用事实，不展示模型思维链、完整 prompt、SQL 或敏感参数。

### 8.3 API 与 Hook 的边界

`src/app/api/ai/chat/route.ts`：校验请求、获取认证上下文、创建 SSE、传递 `request.signal`、将 `AgentStreamEvent` 编码为 SSE、清理资源。

`src/app/agent/_hooks/useChat.ts`：维护浏览器状态、发起请求、消费可判别事件、处理 abort / retry / completed、映射照片卡片和过程记录。

迁移时修复：

- 文本与照片卡片使用独立且稳定的消息 id；
- `completed` 统一结束 `streaming` 状态；
- 清空会话和断连会取消服务端剩余执行；
- 错误事件不再被当作普通文本拼接；
- 前端不判断 `PHOTO_SEARCH` 等后端意图，只处理事件类型。

---

## 9. 安全、数据质量与可观测性

### 9.1 权限与确认

- `AgentExecutionContext` 中的身份、角色与可访问照片范围只来自服务端认证。
- 默认仅注册只读工具。
- 写工具必须满足：管理员权限、明确用户确认、可审计记录、可取消或可回滚策略。
- 若照片档案不是公开内容，聊天入口必须与照片页使用一致的访问控制。

### 9.2 数据质量是能力上限

Agent 的质量受档案覆盖率约束。需要在管理端持续观测：

- 有拍摄时间的照片比例；
- 有地点、Region、EXIF、AI 分析、embedding 的照片比例；
- 失败或过期的 AI 分析数量；
- 无法定位到 Region 的坐标记录；
- 重复、疑似重复或无可用缩略图的照片。

当用户问“去年秋天在哪拍的”时，Agent 应能说明“仅统计有拍摄日期和地点的 82% 照片”，而不是将缺失数据静默忽略。

### 9.3 运行限制

- 每回合限制最大工具调用次数、总耗时与最大结果数量。
- 模型调用、向量检索、图片分析分别设置超时。
- 将浏览器 `AbortSignal` 传入 Agent 与可取消工具。
- 高成本图像分析与扫描/导入共享并发治理，避免争夺模型和对象存储资源。
- 记录工具耗时、结果数量、错误码、取消率与匿名化评测指标。

### 9.4 离线评测集

批次 5 前应逐步积累“问题 → 应有证据 → 预期工具 → 可接受答案”的评测样本，例如：

```text
问题：去年秋天我在哪些城市拍过？
依据：2025-09-01 至 2025-11-30、有地点的照片
预期工具：query_locations / search_photos
可接受答案：列城市、照片数、时间范围与至少一张代表照片
不可接受答案：无依据地推测城市、遗漏数据覆盖率说明
```

评测集用于提示词、工具、模型或排序策略变更后的回归，不用于替代线上权限控制。

---

## 10. 分批开发计划

每一批都应能够独立上线、观察和回滚。批次不是按“文件创建顺序”划分，而是按用户可获得的完整价值划分。

### 批次 0：基础盘点与验收基线

**目标**：冻结现有行为，建立后续改造的事实基线。

**范围**：

- 记录当前 `/api/ai/chat` 的输入、SSE 输出、照片卡片行为和失败方式；
- 准备最小问题集：语义检索、空结果、普通问题、单图详情、模型失败、浏览器取消；
- 明确 Agent 是公开入口、登录入口还是管理员入口；
- 统计现有照片的时间、地点、EXIF、AI 分析与 embedding 覆盖率；
- 明确哪些地点、EXIF 字段可以暴露给不同角色。

**不做**：不重构 Route，不引入工具，不改数据库模型。

**完成标准**：有可重复的请求样本、数据覆盖率报表和访问策略决定。

### 批次 1：可上线的“找与读” Agent

**目标**：让 Agent 真正回答档案问题，替代固定 `PHOTO_SEARCH` 分支。

**用户能做什么**：

- 按场景、地点、时间、标签、光线找到照片；
- 查看指定照片的时间、地点、画面说明与相机参数；
- 看到“正在检索”“找到多少张”的过程；
- 在没有结果时得到基于索引范围的解释，而非固定抱歉文本。

**后端工作**：

- 新建 `src/lib/contracts/agent.ts`；
- 抽出 `semantic-photo-search.service.ts`，修复过滤、排序与参数化查询；
- 新建 `ArchiveAgentService`、工具接口、注册表与首期 prompt；
- 实现 `search_photos`、`get_photo_detail`、`get_photo_exif`、`query_locations`；
- 将 `route.ts` 收敛为 SSE 适配层；
- 将 `request.signal` 传给 Agent 执行链；
- 统一日志、超时、最大结果数和错误码。

**前端工作**：

- `useChat` 消费 `AgentStreamEvent`；
- 修复消息 id、状态收束和 abort；
- 增加紧凑的过程记录与结果数量摘要；
- 照片卡片携带稳定引用 id。

**完成标准**：

- 所有首期问题均通过工具得到有依据的回答；
- Route 内不再存在按 `PHOTO_SEARCH` 写死的业务分支；
- 语义搜索结果保持相关度排序；
- 前后端协议无 `any`；
- 断连后可停止后续执行；
- 不暴露原始数据与未授权字段。

### 批次 2：会话、引用与“连接”能力

**目标**：从单次检索升级为能理解“这张”“第二组”“去年秋天”的连续档案对话。

**用户能做什么**：

- 连续追问上一轮的照片与结果；
- “第二张是什么时候拍的”“把这组按地点展开”；
- “我去年秋天都去了哪里”“我常在哪些城市拍夜景”；
- 刷新后恢复会话历史和被引用照片。

**后端工作**：

- 新增 `AgentConversation`、`AgentMessage`、`AgentMessagePhotoReference`；
- 实现 `conversation.service.ts`；
- 新增 `archive-insight.service.ts`，将分组、计数、时间范围、参数分布等统计固定在服务端，而不是交给模型猜；
- 实现 `summarize_photo_set`，补充地点/时间/设备聚合；
- 实施有限历史与会话摘要策略；
- 支持 `PhotoReference` 解析和持久化。

**前端工作**：

- 侧栏接入真实历史会话；
- 照片引用可展开、定位与继续追问；
- 对统计类回答显示样本数、筛选范围和数据缺失说明。

**完成标准**：

- “第 N 张”“这组”“上一批结果”等指代可稳定解析；
- 刷新后可恢复会话与引用；
- 统计结论均包含样本与时间/地点范围；
- 会话上下文不会无限增长。

### 批次 3：策展产物与主动探索

**目标**：把对话结果转化为用户可保存、可复用的档案成果。

**用户能做什么**：

- “从这批里选 12 张做杭州秋天相册”；
- “对比 2024 和 2025 的秋天”；
- “生成我的夜景拍摄时间线”；
- 保存候选相册、时间线或对比报告，并在后续继续编辑。

**后端工作**：

- 设计 `AgentArtifact` 与 collection / album 数据模型；
- 新增 `collection.service.ts`，区分候选草稿和已确认写入；
- 实现 `compare_photo_sets`、`draft_collection`、`save_collection`；
- 引入确认令牌或明确的二次请求，防止模型自动保存；
- 为候选集建立可解释的选择规则：时间覆盖、地点多样性、重复度、主题相关性、用户偏好。

**前端工作**：

- 展示候选集、时间线、对比报告等 `artifact`；
- 在保存、覆盖、发布前要求明确确认；
- 支持从 artifact 回到照片浏览、地图或会话继续探索。

**完成标准**：

- Agent 只能创建草稿，用户确认后才落库；
- 每个候选集说明筛选依据与照片来源；
- artifact 可在会话外再次打开；
- 不因策展功能破坏普通检索性能与权限边界。

### 批次 4：档案维护与管理员协作

**目标**：让 Agent 成为后台管理的辅助入口，但不成为无约束的管理执行器。

**用户能做什么（管理员）**：

- “哪些照片缺少地点或 AI 分析？”
- “重新分析这 20 张夜景照片。”
- “这些照片是否可能是同一地点？”
- “查看本次扫描中分析失败的文件。”

**后端工作**：

- 实现 `find_metadata_gaps`；
- 将 `request_photo_analysis` 接入明确的异步任务与进度状态；
- 记录触发者、输入范围、任务状态、失败原因与可重试操作；
- 与扫描/导入任务建立并发治理；
- 对批量写操作设计确认、幂等和失败恢复。

**前端工作**：

- 管理员模式与普通档案问答明确区隔；
- 展示任务状态、进度、取消和失败恢复入口；
- 批量操作必须显示影响范围与确认信息。

**完成标准**：

- 普通用户无法看到或调用管理员工具；
- 写操作全程可追踪，失败不会破坏既有索引；
- Agent 不会在无确认的情况下改写档案。

### 批次 5：检索质量、评测与规模化

**目标**：让系统在档案增长、模型变化和工具增加后仍保持可验证质量。

**后端工作**：

- 演进混合检索：结构化过滤 + 关键词 + 向量召回 + 可解释重排；
- 为 embedding、提示词、工具版本和索引版本建立可观测标记；
- 建立离线评测集、自动回归与人工抽检流程；
- 记录检索命中率、零结果率、工具失败率、取消率、延迟分位数与引用覆盖率；
- 处理长期任务队列、缓存、限流和资源隔离；
- 逐步做数据质量修复：重建 embedding、补 Region、检查无效媒体。

**长远但暂不默认实施的方向**：

- 人物、相册、旅行、设备等专门实体模型；
- 用户标注与偏好反馈对排序的影响；
- 更精细的隐私区域和地点模糊策略；
- 多模态重复图检测和相似组；
- 只有当任务确实独立、长时且权限不同，才把后台工作流拆为独立 worker；仍优先确定性任务，不急于多 Agent。

**完成标准**：每次模型、提示词、工具或索引变更都能在评测集上比较效果；数据规模与后台任务增长不显著影响前台检索体验。

---

## 11. 交付顺序与依赖

```text
批次 0：访问策略 + 数据覆盖率 + 现有行为基线
  ↓
批次 1：共享事件协议 + 语义搜索服务 + 首期只读工具 + 可上线 Agent
  ↓
批次 2：真实会话 + 照片引用 + 可验证聚合
  ↓
批次 3：候选集 / 相册 / 时间线等策展产物
  ↓
批次 4：管理员维护工具 + 异步任务治理
  ↓
批次 5：混合检索、评测、观测、规模化与数据质量运营
```

不应跳过批次 0 和批次 1 直接实现会话、相册或写工具：没有稳定检索、引用、权限和事件协议，后续产物不可追溯且难以维护。

---

## 12. 验收清单

### 产品与体验

- [ ] 用户能从一句自然语言得到有证据的照片答案，而不是固定兜底文本。
- [ ] 每个事实性结论可以追溯到照片、时间、地点、EXIF 或统计范围。
- [ ] 无结果、数据缺失、权限不足和工具失败都有明确、可理解的反馈。
- [ ] 过程记录展示执行事实，不泄露模型思维链和敏感内部信息。
- [ ] 候选集、时间线等产物在用户确认前不会写入档案。

### 架构

- [ ] `app/api → Agent → tools → services → infra` 保持单向依赖。
- [ ] 所有可调用工具在 `tool-registry.ts` 显式注册。
- [ ] Route 不含 prompt、工具定义、业务查询或固定意图分支。
- [ ] 工具不复制 Prisma 查询、签名 URL 和脱敏逻辑。
- [ ] `src/lib/contracts/agent.ts` 只含共享序列化契约，内部服务类型不泄露到客户端。

### 协议与数据

- [ ] 前后端事件协议无 `any`。
- [ ] 文本、照片结果、过程记录、artifact、错误和完成事件有可判别类型。
- [ ] 文本与照片卡片具有独立、稳定的消息 id。
- [ ] 会话引用使用稳定 `photoId`，而非 UI 中的临时顺序。
- [ ] 查询结果保留相关度排序，筛选条件实际参与检索。
- [ ] 工具输出不包含 rawData、embedding、对象存储 key 或未授权字段。

### 安全、质量与运行

- [ ] 身份、角色与照片访问范围只来自服务端认证。
- [ ] 默认工具集只读；写工具有权限、确认、审计、限流和取消能力。
- [ ] 浏览器取消会停止后续模型和工具执行。
- [ ] 模型、检索、图片分析都有超时、结果数量和并发限制。
- [ ] 数据覆盖率、工具耗时、失败率、零结果率与引用覆盖率可观测。
- [ ] 评测集覆盖检索、单图、统计、无结果、权限和取消等关键场景。

---

## 13. 实施前的决策项

1. Agent 是公开照片档案入口、登录用户入口，还是仅管理员能力？
2. 不同角色可见的地点精度、EXIF 字段与照片范围分别是什么？
3. 会话、候选集和相册是否需要长期保存与分享？
4. 批次 1 是先返回完整回答，还是同时实现模型 token 流？建议先保障工具阶段事件和完整回答，再逐步补 token 流。
5. 重新分析图片是同步执行、后台队列执行，还是跳转到既有后台任务？建议使用可取消的后台任务。
6. 首批需要支持哪些明确的时间、地点、光线和设备筛选条件？这些条件决定领域查询与索引优先级。

在上述访问与隐私决策未确定前，可以开始批次 0 的数据盘点和批次 1 的只读工具底座；写工具、会话分享和持久化 artifact 应等待边界明确后再进入实现。
