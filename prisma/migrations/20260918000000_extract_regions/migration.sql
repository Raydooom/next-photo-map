-- 5.8 行政区划规范化：从 locations 抽出 regions 字典表
--
-- 该迁移同时兼容两类数据库：
-- 1. 旧结构仍含 locations.country / province / city / district；
-- 2. 已通过 schema 同步进入目标结构、但 Prisma 迁移记录尚未完成。
-- 第二种情况下只补齐缺失约束与索引，不会再次引用已经删除的旧列。

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

-- 2. 仅当旧列还存在时才迁移数据。动态 SQL 避免 PostgreSQL 在旧列已删除时解析失败。
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'locations'
      AND column_name = 'country'
  ) THEN
    EXECUTE '
      INSERT INTO "regions" ("adcode", "country", "province", "city", "district")
      SELECT DISTINCT ON ("adcode")
             "adcode", "country", "province", "city", "district"
      FROM "locations"
      WHERE "adcode" IS NOT NULL AND "adcode" <> ''''
      ORDER BY "adcode"
      ON CONFLICT ("adcode") DO NOTHING
    ';
  END IF;
END $$;

-- 3. 把空字符串的 adcode 归一为 NULL，否则外键会指向不存在的空字符串。
UPDATE "locations" SET "adcode" = NULL WHERE "adcode" = '';

-- 4. PG 不会为外键自动建索引；约束已存在时不重复添加。
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'locations_adcode_fkey'
  ) THEN
    ALTER TABLE "locations"
      ADD CONSTRAINT "locations_adcode_fkey"
      FOREIGN KEY ("adcode") REFERENCES "regions" ("adcode")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "locations_adcode_idx" ON "locations" ("adcode");

-- 5. 旧列作废。IF EXISTS 使已经规范化过的数据库可以安全重试。
ALTER TABLE "locations"
  DROP COLUMN IF EXISTS "country",
  DROP COLUMN IF EXISTS "province",
  DROP COLUMN IF EXISTS "city",
  DROP COLUMN IF EXISTS "district";
