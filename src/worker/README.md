# worker

独立进程入口的预留位置。

扫描与 AI 分析目前跑在 Next.js 进程内（`/api/admin/scan`、`/api/ai/analysis` 的 SSE 路由里直接 `await` 服务），有两个问题：

- 任务寿命绑在 HTTP 连接上，断线即中断，且进度没有持久化
- `sharp` 与 `heic-convert` 是 CPU 密集的，其中 `heic-convert` 为纯 JS 实现会阻塞事件循环，扫描期间页面响应受影响

抽出后这里放进程入口，只 import `@/server/services/ingestion/` 下的 service，不接触 `.tsx`。这也是 `server/ingestion/` 与 UI 组件物理分离的原因。

参照 [immich](https://github.com/immich-app/immich) 的 `server/src/workers/`：同一代码库、不同进程入口，HTTP 服务与后台媒体处理分开跑。

实施细节见 REFACTOR.md。
