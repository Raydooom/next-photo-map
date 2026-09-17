# worker

独立进程入口的预留位置。

目前照片扫描和 AI 分析跑在 Next.js 进程内（`/api/admin/scan`、`/api/ai/analysis` 的 SSE 路由里直接 `await` 服务），存在两个问题：

- 任务寿命绑定在 HTTP 连接上，断线即中断，且没有持久化进度
- `sharp` 与 `heic-convert` 是 CPU 密集的，其中 `heic-convert` 是纯 JS 实现会阻塞事件循环，扫描期间页面响应受影响

抽出 worker 后，这里放进程入口，只 import `@/server/ingestion/` 下的 service，不接触任何 `.tsx`。这也是 `server/ingestion/` 与 UI 组件物理分离的原因。

参照 [immich](https://github.com/immich-app/immich) 的 `server/src/workers/` —— 同一代码库、不同进程入口，HTTP 服务与后台媒体处理分开跑。

实施细节见 REFACTOR.md 的 4.15 与第 5 批中的 `ScanJob` 相关条目。
