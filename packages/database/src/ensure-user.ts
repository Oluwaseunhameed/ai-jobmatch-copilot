import { prisma } from './client';

export interface ClerkUserLike {
  id: string;
  email: string;
  emailVerified?: boolean;
  name?: string | null;
  image?: string | null;
}

/**
 * Upsert a local User (+ default preferences) from Clerk identity.
 * Safe to call on every authenticated request (webhook may lag).
 */
export async function ensureUserFromClerk(input: ClerkUserLike) {
  const name = input.name?.trim() || input.email.split('@')[0] || 'User';
  const email = input.email.toLowerCase();

  // Drop legacy Better Auth rows that share the email but not the Clerk id
  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail && existingByEmail.id !== input.id) {
    await prisma.user.delete({ where: { id: existingByEmail.id } });
  }

  const user = await prisma.user.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      email,
      name,
      emailVerified: input.emailVerified ?? false,
      image: input.image ?? null,
      preferences: { create: {} },
    },
    update: {
      email,
      name,
      emailVerified: input.emailVerified ?? false,
      image: input.image ?? null,
    },
    include: { preferences: true },
  });

  if (!user.preferences) {
    await prisma.userPreference.create({ data: { userId: user.id } });
  }

  return user;
}
