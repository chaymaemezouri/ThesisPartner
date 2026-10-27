-- CreateEnum
CREATE TYPE "InvitationEmailStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "invitations" ADD COLUMN "email_status" "InvitationEmailStatus" NOT NULL DEFAULT 'QUEUED';
ALTER TABLE "invitations" ADD COLUMN "email_sent_at" TIMESTAMP(3);
ALTER TABLE "invitations" ADD COLUMN "email_attempted_at" TIMESTAMP(3);
ALTER TABLE "invitations" ADD COLUMN "email_last_error" VARCHAR(80);
