-- AlterEnum
-- BEFORE 'ADMIN' keeps the Postgres enum order matching schema.prisma; a bare
-- ADD VALUE would append FACULTY after ADMIN and change enum sort order.
ALTER TYPE "UserRole" ADD VALUE 'FACULTY' BEFORE 'ADMIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "enrollmentNo" TEXT,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_enrollmentNo_key" ON "User"("enrollmentNo");
