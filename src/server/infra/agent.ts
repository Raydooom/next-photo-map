import 'server-only';
import { createAgent as cAgent } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL!);

await checkpointer.setup();

const MODEL_LIST: Record<string, any> = {
  qw: new ChatOpenAI('qwen3.8-max', {
    apiKey: process.env.QWEN_API_KEY!,
    configuration: {
      baseURL: process.env.QWEN_API_URL
    }
  }),
  ollama: new ChatOllama({
    model: 'qwen3:4b-q4_K_M',
    baseUrl: process.env.OLLAMA_API_URL,
    temperature: 0
  })
};

export const createAgent = ({
  model = 'qw',
  systemPrompt,
  tools = [],
  openCheckpointer = true
}: {
  model?: string;
  systemPrompt: string;
  tools?: any[];
  openCheckpointer?: boolean;
}) => {
  const agent = cAgent({
    model: MODEL_LIST[model],
    checkpointer: openCheckpointer ? checkpointer : false,
    tools,
    systemPrompt
  });
  return agent;
};
