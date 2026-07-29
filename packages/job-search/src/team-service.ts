import { prisma } from '@jobmatch/database';
import {
  TEAM_PLAN_LIMITS,
  type CoachDeskMemberDto,
  type SupportUserLookupDto,
  type TeamDto,
  type TeamMembershipDto,
  type TeamMemberRole,
  type CoachAssignmentDto,
} from '@jobmatch/types';

import { createInAppNotification } from './notification-service';

function planFromSub(
  row: { planId: string; status: string; currentPeriodEnd: Date | null } | null,
): string {
  if (!row) return 'free';
  const active =
    row.status === 'active' ||
    row.status === 'on_trial' ||
    (row.status === 'canceled' &&
      row.currentPeriodEnd &&
      row.currentPeriodEnd.getTime() > Date.now());
  if (!active) return 'free';
  if (row.planId === 'team' || row.planId === 'pro') return row.planId;
  return 'free';
}

export async function getOrCreateTeamForOwner(userId: string, name?: string): Promise<TeamDto> {
  const existing = await prisma.team.findFirst({
    where: { ownerUserId: userId },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
    },
  });
  if (existing) return toTeamDto(existing);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const team = await prisma.team.create({
    data: {
      name: name?.trim() || `${user?.name ?? 'Team'}'s team`,
      ownerUserId: userId,
      seatLimit: TEAM_PLAN_LIMITS.maxTeamSeats,
      memberships: { create: { userId, role: 'owner' } },
    },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
    },
  });
  return toTeamDto(team);
}

export async function listTeamsForUser(userId: string): Promise<TeamDto[]> {
  const memberships = await prisma.teamMembership.findMany({
    where: { userId },
    include: {
      team: {
        include: {
          memberships: {
            include: { user: { select: { id: true, name: true, email: true, role: true } } },
          },
        },
      },
    },
  });
  return memberships.map((m) => toTeamDto(m.team));
}

export async function addTeamMember(input: {
  ownerUserId: string;
  email: string;
  role?: TeamMemberRole;
}): Promise<TeamMembershipDto> {
  const team = await prisma.team.findFirst({
    where: { ownerUserId: input.ownerUserId },
    include: { memberships: true },
  });
  if (!team) throw new Error('Create a team first.');

  if (team.memberships.length >= team.seatLimit) {
    throw new Error(`Seat limit reached (${team.seatLimit}).`);
  }

  const member = await prisma.user.findFirst({
    where: { email: input.email.trim().toLowerCase() },
  });
  if (!member) throw new Error('No user found with that email — they must sign up first.');

  const role = input.role ?? 'member';
  const row = await prisma.teamMembership.upsert({
    where: { teamId_userId: { teamId: team.id, userId: member.id } },
    create: { teamId: team.id, userId: member.id, role },
    update: { role },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  if (role === 'coach' && member.role === 'user') {
    await prisma.user.update({ where: { id: member.id }, data: { role: 'coach' } });
  }

  await createInAppNotification({
    userId: member.id,
    type: 'team_invite',
    title: `Joined ${team.name}`,
    body: `You were added as ${role} on ${team.name}.`,
    href: '/coach-desk',
  });

  return toMembershipDto(row);
}

export async function assignCoachMember(input: {
  coachUserId: string;
  memberEmail: string;
  note?: string | null;
}): Promise<CoachAssignmentDto> {
  const member = await prisma.user.findFirst({
    where: { email: input.memberEmail.trim().toLowerCase() },
    include: { profile: { select: { headline: true, completenessScore: true } } },
  });
  if (!member) throw new Error('No user found with that email.');

  const row = await prisma.coachAssignment.upsert({
    where: {
      coachUserId_memberUserId: {
        coachUserId: input.coachUserId,
        memberUserId: member.id,
      },
    },
    create: {
      coachUserId: input.coachUserId,
      memberUserId: member.id,
      note: input.note?.trim() || null,
    },
    update: { note: input.note?.trim() || null },
  });

  await createInAppNotification({
    userId: member.id,
    type: 'coach_assigned',
    title: 'Career coach assigned',
    body: 'A coach can now view your profile progress and applications.',
    href: '/profile',
  });

  return {
    id: row.id,
    coachUserId: row.coachUserId,
    memberUserId: row.memberUserId,
    note: row.note,
    member: {
      id: member.id,
      name: member.name,
      email: member.email,
      headline: member.profile?.headline ?? null,
      completenessScore: member.profile?.completenessScore ?? null,
    },
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listCoachDeskMembers(coachUserId: string): Promise<CoachDeskMemberDto[]> {
  const [assignments, teamMemberships] = await Promise.all([
    prisma.coachAssignment.findMany({
      where: { coachUserId },
      include: {
        member: {
          include: {
            profile: { select: { headline: true, completenessScore: true } },
            _count: { select: { applications: true } },
          },
        },
      },
    }),
    prisma.teamMembership.findMany({
      where: { userId: coachUserId, role: { in: ['coach', 'owner'] } },
      select: { teamId: true },
    }),
  ]);

  const byUser = new Map<string, CoachDeskMemberDto>();

  for (const a of assignments) {
    byUser.set(a.memberUserId, {
      userId: a.member.id,
      name: a.member.name,
      email: a.member.email,
      headline: a.member.profile?.headline ?? null,
      completenessScore: a.member.profile?.completenessScore ?? null,
      applicationCount: a.member._count.applications,
      assignmentId: a.id,
      source: 'assignment',
    });
  }

  if (teamMemberships.length) {
    const teamMembers = await prisma.teamMembership.findMany({
      where: {
        teamId: { in: teamMemberships.map((t) => t.teamId) },
        role: 'member',
      },
      include: {
        user: {
          include: {
            profile: { select: { headline: true, completenessScore: true } },
            _count: { select: { applications: true } },
          },
        },
      },
    });
    for (const m of teamMembers) {
      if (byUser.has(m.userId)) continue;
      byUser.set(m.userId, {
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        headline: m.user.profile?.headline ?? null,
        completenessScore: m.user.profile?.completenessScore ?? null,
        applicationCount: m.user._count.applications,
        assignmentId: null,
        source: 'team',
      });
    }
  }

  return [...byUser.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function supportLookupUser(email: string): Promise<SupportUserLookupDto | null> {
  const user = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase() },
    include: {
      preferences: { select: { onboardingCompleted: true } },
      profile: { select: { headline: true, completenessScore: true } },
      subscription: true,
      _count: { select: { applications: true, resumes: true } },
    },
  });
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    planId: planFromSub(user.subscription),
    subscriptionStatus: user.subscription?.status ?? null,
    onboardingCompleted: user.preferences?.onboardingCompleted ?? false,
    headline: user.profile?.headline ?? null,
    completenessScore: user.profile?.completenessScore ?? null,
    applicationCount: user._count.applications,
    resumeCount: user._count.resumes,
    createdAt: user.createdAt.toISOString(),
  };
}

function toTeamDto(team: {
  id: string;
  name: string;
  ownerUserId: string;
  seatLimit: number;
  createdAt: Date;
  updatedAt: Date;
  memberships: Array<{
    id: string;
    teamId: string;
    userId: string;
    role: string;
    createdAt: Date;
    user?: { id: string; name: string; email: string; role: string };
  }>;
}): TeamDto {
  return {
    id: team.id,
    name: team.name,
    ownerUserId: team.ownerUserId,
    seatLimit: team.seatLimit,
    memberCount: team.memberships.length,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
    memberships: team.memberships.map(toMembershipDto),
  };
}

function toMembershipDto(row: {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  createdAt: Date;
  user?: { id: string; name: string; email: string; role: string };
}): TeamMembershipDto {
  return {
    id: row.id,
    teamId: row.teamId,
    userId: row.userId,
    role: row.role,
    user: row.user,
    createdAt: row.createdAt.toISOString(),
  };
}
