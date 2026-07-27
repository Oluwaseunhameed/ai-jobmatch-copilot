-- Module 12: Interview preparation sessions
CREATE TABLE "interview_preps" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "questions_json" JSONB NOT NULL,
    "practice_json" JSONB,
    "confidence_score" INTEGER,
    "summary" TEXT,
    "source" TEXT NOT NULL DEFAULT 'template',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_preps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "interview_preps_user_id_created_at_idx" ON "interview_preps"("user_id", "created_at");
CREATE INDEX "interview_preps_user_id_job_id_idx" ON "interview_preps"("user_id", "job_id");
CREATE INDEX "interview_preps_job_id_idx" ON "interview_preps"("job_id");

ALTER TABLE "interview_preps" ADD CONSTRAINT "interview_preps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interview_preps" ADD CONSTRAINT "interview_preps_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
