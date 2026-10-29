import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getBackendOrigin(): string {
  return (process.env.AI_CHAN_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
}

async function proxyRequest(req: NextRequest, context: { params: { path?: string[] } }): Promise<NextResponse> {
  const pathSegments = context.params?.path || [];
  const subPath = pathSegments.join('/');
  const search = req.nextUrl.search || '';
  const targetUrl = `${getBackendOrigin()}/api/${subPath}${search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower !== 'host' && lower !== 'connection' && lower !== 'content-length') {
      headers.set(key, value);
    }
  });

  const method = req.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const bodyBuffer = hasBody ? await req.arrayBuffer() : undefined;

  try {
    const upstreamRes = await fetch(targetUrl, {
      method,
      headers,
      body: bodyBuffer && bodyBuffer.byteLength > 0 ? bodyBuffer : undefined,
      redirect: 'manual',
      cache: 'no-store',
    });

    const resHeaders = new Headers();
    upstreamRes.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower !== 'transfer-encoding' && lower !== 'content-encoding' && lower !== 'content-length') {
        resHeaders.append(key, value);
      }
    });

    const setCookieHeader = (upstreamRes.headers as any).getSetCookie?.();
    if (Array.isArray(setCookieHeader) && setCookieHeader.length > 0) {
      resHeaders.delete('set-cookie');
      for (const cookie of setCookieHeader) {
        resHeaders.append('set-cookie', cookie);
      }
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: resHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        detail: `Không thể kết nối tới máy chủ AI-Chan Backend (${getBackendOrigin()}): ${err?.message || 'Lỗi mạng'}`,
      },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxyRequest(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxyRequest(req, ctx);
}

export async function PUT(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxyRequest(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxyRequest(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxyRequest(req, ctx);
}

export async function OPTIONS(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxyRequest(req, ctx);
}
