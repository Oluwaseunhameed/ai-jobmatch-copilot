-- CreateTable
CREATE TABLE "application_drafts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "resume_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "error" TEXT,
    "cover_letter" TEXT,
    "questions" JSONB,
    "answers" JSONB,
    "result_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_drafts_user_id_created_at_idx" ON "application_drafts"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "application_drafts_resume_id_job_id_idx" ON "application_drafts"("resume_id", "job_id");

-- CreateIndex
CREATE INDEX "application_drafts_status_idx" ON "application_drafts"("status");

-- AddForeignKey
ALTER TABLE "application_drafts" ADD CONSTRAINT "application_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_drafts" ADD CONSTRAINT "application_drafts_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_drafts" ADD CONSTRAINT "application_drafts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
