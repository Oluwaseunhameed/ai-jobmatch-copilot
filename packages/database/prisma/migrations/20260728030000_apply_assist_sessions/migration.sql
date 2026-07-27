-- Module 10: User-approved apply assist sessions
CREATE TABLE "apply_assist_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "checklist_json" JSONB NOT NULL,
    "fill_plan_json" JSONB NOT NULL,
    "opened_at" TIMESTAMP(3),
    "fill_approved_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "submit_note" TEXT,
    "playwright_status" TEXT NOT NULL DEFAULT 'skipped',
    "playwright_detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apply_assist_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "apply_assist_sessions_application_id_key" ON "apply_assist_sessions"("application_id");
CREATE INDEX "apply_assist_sessions_user_id_created_at_idx" ON "apply_assist_sessions"("user_id", "created_at");

ALTER TABLE "apply_assist_sessions" ADD CONSTRAINT "apply_assist_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "apply_assist_sessions" ADD CONSTRAINT "apply_assist_sessions_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
