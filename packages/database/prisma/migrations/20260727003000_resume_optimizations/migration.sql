-- Phase 2 Module 4: resume optimizations against jobs
CREATE TABLE "resume_optimizations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "resume_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "error" TEXT,
    "before_score" INTEGER,
    "after_score" INTEGER,
    "result_json" JSONB,
    "version_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "resume_optimizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resume_optimizations_version_id_key" ON "resume_optimizations"("version_id");
CREATE INDEX "resume_optimizations_user_id_created_at_idx" ON "resume_optimizations"("user_id", "created_at");
CREATE INDEX "resume_optimizations_resume_id_job_id_idx" ON "resume_optimizations"("resume_id", "job_id");
CREATE INDEX "resume_optimizations_status_idx" ON "resume_optimizations"("status");

ALTER TABLE "resume_optimizations" ADD CONSTRAINT "resume_optimizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resume_optimizations" ADD CONSTRAINT "resume_optimizations_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resume_optimizations" ADD CONSTRAINT "resume_optimizations_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resume_optimizations" ADD CONSTRAINT "resume_optimizations_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "resume_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
