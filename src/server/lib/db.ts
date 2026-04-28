import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@prisma/client';

async function testDbConnection() {
  try {
    // 尝试执行一个极简查询
    await prisma.$connect();
    console.log(
      '✅ 数据库连接成功！当前使用的 URL 是:',
      process.env.DATABASE_URL?.split('@')[1]
    ); // 隐藏密码打印 URL 尾部
  } catch (e) {
    console.error('❌ 数据库连接失败！错误详情:', e);
    // 检查是否是因为没有读取到环境变量
    if (!process.env.DATABASE_URL) {
      console.error('⚠️ 警告：DATABASE_URL 环境变量为空！');
    }
  }
}
testDbConnection();
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
