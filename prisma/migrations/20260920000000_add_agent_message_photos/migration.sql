-- Agent 照片结果：消息仅保存稳定 photoId 与顺序，历史回放时重新生成签名 URL。

ALTER TABLE "agent_messages"
  ADD COLUMN "photo_total" INTEGER;

CREATE TABLE "agent_message_photos" (
  "message_id" TEXT NOT NULL,
  "photo_id" INTEGER NOT NULL,
  "position" INTEGER NOT NULL,

  CONSTRAINT "agent_message_photos_pkey" PRIMARY KEY ("message_id", "photo_id")
);

CREATE UNIQUE INDEX "agent_message_photos_message_id_position_key"
  ON "agent_message_photos" ("message_id", "position");

CREATE INDEX "agent_message_photos_photo_id_idx"
  ON "agent_message_photos" ("photo_id");

ALTER TABLE "agent_message_photos"
  ADD CONSTRAINT "agent_message_photos_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "agent_messages" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_message_photos"
  ADD CONSTRAINT "agent_message_photos_photo_id_fkey"
  FOREIGN KEY ("photo_id") REFERENCES "photos" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
