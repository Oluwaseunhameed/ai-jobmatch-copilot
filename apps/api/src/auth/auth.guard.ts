import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { ensureUserFromClerk } from '@jobmatch/database';
import type { Request } from 'express';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: string;
};

/**
 * Validates Clerk session JWT (Authorization: Bearer <token>).
 * Attach with @UseGuards(AuthGuard) on controllers that require authentication.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const secretKey = process.env.CLERK_SECRET_KEY;

    if (!secretKey) {
      throw new UnauthorizedException('CLERK_SECRET_KEY is not configured');
    }

    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined;

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = await verifyToken(token, { secretKey });
      const clerk = createClerkClient({ secretKey });
      const clerkUser = await clerk.users.getUser(payload.sub);

      const primaryEmail =
        clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId) ??
        clerkUser.emailAddresses[0];

      if (!primaryEmail?.emailAddress) {
        throw new UnauthorizedException('User has no email');
      }

      const user = await ensureUserFromClerk({
        id: clerkUser.id,
        email: primaryEmail.emailAddress,
        emailVerified: primaryEmail.verification?.status === 'verified',
        name:
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
          clerkUser.username,
        image: clerkUser.imageUrl,
      });

      (request as Request & { user: AuthUser }).user = {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
