import 'server-only';

import { createAgent as cAgent } from 'langchain';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { getChatModel } from './chat-model';

let checkpointerPromise: Promise<PostgresSaver> | undefined;

/**
 * checkpoint 建表推迟到首次用到时，且整个进程只做一次。
 *
 * 不能放在模块顶层 await：next build 的 collect page data 阶段会加载
 * /api/agent/chat 的路由模块，顶层 await 会让构建机去连数据库 ——
 * 构建容器里既解析不到 db 主机名，库也未必在跑，ECONNREFUSED 直接让构建失败。
 *
 * setup 失败时清掉缓存，使下一次请求能重试；否则首次赶上数据库没就绪，
 * 这个进程就永久拿不到 checkpointer 了。
 */
function getCheckpointer() {
  if (!checkpointerPromise) {
    const saver = PostgresSaver.fromConnString(process.env.DATABASE_URL!);

    checkpointerPromise = saver
      .setup()
      .then(() => saver)
      .catch((error) => {
        checkpointerPromise = undefined;
        throw error;
      });
  }

  return checkpointerPromise;
}

/**
 * LangGraph Agent 工厂。图片分析不得直接导入本模块，
 * 应使用 chat-model.ts 的无 checkpoint 基础模型入口。
 */
export const createAgent = async ({
  systemPrompt,
  tools = [],
  openCheckpointer = true
}: {
  systemPrompt: string;
  tools?: any[];
  openCheckpointer?: boolean;
}) => {
  return cAgent({
    // 对话模型由 CHAT_* 环境变量决定
    model: getChatModel(),
    checkpointer: openCheckpointer ? await getCheckpointer() : false,
    tools,
    systemPrompt
  });
};
