-- Add missing fields to fix TypeScript errors

-- Add invitationTokenExpires to users table
ALTER TABLE "users" ADD COLUMN "invitationTokenExpires" TIMESTAMP(3);

-- Add resource field to audit_logs table  
ALTER TABLE "audit_logs" ADD COLUMN "resource" TEXT;

-- Create index for invitationTokenExpires
CREATE INDEX "users_invitationTokenExpires_idx" ON "users"("invitationTokenExpires");