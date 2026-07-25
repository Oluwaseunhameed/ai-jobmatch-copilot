import { Injectable } from '@nestjs/common';
import { prisma, type Prisma } from '@jobmatch/database';

@Injectable()
export class PreferencesService {
  async getOrCreate(userId: string) {
    return prisma.userPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async update(userId: string, data: Prisma.UserPreferenceUpdateInput) {
    await this.getOrCreate(userId);
    return prisma.userPreference.update({
      where: { userId },
      data,
    });
  }

  async completeOnboarding(userId: string) {
    return this.update(userId, { onboardingCompleted: true });
  }
}
