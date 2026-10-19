import { NextRequest, NextResponse } from 'next/server';

/**
 * Runtime Reverse Proxy for AI-Chan Backend API
 *
 * Forwards same-origin /api/* requests to the dynamic loopback FastAPI backend.
 * Evaluates process.env.INTERNAL_BACKEND_URL at request time so that dynamic ports
 * selected by the launcher (e.g. 8000, 8001, etc.) are always correctly targeted.
 * Forwards cookies, authentication headers, method, body stream, and response Set-Cookie headers.
 */

function getBackendBaseUrl(): string {
  let raw = process.env.INTERNAL_BACKEND_URL;
  if (!raw || raw.trim() === '') {
    raw = 'http://127.0.0.1:8000/api/';
  }
  if (!raw.endsWith('/')) {
    raw += '/';
  }
  return raw;
}

async function handleProxy(req: NextRequest, params: { path?: string[] }): Promise<NextResponse> {
  const backendBase = getBackendBaseUrl();
  const pathSegments = params.path || [];
  const subpath = pathSegments.join('/');

  let targetUrl: URL;
  try {
    targetUrl = new URL(subpath, backendBase);
    targetUrl.search = req.nextUrl.search;
  } catch (err: any) {
    return NextResponse.json(
      { detail: `URL backend không hợp lệ: ${err.message}` },
      { status: 400 }
    );
  }

  // Security guard: Loopback only
  const isLoopback = ['127.0.0.1', 'localhost', '::1'].includes(targetUrl.hostname);
  if (!isLoopback) {
    return NextResponse.json(
      { detail: 'Truy cập bị từ chối: Proxy chỉ cho phép chuyển tiếp tới dịch vụ nội bộ loopback.' },
      { status: 403 }
    );
  }

  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (['host', 'connection', 'keep-alive', 'transfer-encoding'].includes(lowerKey)) {
      return;
    }
    forwardHeaders.set(key, value);
  });
  forwardHeaders.set('host', targetUrl.host);

  const method = req.method.toUpperCase();
  const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  const fetchOptions: RequestInit & { duplex?: string } = {
    method,
    headers: forwardHeaders,
    redirect: 'manual',
    cache: 'no-store',
  };

  if (hasBody && req.body) {
    fetchOptions.body = req.body;
    fetchOptions.duplex = 'half';
  }

  try {
    const backendRes = await fetch(targetUrl.toString(), fetchOptions as any);

    const responseHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (['transfer-encoding', 'connection'].includes(lowerKey)) {
        return;
      }
      responseHeaders.set(key, value);
    });

    // Safely forward multiple Set-Cookie headers
    const getSetCookie = (backendRes.headers as any).getSetCookie;
    if (typeof getSetCookie === 'function') {
      const cookies: string[] = getSetCookie.call(backendRes.headers);
      if (Array.isArray(cookies) && cookies.length > 0) {
        responseHeaders.delete('set-cookie');
        for (const cookie of cookies) {
          responseHeaders.append('set-cookie', cookie);
        }
      }
    }

    return new NextResponse(backendRes.body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        detail: `Không thể kết nối đến máy chủ backend AI-Chan tại ${targetUrl.origin}. Dịch vụ có thể chưa khởi động hoặc đang bận.`,
        error: err.message || 'Connection refused',
        target: `${targetUrl.protocol}//${targetUrl.host}`,
      },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const resolved = await params;
  return handleProxy(req, resolved);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const resolved = await params;
  return handleProxy(req, resolved);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const resolved = await params;
  return handleProxy(req, resolved);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const resolved = await params;
  return handleProxy(req, resolved);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const resolved = await params;
  return handleProxy(req, resolved);
}

export async function HEAD(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const resolved = await params;
  return handleProxy(req, resolved);
}

export async function OPTIONS(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const resolved = await params;
  return handleProxy(req, resolved);
}
