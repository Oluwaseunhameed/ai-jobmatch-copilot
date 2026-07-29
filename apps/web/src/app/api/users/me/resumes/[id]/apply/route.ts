import { prisma } from '@jobmatch/database';
import {
  extractEducationFromText,
  extractExperienceFromText,
  extractLinksFromText,
  extractLocationFromText,
  extractPhonesFromText,
  inferWorkLocationPreference,
  inferYearsOfExperience,
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
  city?: string | null;
  country?: string | null;
  yearsOfExperience?: number | null;
  workLocationPreference?: string | null;
  desiredRoles?: string[];
  experience?: unknown[];
  education?: unknown[];
  workExperience?: unknown[];
};

/**
 * Apply parsed resume fields onto the career profile (empty fields only).
 * Includes overview, education/experience, location/contacts/links, and a few preferences.
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
    applyLocation?: boolean;
    applyPreferences?: boolean;
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
  if (text && !parsed.city && !parsed.country) {
    const location = extractLocationFromText(text);
    parsed.city = location.city;
    parsed.country = location.country;
  }
  if (text && (!Array.isArray(parsed.phones) || parsed.phones.length === 0)) {
    parsed.phones = extractPhonesFromText(text);
  }
  if (text && (!Array.isArray(parsed.links) || parsed.links.length === 0)) {
    parsed.links = extractLinksFromText(text);
  }

  const experienceForPrefs = (
    Array.isArray(parsed.experience) ? parsed.experience : parsed.workExperience ?? []
  ) as Array<{ startMonth?: string | null; endMonth?: string | null }>;

  if (parsed.yearsOfExperience == null) {
    parsed.yearsOfExperience = inferYearsOfExperience(experienceForPrefs);
  }
  if (!parsed.workLocationPreference && text) {
    parsed.workLocationPreference = inferWorkLocationPreference(text);
  }

  const profile = await updateProfile(app.user.id, parsed, {
    applyHeadline: body.applyHeadline !== false,
    applySummary: body.applySummary !== false,
    applySkills: body.applySkills !== false,
    applyExperience: body.applyExperience !== false,
    applyEducation: body.applyEducation !== false,
    applyContacts: body.applyContacts !== false,
    applyLocation: body.applyLocation !== false,
    applyPreferences: body.applyPreferences !== false,
  });

  return NextResponse.json(profile, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
