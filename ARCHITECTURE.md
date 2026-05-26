# 项目架构图

> 使用 [Mermaid](https://mermaid.js.org/) 绘制，支持 GitHub、VS Code 等渲染。

---

## 1. 系统总览架构

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#1a1a2e', 'primaryTextColor': '#fff', 'primaryBorderColor': '#7c3aed', 'lineColor': '#7c3aed', 'secondaryColor': '#16213e', 'tertiaryColor': '#0f3460'}}}%%
graph TB
    subgraph Browser["🌐 浏览器"]
        NextApp["Next.js 应用<br/>(React Server Components)"]
    end

    subgraph VPS["☁️ 云服务器 (公网)"]
        FRPS["FRP Server (frps)<br/>端口 80/443"]
        DNS["DNS: raydom.wang<br/>sso.raydom.wang<br/>map.raydom.wang"]
    end

    subgraph NUC["💻 NUC (Debian 内网)"]
        FRPC["FRP Client (frpc)"]

        subgraph NPM_["Nginx Proxy Manager<br/>80/443 → SSL 终结"]
            NPM["jc21/nginx-proxy-manager"]
        end

        subgraph Docker["🐳 Docker 服务 (同一网络 photo_map_network)"]
            NPM["nginx-proxy-manager<br/>端口 80 / 443 / 81"]
            Next["photo-map-next<br/>Next.js 15 (端口 3000)"]
            DB[("photo-map-db<br/>PostgreSQL + PostGIS<br/>+ pgvector (5432)")]
            MinIO[("photo-map-minio<br/>S3 对象存储 (9000)")]
            Tile["photo-map-tileserver<br/>地图瓦片服务 (8080)"]
        end

        subgraph Host["🏠 宿主机"]
            Ollama["Ollama<br/>bge-m3 / qwen2.5 / moondream<br/>(端口 11434)"]
            Photos["📁 /mnt/map-photos<br/>照片文件"]
        end
    end

    subgraph External["🔗 外部服务"]
        ModelScope["ModelScope<br/>(视觉模型)"]
        Amap["高德地图 API<br/>(逆地理编码)"]
        Baidu["百度统计"]
        Git["Git (CI/CD)"]
    end

    DNS -->|"域名解析"| VPS
    Browser -->|"HTTPS raydom.wang"| VPS
    VPS -->|"FRP 隧道<br/>80/443 → NUC"| FRPC
    FRPC -->|"localhost:80/443"| NPM
    NPM -->|"raydom.wang"| Next
    NPM -->|"sso.raydom.wang"| MinIO
    NPM -->|"map.raydom.wang"| Tile
    Next -->|"Server Actions"| Services
    Next -->|"Prisma ORM (内网)"| DB
    Next -->|"S3 SDK (内网)"| MinIO
    Next -->|"Ollama SDK"| Ollama
    Next -->|"读取照片文件"| Photos
    Next -->|"SSE 流"| Browser
    Next -->|"OpenAI SDK"| ModelScope
    Next -->|"REST API"| Amap
    Next -->|"next/script"| Baidu
    Next -->|"Git CLI / Docker CLI"| Git

    subgraph Services["⚙️ 服务层 (src/server/)"]
        PS["Photo Service"]
        LS["Location Service"]
        ES["EXIF Service"]
        AS["AI Service"]
        CS["Chat Service"]
        SS["Scanner Service"]
        DS["Deploy Service"]
        FS["File Manage Service"]
    end
```

---

## 2. 前端组件树

### 2a. 布局层级

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#1a1a2e', 'primaryTextColor': '#fff', 'primaryBorderColor': '#0ea5e9', 'lineColor': '#0ea5e9', 'secondaryColor': '#16213e', 'tertiaryColor': '#0f3460'}}}%%
flowchart TD
    Root["RootLayout (Server)"]
    Prov["Providers (Client)"]
    HW["HeroUIProvider"]
    TP["ToastProvider"]
    NTP["NextThemesProvider"]
    LW["LayoutWrapper (Client)"]
    NB["Navbar"]
    Page["&lt;main&gt;{children}&lt;/main&gt;"]

    Root --> Prov --> HW
    HW --> TP & NTP
    NTP --> LW
    LW --> NB & Page
```

### 2b. 首页 (/)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#1a1a2e', 'primaryTextColor': '#fff', 'primaryBorderColor': '#0ea5e9', 'lineColor': '#0ea5e9', 'secondaryColor': '#16213e', 'tertiaryColor': '#0f3460'}}}%%
flowchart TD
    HS["HeroSection (Server)"]
    Banner["Banner"]
    Carousel["Carousel (Embla)"]
    AreaMap["AreaMap"]
    Stats["Stats Bar"]
    Recently["Recently"]
    Masonry["MasonryGrid (Masonic)"]
    PCard["PhotoCard"]

    HS --> Banner & AreaMap & Stats
    Banner --> Carousel
    Recently --> Masonry --> PCard
```

### 2c. 照片页 (/photos)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#1a1a2e', 'primaryTextColor': '#fff', 'primaryBorderColor': '#0ea5e9', 'lineColor': '#0ea5e9', 'secondaryColor': '#16213e', 'tertiaryColor': '#0f3460'}}}%%
flowchart TD
    MG["MasonryGrid"]
    PC["PhotoCard"]
    PP["PhotoPreview<br/>(HeroUI Modal)"]
    CV["Carousel<br/>(Full-screen Embla)"]

    MG --> PC --> PP --> CV
```

### 2d. 足迹地图 (/footprint)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#1a1a2e', 'primaryTextColor': '#fff', 'primaryBorderColor': '#0ea5e9', 'lineColor': '#0ea5e9', 'secondaryColor': '#16213e', 'tertiaryColor': '#0f3460'}}}%%
flowchart TD
    MapBase["useMapBase Hook<br/>MapLibre 初始化"]
    MapCluster["useMapClusters Hook<br/>GeoJSON 聚类"]
    ClusterM["ClusterMarker"]
    SingleM["SingleMarker"]
    MapMarker["MapMarker<br/>(React Portal)"]
    MapCtrl["MapControls"]
    PD["PointDetail Panel"]

    MapBase --> MapCtrl
    MapCluster --> ClusterM & SingleM & MapMarker
    PD
```

### 2e. AI 聊天 (/chat)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#1a1a2e', 'primaryTextColor': '#fff', 'primaryBorderColor': '#0ea5e9', 'lineColor': '#0ea5e9', 'secondaryColor': '#16213e', 'tertiaryColor': '#0f3460'}}}%%
flowchart TD
    Sidebar["ChatSidebar"]
    Header["ChatHeader"]
    MsgList["ChatMessageList"]
    Msg["ChatMessage"]
    Input["ChatInput"]
    Welcome["WelcomeScreen"]

    Sidebar & Header & MsgList & Input
    MsgList --> Msg
    Welcome
```

### 2f. 管理后台 (/admin/*)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#1a1a2e', 'primaryTextColor': '#fff', 'primaryBorderColor': '#0ea5e9', 'lineColor': '#0ea5e9', 'secondaryColor': '#16213e', 'tertiaryColor': '#0f3460'}}}%%
flowchart TD
    subgraph Overview["/admin"]
        SC["Stats Cards"]
        QL["Quick Links"]
    end
    subgraph Photos["/admin/photos"]
        PT["Photo Table"]
        LM["LocationModal (Map)"]
    end
    subgraph Scan["/admin/scan"]
        SV["Scan View (SSE)"]
        RealTime["实时统计 + 日志"]
    end
    subgraph Deploy["/admin/deploy"]
        DV["Deploy View (SSE)"]
        Pipeline["Git → Prisma → Build → Up"]
    end
```

---

## 3. 请求与数据流

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#1a1a2e', 'primaryTextColor': '#fff', 'primaryBorderColor': '#10b981', 'lineColor': '#10b981', 'secondaryColor': '#16213e', 'tertiaryColor': '#0f3460'}}}%%
sequenceDiagram
    actor U as 用户
    participant B as 浏览器
    participant N as Next.js Server
    participant S as 服务层 (src/server/)
    participant DB as PostgreSQL
    participant M as MinIO
    participant E as 外部服务

    %% 正常页面加载
    U->>B: 访问页面
    B->>N: HTTP GET
    N->>S: Server Action (RSC)
    S->>DB: Prisma Query
    DB-->>S: 数据
    S->>M: getImageUrl() → 签名 URL
    M-->>S: 返回
    S-->>N: 序列化 props
    N-->>B: HTML + RSC Payload
    B->>M: 加载图片 (通过 /api/image 代理)
    M-->>B: 图片数据 (缓存 7 天)

    %% 客户端交互 (照片页)
    B->>N: 点击照片 → 打开 Lightbox
    N->>S: getPhotoDetail Action
    S->>DB: Prisma Query (带 EXIF/Location)
    DB-->>S: 
    S-->>N: 照片详情
    N-->>B: 客户端状态更新

    %% SSE 扫描流程
    B->>N: GET /api/admin/scan (SSE)
    N->>S: ScannerService.startScanner()
    S->>M: 读取文件系统
    S->>M: 上传缩略图 (Sharp)
    S->>E: 逆地理编码 (高德)
    E-->>S: 地址
    S->>DB: 创建 Photo + EXIF + Location
    S-->>N: SSE: progress event
    N-->>B: SSE: progress stream

    %% SSE AI 分析流程
    B->>N: GET /api/ai/analysis (SSE)
    N->>S: AIService.analyzeAll()
    S->>M: 读取原图
    S->>E: 视觉模型分析 (ModelScope)
    E-->>S: Desctiption + Tags
    S->>E: 生成 Embedding (Ollama)
    E-->>S: Vector(1024)
    S->>DB: 更新 PhotoAiAnalysis
    N-->>B: SSE: progress stream

    %% AI 聊天流程
    U->>B: 输入问题
    B->>N: POST /api/ai/chat (SSE)
    N->>S: 意图分析 (Ollama)
    S->>E: Ollama 推理
    E-->>S: 意图类型
    alt PHOTO_SEARCH
        S->>DB: 向量相似度搜索 (pgvector <=>)
        DB-->>S: Top-K 照片
        S->>M: 获取图片 URL
    end
    S-->>N: SSE: streaming tokens
    N-->>B: SSE: chat stream
```

---

## 4. 后端服务依赖关系

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#1a1a2e', 'primaryTextColor': '#fff', 'primaryBorderColor': '#f59e0b', 'lineColor': '#f59e0b', 'secondaryColor': '#16213e', 'tertiaryColor': '#0f3460'}}}%%
graph LR
    subgraph Actions["📮 Server Actions (入口)"]
        Public["src/server/actions/index.ts<br/>getPhotoList / countAllPhotos<br/>getPhotoDetail / getLocations"]
        Admin["src/server/actions/admin.ts<br/>startScan / deletePhoto / updateLocation<br/>rebuildThumb / checkFileExists"]
        AI["src/server/actions/ai.ts<br/>analyzeAll / updateEmbedding"]
    end

    subgraph Services["⚙️ Services (业务逻辑)"]
        PS["Photo Service"]
        LS["Location Service"]
        ES["EXIF Service"]
        FS["File Manage Service"]
        AS["AI Service"]
        CS["Chat Service"]
        SS["Scanner Service"]
        GS["Geocoding Service"]
    end

    subgraph Lib["📚 Lib (基础设施)"]
        DB["db.ts<br/>PrismaClient + pg Pool"]
        OSS["oss.ts<br/>S3Client × 2<br/>upload / delete / getUrl"]
        TOKEN["image-token.ts<br/>HMAC 签名"]
        AI_LIB["ai.ts<br/>Ollama + ModelScope + OpenAI"]
        SSE["sse.ts<br/>SSE 工具"]
    end

    subgraph External["🌍 外部依赖"]
        PG[("PostgreSQL<br/>PostGIS + pgvector")]
        MINIO[("MinIO<br/>S3 Bucket")]
        OLLAMA["Ollama<br/>bge-m3 / qwen2.5"]
        MSCOPE["ModelScope<br/>视觉模型"]
        AMAP["高德 API<br/>逆地理编码"]
    end

    Public --> PS
    Public --> LS
    Admin --> SS
    Admin --> FS
    Admin --> PS
    AI --> AS
    AI --> CS

    PS --> DB
    PS --> OSS
    LS --> DB
    ES --> DB
    FS --> OSS
    AS --> DB
    AS --> AI_LIB
    AS --> OSS
    CS --> DB
    CS --> AI_LIB
    CS --> OSS
    SS --> PS
    SS --> FS
    SS --> LS
    SS --> ES
    SS --> GS
    GS --> AMAP

    DB --> PG
    OSS --> MINIO
    AI_LIB --> OLLAMA
    AI_LIB --> MSCOPE
```

---

## 5. 照片扫描处理流程

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#1a1a2e', 'primaryTextColor': '#fff', 'primaryBorderColor': '#ef4444', 'lineColor': '#ef4444', 'secondaryColor': '#16213e', 'tertiaryColor': '#0f3460'}}}%%
flowchart TD
    S(["开始扫描"]) --> G["glob 扫描目录<br/>图片 + 视频"]
    G --> Grp["文件分组<br/>照片 ↔ 配套视频"]
    Grp --> Ck{"已存在?"}
    Ck -->|是| Skip["跳过"]
    Ck -->|否/强制| P

    subgraph P["处理流水线"]
        H{"HEIC?"}
        H -->|是| Conv["heic-convert"]
        H -->|否| Load["fs.readFile"]
        Conv & Load --> Exif["exifr 解析 EXIF"]
        Exif --> Thumb["Sharp 缩略图<br/>200px + 1400px"]
        Thumb --> Color["提取主色调"]
        Color --> Up["上传 MinIO<br/>raw/small/large/video"]
        Up --> Geo["高德逆地理编码"]
        Geo --> DB["写入 DB<br/>Photo+Exif+Location"]
    end

    P --> Log["日志记录"]
    Log & Skip --> E(["完成"])
```

---

## 6. 网络拓扑与部署架构

### 6a. 网络拓扑 (FRP + NPM + Docker)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#1a1a2e', 'primaryTextColor': '#fff', 'primaryBorderColor': '#8b5cf6', 'lineColor': '#8b5cf6', 'secondaryColor': '#16213e', 'tertiaryColor': '#0f3460'}}}%%
graph TB
    subgraph Internet["🌍 公网"]
        DNS["DNS 解析"]
        User["用户"]
        VPS["云服务器<br/>IP: 1.2.3.4"]
        FRPS["FRP Server (frps)<br/>监听 80 / 443"]
    end

    subgraph LocalNet["🔒 内网 (NUC - Debian)"]
        subgraph HostLevel["宿主机层"]
            FRPC["FRP Client (frpc)<br/>连接 VPS 隧道"]
            Ollama["Ollama<br/>host.docker.internal:11434"]
            Photos["照片目录<br/>/mnt/map-photos"]
        end

        subgraph DockerLevel["🐳 Docker 容器层"]
            subgraph PhotoNet["photo_map_network (同一网络)"]
                NPM["nginx-proxy-manager<br/>jc21/nginx-proxy-manager<br/>端口 80 / 443 / 81"]
                Next["photo-map-next<br/>Next.js 15<br/>端口 3000"]
                MinIO["photo-map-minio<br/>MinIO S3<br/>端口 9000 (API)<br/>端口 9001 (Console)"]
                PG[("photo-map-db<br/>PostgreSQL + PostGIS<br/>+ pgvector<br/>端口 5432")]
                Tile["photo-map-tileserver<br/>TileServer-GL<br/>端口 8080"]
            end
        end
    end

    User -->|"raydom.wang"| DNS
    DNS -->|"→ VPS IP"| User
    User -->|"HTTPS 443"| VPS
    VPS -->|"FRP 隧道<br/>80→80, 443→443"| FRPC
    FRPC -->|"localhost:80/443"| NPM

    NPM -->|"raydom.wang →<br/>容器名:3000"| Next
    NPM -->|"sso.raydom.wang →<br/>容器名:9000"| MinIO
    NPM -->|"map.raydom.wang →<br/>容器名:8080"| Tile

    Next -->|"S3 SDK (内网容器名)"| MinIO
    Next -->|"Prisma (内网容器名)"| PG
    Next -->|"Ollama SDK<br/>host.docker.internal"| Ollama
    Next -->|"读取照片"| Photos
    Next -->|"Docker CLI / Git"| HostLevel

    subgraph Domains["📌 域名路由"]
        D1["raydom.wang<br/>→ photo-map-next:3000<br/>主应用"]
        D2["sso.raydom.wang<br/>→ photo-map-minio:9000<br/>MinIO 对象存储"]
        D3["map.raydom.wang<br/>→ photo-map-tileserver:8080<br/>地图瓦片服务"]
    end

    NPM --> Domains
```
---

## 7. Docker 服务一览

| 容器 | 镜像 | 端口 | 网络 | 作用 |
|------|------|------|------|------|
| `nginx-proxy-manager` | `jc21/nginx-proxy-manager` | 80, 443, 81 | `photo_map_network` | 反向代理 + SSL 终结 |
| `photo-map-next` | 自构建 (Dockerfile) | 3000 | `photo_map_network` | Next.js 全栈应用 |
| `photo-map-db` | 自构建 (db.Dockerfile) | 5432 | `photo_map_network` | PostgreSQL + PostGIS + pgvector |
| `photo-map-minio` | `minio/minio` | 9000, 9001 | `photo_map_network` | S3 兼容对象存储 |
| `photo-map-tileserver` | `maptiler/tileserver-gl` | 8080 | `photo_map_network` | 离线地图瓦片服务 |

### 域名 → 服务映射

NPM 与所有后端容器同属 `photo_map_network`，可直接通过 **容器名** 反代：

| 域名 | NPM 代理目标 | 说明 |
|------|-------------|------|
| `raydom.wang` | `http://photo-map-next:3000` | 主应用 (照片足迹) |
| `sso.raydom.wang` | `http://photo-map-minio:9000` | MinIO S3 API (图片托管) |
| `map.raydom.wang` | `http://photo-map-tileserver:8080` | 地图瓦片服务 (MapLibre 样式) |

### Docker 网络

| 网络 | 类型 | 包含容器 |
|------|------|---------|
| `photo_map_network` | `external: true` | NPM + Next + DB + MinIO + Tile 全部在同一个网络中 |

## 8. 技术栈一览

| 分类 | 技术 | 用途 |
|------|------|------|
| **框架** | Next.js 15 (App Router, Turbopack) | 全栈框架 |
| **语言** | TypeScript 5.6 (strict) | 开发语言 |
| **UI** | HeroUI (NextUI) + Tailwind CSS 4 | 组件库 + 样式 |
| **动画** | Framer Motion 11 | 动效 |
| **地图** | MapLibre GL JS 5 + Turf.js 7 | 地图渲染 + 空间分析 |
| **数据库** | PostgreSQL + PostGIS + pgvector | 数据存储 + 地理 + 向量 |
| **ORM** | Prisma 7 + @prisma/adapter-pg | 数据库 ORM |
| **对象存储** | MinIO (S3) + @aws-sdk/client-s3 | 图片/视频存储 |
| **图片处理** | Sharp + exifr + heic-convert | 缩略图 + EXIF + 格式转换 |
| **AI** | Ollama + ModelScope + Vercel AI SDK | 向量嵌入 + 视觉分析 + 聊天 |
| **流式传输** | ReadableStream (SSE) | 扫描/分析/聊天/部署进度 |
| **地理编码** | 高德地图 API | 坐标→地址 |
| **容器化** | Docker + docker-compose | 部署运行 |
| **内网穿透** | FRP (frps + frpc) | 公网 → 内网隧道 |
| **反向代理** | Nginx Proxy Manager | SSL 终结 + 域名路由 |
