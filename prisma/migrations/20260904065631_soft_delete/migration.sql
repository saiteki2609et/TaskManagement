-- AlterTable
ALTER TABLE "Task" ADD COLUMN "deletedAt" DATETIME;

-- CreateIndex
CREATE INDEX "Task_deletedAt_idx" ON "Task"("deletedAt");
