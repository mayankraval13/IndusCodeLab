-- Reconstructed after the fact: this change reached the dev database via
-- `prisma db push`, so it is registered with `prisma migrate resolve --applied`
-- rather than executed. The SQL below is what a fresh database needs.

-- CreateEnum
CREATE TYPE "ExecutionMode" AS ENUM ('JUDGE0_RUN', 'JUDGE0_GRADE', 'WEB_RENDER');

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "executionMode" "ExecutionMode" NOT NULL DEFAULT 'JUDGE0_GRADE';
