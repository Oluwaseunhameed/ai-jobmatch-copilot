import { ensureUserFromClerk, prisma } from '@jobmatch/database';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';

type ClerkEmailAddress = {
  id?: string;
  email_address: string;
  verification?: { status?: string } | null;
};

type ClerkUserEventData = {
  id: string;
  email_addresses?: ClerkEmailAddress[];
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  image_url?: string | null;
};

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CLERK_WEBHOOK_SECRET not configured' }, { status: 500 });
  }

  const payload = await req.text();
  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const wh = new Webhook(secret);
  let event: { type: string; data: ClerkUserEventData };

  try {
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as { type: string; data: ClerkUserEventData };
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const data = event.data;
    const primaryEmail =
      data.email_addresses?.find((e) => e.id === data.primary_email_address_id) ??
      data.email_addresses?.[0];

    if (primaryEmail?.email_address) {
      await ensureUserFromClerk({
        id: data.id,
        email: primaryEmail.email_address,
        emailVerified: primaryEmail.verification?.status === 'verified',
        name: [data.first_name, data.last_name].filter(Boolean).join(' ') || data.username,
        image: data.image_url,
      });
    }
  }

  if (event.type === 'user.deleted' && event.data.id) {
    await prisma.user.deleteMany({ where: { id: event.data.id } });
  }

  return NextResponse.json({ ok: true });
}
