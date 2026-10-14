import { NextResponse } from 'next/server';
import { getDefaultEnvironment, unipileFetch, makeBaseUrl, safeValue } from '@/lib/unipileService';

export async function POST(request) {
  try {
    const data = await request.json();
    const env = getDefaultEnvironment();

    const dsn = data.dsn || env.dsn;
    const apiKey = data.apiKey || env.apiKey;
    const accountId = data.accountId || env.accountId;

    if (!dsn) {
      return NextResponse.json({ ok: false, error: 'DSN is required' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'API Key is required' }, { status: 400 });
    }

    // Attempt a light ping or account check
    // In Unipile, accounts endpoint is /api/v1/accounts or /api/v1/accounts/:id
    const routePath = accountId
      ? `/api/v1/accounts/${encodeURIComponent(accountId)}`
      : `/api/v1/accounts`;

    const result = await unipileFetch({
      dsn,
      apiKey,
      accountId,
      method: 'GET',
      path: routePath,
      timeoutMs: 12000,
    });

    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      statusText: result.statusText,
      durationMs: result.durationMs,
      url: result.url,
      is502: result.is502,
      note: result.note,
      body: safeValue('body', result.body),
      message: result.ok
        ? 'Successfully connected to Unipile host and verified account!'
        : result.is502
          ? 'Unipile host returned 502 Bad Gateway. Upstream server is restarting or down.'
          : result.status === 401
            ? 'Invalid API Key (HTTP 401 Unauthorized).'
            : result.status === 404
              ? 'Connected to host, but Account ID was not found (HTTP 404).'
              : `Connection responded with HTTP ${result.status} ${result.statusText}`,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Connection test failed' },
      { status: 500 }
    );
  }
}
