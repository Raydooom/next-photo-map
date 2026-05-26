# 🗺️ 照片足迹 — Photo Map

一个自托管的个人摄影作品展示平台。照片自动扫描入库，在地图上标记足迹，支持 AI 语义搜索与聊天交互。

## 核心功能

- **照片自动扫描** — HEIC 转码、EXIF 提取、缩略图生成、MinIO 上传、高德逆地理编码、入库
- **足迹地图** — MapLibre 全屏地图，GeoJSON 聚类，按位置浏览照片
- **照片墙** — 瀑布流布局，全屏灯箱轮播，EXIF 信息展示
- **AI 聊天** — Ollama 意图分析 + pgvector 语义搜索，自然语言查找照片
- **AI 自动分析** — ModelScope 视觉模型生成描述/标签/主题，bge-m3 向量嵌入
- **管理后台** — 照片管理表格、文件扫描器（SSE 实时进度）、AI 分析面板

## 系统架构

![架构图](ARCHITECTURE.md)

部署架构：DNS → 公网 VPS (frps) → FRP 隧道 → 内网 NUC (frpc) → Nginx Proxy Manager → Docker 服务

| 服务 | 域名 | 说明 |
|------|------|------|
| 主应用 | `raydom.wang` | Next.js 全栈应用 |
| 对象存储 | `sso.raydom.wang` | MinIO S3 API |
| 地图瓦片 | `map.raydom.wang` | TileServer-GL |

## 技术栈

| 层 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router, Turbopack, RSC) |
| 语言 | TypeScript 5.6 (strict) |
| UI | HeroUI + Tailwind CSS 4 + Framer Motion 11 |
| 地图 | MapLibre GL JS 5 + Turf.js 7 |
| 数据库 | PostgreSQL + PostGIS + pgvector |
| ORM | Prisma 7 + @prisma/adapter-pg |
| 对象存储 | MinIO (S3) + @aws-sdk/client-s3 |
| 图片处理 | Sharp + exifr + heic-convert |
| AI | Ollama (本地) + ModelScope (视觉) + Vercel AI SDK |
| 容器化 | Docker + docker-compose |
| 内网穿透 | FRP (frps + frpc) |
| 反向代理 | Nginx Proxy Manager |


## 快速开始

### 环境要求

- Node.js 22+
- Docker & docker-compose
- PostgreSQL (with PostGIS + pgvector)
- MinIO (S3-compatible)
- Ollama (可选，用于 AI 功能)

### 本地开发

```bash
# 安装依赖
npm install

# 复制环境变量
cp .env .env.local
# 编辑 .env.local 填入数据库和 MinIO 连接信息

# 同步数据库
npm run prisma:push

# 启动开发服务器
npm run dev
```

### 生产部署

```bash
# 构建
npm run build

# Docker 构建
docker compose build --no-cache

# 启动
docker compose up -d
```

## 项目结构

```
web-next/
├── src/
│   ├── app/              # Next.js App Router 页面 & API 路由
│   │   ├── page.tsx      # 首页 (HeroSection + 照片墙)
│   │   ├── photos/       # 照片浏览
│   │   ├── footprint/    # 足迹地图
│   │   ├── aiChat/       # AI 聊天
│   │   ├── admin/        # 管理后台
│   │   └── api/          # API 路由 (SSE / 图片代理)
│   ├── components/       # 共享 UI 组件
│   ├── server/           # 服务端逻辑
│   │   ├── actions/      # Server Actions (RPC 入口)
│   │   ├── services/     # 业务服务层
│   │   └── lib/          # 基础设施 (DB/OSS/AI/SSE)
│   ├── config/           # 站点配置
│   ├── styles/           # 全局样式 (CSS 变量主题)
│   ├── types/            # TypeScript 类型
│   └── utils/            # 工具函数
├── prisma/
│   └── schema.prisma     # 数据库模型 (Photo/Exif/Location/AIAnalysis)
├── public/               # 静态资源
└── Dockerfile            # 多阶段构建
```

## 数据库模型

- **Photo** — 照片元数据 (文件、尺寸、时间、MinIO 键、特色标记)
- **PhotoExif** — 完整 EXIF 信息 (相机参数、GPS、原始数据)
- **Location** — 地理位置 (坐标、省市、地址、高德编码)
- **PhotoAiAnalysis** — AI 分析结果 (描述、标签、vector(1024) 嵌入、PostGIS 地理)

### Prisma 常用命令

```bash
# 修改模型后同步（推荐）
npm run db:sync -- --name 修改描述

# 快速同步不留记录
npm run prisma:push

# 可视化管理数据
npm run prisma:studio
```

## License

MIT
