# 第一阶段：安装依赖
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm i -d

# 第二阶段：构建源码
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建 Next.js 应用
RUN npm run build:docker

# 第三阶段：运行环境
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# 禁用 Next.js 遥测数据收集
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户提高安全性
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 仅拷贝构建好的独立运行文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]