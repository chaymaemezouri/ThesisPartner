-- CreateEnum
CREATE TYPE "PaymentEnvironment" AS ENUM ('TEST', 'LIVE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentEventProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateEnum
CREATE TYPE "InvoiceKind" AS ENUM ('INVOICE', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'VOIDED');

-- AlterTable
ALTER TABLE "billing_settings" ADD COLUMN "tax_bps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "billing_settings" ADD COLUMN "invoice_prefix" VARCHAR(16) NOT NULL DEFAULT 'TP';
ALTER TABLE "billing_settings" ADD COLUMN "issuer_name" VARCHAR(200);
ALTER TABLE "billing_settings" ADD COLUMN "issuer_address" VARCHAR(500);
ALTER TABLE "billing_settings" ADD COLUMN "issuer_legal_id" VARCHAR(120);
ALTER TABLE "billing_settings" ADD COLUMN "issuer_email" VARCHAR(320);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "provider_payment_id" VARCHAR(120),
    "checkout_session_id" VARCHAR(120),
    "idempotency_key" VARCHAR(128) NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "refunded_amount_minor" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'MAD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "environment" "PaymentEnvironment" NOT NULL,
    "checkout_url" VARCHAR(500),
    "checkout_expires_at" TIMESTAMP(3),
    "failure_code" VARCHAR(80),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "environment" "PaymentEnvironment" NOT NULL,
    "external_event_id" VARCHAR(160) NOT NULL,
    "payment_id" UUID,
    "event_type" VARCHAR(80) NOT NULL,
    "processing_status" "PaymentEventProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB,
    "error_code" VARCHAR(80),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "environment" "PaymentEnvironment" NOT NULL,
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("environment","year")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subscription_id" UUID,
    "payment_id" UUID,
    "invoice_number" VARCHAR(40) NOT NULL,
    "kind" "InvoiceKind" NOT NULL DEFAULT 'INVOICE',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "specimen" BOOLEAN NOT NULL DEFAULT true,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "description" VARCHAR(240) NOT NULL,
    "plan_code" VARCHAR(64) NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "tax_bps" INTEGER NOT NULL,
    "tax_amount_minor" INTEGER NOT NULL,
    "total_minor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'MAD',
    "environment" "PaymentEnvironment" NOT NULL,
    "document_path" VARCHAR(500),
    "issuer_name" VARCHAR(200),
    "issuer_address" VARCHAR(500),
    "issuer_legal_id" VARCHAR(120),
    "recipient_name" VARCHAR(200) NOT NULL,
    "recipient_email" VARCHAR(320) NOT NULL,
    "payment_reference" VARCHAR(160),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_user_id_idempotency_key_key" ON "payments"("user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_environment_provider_payment_id_key" ON "payments"("provider", "environment", "provider_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_environment_checkout_session_id_key" ON "payments"("provider", "environment", "checkout_session_id");

-- CreateIndex
CREATE INDEX "payments_user_id_created_at_idx" ON "payments"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_status_environment_idx" ON "payments"("status", "environment");

-- CreateIndex
CREATE INDEX "payments_subscription_id_idx" ON "payments"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_environment_external_event_id_key" ON "payment_events"("provider", "environment", "external_event_id");

-- CreateIndex
CREATE INDEX "payment_events_processing_status_received_at_idx" ON "payment_events"("processing_status", "received_at");

-- CreateIndex
CREATE INDEX "payment_events_payment_id_idx" ON "payment_events"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_user_id_issue_date_idx" ON "invoices"("user_id", "issue_date");

-- CreateIndex
CREATE INDEX "invoices_payment_id_idx" ON "invoices"("payment_id");

-- CreateIndex
CREATE INDEX "invoices_environment_status_idx" ON "invoices"("environment", "status");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
