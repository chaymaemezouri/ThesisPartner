-- Reminder tracking for pending supervisor invitations (J+7 / J+12).
ALTER TABLE "invitations" ADD COLUMN "reminder_7_sent_at" TIMESTAMP(3);
ALTER TABLE "invitations" ADD COLUMN "reminder_12_sent_at" TIMESTAMP(3);
