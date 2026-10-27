-- CreateEnum
CREATE TYPE "TrialStatus" AS ENUM ('NOT_STARTED', 'ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('THESISPARTNER_PRO_MONTHLY', 'THESISPARTNER_PRO_YEARLY');

-- CreateEnum
CREATE TYPE "PlanInterval" AS ENUM ('MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "billing_settings" (
    "id" VARCHAR(32) NOT NULL,
    "trial_days" INTEGER NOT NULL DEFAULT 30,
    "grace_days" INTEGER NOT NULL DEFAULT 7,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trials" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "TrialStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "started_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "code" "PlanCode" NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "interval" "PlanInterval" NOT NULL,
    "price_mad" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'MAD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMP(3),
    "grace_period_ends_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thesis_subscription_coverages" (
    "id" UUID NOT NULL,
    "thesis_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thesis_subscription_coverages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "actor_id" UUID,
    "trial_id" UUID,
    "subscription_id" UUID,
    "type" VARCHAR(80) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trials_user_id_key" ON "trials"("user_id");
CREATE INDEX "trials_status_expires_at_idx" ON "trials"("status", "expires_at");
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");
CREATE INDEX "subscriptions_user_id_status_idx" ON "subscriptions"("user_id", "status");
CREATE INDEX "subscriptions_status_current_period_end_idx" ON "subscriptions"("status", "current_period_end");
CREATE UNIQUE INDEX "thesis_subscription_coverages_thesis_id_key" ON "thesis_subscription_coverages"("thesis_id");
CREATE INDEX "thesis_subscription_coverages_subscription_id_idx" ON "thesis_subscription_coverages"("subscription_id");
CREATE INDEX "subscription_events_user_id_created_at_idx" ON "subscription_events"("user_id", "created_at");
CREATE INDEX "subscription_events_type_created_at_idx" ON "subscription_events"("type", "created_at");

ALTER TABLE "trials" ADD CONSTRAINT "trials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "thesis_subscription_coverages" ADD CONSTRAINT "thesis_subscription_coverages_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "thesis_subscription_coverages" ADD CONSTRAINT "thesis_subscription_coverages_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_trial_id_fkey" FOREIGN KEY ("trial_id") REFERENCES "trials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "billing_settings" ("id", "trial_days", "grace_days", "updated_at")
VALUES ('default', 30, 7, CURRENT_TIMESTAMP);

INSERT INTO "plans" ("id", "code", "name", "interval", "price_mad", "currency", "active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'THESISPARTNER_PRO_MONTHLY', 'ThesisPartner Pro mensuel', 'MONTH', 199, 'MAD', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'THESISPARTNER_PRO_YEARLY', 'ThesisPartner Pro annuel', 'YEAR', 1990, 'MAD', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
