import { NextResponse } from 'next/server';
import { getDefaultEnvironment, unipileFetch, safeValue } from '@/lib/unipileService';

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

    const dsn = data.dsn || env.dsn;
    const apiKey = data.apiKey || env.apiKey;
    const accountId = data.accountId || env.accountId;

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
      error: !result.ok ? (typeof result.body === 'string' ? result.body : (result.body?.error || result.statusText)) : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
