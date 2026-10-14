import { NextResponse } from 'next/server';
import { getDefaultEnvironment, unipileFetch, extractApiError, safeValue } from '@/lib/unipileService';

export async function POST(request) {
  try {
    const data = await request.json();
    const env = getDefaultEnvironment();

    const providerId = String(data.providerId || '').trim();
    if (!providerId) {
      return NextResponse.json({ ok: false, error: 'Provider ID is required' }, { status: 400 });
    }

    const dsn = data.dsn || env.dsn;
    const apiKey = data.apiKey || env.apiKey;
    const accountId = data.accountId || env.accountId;

    const result = await unipileFetch({
      dsn,
      apiKey,
      accountId,
      method: 'POST',
      path: '/api/v1/users/invite',
      jsonBody: {
        account_id: accountId,
        provider_id: providerId,
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
