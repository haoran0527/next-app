-- AlterTable
ALTER TABLE "users" ADD COLUMN "wechatOpenId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_wechatOpenId_key" ON "users"("wechatOpenId");
