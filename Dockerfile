# 第一阶段：安装依赖
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
COPY prisma ./prisma/
RUN npm i -dd

# 第二阶段：构建源码
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 声明一个构建参数
ARG DATABASE_URL
# 将参数转为环境变量，供 build 阶段使用
ENV DATABASE_URL=$DATABASE_URL

# 应用 Prisma 数据库迁移
RUN npm run build:docker

# 第三阶段：运行环境
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# 禁用 Next.js 遥测数据收集
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户提高安全性
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 仅拷贝构建好的独立运行文件
# 必须显式拷贝 prisma 目录，否则运行时无法执行迁移
COPY --from=builder /app/prisma ./prisma
# 拷贝 package.json 以确保 npx 命令在当前目录能找到上下文
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000

# 在compose中启动
# CMD ["node", "server.js"]