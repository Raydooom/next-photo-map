-- 5.8 行政区划规范化：从 locations 抽出 regions 字典表
--
-- 顺序不能变：先建表、迁数据、加外键，最后才删旧列。
-- 直接用 prisma db push 会先删列，区划数据就没了。
--
-- township 不进 regions：adcode 是区县级代码，一个区下有多个街道
-- （如 110105 朝阳区含奥运村街道与孙河乡），放进来会破坏主键唯一性。

-- 1. 字典表
CREATE TABLE IF NOT EXISTS "regions" (
  "adcode"   TEXT NOT NULL,
  "country"  TEXT,
  "province" TEXT,
  "city"     TEXT,
  "district" TEXT,
  CONSTRAINT "regions_pkey" PRIMARY KEY ("adcode")
);

CREATE INDEX IF NOT EXISTS "regions_province_city_district_idx"
  ON "regions" ("province", "city", "district");

-- 2. 迁数据。DISTINCT ON 保证每个 adcode 只取一行 ——
--    已验证去掉 township 后同一 adcode 的区划是唯一的
INSERT INTO "regions" ("adcode", "country", "province", "city", "district")
SELECT DISTINCT ON ("adcode")
       "adcode", "country", "province", "city", "district"
FROM "locations"
WHERE "adcode" IS NOT NULL AND "adcode" <> ''
ORDER BY "adcode"
ON CONFLICT ("adcode") DO NOTHING;

-- 3. 把空字符串的 adcode 归一为 NULL，否则外键会指向不存在的 ''
UPDATE "locations" SET "adcode" = NULL WHERE "adcode" = '';

-- 4. 外键。RESTRICT：regions 是字典表，不该因删区划而丢照片位置
ALTER TABLE "locations"
  ADD CONSTRAINT "locations_adcode_fkey"
  FOREIGN KEY ("adcode") REFERENCES "regions" ("adcode")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- PG 不会为外键列自动建索引
CREATE INDEX IF NOT EXISTS "locations_adcode_idx" ON "locations" ("adcode");

-- 5. 旧列作废
ALTER TABLE "locations"
  DROP COLUMN "country",
  DROP COLUMN "province",
  DROP COLUMN "city",
  DROP COLUMN "district";
