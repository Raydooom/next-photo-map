# 第一阶段：安装依赖
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm i -dd

# 第二阶段：构建源码
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 如果使用 Prisma，必须在这里生成 Client
# RUN npx prisma generate 

RUN npm run build

# 第三阶段：运行环境
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=development
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

# 注意：standalone 模式下入口是 server.js
CMD ["node", "server.js"]