import { prisma } from '@jobmatch/database';
import {
  extractEducationFromText,
  extractExperienceFromText,
} from '@jobmatch/resume-parsing';
import { NextResponse } from 'next/server';

import { requireAppUser } from '@/lib/auth';
import { updateProfile } from '@/lib/apply-parsed-resume';

type Params = { params: Promise<{ id: string }> };

type ParsedPayload = {
  headline?: string | null;
  summary?: string | null;
  skills?: string[];
  phones?: string[];
  links?: string[];
  experience?: unknown[];
  education?: unknown[];
  workExperience?: unknown[];
};

/**
 * Apply parsed resume fields onto the career profile (empty fields only).
 * Includes headline/summary/skills plus education, experience, and contacts.
 */
export async function POST(request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const resume = await prisma.resume.findFirst({
    where: { id, userId: app.user.id },
  });

  if (!resume) {
    return NextResponse.json({ error: { message: 'Resume not found' } }, { status: 404 });
  }

  if (resume.parseStatus !== 'ready' || !resume.parsedJson) {
    return NextResponse.json(
      { error: { message: 'Resume has not been parsed yet' } },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    applyHeadline?: boolean;
    applySummary?: boolean;
    applySkills?: boolean;
    applyExperience?: boolean;
    applyEducation?: boolean;
    applyContacts?: boolean;
  };

  const parsed = { ...(resume.parsedJson as ParsedPayload) };
  const text = resume.parsedText?.trim() ?? '';

  const hasExperience =
    (Array.isArray(parsed.experience) && parsed.experience.length > 0) ||
    (Array.isArray(parsed.workExperience) && parsed.workExperience.length > 0);
  const hasEducation = Array.isArray(parsed.education) && parsed.education.length > 0;

  // Older parses only stored headline/summary/skills — recover sections from text.
  if (text && !hasExperience) {
    parsed.experience = extractExperienceFromText(text);
  }
  if (text && !hasEducation) {
    parsed.education = extractEducationFromText(text);
  }

  const profile = await updateProfile(app.user.id, parsed, {
    applyHeadline: body.applyHeadline !== false,
    applySummary: body.applySummary !== false,
    applySkills: body.applySkills !== false,
    applyExperience: body.applyExperience !== false,
    applyEducation: body.applyEducation !== false,
    applyContacts: body.applyContacts !== false,
  });

  return NextResponse.json(profile, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
