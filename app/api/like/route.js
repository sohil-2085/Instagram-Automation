import { NextResponse } from 'next/server';
import { getDefaultEnvironment, unipileFetch, extractApiError, safeValue } from '@/lib/unipileService';

export async function POST(request) {
  try {
    const data = await request.json();
    const env = getDefaultEnvironment();

    const postId = String(data.postId || '').trim();
    if (!postId) {
      return NextResponse.json({ ok: false, error: 'Post ID is required' }, { status: 400 });
    }

    const dsn = env.dsn || data.dsn;
    const apiKey = env.apiKey || data.apiKey;
    const accountId = env.accountId || data.accountId;

    const result = await unipileFetch({
      dsn,
      apiKey,
      accountId,
      method: 'POST',
      path: '/api/v1/posts/reaction',
      jsonBody: {
        account_id: accountId,
        post_id: postId,
      },
    });

    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      statusText: result.statusText,
      durationMs: result.durationMs,
      body: safeValue('body', result.body),
      is502: result.is502,
      note: result.note,
      error: !result.ok ? extractApiError(result) : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
