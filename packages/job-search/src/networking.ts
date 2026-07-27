import type {
  NetworkingContactDto,
  NetworkingContactStatus,
  NetworkingHubDto,
  NetworkingRoleType,
  NetworkingTalkTrackDto,
  NetworkingTargetDto,
} from '@jobmatch/types';
import {
  isNetworkingContactStatus,
  isNetworkingRoleType,
} from '@jobmatch/types';

export type NetworkingContactInput = {
  fullName: string;
  companyId?: string | null;
  companyName?: string | null;
  roleType?: string;
  title?: string | null;
  profileUrl?: string | null;
  email?: string | null;
  status?: string;
  notes?: string | null;
  relatedJobId?: string | null;
};

export type NetworkingTargetInput = {
  companyId: string;
  companyName: string;
  companySlug: string;
  websiteUrl?: string | null;
  industry?: string | null;
  location?: string | null;
  reason: string;
  source: NetworkingTargetDto['source'];
  openRoles: number;
  sampleJob?: NetworkingTargetDto['sampleJob'];
};

export function normalizeRoleType(value?: string | null): NetworkingRoleType {
  if (value && isNetworkingRoleType(value)) return value;
  return 'recruiter';
}

export function normalizeContactStatus(value?: string | null): NetworkingContactStatus {
  if (value && isNetworkingContactStatus(value)) return value;
  return 'to_contact';
}

export function cleanOptionalText(value?: string | null, max = 4000): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export function cleanUrl(value?: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed.slice(0, 500);
}

export function cleanEmail(value?: string | null): string | null {
  const trimmed = value?.trim().toLowerCase() ?? '';
  if (!trimmed) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed.slice(0, 200);
}

export function buildResearchLinks(input: {
  websiteUrl?: string | null;
  applyUrl?: string | null;
  sourceUrl?: string | null;
  companySlug: string;
}): Array<{ label: string; url: string }> {
  const links: Array<{ label: string; url: string }> = [];
  const push = (label: string, url?: string | null) => {
    const cleaned = cleanUrl(url);
    if (!cleaned) return;
    if (links.some((l) => l.url === cleaned)) return;
    links.push({ label, url: cleaned });
  };

  push('Company website', input.websiteUrl);
  push('Apply / careers', input.applyUrl);
  push('Job source', input.sourceUrl);
  links.push({ label: 'In-app company profile', url: `/companies/${input.companySlug}` });
  return links;
}

export function buildNetworkingTargets(
  rows: NetworkingTargetInput[],
  opts?: { limit?: number },
): NetworkingTargetDto[] {
  const limit = Math.min(20, Math.max(1, opts?.limit ?? 8));
  const byCompany = new Map<string, NetworkingTargetDto>();

  const sourceRank: Record<string, number> = {
    application: 3,
    saved_job: 2,
    viewed: 1,
  };

  for (const row of rows) {
    const existing = byCompany.get(row.companyId);
    const candidate: NetworkingTargetDto = {
      id: `target_${row.companyId}`,
      companyId: row.companyId,
      companyName: row.companyName,
      companySlug: row.companySlug,
      websiteUrl: row.websiteUrl ?? null,
      industry: row.industry ?? null,
      location: row.location ?? null,
      reason: row.reason,
      source: row.source,
      openRoles: row.openRoles,
      sampleJob: row.sampleJob ?? null,
      researchLinks: buildResearchLinks({
        websiteUrl: row.websiteUrl,
        applyUrl: row.sampleJob?.applyUrl,
        sourceUrl: row.sampleJob?.sourceUrl,
        companySlug: row.companySlug,
      }),
    };

    if (!existing) {
      byCompany.set(row.companyId, candidate);
      continue;
    }

    const nextRank = sourceRank[candidate.source] ?? 0;
    const prevRank = sourceRank[existing.source] ?? 0;
    if (nextRank > prevRank) {
      byCompany.set(row.companyId, {
        ...candidate,
        openRoles: Math.max(existing.openRoles, candidate.openRoles),
        reason: candidate.reason,
      });
    } else {
      byCompany.set(row.companyId, {
        ...existing,
        openRoles: Math.max(existing.openRoles, candidate.openRoles),
      });
    }
  }

  return [...byCompany.values()]
    .sort((a, b) => (sourceRank[b.source] ?? 0) - (sourceRank[a.source] ?? 0))
    .slice(0, limit);
}

export function buildTalkTracks(input: {
  candidateName?: string | null;
  headline?: string | null;
  skills?: string[];
  companyName: string;
  jobTitle?: string | null;
  roleType?: NetworkingRoleType | string;
}): NetworkingTalkTrackDto[] {
  const name = input.candidateName?.trim() || 'there';
  const first = name.split(/\s+/)[0] || 'there';
  const company = input.companyName.trim() || 'your team';
  const role = input.jobTitle?.trim() || 'open roles';
  const skillLine =
    (input.skills ?? [])
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(', ') || 'relevant experience';
  const headline = input.headline?.trim();

  const emailBody = [
    `Hi ${first === 'there' ? 'there' : first},`,
    '',
    `I'm exploring opportunities at ${company}${input.jobTitle ? ` (especially ${role})` : ''}.`,
    headline
      ? `I'm a ${headline} with experience in ${skillLine}.`
      : `My background includes ${skillLine}.`,
    '',
    `Would you be open to a short conversation about how I might contribute? Happy to share a resume or portfolio if useful.`,
    '',
    `Thanks,`,
    name === 'there' ? 'Candidate' : name,
  ].join('\n');

  const dmBody = [
    `Hi — I'm interested in ${company}'s ${role}.`,
    `Background in ${skillLine}.`,
    `Would you be open to a brief chat or pointer to the right person?`,
  ].join(' ');

  const careersBody = [
    `Interest: ${role} at ${company}.`,
    `Skills: ${skillLine}.`,
    headline ? `Profile: ${headline}.` : null,
    `Looking to connect with the hiring team via public channels only.`,
  ]
    .filter(Boolean)
    .join(' ');

  return [
    {
      id: 'email_intro',
      channel: 'email',
      title: 'Intro email',
      subject: `Interest in ${role} at ${company}`,
      body: emailBody,
      detail: 'Copy into your mail client. We do not send on your behalf.',
    },
    {
      id: 'linkedin_dm',
      channel: 'linkedin_dm',
      title: 'LinkedIn DM (paste)',
      subject: null,
      body: dmBody,
      detail: 'Paste into LinkedIn yourself. We never scrape or message LinkedIn for you.',
    },
    {
      id: 'careers_note',
      channel: 'careers_note',
      title: 'Careers-page note',
      subject: null,
      body: careersBody,
      detail: 'Short note for careers forms or recruiter portals.',
    },
  ];
}

export function buildNetworkingHub(input: {
  contacts: NetworkingContactDto[];
  targets: NetworkingTargetDto[];
  talkTracks: NetworkingTalkTrackDto[];
}): NetworkingHubDto {
  const active = input.contacts.filter((c) => c.status !== 'closed');
  const summary =
    input.contacts.length === 0
      ? 'Track outreach to companies you already care about — using public websites and roles you save or apply to. No LinkedIn scraping.'
      : `You are tracking ${input.contacts.length} contact${input.contacts.length === 1 ? '' : 's'} (${active.length} active) across ${input.targets.length} target compan${input.targets.length === 1 ? 'y' : 'ies'}.`;

  return {
    summary,
    contactCount: input.contacts.length,
    activeCount: active.length,
    contacts: input.contacts,
    targets: input.targets,
    talkTracks: input.talkTracks,
  };
}

export function normalizeContactInput(input: NetworkingContactInput) {
  const fullName = input.fullName?.trim() ?? '';
  if (!fullName) throw new Error('fullName is required');
  if (fullName.length > 120) throw new Error('fullName is too long');

  return {
    fullName: fullName.slice(0, 120),
    companyId: input.companyId?.trim() || null,
    companyName: cleanOptionalText(input.companyName, 160),
    roleType: normalizeRoleType(input.roleType),
    title: cleanOptionalText(input.title, 160),
    profileUrl: cleanUrl(input.profileUrl),
    email: cleanEmail(input.email),
    status: normalizeContactStatus(input.status),
    notes: cleanOptionalText(input.notes, 4000),
    relatedJobId: input.relatedJobId?.trim() || null,
  };
}

export function toNetworkingContactDto(row: {
  id: string;
  userId: string;
  companyId: string | null;
  companyName: string | null;
  fullName: string;
  roleType: string;
  title: string | null;
  profileUrl: string | null;
  email: string | null;
  status: string;
  notes: string | null;
  relatedJobId: string | null;
  lastTouchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  company?: {
    id: string;
    name: string;
    slug: string;
    websiteUrl: string | null;
  } | null;
}): NetworkingContactDto {
  return {
    id: row.id,
    userId: row.userId,
    companyId: row.companyId,
    companyName: row.companyName ?? row.company?.name ?? null,
    fullName: row.fullName,
    roleType: row.roleType,
    title: row.title,
    profileUrl: row.profileUrl,
    email: row.email,
    status: row.status,
    notes: row.notes,
    relatedJobId: row.relatedJobId,
    lastTouchedAt: row.lastTouchedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    company: row.company
      ? {
          id: row.company.id,
          name: row.company.name,
          slug: row.company.slug,
          websiteUrl: row.company.websiteUrl,
        }
      : null,
  };
}
