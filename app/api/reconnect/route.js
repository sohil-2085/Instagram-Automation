import { NextResponse } from 'next/server';
import { getDefaultEnvironment, unipileFetch, makeBaseUrl, safeValue } from '@/lib/unipileService';

export async function POST(request) {
  try {
    const data = await request.json();
    const env = getDefaultEnvironment();

    const managerName = String(data.managerName || 'TEST_MANAGER_001').trim();
    const notifyUrl = String(data.notifyUrl || 'https://webhook.site/test').trim();

    const dsn = env.dsn || data.dsn;
    const apiKey = env.apiKey || data.apiKey;
    const accountId = env.accountId || data.accountId;

    const baseUrl = makeBaseUrl(dsn);
    const expiresOn = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const result = await unipileFetch({
      dsn,
      apiKey,
      accountId,
      method: 'POST',
      path: '/api/v1/hosted/accounts/link',
      jsonBody: {
        type: 'reconnect',
        reconnect_account: accountId,
        api_url: baseUrl,
        expiresOn,
        name: managerName,
        notify_url: notifyUrl,
      },
    });

    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      statusText: result.statusText,
      durationMs: result.durationMs,
      body: safeValue('body', result.body),
      url: result.body?.url,
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
