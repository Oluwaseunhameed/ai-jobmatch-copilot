import { NextResponse } from 'next/server';

import { requireAppUser } from '@/lib/auth';
import { createExtensionToken } from '@/lib/extension-auth';

export const dynamic = 'force-dynamic';

/** Issue a long-lived token for the browser extension (Path B). */
export async function POST() {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const issued = createExtensionToken(app.user.id);
    return NextResponse.json({
      token: issued.token,
      expiresAt: issued.expiresAt,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '',
      user: {
        id: app.user.id,
        email: app.user.email,
        name: app.user.name,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not issue extension token';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
