import { NextResponse } from 'next/server';
import {
  getDefaultEnvironment,
  unipileFetch,
  getPostArray,
  extractPostId,
  extractCaption,
  extractApiError,
  safeValue,
} from '@/lib/unipileService';

function extractMediaUrl(post) {
  if (!post || typeof post !== 'object') return '';
  if (post.preview_image?.url) return post.preview_image.url;
  if (Array.isArray(post.carousel_medias) && post.carousel_medias[0]?.url) {
    return post.carousel_medias[0].url;
  }
  if (Array.isArray(post.carousel_media) && post.carousel_media[0]?.image_versions2?.candidates?.[0]?.url) {
    return post.carousel_media[0].image_versions2.candidates[0].url;
  }
  if (Array.isArray(post.carousel_media) && post.carousel_media[0]?.url) {
    return post.carousel_media[0].url;
  }
  if (post.image_versions2?.candidates?.[0]?.url) {
    return post.image_versions2.candidates[0].url;
  }
  return post.media_url || post.image_url || post.display_url || post.thumbnail_url || '';
}

export async function POST(request) {
  try {
    const data = await request.json();
    const env = getDefaultEnvironment();

    const providerId = String(data.providerId || '').trim();

    if (!providerId) {
      return NextResponse.json({ ok: false, error: 'Provider ID is required' }, { status: 400 });
    }

    const dsn = env.dsn || data.dsn;
    const apiKey = env.apiKey || data.apiKey;
    const accountId = env.accountId || data.accountId;

    const routePath = `/api/v1/users/${encodeURIComponent(providerId)}/posts?account_id=${encodeURIComponent(accountId)}&limit=20`;
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

    const rawPosts = getPostArray(result.body);
    const formattedPosts = [];
    const seenIds = new Set();

    for (const post of rawPosts) {
      const postId = extractPostId(post);
      if (!postId || seenIds.has(postId)) continue;
      seenIds.add(postId);

      const mediaUrl = extractMediaUrl(post);

      formattedPosts.push({
        id: postId,
        postId,
        caption: extractCaption(post),
        mediaUrl,
        previewImageUrl: mediaUrl,
        likeCount: post.like_count || post.likes_count || 0,
        commentsCount: post.comments_count || post.comment_count || 0,
        createdAt: post.created_at || post.taken_at || '',
        permalink: post.permalink || post.url || `https://instagram.com/p/${postId}`,
        owner: post.owner || null,
        raw: safeValue('post', post),
      });
    }

    return NextResponse.json({
      ok: true,
      status: result.status,
      statusText: result.statusText,
      durationMs: result.durationMs,
      posts: formattedPosts,
      total: formattedPosts.length,
      body: safeValue('body', result.body),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
