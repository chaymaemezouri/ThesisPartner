-- Display names only. PlanCode enum values stay THESISPARTNER_PRO_* (stable API codes).
UPDATE "Plan"
SET "name" = 'Thesis Flow Pro mensuel'
WHERE "code" = 'THESISPARTNER_PRO_MONTHLY';

UPDATE "Plan"
SET "name" = 'Thesis Flow Pro annuel'
WHERE "code" = 'THESISPARTNER_PRO_YEARLY';
