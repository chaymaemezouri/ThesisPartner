-- Persist welcome/guide dismissal for interactive onboarding.
ALTER TABLE "profiles" ADD COLUMN "onboarding_welcome_dismissed_at" TIMESTAMP(3);
ALTER TABLE "profiles" ADD COLUMN "onboarding_guide_completed_at" TIMESTAMP(3);
