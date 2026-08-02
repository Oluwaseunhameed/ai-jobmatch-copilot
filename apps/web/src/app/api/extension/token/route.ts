import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from '@/lib/extension-cors';
import { requireAppUser } from '@/lib/auth';
import { createExtensionToken } from '@/lib/extension-auth';

export const dynamic = 'force-dynamic';

export function OPTIONS(request: Request) {
  return extensionOptionsResponse(request);
}

/** Issue a long-lived token for the browser extension (Path B). */
export async function POST(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return extensionJsonResponse(request, { error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const issued = createExtensionToken(app.user.id);
    return extensionJsonResponse(request, {
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
    return extensionJsonResponse(request, { error: { message } }, { status: 500 });
  }
}
