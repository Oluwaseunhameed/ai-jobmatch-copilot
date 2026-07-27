-- Module 8: Professional networking contacts (user CRM, public URLs only)
CREATE TABLE "networking_contacts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT,
    "company_name" TEXT,
    "full_name" TEXT NOT NULL,
    "role_type" TEXT NOT NULL DEFAULT 'recruiter',
    "title" TEXT,
    "profile_url" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'to_contact',
    "notes" TEXT,
    "related_job_id" TEXT,
    "last_touched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "networking_contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "networking_contacts_user_id_status_idx" ON "networking_contacts"("user_id", "status");
CREATE INDEX "networking_contacts_user_id_created_at_idx" ON "networking_contacts"("user_id", "created_at");
CREATE INDEX "networking_contacts_company_id_idx" ON "networking_contacts"("company_id");

ALTER TABLE "networking_contacts" ADD CONSTRAINT "networking_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "networking_contacts" ADD CONSTRAINT "networking_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
