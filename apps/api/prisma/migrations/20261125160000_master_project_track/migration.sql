CREATE TYPE "ThesisTrack" AS ENUM ('DOCTORATE', 'MASTER');

ALTER TABLE "theses"
  ADD COLUMN IF NOT EXISTS "track" "ThesisTrack" NOT NULL DEFAULT 'DOCTORATE';

CREATE INDEX IF NOT EXISTS "theses_track_idx" ON "theses"("track");
