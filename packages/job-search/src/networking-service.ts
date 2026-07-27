import { prisma } from '@jobmatch/database';
import type {
  NetworkingContactDto,
  NetworkingHubDto,
} from '@jobmatch/types';

import {
  buildNetworkingHub,
  buildNetworkingTargets,
  buildTalkTracks,
  normalizeContactInput,
  toNetworkingContactDto,
  type NetworkingContactInput,
  type NetworkingTargetInput,
} from './networking';

export {
  buildNetworkingHub,
  buildNetworkingTargets,
  buildResearchLinks,
  buildTalkTracks,
  normalizeContactInput,
  toNetworkingContactDto,
  type NetworkingContactInput,
} from './networking';

const contactInclude = {
  company: {
    select: { id: true, name: true, slug: true, websiteUrl: true },
  },
} as const;

export async function listNetworkingContacts(userId: string): Promise<NetworkingContactDto[]> {
  const rows = await prisma.networkingContact.findMany({
    where: { userId },
    include: contactInclude,
    orderBy: [{ updatedAt: 'desc' }],
    take: 100,
  });
  return rows.map(toNetworkingContactDto);
}

export async function getNetworkingContact(
  userId: string,
  id: string,
): Promise<NetworkingContactDto | null> {
  const row = await prisma.networkingContact.findFirst({
    where: { id, userId },
    include: contactInclude,
  });
  return row ? toNetworkingContactDto(row) : null;
}

export async function createNetworkingContact(input: {
  userId: string;
  data: NetworkingContactInput;
}): Promise<NetworkingContactDto> {
  const data = normalizeContactInput(input.data);

  if (data.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
      select: { id: true, name: true },
    });
    if (!company) throw new Error('Company not found');
    if (!data.companyName) data.companyName = company.name;
  }

  const row = await prisma.networkingContact.create({
    data: {
      userId: input.userId,
      ...data,
      lastTouchedAt: new Date(),
    },
    include: contactInclude,
  });
  return toNetworkingContactDto(row);
}

export async function updateNetworkingContact(input: {
  userId: string;
  id: string;
  data: NetworkingContactInput;
}): Promise<NetworkingContactDto | null> {
  const existing = await prisma.networkingContact.findFirst({
    where: { id: input.id, userId: input.userId },
    select: { id: true },
  });
  if (!existing) return null;

  const data = normalizeContactInput(input.data);
  if (data.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
      select: { id: true, name: true },
    });
    if (!company) throw new Error('Company not found');
    if (!data.companyName) data.companyName = company.name;
  }

  const row = await prisma.networkingContact.update({
    where: { id: existing.id },
    data: {
      ...data,
      lastTouchedAt: new Date(),
    },
    include: contactInclude,
  });
  return toNetworkingContactDto(row);
}

export async function deleteNetworkingContact(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.networkingContact.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.networkingContact.delete({ where: { id: existing.id } });
  return true;
}

export async function getNetworkingHub(userId: string): Promise<NetworkingHubDto> {
  const [contacts, profile, saved, applications, viewed] = await Promise.all([
    listNetworkingContacts(userId),
    prisma.careerProfile.findUnique({
      where: { userId },
      include: { skills: { select: { name: true }, take: 12 } },
    }),
    prisma.jobInteraction.findMany({
      where: { userId, type: 'saved' },
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 40,
    }),
    prisma.application.findMany({
      where: { userId },
      include: {
        job: { include: { company: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 40,
    }),
    prisma.jobInteraction.findMany({
      where: { userId, type: 'viewed' },
      include: {
        job: { include: { company: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
  ]);

  const openRoleCounts = await prisma.job.groupBy({
    by: ['companyId'],
    where: { isActive: true },
    _count: { _all: true },
  });
  const openByCompany = new Map(
    openRoleCounts.map((row) => [row.companyId, row._count._all]),
  );

  const targetInputs: NetworkingTargetInput[] = [];

  for (const app of applications) {
    const company = app.job.company;
    targetInputs.push({
      companyId: company.id,
      companyName: company.name,
      companySlug: company.slug,
      websiteUrl: company.websiteUrl,
      industry: company.industry,
      location: company.location,
      reason: `You have an application for ${app.job.title} (${app.stage}).`,
      source: 'application',
      openRoles: openByCompany.get(company.id) ?? 0,
      sampleJob: {
        id: app.job.id,
        title: app.job.title,
        slug: app.job.slug,
        applyUrl: app.job.applyUrl,
        sourceUrl: app.job.sourceUrl,
      },
    });
  }

  for (const item of saved) {
    const company = item.job.company;
    targetInputs.push({
      companyId: company.id,
      companyName: company.name,
      companySlug: company.slug,
      websiteUrl: company.websiteUrl,
      industry: company.industry,
      location: company.location,
      reason: `You saved ${item.job.title}.`,
      source: 'saved_job',
      openRoles: openByCompany.get(company.id) ?? 0,
      sampleJob: {
        id: item.job.id,
        title: item.job.title,
        slug: item.job.slug,
        applyUrl: item.job.applyUrl,
        sourceUrl: item.job.sourceUrl,
      },
    });
  }

  for (const item of viewed) {
    const company = item.job.company;
    targetInputs.push({
      companyId: company.id,
      companyName: company.name,
      companySlug: company.slug,
      websiteUrl: company.websiteUrl,
      industry: company.industry,
      location: company.location,
      reason: `You viewed ${item.job.title}.`,
      source: 'viewed',
      openRoles: openByCompany.get(company.id) ?? 0,
      sampleJob: {
        id: item.job.id,
        title: item.job.title,
        slug: item.job.slug,
        applyUrl: item.job.applyUrl,
        sourceUrl: item.job.sourceUrl,
      },
    });
  }

  const targets = buildNetworkingTargets(targetInputs, { limit: 8 });
  const primary = targets[0];
  const talkTracks = buildTalkTracks({
    candidateName: undefined,
    headline: profile?.headline,
    skills: profile?.skills.map((s) => s.name) ?? [],
    companyName: primary?.companyName ?? 'the company',
    jobTitle: primary?.sampleJob?.title ?? null,
    roleType: 'recruiter',
  });

  return buildNetworkingHub({ contacts, targets, talkTracks });
}
