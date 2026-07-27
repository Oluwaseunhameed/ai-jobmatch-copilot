-- Module 14: Portfolio projects
CREATE TABLE "portfolio_projects" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "tech_stack" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "problem" TEXT,
    "solution" TEXT,
    "impact" TEXT,
    "repo_url" TEXT,
    "demo_url" TEXT,
    "start_month" TEXT,
    "end_month" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "suggested_skill" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_projects_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "portfolio_projects_user_id_sort_order_idx" ON "portfolio_projects"("user_id", "sort_order");
CREATE INDEX "portfolio_projects_user_id_created_at_idx" ON "portfolio_projects"("user_id", "created_at");

ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
