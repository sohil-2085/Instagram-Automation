import fs from 'node:fs';
import path from 'node:path';

const API_PREFIX = '/api/v1';

/**
 * Loads default environment credentials from file or process.env
 */
export function getDefaultEnvironment() {
  const env = {
    dsn: process.env.UNIPILE_DSN || process.env.DSN || '',
    apiKey: process.env.UNIPILE_API_KEY || process.env.API_KEY || '',
    accountId: process.env.UNIPILE_ACCOUNT_ID || process.env.ACC || '',
  };

  if (!env.dsn || !env.apiKey || !env.accountId) {
    try {
      const envPath = path.resolve(process.cwd(), 'instagram-environment.json');
      if (fs.existsSync(envPath)) {
        const raw = JSON.parse(fs.readFileSync(envPath, 'utf8'));
        if (Array.isArray(raw.values)) {
          for (const item of raw.values) {
            if (item?.enabled !== false && item?.key) {
              if (item.key === 'DSN' && !env.dsn) env.dsn = String(item.value || '').trim();
              if (item.key === 'API_KEY' && !env.apiKey) env.apiKey = String(item.value || '').trim();
              if (item.key === 'ACC' && !env.accountId) env.accountId = String(item.value || '').trim();
            }
          }
        }
      }
    } catch {
      // Ignore if file read fails on Vercel
    }
  }

  // Sensible fallback defaults
  if (!env.dsn) env.dsn = 'api71.unipile.com:20132';

  return env;
}

/**
 * Formats base URL from DSN
 */
export function makeBaseUrl(dsn) {
  const raw = String(dsn || '').trim().replace(/\/+$/, '');
  if (!raw) {
    return 'https://api71.unipile.com:20132';
  }
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return `https://${raw}`;
  }
}

/**
 * Redacts secrets from JSON for safe logging/display
 */
export function safeValue(key, value) {
  if (/access.?token|refresh.?token|api.?key|secret|password|cookie|authorization/i.test(key)) {
    return '[REDACTED]';
  }
  if (Array.isArray(value)) {
    return value.map((item) => safeValue(key, item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        safeValue(childKey, childValue),
      ])
    );
  }
  return value;
}

/**
 * Extracts human-readable error description from Unipile response
 */
export function extractApiError(result) {
  if (!result) return 'Unknown error';
  if (typeof result.body === 'string' && result.body.trim()) {
    return result.body.trim();
  }
  if (result.body && typeof result.body === 'object') {
    const detail =
      result.body.message ||
      result.body.detail ||
      result.body.title ||
      result.body.error ||
      (Array.isArray(result.body.errors) && result.body.errors[0]?.message);

    if (detail) {
      return result.status ? `${detail} (HTTP ${result.status})` : String(detail);
    }
  }
  if (result.statusText) {
    return `${result.statusText} (HTTP ${result.status})`;
  }
  return `HTTP ${result.status || 500}`;
}

/**
 * Extracts provider ID from profile body
 */
export function extractProviderId(profileBody) {
  if (!profileBody || typeof profileBody !== 'object') return '';

  const explicit = findValueByKeys(profileBody, [
    'provider_id',
    'providerId',
    'provider_user_id',
    'providerUserId',
  ]);

  if (typeof explicit === 'string' || typeof explicit === 'number') {
    return String(explicit).trim();
  }

  const root = Array.isArray(profileBody) ? profileBody[0] : profileBody;
  const candidates = [root, root?.data, root?.user, root?.profile];

  for (const candidate of candidates) {
    if (candidate && !Array.isArray(candidate) && (typeof candidate.id === 'string' || typeof candidate.id === 'number')) {
      return String(candidate.id).trim();
    }
  }

  return '';
}

function findValueByKeys(value, keys) {
  if (!value || typeof value !== 'object') return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const res = findValueByKeys(item, keys);
      if (res !== undefined && res !== null && res !== '') return res;
    }
    return undefined;
  }
  for (const key of keys) {
    if (value[key] !== undefined && value[key] !== null && value[key] !== '') {
      return value[key];
    }
  }
  for (const child of Object.values(value)) {
    const res = findValueByKeys(child, keys);
    if (res !== undefined && res !== null && res !== '') return res;
  }
  return undefined;
}

/**
 * Reads follow state from profile response
 */
export function readFollowState(value) {
  const positiveKeys = new Set([
    'is_following',
    'isFollowing',
    'following',
    'followed_by_me',
    'is_followed',
    'is_requested',
    'is_follow_request_sent',
    'requested',
    'pending',
    'is_pending',
  ]);

  const relationKeys = new Set([
    'is_following',
    'isFollowing',
    'following',
    'followed_by_me',
    'is_followed',
  ]);

  const flags = [];

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (typeof child === 'boolean' && positiveKeys.has(key)) {
        flags.push({
          key,
          value: child,
          isRelation: relationKeys.has(key),
        });
      }
      if (child && typeof child === 'object') {
        walk(child);
      }
    }
  }

  walk(value);

  if (flags.some((flag) => flag.value === true)) {
    return {
      state: 'already-connected-or-pending',
      flags,
    };
  }

  if (flags.some((flag) => flag.value === false && flag.isRelation)) {
    return {
      state: 'not-following',
      flags,
    };
  }

  return {
    state: 'unknown',
    flags,
  };
}

/**
 * Extracts post items array from response
 */
export function getPostArray(body) {
  const likelyKeys = ['data', 'items', 'posts', 'results'];

  function isPostLike(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const id = item.provider_id ?? item.providerId ?? item.post_id ?? item.postId ?? item.id;
    return id !== undefined && id !== null && id !== '';
  }

  function walk(node) {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) {
      if (node.some(isPostLike)) return node.filter(isPostLike);
      for (const item of node) {
        const found = walk(item);
        if (found) return found;
      }
      return null;
    }
    for (const key of likelyKeys) {
      if (node[key] !== undefined) {
        const found = walk(node[key]);
        if (found) return found;
      }
    }
    for (const child of Object.values(node)) {
      const found = walk(child);
      if (found) return found;
    }
    return null;
  }

  return walk(body) || [];
}

export function extractPostId(post) {
  const raw = post.provider_id ?? post.providerId ?? post.post_id ?? post.postId ?? post.id;
  return raw === undefined || raw === null ? '' : String(raw).trim();
}

export function extractCaption(post) {
  if (post?.caption && typeof post.caption === 'object' && typeof post.caption.text === 'string') {
    return post.caption.text.trim();
  }
  for (const key of ['caption', 'text', 'description', 'title']) {
    if (typeof post?.[key] === 'string' && post[key].trim()) {
      return post[key].trim();
    }
  }
  return '';
}

export function commentForCaption(caption, prefix = '[API TEST]', maxChars = 100, postId = '') {
  const excerpt = String(caption || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars);

  if (!excerpt) {
    return `${prefix} Automated API runner comment test for post ${postId}`;
  }
  return `${prefix} Caption excerpt: “${excerpt}”`;
}

/**
 * Executes a call to the Unipile API
 */
export async function unipileFetch({
  dsn,
  apiKey,
  accountId,
  method = 'GET',
  path: routePath,
  jsonBody = null,
  formBody = null,
  timeoutMs = 25000,
}) {
  const baseUrl = makeBaseUrl(dsn);
  const url = `${baseUrl}${routePath}`;
  const started = Date.now();

  const headers = {
    Accept: 'application/json',
  };
  if (apiKey) {
    headers['X-API-KEY'] = apiKey;
  }

  const init = {
    method,
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  };

  if (formBody) {
    init.body = formBody;
  } else if (jsonBody !== null) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(jsonBody);
  }

  try {
    const res = await fetch(url, init);
    const raw = await res.text();
    let body = raw;
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        // Leave as string if not JSON (e.g. HTML 502)
      }
    }
    const durationMs = Date.now() - started;

    const is502 = res.status === 502;
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      url,
      method,
      durationMs,
      body,
      is502,
      note: is502
        ? 'Unipile host returned 502 Bad Gateway (upstream proxy/service is restarting or unreachable). Try switching to Simulation Mode for full testing or check Unipile status.'
        : undefined,
    };
  } catch (error) {
    const durationMs = Date.now() - started;
    return {
      ok: false,
      status: 0,
      statusText: error.name || 'Request Failed',
      url,
      method,
      durationMs,
      body: { error: error.message },
      isNetworkError: true,
      note: `Network or timeout error contacting ${baseUrl}: ${error.message}`,
    };
  }
}


