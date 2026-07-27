-- Module 13: Coding assessment practice sessions
CREATE TABLE "coding_practice_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "styles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficulties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "problems_json" JSONB NOT NULL,
    "attempts_json" JSONB,
    "performance_score" INTEGER,
    "time_budget_minutes" INTEGER,
    "summary" TEXT,
    "source" TEXT NOT NULL DEFAULT 'template',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coding_practice_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "coding_practice_sessions_user_id_created_at_idx" ON "coding_practice_sessions"("user_id", "created_at");
CREATE INDEX "coding_practice_sessions_user_id_job_id_idx" ON "coding_practice_sessions"("user_id", "job_id");
CREATE INDEX "coding_practice_sessions_job_id_idx" ON "coding_practice_sessions"("job_id");

ALTER TABLE "coding_practice_sessions" ADD CONSTRAINT "coding_practice_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coding_practice_sessions" ADD CONSTRAINT "coding_practice_sessions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
