-- Invitations stay pending until accept, reject or cancel.
UPDATE invitations AS i
SET
  status = 'PENDING',
  responded_at = NULL,
  expires_at = TIMESTAMP '9999-12-31 00:00:00'
WHERE i.status = 'EXPIRED'
  AND NOT EXISTS (
    SELECT 1
    FROM invitations AS j
    WHERE j.thesis_id = i.thesis_id
      AND lower(j.email) = lower(i.email)
      AND j.id <> i.id
      AND j.status IN ('PENDING', 'ACCEPTED')
  );

UPDATE invitations
SET expires_at = TIMESTAMP '9999-12-31 00:00:00'
WHERE status = 'PENDING';

ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "audio_storage_key" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "audio_mime_type" VARCHAR(160),
  ADD COLUMN IF NOT EXISTS "audio_duration_ms" INTEGER,
  ADD COLUMN IF NOT EXISTS "audio_size_bytes" BIGINT;
