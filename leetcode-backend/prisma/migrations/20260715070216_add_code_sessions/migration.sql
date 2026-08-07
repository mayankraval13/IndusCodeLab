-- CreateEnum
CREATE TYPE "ProctorEventType" AS ENUM ('PASTE_BLOCKED', 'COPY_BLOCKED', 'TAB_SWITCH', 'WINDOW_BLUR');

-- CreateTable
CREATE TABLE "CodeSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CodeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProctorEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "ProctorEventType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "ProctorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodeSession_userId_problemId_idx" ON "CodeSession"("userId", "problemId");

-- AddForeignKey
ALTER TABLE "CodeSession" ADD CONSTRAINT "CodeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSession" ADD CONSTRAINT "CodeSession_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProctorEvent" ADD CONSTRAINT "ProctorEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CodeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
