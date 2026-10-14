import { NextResponse } from 'next/server';
import {
  getDefaultEnvironment,
  unipileFetch,
  extractProviderId,
  readFollowState,
  extractApiError,
  safeValue,
} from '@/lib/unipileService';

export async function POST(request) {
  try {
    const data = await request.json();
    const env = getDefaultEnvironment();

    const username = String(data.username || '').trim().replace(/^@+/, '');
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required' }, { status: 400 });
    }

    const dsn = env.dsn || data.dsn;
    const apiKey = env.apiKey || data.apiKey;
    const accountId = env.accountId || data.accountId;

    const routePath = `/api/v1/users/${encodeURIComponent(username)}?account_id=${encodeURIComponent(accountId)}`;
    const result = await unipileFetch({
      dsn,
      apiKey,
      accountId,
      method: 'GET',
      path: routePath,
    });

    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        status: result.status,
        statusText: result.statusText,
        durationMs: result.durationMs,
        body: safeValue('body', result.body),
        is502: result.is502,
        note: result.note,
        error: extractApiError(result),
      });
    }

    const providerId = extractProviderId(result.body);
    const followState = readFollowState(result.body);

    const rawProfile = typeof result.body === 'object' && result.body !== null ? result.body : {};
    const avatarUrl =
      rawProfile.profile_picture_url_large ||
      rawProfile.profile_picture_url ||
      rawProfile.profile_pic_url ||
      rawProfile.avatar_url ||
      rawProfile.owner?.profile_pic_url ||
      '';

    const enrichedProfile = {
      ...rawProfile,
      avatar_url: avatarUrl,
      profile_picture_url: avatarUrl,
      profile_picture_url_large: rawProfile.profile_picture_url_large || avatarUrl,
      followers_count: rawProfile.followers_count ?? rawProfile.follower_count ?? 0,
      follower_count: rawProfile.followers_count ?? rawProfile.follower_count ?? 0,
      following_count: rawProfile.following_count ?? 0,
      posts_count: rawProfile.posts_count ?? 0,
      full_name: rawProfile.full_name || rawProfile.name || username,
    };

    return NextResponse.json({
      ok: true,
      status: result.status,
      statusText: result.statusText,
      durationMs: result.durationMs,
      providerId,
      followState,
      avatarUrl,
      body: safeValue('body', result.body),
      profile: enrichedProfile,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
