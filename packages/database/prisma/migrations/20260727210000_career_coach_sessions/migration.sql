-- Module 16: AI Career Coach sessions
CREATE TABLE "career_coach_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "focus" TEXT NOT NULL DEFAULT 'general',
    "title" TEXT,
    "messages_json" JSONB NOT NULL,
    "context_json" JSONB,
    "summary" TEXT,
    "source" TEXT NOT NULL DEFAULT 'template',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "career_coach_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "career_coach_sessions_user_id_created_at_idx" ON "career_coach_sessions"("user_id", "created_at");

ALTER TABLE "career_coach_sessions" ADD CONSTRAINT "career_coach_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
