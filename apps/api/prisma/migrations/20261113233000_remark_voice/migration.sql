ALTER TABLE "remarks"
  ADD COLUMN IF NOT EXISTS "audio_storage_key" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "audio_mime_type" VARCHAR(160),
  ADD COLUMN IF NOT EXISTS "audio_duration_ms" INTEGER,
  ADD COLUMN IF NOT EXISTS "audio_size_bytes" BIGINT;

ALTER TABLE "remark_replies"
  ADD COLUMN IF NOT EXISTS "audio_storage_key" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "audio_mime_type" VARCHAR(160),
  ADD COLUMN IF NOT EXISTS "audio_duration_ms" INTEGER,
  ADD COLUMN IF NOT EXISTS "audio_size_bytes" BIGINT;
