# Agent 模块

照片库的自然语言检索入口。页面 `/agent`，服务端用 LangGraph 编排一个 Agent 加五个只读检索工具。
模型只负责「选哪个工具、填什么参数」，其余由服务端决定。

---

## 能力边界

已实现：

| 能力 | 实现位置 |
|---|---|
| 五维度检索：时间、地点、AI 标签、画面语义、拍摄参数 | `tools/search-photo.tool.ts` |
| 语义检索的查询改写、相似度双重收敛、标签无结果时的向量兜底 | `semantic-search.service.ts`、`query-planner.service.ts` |
| 会话持久化：列表、切换、删除、刷新恢复消息与照片 | `conversation.service.ts`、`api/agent/conversations` |
| 照片结果网格，点击进查看器看详情与 EXIF | `AgentPhotoGrid.tsx`、`PhotoPreview` |
| 访客级会话隔离（HTTP-only cookie） | `api/agent/_lib/visitor.ts` |
| 事实性叙述由服务端接管，模型正文不直接呈现 | `agent.service.ts` |
| 中断传播：浏览器取消 → 服务端停止模型与工具 | `route.ts` → `agent.service.ts` |
| 模型来源按用途分三组、可切本地或云端 | `infra/chat-model.ts` |

未实现，按依赖排序，展开见「缺口」：

```text
1  会话内指代（「第二张」「这组」）+ 单图详情与 EXIF 问答工具
2  上下文裁剪与会话摘要
3  统计聚合（时间分布、城市分布、设备习惯）
4  复合条件交集（现为并集，故只取第一组结果）
5  登录、角色、照片可见性
6  候选集 / 相册 / 对比报告等产物与写操作
7  覆盖率观测、离线评测集
8  token 级流式、阶段化过程事件、结构化错误码
```

## 数据流

```text
useChat.ts  fetchEventSource
  → POST /api/agent/chat
      resolveAgentVisitor()              cookie 取 visitorId
      conversationService.startTurn()    落库 user 消息，无会话则新建
      agentService.stream()              LangGraph，streamMode: 'messages'
        ├─ 五个检索工具                    命中后 yield photo-results
        └─ 收尾 yield text                 正文由服务端决定，见「正文接管」
      photoService.getPhotosByIds()      补全照片 + 签名 URL
      conversationService.appendAssistantMessage()
  ← SSE: loading → photo-results → streaming → done
```

会话历史另有两个接口：`GET /api/agent/conversations`（列表）、`GET|DELETE /api/agent/conversations/[conversationId]`。

## 模块职责

| 文件 | 职责 |
|---|---|
| `app/api/agent/chat/route.ts` | 校验入参、建 SSE、补全照片、落库、编码事件 |
| `app/api/agent/_lib/visitor.ts` | HTTP-only 随机 cookie 提供 `visitorId` |
| `services/ai/agent/agent.service.ts` | 系统提示词、工具集、流事件、正文接管 |
| `services/ai/agent/tools/search-photo.tool.ts` | 五个工具与 zod 入参 |
| `services/ai/agent/conversation.service.ts` | 会话 / 消息 / 照片引用的唯一读写入口 |
| `services/ai/image-analysis/semantic-search.service.ts` | 查询改写、向量召回、相似度收敛 |
| `infra/agent.ts` | `createAgent` + `PostgresSaver` checkpoint |
| `infra/chat-model.ts` | 模型接入，按用途分三组配置 |
| `lib/contracts/agent-conversation.ts` | 会话 DTO，前后端共用 |

依赖方向单向：`route → agent.service → tools → 领域 service → infra`。
`agent.service` 不认识 `NextRequest` / SSE / Prisma；`tools` 不写 SSE、不直接查 Prisma；前端不 import 服务端代码。

## 检索工具

按检索维度拆分，而非一个通用搜索加一堆过滤参数——模型选择更明确，入参也能各自约束。

| 工具 | 入参要点 |
|---|---|
| `date_search` | `startDate` / `endDate`（`YYYY-MM-DD`），按 `Asia/Shanghai` 转半开时刻区间，结束日加一天 |
| `location_search` | `province` / `city` / `district` / `township` / `keyword`，至少一项 |
| `ai_metadata_search` | `tagsAny` / `tagsAll` / `tagsExclude` / `theme` / `descriptionKeyword` |
| `semantic_photo_search` | `query`，自然语言画面描述 |
| `exif_search` | 相机、镜头、光圈、ISO、焦距区间、`flashMode` |

公共：`limit` 默认 12、上限 20。返回 `{ query, total, photos }`，`photos` 每项只有 `id` / `theme` / `tags`。

原计划是一个通用 `search_photos` 带一堆过滤参数，实现时改为按维度拆五个。通用工具的问题是模型要同时决定「用哪些参数」和「参数怎么填」，而拆开后每个工具的 zod schema 能各自约束必填组合（如 `location_search` 要求五个地点字段至少一项、`exif_search` 要求光圈上下限不倒置），模型的选择空间小得多，出错也更容易从日志定位。

路线图里尚未实现的工具：

| 工具 | 用途 | 依赖 |
|---|---|---|
| `get_photo_detail` | 单图事实问答 | 引用回流（缺口 1） |
| `get_photo_exif` | 拍摄参数问答 | 引用回流（缺口 1） |
| `summarize_photo_set` | 受控聚合，不让模型自己算统计 | `archive-insight.service.ts`（缺口 3） |
| `compare_photo_sets` | 对比两组的时间、地点、设备 | 同上 |
| `draft_collection` / `save_collection` | 候选集草稿与确认写入 | 身份体系（缺口 5、6） |
| `find_metadata_gaps` | 找缺地点 / 缺 EXIF / 未分析的照片 | 管理员权限 |
| `request_photo_analysis` | 触发重新分析，可取消的后台任务 | 管理员权限 + 任务治理 |

`ai_metadata_search` 的兜底：纯标签条件命中 0 条且没传 `tagsExclude` 时，把条件拼成文本转语义检索。有 `tagsExclude` 时不兜底——排除是硬条件，向量检索保不住。

`semantic_photo_search` 的流程与阈值：

```text
query → photoQueryPlannerService.plan()      改写为 semanticQuery + ≤6 个关联词
      → 三者拼接（≤600 字符）→ embedding
      → 绝对下限 SEMANTIC_SEARCH_MIN_SIMILARITY = 0.55
      → 相对收敛 topSimilarity - SEMANTIC_SEARCH_MAX_SCORE_GAP(0.08)
      → 上限 SEMANTIC_SEARCH_MAX_RESULTS = 6
```

相似度是描述向量与标签向量的加权。`photo_ai_analyses.embedding` 为空的照片对语义检索不存在。

## 数据模型

| 表 | 内容 |
|---|---|
| `agent_conversations` | `visitorId`、标题（首条输入前 30 字）、时间 |
| `agent_messages` | `role`、`kind`（TEXT / PHOTO_RESULTS）、`status`（COMPLETED / INTERRUPTED / ERROR）、正文、`photoTotal`、会话内 `sequence` |
| `agent_message_photos` | `photoId` + `position`，按 `(messageId, position)` 唯一 |

只存 `photoId` 与顺序，签名 URL 读取时重新生成。prompt、思维链、原始工具结果、向量都不落库。列表预览取最后一条消息前 72 字。

LangGraph 的上下文由 `PostgresSaver` 单独维护，`thread_id = conversation:${conversationId}`，服务模型记忆；界面历史一律来自上面三张表，两者不混用。

## 模型配置

三组环境变量，每组 `API_TYPE` / `MODEL` / `API_URL` / `API_KEY`：

| 组 | 用途 |
|---|---|
| `CHAT_*` | Agent 对话与语义查询改写。模型必须支持 function calling |
| `VISION_*` | 入库时的图片分析 |
| `EMBEDDING_*` | 向量嵌入，输出维度必须 1024，与 `vector(1024)` 对应 |

`API_TYPE` 取 `ollama`（原生接口）或 `openai`（兼容端点，覆盖百炼、魔搭等），只区分协议不区分平台，接新平台不改代码。

## SSE 协议

服务端内部事件只有两种：

```ts
type AgentStreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'photo-results'; toolCallId; toolName; query; total; photoIds }
```

对外 SSE 用 `status` 判别：

| status | 载荷 | 前端动作 |
|---|---|---|
| `loading` | `conversationId`、`userMessage` | 替换乐观插入的 user 消息，插入 assistant 占位 |
| `photo-results` | `photoResult` | 照片进内存但不显示 |
| `streaming` | `message` 文本增量 | 追加正文 |
| `done` | `assistantMessage` | 整体替换该条，揭示照片并播一次动画 |
| `error` | `message` | 结束等待态 |

## 前端消息状态机

同一条 assistant 消息全程原地更新，本地 id 在 `done` 时换成服务端 id：

```text
乐观插入 user
  → loading         status: 'loading'，渲染等待态
  → photo-results   填入 data，photoResultsVisible: false
  → streaming       status: 'streaming'，追加 content
  → done            reconcile，photoResultsVisible: true
```

`photo-results` 先到、文字后到是常态，所以 `status === 'loading'` 的渲染优先级最高，避免照片先闪出来。异常路径（`error` / `onclose` 未收终态 / `catch`）都会先揭示已有照片再收束为 `done`，保证不会卡在 `loading`。切换会话时 `activeConversationRef` 与请求所属会话不一致的事件一律丢弃。

## 已实施的约束

| 约束 | 位置 | 防什么 |
|---|---|---|
| 正文接管 | `agent.service.ts` | 模型会复述照片数量、编号、参数，或让用户「点击查看详细信息」而界面并无此物 |
| 命中照片后丢弃后续检索结果 | `agent.service.ts` | 模型拿返回的 `theme` 再编查询二次检索，各次结果并集后混入未经原条件筛选的照片 |
| 工具只回 `id` / `theme` / `tags` | `search-photo.tool.ts` | 12 张照片的 `description` 约 3K token，是工具回填那轮耗时的主体 |
| `think: false`（仅 Ollama） | `chat-model.ts` | qwen3 默认先产出大段思考，本 Agent 只需一次工具决策 |
| 正文缓冲到收尾 | `agent.service.ts` | 工具调用前的规划 JSON 抢先流向界面 |
| checkpoint 建表懒初始化 | `infra/agent.ts` | 模块顶层连库会让 `next build` 的 collect page data 阶段失败 |

正文接管的三个分支：命中照片 → `getPhotoResultSummary()` 按 `theme` 生成画面概述；跑过工具但 0 结果 → `NO_PHOTO_RESULT_REPLY`；未调用任何工具 → `stripPhotoUiHints(bufferedText) || NO_CONTENT_REPLY`。

## 性能

NUC 第 6 代 / 8G / 纯 CPU / `qwen3:4b-q4_K_M` 实测：

```text
生成速度        5.23 tokens/s
单轮总耗时      42.45s = 首轮 8.00s + 工具 0.07s + 工具回填轮 33.83s
两轮输入量      1.762K token → 4.865K token
```

瓶颈在工具回填那轮的输入量，不在系统提示词，也不在工具本身（0.07s）。已据此精简工具返回。仍不够则依次考虑：换更小的对话模型、`CHAT_*` 指向云端、压缩系统提示词。

## 缺口

按依赖排序，前两项是其余功能的基础。

**1. 照片引用未回流到模型上下文**
`agent_message_photos` 已存引用，但没喂回模型，「第二张是什么时候拍的」「这组用了什么镜头」无法解析。需要实现 `position` → `photoId` 的解析，并配套 `get_photo_detail` / `get_photo_exif` 两个工具——目前照片详情只由前端 `PhotoPreview` 承担，Agent 侧没有单图能力。

**2. 上下文无裁剪**
完全交给 LangGraph checkpoint 累积，长会话输入量线性增长，而 CPU 推理下输入量直接等于等待时间。需要有限历史 + 会话摘要策略。

**3. 没有服务端聚合**
统计类问题（时间分布、城市分布、设备习惯）给不出带样本范围的结论。需要一个 `archive-insight.service.ts` 把分组、计数、时间范围固定在服务端，再包一个 `summarize_photo_set` 工具，不能让模型自己算。

**4. 复合条件退化为单条件**
多次工具结果做的是并集而非交集，所以只保留第一组。「去年在杭州拍的逆光照片」目前只按一个条件命中。要支持得改形态：模型一次性输出全部条件，由单个工具组合查询，而不是连续调多个工具各查一遍。

**5. 无身份体系**
只有 `visitorId` 做会话隔离，没有登录、角色、字段级可见性。所有工具只读，引入任何写工具前必须先补这块。

**6. 无写能力与产物**
候选集、时间线、对比报告都没有。需要 `AgentArtifact` 模型、草稿与确认写入分离、防止模型自动保存的确认令牌。依赖第 5 项。

**7. 观测与评测缺失**
数据覆盖率（有时间 / 地点 / EXIF / 分析 / 向量的照片比例）不可观测，其中「有向量」直接决定语义检索的召回上限。也没有「问题 → 预期工具 → 可接受答案」的评测集，提示词和模型变更缺少回归依据。

**8. 流式粒度**
服务端缓冲到收尾一次性下发，不是 token 级流。阶段化 `status` 事件、工具级记录、结构化 `error.code` 也都没有。

## 坑与决策

`migrate diff` 的输出永远包含 `DROP TABLE checkpoint_blobs / checkpoint_migrations / checkpoint_writes / checkpoints`。这四张表由 `PostgresSaver` 维护、不在 Prisma schema 里，**直接把 diff 输出当 migration 执行会抹掉对话记忆**。

反向代理需放宽读超时。Nginx 的 `proxy_read_timeout` 默认 60s，指两次收到数据的间隔；正文缓冲到收尾意味着中间有长静默，走域名会被判超时。目前靠 NPM 里配 `proxy_read_timeout 600s` + `proxy_buffering off`，更稳的做法是在 SSE 加周期心跳。

`/api/agent/chat` 无鉴权。`/agent` 是公开页，该接口不在 middleware matcher 里，任何人可调用并消耗 CPU 或云端配额。

语义查询改写与对话共用 `CHAT_*`。配置云端后这一步同样出网计费。若要它永远留本地，需单独一组配置。

工具划分按检索维度而非通用搜索，编排用 LangChain `createAgent` 而非自研工具循环，会话记忆与界面历史分两套存储——这三条是已定的结构选择。
