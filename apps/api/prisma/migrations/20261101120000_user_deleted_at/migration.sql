-- Soft-delete accounts separately from suspension (disabled_at).
ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3);
