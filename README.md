# 🗺️ 照片足迹 — Photo Map

一个自托管的个人摄影作品展示平台。照片自动扫描入库，在地图上标记足迹，支持自然语言检索照片。

## 文档

| 文档 | 内容 |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 部署拓扑、代码分层、路由与服务模块、关键流程时序图、数据模型 |
| [AGENT_DEVELOPMENT_PLAN.md](./AGENT_DEVELOPMENT_PLAN.md) | Agent 模块的能力边界、五个检索工具、SSE 协议、已实施的约束与缺口 |
| [REFACTOR.md](./REFACTOR.md) | 待优化清单，按执行顺序编排；附不改的决定与验证方式 |

## 核心功能

- **照片自动扫描** — HEIC 转码、EXIF 提取、缩略图生成、MinIO 上传、高德逆地理编码、入库
- **足迹地图** — MapLibre 全屏地图，GeoJSON 聚类，按位置浏览照片
- **照片墙** — 瀑布流布局，全屏灯箱轮播，EXIF 信息展示
- **AI 检索** — LangGraph Agent 加五个只读工具，按时间、地点、AI 标签、画面语义、拍摄参数找照片
- **AI 自动分析** — 视觉模型生成描述与标签，bge-m3 生成 1024 维向量
- **管理后台** — 照片管理表格、扫描器与批量分析（均为 SSE 实时进度）

## 系统架构

```text
DNS → 公网 VPS (frps) → FRP 隧道 → 内网 NUC (frpc) → Nginx Proxy Manager → Docker
```

| 服务 | 域名 | 说明 |
|------|------|------|
| 主应用 | `raydom.wang` | Next.js 全栈应用 |
| 对象存储 | `sso.raydom.wang` | MinIO S3 API |
| 地图瓦片 | `map.raydom.wang` | TileServer-GL |

图示与细节见 [ARCHITECTURE.md](./ARCHITECTURE.md)。

## 技术栈

| 层 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router, Turbopack, RSC) |
| 语言 | TypeScript 5.6 (strict) |
| UI | HeroUI + Tailwind CSS 4 + motion 13 |
| 地图 | MapLibre GL JS 5 + Turf.js 7 |
| 数据库 | PostgreSQL + PostGIS + pgvector |
| ORM | Prisma 7 + @prisma/adapter-pg |
| 对象存储 | MinIO (S3) + @aws-sdk/client-s3 |
| 图片处理 | Sharp + exifr + heic-convert |
| AI 编排 | LangChain 1.5 / LangGraph 1.4 |
| 模型接入 | Ollama 本地，或任意 OpenAI 兼容端点（百炼、魔搭） |
| 容器化 | Docker + docker-compose |
| 内网穿透 | FRP (frps + frpc) |
| 反向代理 | Nginx Proxy Manager |

## 快速开始

### 环境要求

- Node.js 22+
- Docker & docker-compose
- PostgreSQL（需 PostGIS + pgvector 扩展）
- MinIO（S3 兼容）
- Ollama（AI 功能需要，也可改用云端 API）

### 本地开发

```bash
npm install

# 环境变量：按注释填写，每项都标了必填/可选与缺失后果
cp .env.example .env.local

# 应用数据库迁移
npm run db:migrate:local

npm run dev
```

模型配置按**用途**分三组，不按平台分组 —— `CHAT_*`（对话）、`VISION_*`（图片分析）、`EMBEDDING_*`（向量），每组四项 `API_TYPE` / `MODEL` / `API_URL` / `API_KEY`。`API_TYPE` 取 `ollama` 或 `openai`，只区分调用协议，接新平台不用改代码。

### 生产部署

```bash
# 构建镜像（构建期环境变量取自 .env.docker）
docker compose build --no-cache
docker compose up -d

# 数据库迁移（需与服务器同局域网）
npm run db:status:prod    # 先看状态
npm run db:migrate:prod
```

`env_file` 在容器创建时读取，改完 `.env.docker` 需要 `docker compose up -d --force-recreate` 才生效。`NEXT_PUBLIC_*` 是构建期内联进产物的，改动必须重新构建镜像。

## 项目结构

```
web-next/
├── src/
│   ├── app/
│   │   ├── (site)/           # 带导航栏的公开页面：首页 / photos / footprint
│   │   ├── (admin)/admin/    # 管理后台，layout 中鉴权后渲染
│   │   ├── agent/            # AI 检索，全屏三栏，不挂站点导航
│   │   └── api/              # agent / admin / ai / image 路由
│   ├── components/           # 跨页面复用：photo / map / ui / layout / Icons
│   ├── server/
│   │   ├── infra/            # db / storage / chat-model / agent / sse / image-token
│   │   ├── services/         # photo / ingestion / ai（agent + image-analysis）
│   │   ├── auth.ts           # 访问控制
│   │   └── actions.ts        # 公开读取类 Server Action
│   ├── lib/                  # 两端可用：format / contracts / types
│   ├── config/  styles/  middleware.ts
│   └── worker/               # 预留：ingestion 独立进程
├── prisma/
│   ├── schema.prisma
│   └── migrations/           # 单个 baseline，见 REFACTOR.md
└── Dockerfile                # 多阶段构建，standalone 产物
```

组件归属规则：只有一个页面用放 `app/xxx/_components/`，多个页面用放 `components/<域>/`，无业务语义放 `components/ui/`。

## 数据库模型

| 模型 | 内容 |
|---|---|
| `Photo` | 文件、尺寸、拍摄时间、MinIO 键、置顶标记 |
| `PhotoExif` | 完整 EXIF（相机参数、GPS、原始 JSON） |
| `Location` | 坐标、街道、详细地址，外键指向 `Region` |
| `Region` | 行政区划字典，以高德 adcode 为主键 |
| `PhotoAiAnalysis` | 描述、主题、标签、两个 `vector(1024)` 向量 |
| `AgentConversation` / `AgentMessage` / `AgentMessagePhoto` | Agent 会话、消息、照片引用 |

LangGraph 的 `checkpoint*` 四张表由 `PostgresSaver` 自动创建，不在 Prisma schema 内 —— `prisma migrate diff` 的输出会包含删除它们的语句，**不能直接当 migration 执行**。

### Prisma 常用命令

```bash
npm run db:migrate:local   # 本地：生成并应用迁移
npm run db:migrate:prod    # 生产：应用迁移（migrate deploy）
npm run db:status:prod     # 生产：查看迁移状态
npm run prisma:generate    # 只生成 Client
npm run prisma:studio      # 可视化查看本地库
```

## License

MIT
