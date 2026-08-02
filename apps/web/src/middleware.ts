import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/register(.*)',
  '/api/health',
  '/api/webhooks(.*)',
  '/api/extension/assist(.*)',
  '/p/(.*)',
  '/api/p/(.*)',
  '/apply-fixture',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  const ref = request.nextUrl.searchParams.get('ref');
  if (ref && request.nextUrl.pathname.startsWith('/register')) {
    const response = NextResponse.next();
    response.cookies.set('jm_ref', ref, {
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });
    return response;
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
