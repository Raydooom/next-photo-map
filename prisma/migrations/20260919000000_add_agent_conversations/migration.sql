-- Agent 会话历史：应用层的可见记录。
-- LangGraph checkpoint 只负责 Agent 上下文，不能作为侧栏历史或消息回放的数据源。

CREATE TYPE "AgentMessageRole" AS ENUM ('USER', 'ASSISTANT');
CREATE TYPE "AgentMessageKind" AS ENUM ('TEXT', 'PHOTO_RESULTS');
CREATE TYPE "AgentMessageStatus" AS ENUM ('COMPLETED', 'INTERRUPTED', 'ERROR');

CREATE TABLE "agent_conversations" (
  "id" TEXT NOT NULL,
  "visitor_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "agent_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_messages" (
  "id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "role" "AgentMessageRole" NOT NULL,
  "kind" "AgentMessageKind" NOT NULL DEFAULT 'TEXT',
  "status" "AgentMessageStatus" NOT NULL DEFAULT 'COMPLETED',
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "agent_conversations_visitor_id_updated_at_idx"
  ON "agent_conversations" ("visitor_id", "updated_at" DESC);

CREATE INDEX "agent_messages_conversation_id_sequence_idx"
  ON "agent_messages" ("conversation_id", "sequence");

CREATE UNIQUE INDEX "agent_messages_conversation_id_sequence_key"
  ON "agent_messages" ("conversation_id", "sequence");

ALTER TABLE "agent_messages"
  ADD CONSTRAINT "agent_messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "agent_conversations" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
