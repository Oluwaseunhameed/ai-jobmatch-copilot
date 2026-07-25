import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { verifyToken, createClerkClient } from '@clerk/backend';
import { ensureUserFromClerk } from '@jobmatch/database';

import { AuthGuard } from './auth.guard';

jest.mock('@clerk/backend', () => ({
  verifyToken: jest.fn(),
  createClerkClient: jest.fn(),
}));

jest.mock('@jobmatch/database', () => ({
  ensureUserFromClerk: jest.fn(),
}));

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.CLERK_SECRET_KEY = 'sk_test_dummy';

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthGuard],
    }).compile();

    guard = module.get(AuthGuard);
  });

  it('allows requests with a valid Bearer token', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ sub: 'user_1' });
    (createClerkClient as jest.Mock).mockReturnValue({
      users: {
        getUser: jest.fn().mockResolvedValue({
          id: 'user_1',
          firstName: 'Jane',
          lastName: 'Doe',
          username: null,
          imageUrl: null,
          primaryEmailAddressId: 'email_1',
          emailAddresses: [
            {
              id: 'email_1',
              emailAddress: 'jane@example.com',
              verification: { status: 'verified' },
            },
          ],
        }),
      },
    });
    (ensureUserFromClerk as jest.Mock).mockResolvedValue({
      id: 'user_1',
      email: 'jane@example.com',
      name: 'Jane Doe',
      image: null,
      role: 'user',
    });

    const request = { headers: { authorization: 'Bearer tok_abc' } };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request as { user?: { id: string } }).user?.id).toBe('user_1');
  });

  it('rejects requests without a Bearer token', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
