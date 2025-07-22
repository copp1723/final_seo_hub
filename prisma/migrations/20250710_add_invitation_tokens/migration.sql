-- AlterTable
ALTER TABLE "User" ADD COLUMN     "invitationToken" TEXT,
ADD COLUMN     "invitationTokenExpires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_invitationToken_key" ON "User"("invitationToken");

-- CreateIndex
CREATE INDEX "User_invitationToken_idx" ON "User"("invitationToken");