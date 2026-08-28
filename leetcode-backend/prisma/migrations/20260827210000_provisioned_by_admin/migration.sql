-- AlterTable
ALTER TABLE "User" ADD COLUMN     "provisionedByAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: every account that exists before this migration was either created
-- by the seed or by an admin, since self-registration could not yet be told
-- apart. Marking them provisioned keeps existing sections enrollable; from here
-- on only institution-created accounts get the flag.
UPDATE "User" SET "provisionedByAdmin" = true;
