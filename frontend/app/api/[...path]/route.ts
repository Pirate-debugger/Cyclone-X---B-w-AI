import { NextRequest, NextResponse } from 'next/server';

/**
 * Runtime Backend Proxy Route (Section 54)
 * Forwards same-origin /api/* requests to BACKEND_URL dynamically at runtime.
 * Never exposes internal Docker hostnames or keys to the client bundle.
 */
function getBackendBase(): string {
  return (
    process.env.INTERNAL_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:8000'
  ).replace(/\/$/, '');
}

async function handleProxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  const resolvedParams = await Promise.resolve(context.params);
  const pathSegments = resolvedParams?.path || [];
  const targetSubPath = pathSegments.join('/');
  
  const backendBase = getBackendBase();
  const searchParams = request.nextUrl.search;
  const targetUrl = `${backendBase}/api/${targetSubPath}${searchParams}`;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('host');

  let body: ArrayBuffer | undefined = undefined;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    try {
      const buffer = await request.arrayBuffer();
      if (buffer.byteLength > 0) {
        body = buffer;
      }
    } catch {
      // Empty or non-readable body
    }
  }

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: requestHeaders,
      body,
      // @ts-expect-error duplex required for streaming in Node fetch
      duplex: body ? 'half' : undefined,
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BACKEND_PROXY_FAILED',
          message: error?.message || 'Failed to proxy request to backend service.',
          target_url: targetUrl,
        },
      },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
export const OPTIONS = handleProxy;
