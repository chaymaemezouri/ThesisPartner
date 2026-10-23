-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");
