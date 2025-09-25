-- Migration: Fix user.id column type from UUID to TEXT
-- This will allow Medusa's string-based IDs (user_xxx) to be stored.

ALTER TABLE "user" 
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "id" TYPE TEXT USING id::text;

-- Optional: reset primary key constraint if needed
ALTER TABLE "user"
  ALTER COLUMN "id" SET NOT NULL;

-- If "user" has a sequence attached (UUID gen), drop it
-- (Usually not the case, but safe to include)
DROP SEQUENCE IF EXISTS user_id_seq;
