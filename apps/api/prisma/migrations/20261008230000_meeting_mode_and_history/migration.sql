CREATE TYPE "MeetingMode" AS ENUM ('ONLINE', 'IN_PERSON');

CREATE TYPE "MeetingStatus" AS ENUM ('PLANNED', 'HELD', 'CANCELLED');

ALTER TABLE "meetings" ADD COLUMN "mode" "MeetingMode" NOT NULL DEFAULT 'IN_PERSON';
ALTER TABLE "meetings" ADD COLUMN "status" "MeetingStatus" NOT NULL DEFAULT 'PLANNED';
ALTER TABLE "meetings" ADD COLUMN "location" VARCHAR(300);
ALTER TABLE "meetings" ADD COLUMN "meeting_url" VARCHAR(500);
ALTER TABLE "meetings" ADD COLUMN "agenda" VARCHAR(4000);
ALTER TABLE "meetings" ADD COLUMN "minutes" VARCHAR(4000);
ALTER TABLE "meetings" ADD COLUMN "cancel_reason" VARCHAR(500);
ALTER TABLE "meetings" ADD COLUMN "held_at" TIMESTAMP(3);
ALTER TABLE "meetings" ADD COLUMN "cancelled_at" TIMESTAMP(3);

CREATE INDEX "meetings_thesis_id_status_idx" ON "meetings"("thesis_id", "status");
