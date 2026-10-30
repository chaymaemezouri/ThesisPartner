-- Display names only. PlanCode enum values stay THESISPARTNER_PRO_* (stable API codes).
-- Physical table is "plans" (@@map), not "Plan".
UPDATE "plans"
SET "name" = 'Thesis Flow Pro mensuel'
WHERE "code" = 'THESISPARTNER_PRO_MONTHLY';

UPDATE "plans"
SET "name" = 'Thesis Flow Pro annuel'
WHERE "code" = 'THESISPARTNER_PRO_YEARLY';
