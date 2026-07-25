import { prisma } from './client';
import { ensureUserFromClerk, type ClerkUserLike } from './ensure-user';

export { prisma };
export { PrismaClient } from '@prisma/client';
export * from '@prisma/client';
export { ensureUserFromClerk, type ClerkUserLike } from './ensure-user';
export {
  calculateCompletenessScore,
  completenessBreakdown,
  type CompletenessProfile,
} from './completeness';
