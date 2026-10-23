-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "thesis_id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "token_hash" VARCHAR(64) NOT NULL,
    "invited_by_id" UUID NOT NULL,
    "replaces_supervisor" BOOLEAN NOT NULL DEFAULT false,
    "change_reason" VARCHAR(500),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_history" (
    "id" UUID NOT NULL,
    "thesis_id" UUID NOT NULL,
    "supervisor_user_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3) NOT NULL,
    "ended_reason" VARCHAR(80) NOT NULL,
    "change_reason" VARCHAR(500),
    "invitation_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supervision_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- CreateIndex
CREATE INDEX "invitations_thesis_id_status_idx" ON "invitations"("thesis_id", "status");

-- CreateIndex
CREATE INDEX "invitations_email_status_idx" ON "invitations"("email", "status");

-- CreateIndex
CREATE INDEX "invitations_expires_at_idx" ON "invitations"("expires_at");

-- CreateIndex
CREATE INDEX "supervision_history_thesis_id_ended_at_idx" ON "supervision_history"("thesis_id", "ended_at");

-- CreateIndex
CREATE INDEX "supervision_history_supervisor_user_id_idx" ON "supervision_history"("supervisor_user_id");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_history" ADD CONSTRAINT "supervision_history_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_history" ADD CONSTRAINT "supervision_history_supervisor_user_id_fkey" FOREIGN KEY ("supervisor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
