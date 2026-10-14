import { NextResponse } from 'next/server';
import { getDefaultEnvironment, unipileFetch, extractApiError, safeValue } from '@/lib/unipileService';

export async function POST(request) {
  try {
    const data = await request.json();
    const env = getDefaultEnvironment();

    const postId = String(data.postId || '').trim();
    const commentText = String(data.commentText || '').trim();

    if (!postId) {
      return NextResponse.json({ ok: false, error: 'Post ID is required' }, { status: 400 });
    }
    if (!commentText) {
      return NextResponse.json({ ok: false, error: 'Comment text is required' }, { status: 400 });
    }

    const dsn = env.dsn || data.dsn;
    const apiKey = env.apiKey || data.apiKey;
    const accountId = env.accountId || data.accountId;

    const form = new FormData();
    form.set('account_id', accountId);
    form.set('text', commentText);

    const result = await unipileFetch({
      dsn,
      apiKey,
      accountId,
      method: 'POST',
      path: `/api/v1/posts/${encodeURIComponent(postId)}/comments`,
      formBody: form,
    });

    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      statusText: result.statusText,
      durationMs: result.durationMs,
      commentText,
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
