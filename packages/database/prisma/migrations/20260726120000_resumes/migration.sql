-- Module 3: Resume library
CREATE TABLE IF NOT EXISTS "resumes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "storage_provider" TEXT NOT NULL DEFAULT 'local',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "parse_status" TEXT NOT NULL DEFAULT 'idle',
    "parse_error" TEXT,
    "parsed_text" TEXT,
    "parsed_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "resume_versions" (
    "id" TEXT NOT NULL,
    "resume_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'upload',
    "content_text" TEXT,
    "content_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resume_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "resumes_user_id_idx" ON "resumes"("user_id");
CREATE INDEX IF NOT EXISTS "resumes_user_id_is_primary_idx" ON "resumes"("user_id", "is_primary");
CREATE INDEX IF NOT EXISTS "resume_versions_resume_id_idx" ON "resume_versions"("resume_id");

DO $$ BEGIN
  ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_resume_id_fkey"
    FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
