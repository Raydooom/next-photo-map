import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 在初始化 pool 后立即添加监听器
pool.on('error', err => {
  console.error('Unexpected error on idle client', err);
});

const adapter = new PrismaPg(pool as any);

const prisma = new PrismaClient({
  adapter,
  // log: ['query', 'info', 'warn', 'error'],
  log: ['warn', 'error']
});

export { prisma, Prisma };
