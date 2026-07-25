import { Test, TestingModule } from '@nestjs/testing';

import { ProfilesService } from './profiles.service';

jest.mock('@jobmatch/database', () => {
  const store: {
    profile: Record<string, unknown> | null;
    skills: Array<Record<string, unknown>>;
  } = { profile: null, skills: [] };

  return {
    calculateCompletenessScore: jest.fn(() => 42),
    prisma: {
      careerProfile: {
        findUnique: jest.fn(async ({ where }: { where: { userId: string } }) => {
          if (!store.profile || (store.profile as { userId: string }).userId !== where.userId) {
            return null;
          }
          return { ...store.profile, skills: store.skills };
        }),
        create: jest.fn(async ({ data }: { data: { userId: string } }) => {
          store.profile = {
            id: 'prof_1',
            userId: data.userId,
            completenessScore: 0,
            desiredRoles: [],
            visaSponsorshipNeeded: false,
          };
          store.skills = [];
          return { ...store.profile, skills: [] };
        }),
        update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          store.profile = { ...store.profile, ...data, skills: undefined };
          if (data.skills && typeof data.skills === 'object') {
            const skillsOp = data.skills as {
              create?: Array<Record<string, unknown>>;
            };
            if (skillsOp.create) {
              store.skills = skillsOp.create.map((s, i) => ({
                id: `skill_${i}`,
                profileId: 'prof_1',
                ...s,
              }));
            }
          }
          return { ...store.profile, skills: store.skills };
        }),
      },
    },
  };
});

describe('ProfilesService', () => {
  let service: ProfilesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfilesService],
    }).compile();

    service = module.get(ProfilesService);
  });

  it('creates a profile when none exists', async () => {
    const profile = await service.getOrCreate('user_1');
    expect(profile.userId).toBe('user_1');
  });

  it('updates profile and recalculates completeness', async () => {
    await service.getOrCreate('user_1');
    const updated = await service.update('user_1', {
      headline: 'Senior Engineer',
      skills: [{ name: 'TypeScript', category: 'technical', level: 'expert' }],
    });
    expect(updated.completenessScore).toBe(42);
  });
});
