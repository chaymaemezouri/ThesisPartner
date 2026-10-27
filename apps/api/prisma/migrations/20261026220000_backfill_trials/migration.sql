INSERT INTO "trials" ("id", "user_id", "status", "created_at", "updated_at")
SELECT gen_random_uuid(), u."id", 'NOT_STARTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "users" u
WHERE NOT EXISTS (SELECT 1 FROM "trials" t WHERE t."user_id" = u."id");
