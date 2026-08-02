import { NextResponse } from 'next/server';

/** Allow browser-extension origins to call token-authenticated extension APIs. */
export function extensionCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin');
  const allowOrigin =
    origin &&
    (origin.startsWith('moz-extension://') ||
      origin.startsWith('chrome-extension://') ||
      origin.startsWith('safari-web-extension://'))
      ? origin
      : '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-JobMatch-Extension-Token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function extensionOptionsResponse(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: extensionCorsHeaders(request),
  });
}

export function extensionJsonResponse(
  request: Request,
  body: unknown,
  init: { status?: number } = {},
) {
  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: extensionCorsHeaders(request),
  });
}
