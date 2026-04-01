
---

## 📸 照片地图系统 - 数据库维护指南

本项目使用 **Prisma ORM** 配合 **PostgreSQL** 进行数据管理。

### 🚀 常用开发流程

#### 1. 修改模型后同步 (最常用)
当你修改了 `prisma/schema.prisma` 中的表结构（例如在 `photo_exifs` 中增加了新字段）时：
```bash
npm run db:sync -- --name 你的修改描述
```
* **作用**：生成 SQL 迁移文件 + 更新数据库结构 + 重新生成本地 TypeScript 类型。
* **注意**：`--` 是必须的，用于将参数传递给底层的 Prisma 命令。

#### 2. 快速测试同步 (不留记录)
如果你只是想临时测试一个字段，不想生成繁琐的迁移文件：
```bash
npm run prisma:push
```
* **作用**：直接将 Schema 强制推送到数据库。**注意：** 如果字段冲突，可能会导致数据丢失。

#### 3. 可视化管理数据
想要像 Excel 一样查看和编辑 `photos` 或 `users` 表的数据：
```bash
npm run prisma:studio
```
* **访问**：浏览器打开 `http://localhost:5555`。

---

### 🛠 命令详解

| 命令 | 完整指令 | 使用场景 |
| :--- | :--- | :--- |
| **`db:sync`** | `migrate dev && generate` | **推荐**。改完 Schema 后的全自动同步。 |
| **`prisma:migrate`** | `prisma migrate dev` | 仅创建并执行 SQL 迁移记录。 |
| **`prisma:push`** | `prisma db push` | 原型开发阶段，快速同步结构而不产生迁移文件。 |
| **`prisma:pull`** | `prisma db pull` | **反向工程**。如果直接在数据库改了表，用它拉取到 Schema。 |
| **`prisma:generate`** | `prisma generate` | 仅更新 `node_modules` 中的 TS 类型提示。 |
| **`prisma:studio`** | `prisma studio` | 打开网页版数据库管理后台。 |

---

### ⚠️ 注意事项

1.  **环境变量**：确保根目录 `.env` 中的 `DATABASE_URL` 指向正确的 PostgreSQL 实例。
2.  **生产环境**：在服务器上部署时，请使用 `npx prisma migrate deploy`，严禁使用 `migrate dev` 避免意外重置数据库。
3.  **HEIC/EXIF 写入**：在执行 `db:sync` 后，如果你的 `ScannerService` 报错找不到新字段，请尝试重启 VS Code 以刷新 TS 缓存。

---
