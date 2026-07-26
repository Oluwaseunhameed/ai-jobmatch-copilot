-- Module 5: Job discovery (companies, jobs, saved/viewed interactions)
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE IF NOT EXISTS "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "website_url" TEXT,
    "logo_url" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "location" TEXT,
    "about" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "jobs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "employment_type" TEXT NOT NULL DEFAULT 'full-time',
    "work_mode" TEXT NOT NULL DEFAULT 'on-site',
    "seniority" TEXT NOT NULL DEFAULT 'mid',
    "location" TEXT,
    "city" TEXT,
    "country" TEXT,
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "salary_currency" TEXT NOT NULL DEFAULT 'USD',
    "salary_period" TEXT NOT NULL DEFAULT 'year',
    "source" TEXT NOT NULL DEFAULT 'seed',
    "source_url" TEXT,
    "external_id" TEXT,
    "apply_url" TEXT,
    "posted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "embedding" vector(768),
    "embedding_status" TEXT NOT NULL DEFAULT 'idle',
    "embedding_error" TEXT,
    "embedding_model" TEXT,
    "embedded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "job_interactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "job_interactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "companies_slug_key" ON "companies"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_slug_key" ON "jobs"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_source_external_id_key" ON "jobs"("source", "external_id");
CREATE INDEX IF NOT EXISTS "jobs_company_id_idx" ON "jobs"("company_id");
CREATE INDEX IF NOT EXISTS "jobs_is_active_posted_at_idx" ON "jobs"("is_active", "posted_at");
CREATE INDEX IF NOT EXISTS "jobs_embedding_status_idx" ON "jobs"("embedding_status");
CREATE UNIQUE INDEX IF NOT EXISTS "job_interactions_user_id_job_id_type_key" ON "job_interactions"("user_id", "job_id", "type");
CREATE INDEX IF NOT EXISTS "job_interactions_user_id_type_idx" ON "job_interactions"("user_id", "type");
CREATE INDEX IF NOT EXISTS "job_interactions_job_id_idx" ON "job_interactions"("job_id");

-- Keyword search document. Wrapped in a function so the index expression and
-- the query expression cannot drift apart: search queries call this too.
--
-- Two Postgres quirks force this shape. to_tsvector(text, text) is only STABLE,
-- so the config needs an explicit ::regconfig cast; and array_to_string is
-- STABLE for arbitrary element types, though it is immutable for the text[] we
-- pass here, which is why the wrapper can be declared IMMUTABLE.
CREATE OR REPLACE FUNCTION job_search_document(
    title TEXT,
    skills TEXT[],
    description TEXT,
    location TEXT
) RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT setweight(to_tsvector('english'::regconfig, coalesce(title, '')), 'A')
        || setweight(to_tsvector('english'::regconfig, coalesce(array_to_string(skills, ' '), '')), 'B')
        || setweight(to_tsvector('english'::regconfig, coalesce(description, '')), 'C')
        || setweight(to_tsvector('english'::regconfig, coalesce(location, '')), 'D')
$$;

CREATE INDEX IF NOT EXISTS "jobs_search_idx" ON "jobs" USING GIN (
    job_search_document("title", "skills", "description", "location")
);

-- Semantic search. Cosine distance matches the normalized embeddings we store.
CREATE INDEX IF NOT EXISTS "jobs_embedding_idx" ON "jobs" USING hnsw ("embedding" vector_cosine_ops);

DO $$ BEGIN
  ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "job_interactions" ADD CONSTRAINT "job_interactions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "job_interactions" ADD CONSTRAINT "job_interactions_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
