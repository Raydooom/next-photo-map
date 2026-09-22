import 'server-only';

import { createAgent as cAgent } from 'langchain';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import {
  getFoundationChatModel,
  type FoundationModelName
} from './chat-model';

const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL!);

await checkpointer.setup();

/**
 * LangGraph Agent 工厂。图片分析不得直接导入本模块，
 * 应使用 chat-model.ts 的无 checkpoint 基础模型入口。
 */
export const createAgent = ({
  model = 'qw',
  systemPrompt,
  tools = [],
  openCheckpointer = true
}: {
  model?: FoundationModelName;
  systemPrompt: string;
  tools?: any[];
  openCheckpointer?: boolean;
}) => {
  return cAgent({
    model: getFoundationChatModel(model),
    checkpointer: openCheckpointer ? checkpointer : false,
    tools,
    systemPrompt
  });
};
