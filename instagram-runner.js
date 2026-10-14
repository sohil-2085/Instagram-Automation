#!/usr/bin/env node
'use strict';

/**
 * Instagram API Test Runner — Unipile
 *
 * Features:
 * - Reconnect an existing Instagram account.
 * - Run a sequential test cycle for each username.
 * - Check profile and resolve provider ID.
 * - Check follow state and send a follow request when appropriate.
 * - Fetch posts and select up to five posts.
 * - Like and prepare caption-based test comments.
 * - Print HTTP status codes and API response bodies.
 * - Save detailed logs locally.
 * - Exclude Social Crawl completely.
 *
 * Live mutations are disabled by default.
 * Use only accounts you own or are authorized to test.
 */

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');

const ROOT = __dirname;

const ENV_PATH = path.resolve(
  process.env.INSTAGRAM_ENV_FILE ||
  path.join(ROOT, 'instagram-environment.json')
);

const TARGETS_PATH = path.join(ROOT, 'targets.json');
const CONFIG_PATH = path.join(ROOT, 'runner-config.json');
const LOG_DIR = path.join(ROOT, 'logs');
const API_PREFIX = '/api/v1';

const rl = readline.createInterface({ input, output });

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const ask = async (question) => {
  try {
    return (await rl.question(question)).trim();
  } catch (error) {
    if (rl.closed || error?.code === 'ERR_USE_AFTER_CLOSE') {
      return null;
    }
    throw error;
  }
};

async function askRequired(question) {
  while (true) {
    const value = await ask(question);

    if (value === null) {
      throw new Error('Input closed.');
    }

    if (value) {
      return value;
    }

    console.log('A value is required.');
  }
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} file not found: ${filePath}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `${label} is not valid JSON: ${error.message}`
    );
  }
}

function loadEnvironment(filePath) {
  const parsed = readJson(filePath, 'Environment');

  // Supports Postman environment exports.
  if (Array.isArray(parsed.values)) {
    const env = {};

    for (const item of parsed.values) {
      if (item?.enabled !== false && item?.key) {
        env[item.key] = String(item.value ?? '').trim();
      }
    }

    return env;
  }

  // Also supports simple key/value JSON.
  return Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [
      key,
      String(value ?? '').trim(),
    ])
  );
}

function loadConfig() {
  const raw = readJson(CONFIG_PATH, 'Runner config');

  const config = {
    mode: raw.mode === 'live' ? 'live' : 'dry-run',

    betweenActionsSeconds:
      Number.isFinite(Number(raw.betweenActionsSeconds))
        ? Number(raw.betweenActionsSeconds)
        : 15,

    betweenUsersSeconds:
      Number.isFinite(Number(raw.betweenUsersSeconds))
        ? Number(raw.betweenUsersSeconds)
        : 60,

    dryRunRandomBetweenUsers:
      raw.dryRunRandomBetweenUsers !== false,

    dryRunBetweenUsersMinSeconds:
      Number.isFinite(Number(raw.dryRunBetweenUsersMinSeconds))
        ? Number(raw.dryRunBetweenUsersMinSeconds)
        : 30,

    dryRunBetweenUsersMaxSeconds:
      Number.isFinite(Number(raw.dryRunBetweenUsersMaxSeconds))
        ? Number(raw.dryRunBetweenUsersMaxSeconds)
        : 90,

    postsToLike:
      Number.isFinite(Number(raw.postsToLike))
        ? Math.max(1, Math.min(5, Number(raw.postsToLike)))
        : 5,

    commentOnPosts: raw.commentOnPosts !== false,

    commentPrefix:
      typeof raw.commentPrefix === 'string'
        ? raw.commentPrefix
        : '[API TEST]',

    maxCaptionChars:
      Number.isFinite(Number(raw.maxCaptionChars))
        ? Math.max(20, Math.min(180, Number(raw.maxCaptionChars)))
        : 100,
  };

  if (
    config.betweenActionsSeconds < 0 ||
    config.betweenUsersSeconds < 0 ||
    config.dryRunBetweenUsersMinSeconds < 0 ||
    config.dryRunBetweenUsersMaxSeconds < 0
  ) {
    throw new Error('Delay settings cannot be negative.');
  }

  if (
    config.dryRunBetweenUsersMinSeconds >
    config.dryRunBetweenUsersMaxSeconds
  ) {
    throw new Error(
      'dryRunBetweenUsersMinSeconds must be less than or equal to dryRunBetweenUsersMaxSeconds.'
    );
  }

  return config;
}

function makeBaseUrl(dsn) {
  const raw = String(dsn || '').trim().replace(/\/+$/, '');

  if (!raw) {
    throw new Error('DSN is empty in instagram-environment.json.');
  }

  const candidate = /^https?:\/\//i.test(raw)
    ? raw
    : `https://${raw}`;

  let parsed;

  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(
      'DSN must be a hostname (optionally with port) or full HTTP(S) URL.'
    );
  }

  return `${parsed.protocol}//${parsed.host}`;
}

function safeValue(key, value) {
  if (
    /access.?token|refresh.?token|api.?key|secret|password|cookie|authorization/i.test(
      key
    )
  ) {
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

function pretty(value, limit = 18000) {
  const text =
    typeof value === 'string'
      ? value
      : JSON.stringify(value, null, 2);

  return text.length > limit
    ? `${text.slice(0, limit)}\n... response truncated; see local JSONL log ...`
    : text;
}

function cleanUsername(value) {
  return String(value || '').trim().replace(/^@+/, '');
}

function findValueByKeys(value, keys) {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findValueByKeys(item, keys);

      if (result !== undefined && result !== null && result !== '') {
        return result;
      }
    }

    return undefined;
  }

  for (const key of keys) {
    if (
      value[key] !== undefined &&
      value[key] !== null &&
      value[key] !== ''
    ) {
      return value[key];
    }
  }

  for (const child of Object.values(value)) {
    const result = findValueByKeys(child, keys);

    if (result !== undefined && result !== null && result !== '') {
      return result;
    }
  }

  return undefined;
}

function extractProviderId(profileBody) {
  const explicit = findValueByKeys(profileBody, [
    'provider_id',
    'providerId',
    'provider_user_id',
    'providerUserId',
  ]);

  if (
    typeof explicit === 'string' ||
    typeof explicit === 'number'
  ) {
    return String(explicit).trim();
  }

  const root = Array.isArray(profileBody)
    ? profileBody[0]
    : profileBody;

  const candidates = [
    root,
    root?.data,
    root?.user,
    root?.profile,
  ];

  for (const candidate of candidates) {
    if (
      candidate &&
      !Array.isArray(candidate) &&
      (
        typeof candidate.id === 'string' ||
        typeof candidate.id === 'number'
      )
    ) {
      return String(candidate.id).trim();
    }
  }

  return '';
}

function readFollowState(value) {
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
    if (!node || typeof node !== 'object') {
      return;
    }

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

  if (
    flags.some(
      (flag) => flag.value === false && flag.isRelation
    )
  ) {
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

function getPostArray(body) {
  const likelyKeys = ['data', 'items', 'posts', 'results'];

  function isPostLike(item) {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item)
    ) {
      return false;
    }

    const id =
      item.provider_id ??
      item.providerId ??
      item.post_id ??
      item.postId ??
      item.id;

    return (
      id !== undefined &&
      id !== null &&
      id !== '' &&
      (
        typeof item.text === 'string' ||
        typeof item.caption === 'string' ||
        typeof item.description === 'string' ||
        typeof item.title === 'string' ||
        item.object === 'Post' ||
        item.share_url ||
        item.url
      )
    );
  }

  function walk(node) {
    if (!node || typeof node !== 'object') {
      return null;
    }

    if (Array.isArray(node)) {
      if (node.some(isPostLike)) {
        return node.filter(isPostLike);
      }

      for (const item of node) {
        const found = walk(item);

        if (found) {
          return found;
        }
      }

      return null;
    }

    for (const key of likelyKeys) {
      if (node[key] !== undefined) {
        const found = walk(node[key]);

        if (found) {
          return found;
        }
      }
    }

    for (const child of Object.values(node)) {
      const found = walk(child);

      if (found) {
        return found;
      }
    }

    return null;
  }

  return walk(body) || [];
}

function extractPostId(post) {
  const raw =
    post.provider_id ??
    post.providerId ??
    post.post_id ??
    post.postId ??
    post.id;

  return raw === undefined || raw === null
    ? ''
    : String(raw).trim();
}

function extractCaption(post) {
  if (post?.caption && typeof post.caption === 'object' && typeof post.caption.text === 'string') {
    return post.caption.text.trim();
  }

  for (const key of [
    'caption',
    'text',
    'description',
    'title',
  ]) {
    if (
      typeof post?.[key] === 'string' &&
      post[key].trim()
    ) {
      return post[key].trim();
    }
  }

  return '';
}

function commentForCaption(caption, config, postId) {
  const excerpt = String(caption || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, config.maxCaptionChars);

  if (!excerpt) {
    return `${config.commentPrefix} Comment endpoint test for post ${postId}.`;
  }

  return `${config.commentPrefix} Caption reference: “${excerpt}”`;
}

function createLogFile() {
  fs.mkdirSync(LOG_DIR, { recursive: true });

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  return path.join(
    LOG_DIR,
    `instagram-run-${stamp}.jsonl`
  );
}

async function main() {
  let env;
  let config;

  try {
    env = loadEnvironment(ENV_PATH);
    config = loadConfig();
  } catch (error) {
    console.error(`\nSetup error: ${error.message}\n`);
    process.exitCode = 1;
    rl.close();
    return;
  }

  const dsn = process.env.DSN || env.DSN;
  const apiKey = process.env.API_KEY || env.API_KEY;
  const accountId = process.env.ACC || env.ACC;

  if (!dsn || !apiKey || !accountId) {
    console.error(
      '\nMissing required settings. Fill DSN, API_KEY, and ACC in instagram-environment.json.'
    );
    console.error(
      'Keep the file private and never commit it to Git.\n'
    );

    process.exitCode = 1;
    rl.close();
    return;
  }

  let baseUrl;

  try {
    baseUrl = makeBaseUrl(dsn);
  } catch (error) {
    console.error(
      `\nConfiguration error: ${error.message}\n`
    );
    process.exitCode = 1;
    rl.close();
    return;
  }

  let targets;

  try {
    const parsed = readJson(TARGETS_PATH, 'Targets');

    targets = Array.isArray(parsed.usernames)
      ? [
        ...new Set(
          parsed.usernames
            .map(cleanUsername)
            .filter(Boolean)
        ),
      ]
      : [];
  } catch (error) {
    console.error(`\nTargets error: ${error.message}\n`);
    process.exitCode = 1;
    rl.close();
    return;
  }

  const logFile = createLogFile();
  const runId = new Date().toISOString();
  const summaries = [];

  function writeLog(entry) {
    const record = {
      runId,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    fs.appendFileSync(
      logFile,
      `${JSON.stringify(safeValue('root', record))}\n`,
      'utf8'
    );
  }

  function printResponseBody(body) {
    const sanitized = safeValue('root', body);

    if (
      body === undefined ||
      body === null ||
      body === ''
    ) {
      console.log('    Response body: (empty)');
    } else {
      console.log(
        `    Response body:\n${pretty(sanitized)}`
      );
    }
  }

  function summarizeError(body, statusText) {
    if (typeof body === 'string' && body.trim()) {
      return body.slice(0, 500);
    }

    if (body && typeof body === 'object') {
      const message =
        body.message ||
        body.error ||
        body.detail ||
        body.title;

      if (typeof message === 'string') {
        return message.slice(0, 500);
      }

      try {
        return JSON.stringify(body).slice(0, 500);
      } catch {
        // Ignore serialization errors.
      }
    }

    return (
      statusText ||
      'Request failed without a response body.'
    );
  }

  async function request(
    action,
    username,
    method,
    route,
    options = {}
  ) {
    const url = `${baseUrl}${route}`;

    const headers = {
      Accept: 'application/json',
      'X-API-KEY': apiKey,
    };

    const init = {
      method,
      headers,
      signal: AbortSignal.timeout(30000),
    };

    if (options.formBody) {
      init.body = options.formBody;
    } else if (options.jsonBody !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(options.jsonBody);
    }

    const started = Date.now();

    console.log(
      `\n[${new Date().toLocaleTimeString()}] [${username || 'ACCOUNT'}] ${action}`
    );
    console.log(`    --> ${method} ${url}`);

    try {
      const response = await fetch(url, init);
      const raw = await response.text();

      let body = raw;

      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          // Preserve plain-text response.
        }
      }

      const durationMs = Date.now() - started;

      console.log(
        `    <-- HTTP ${response.status} ${response.statusText} (${durationMs} ms) ${response.ok ? '✅' : '❌'}`
      );

      printResponseBody(body);

      const result = {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        body,
        durationMs,
      };

      writeLog({
        type: 'request',
        username: username || null,
        action,
        method,
        url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        durationMs,
        response: safeValue('root', body),
      });

      if (!response.ok) {
        console.error(
          `    FAILURE REASON: ${summarizeError(body, response.statusText)}`
        );
      }

      return result;
    } catch (error) {
      const durationMs = Date.now() - started;

      const message =
        `${error.name || 'Error'}: ${error.message}`;

      console.error(
        `    <-- REQUEST ERROR (${durationMs} ms) ❌ ${message}`
      );

      writeLog({
        type: 'request',
        username: username || null,
        action,
        method,
        url,
        ok: false,
        status: 0,
        durationMs,
        error: message,
      });

      const summary = summaries.find(
        (item) => item.username === username
      );

      if (summary) {
        summary.failures.push({
          action,
          status: 0,
          message,
        });
      }

      return {
        ok: false,
        status: 0,
        body: null,
        error,
        durationMs,
      };
    }
  }

  function recordLocalStep(
    username,
    action,
    status,
    details = {}
  ) {
    const symbol =
      status === 'PASS'
        ? '✅'
        : status === 'FAIL'
          ? '❌'
          : status === 'SKIP'
            ? '⏭️'
            : 'ℹ️';

    console.log(
      `    ${symbol} ${status}: ${action}${details.reason ? ` — ${details.reason}` : ''
      }`
    );

    writeLog({
      type: 'step',
      username: username || null,
      action,
      status,
      ...details,
    });

    const summary = summaries.find(
      (item) => item.username === username
    );

    if (summary) {
      summary.steps.push({
        action,
        status,
        ...details,
      });
    }

    if (
      summary &&
      status === 'FAIL' &&
      !summary.failures.some(
        (failure) =>
          failure.action === action &&
          failure.message === details.reason
      )
    ) {
      summary.failures.push({
        action,
        status: details.httpStatus || 0,
        message:
          details.reason || 'Local validation failed.',
      });
    }
  }

  async function waitBetweenActions(username, reason) {
    const ms = Math.round(
      config.betweenActionsSeconds * 1000
    );

    if (!ms) {
      return;
    }

    console.log(
      `\n    Waiting ${config.betweenActionsSeconds}s before next dependent step (${reason})...`
    );

    await sleep(ms);
  }

  async function getProfile(username, identifier = username) {
    return request(
      'Check profile and follow state',
      username,
      'GET',
      `${API_PREFIX}/users/${encodeURIComponent(identifier)}?account_id=${encodeURIComponent(accountId)}`
    );
  }

  async function fetchTargetPosts(username, providerId) {
    return request(
      'Fetch target posts',
      username,
      'GET',
      `${API_PREFIX}/users/${encodeURIComponent(providerId)}/posts?account_id=${encodeURIComponent(accountId)}&limit=20`
    );
  }

  async function sendFollow(username, providerId) {
    return request(
      'Send follow request',
      username,
      'POST',
      `${API_PREFIX}/users/invite`,
      {
        jsonBody: {
          account_id: accountId,
          provider_id: providerId,
        },
      }
    );
  }

  async function likePost(username, postId) {
    return request(
      `Like post ${postId}`,
      username,
      'POST',
      `${API_PREFIX}/posts/reaction`,
      {
        jsonBody: {
          account_id: accountId,
          post_id: postId,
        },
      }
    );
  }

  async function commentPost(
    username,
    postId,
    commentText
  ) {
    const form = new FormData();

    form.set('account_id', accountId);
    form.set('text', commentText);

    return request(
      `Comment on post ${postId}`,
      username,
      'POST',
      `${API_PREFIX}/posts/${encodeURIComponent(postId)}/comments`,
      {
        formBody: form,
      }
    );
  }

  // OPTION 1: Reconnect an existing account.
  async function reconnectAccount() {
    console.log('\nReconnect existing Instagram account');
    console.log(
      'This operation uses type="reconnect" for the account ID configured in instagram-environment.json.'
    );

    let managerName;
    let notifyUrl;

    try {
      managerName = await askRequired(
        'Manager / connection name (for example, TEST_MANAGER_001): '
      );

      notifyUrl = await askRequired(
        'Public HTTPS notify/callback URL: '
      );
    } catch (error) {
      console.error(`Reconnect cancelled: ${error.message}`);
      return;
    }

    try {
      const parsedNotifyUrl = new URL(notifyUrl);

      if (parsedNotifyUrl.protocol !== 'https:') {
        throw new Error('HTTPS is required.');
      }
    } catch {
      recordLocalStep(
        'ACCOUNT',
        'Validate reconnect callback',
        'FAIL',
        {
          reason:
            'Callback URL must be a valid HTTPS URL.',
        }
      );

      return;
    }

    console.log('\nReconnect request details:');
    console.log(`    Account ID: ${accountId}`);
    console.log(`    Connection name: ${managerName}`);
    console.log(`    Callback URL: ${notifyUrl}`);
    console.log(`    API URL: ${baseUrl}`);

    const confirmation = await ask(
      'This requests a reconnect link for the configured account. Type RECONNECT to continue: '
    );

    if (confirmation !== 'RECONNECT') {
      console.log('Reconnect cancelled.');
      return;
    }

    const expiresOn = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000
    ).toISOString();

    await request(
      'Reconnect Instagram account',
      'ACCOUNT',
      'POST',
      `${API_PREFIX}/hosted/accounts/link`,
      {
        jsonBody: {
          type: 'reconnect',
          reconnect_account: accountId,
          api_url: baseUrl,
          expiresOn,
          name: managerName,
          notify_url: notifyUrl,
        },
      }
    );
  }

  // OPTION 2: Complete one username cycle before starting the next.
  async function runOneTarget(username, index, total) {
    const summary = {
      username,
      index,
      total,
      steps: [],
      failures: [],
      startedAt: new Date().toISOString(),
    };

    summaries.push(summary);

    console.log('\n' + '='.repeat(76));
    console.log(`TARGET ${index}/${total}: @${username}`);
    console.log(
      'Cycle: profile → provider ID → follow decision → posts → likes/comments'
    );
    console.log('='.repeat(76));

    // Step 1: Profile lookup.
    const profile = await getProfile(username);

    if (!profile.ok) {
      recordLocalStep(
        username,
        'Profile lookup',
        'FAIL',
        {
          httpStatus: profile.status,
          reason: summarizeError(
            profile.body,
            profile.statusText
          ),
        }
      );

      recordLocalStep(
        username,
        'Stop this target after profile lookup',
        'SKIP',
        {
          reason:
            'Provider ID is unknown, so dependent actions were stopped.',
        }
      );

      summary.finishedAt = new Date().toISOString();
      return;
    }

    recordLocalStep(
      username,
      'Profile lookup',
      'PASS',
      {
        httpStatus: profile.status,
      }
    );

    // Step 2: Resolve provider ID from the response.
    const providerId = extractProviderId(profile.body);

    if (!providerId) {
      recordLocalStep(
        username,
        'Extract provider ID',
        'FAIL',
        {
          reason:
            'No provider_id/providerId or supported profile ID field was found. Inspect the API response and update the parser to match its actual structure.',
        }
      );

      recordLocalStep(
        username,
        'Stop dependent operations',
        'SKIP',
        {
          reason:
            'Cannot safely use a missing provider ID for follow or post requests.',
        }
      );

      summary.finishedAt = new Date().toISOString();
      return;
    }

    console.log(
      `    Resolved provider ID for @${username}: ${providerId}`
    );

    recordLocalStep(
      username,
      'Resolve provider ID',
      'PASS',
      {
        providerId,
      }
    );

    // Step 3: Follow state / follow request.
    await waitBetweenActions(
      username,
      'profile lookup → follow request'
    );

    const followState = readFollowState(profile.body);

    if (
      followState.state ===
      'already-connected-or-pending'
    ) {
      recordLocalStep(
        username,
        'Follow request',
        'SKIP',
        {
          reason:
            'The profile response indicates that the account is already followed or the request is pending.',
        }
      );
    } else if (config.mode !== 'live') {
      recordLocalStep(
        username,
        'Follow request',
        'SKIP',
        {
          reason:
            `Dry-run mode; provider ID ${providerId} was resolved, but no follow request was sent.`,
        }
      );
    } else {
      const followResult = await sendFollow(
        username,
        providerId
      );

      if (followResult.ok) {
        recordLocalStep(
          username,
          'Follow request',
          'PASS',
          {
            httpStatus: followResult.status,
            providerId,
          }
        );
      } else {
        recordLocalStep(
          username,
          'Follow request',
          'FAIL',
          {
            httpStatus: followResult.status,
            reason: summarizeError(
              followResult.body,
              followResult.statusText
            ),
          }
        );
      }
    }

    // Step 4: Fetch posts.
    await waitBetweenActions(
      username,
      'follow decision → fetch posts'
    );

    const postsResult = await fetchTargetPosts(
      username,
      providerId
    );

    if (!postsResult.ok) {
      recordLocalStep(
        username,
        'Fetch posts',
        'FAIL',
        {
          httpStatus: postsResult.status,
          reason: summarizeError(
            postsResult.body,
            postsResult.statusText
          ),
        }
      );

      recordLocalStep(
        username,
        'Like/comment posts',
        'SKIP',
        {
          reason:
            'Fetching posts failed; post IDs are unavailable.',
        }
      );

      summary.finishedAt = new Date().toISOString();
      return;
    }

    const posts = getPostArray(postsResult.body);

    recordLocalStep(
      username,
      'Fetch posts',
      'PASS',
      {
        httpStatus: postsResult.status,
        postCount: posts.length,
      }
    );

    if (!posts.length) {
      recordLocalStep(
        username,
        'Select posts',
        'SKIP',
        {
          reason:
            'The response did not contain a recognizable posts array. Inspect the response shown above.',
        }
      );

      summary.finishedAt = new Date().toISOString();
      return;
    }

    // Step 5: Choose up to the configured number of unique posts.
    const selected = [];
    const seenIds = new Set();

    for (const post of posts) {
      const postId = extractPostId(post);

      if (!postId || seenIds.has(postId)) {
        continue;
      }

      seenIds.add(postId);

      selected.push({
        post,
        postId,
        caption: extractCaption(post),
      });

      if (selected.length >= config.postsToLike) {
        break;
      }
    }

    if (!selected.length) {
      recordLocalStep(
        username,
        'Select posts',
        'FAIL',
        {
          reason:
            'Posts were returned, but no usable post IDs were found.',
        }
      );

      summary.finishedAt = new Date().toISOString();
      return;
    }

    recordLocalStep(
      username,
      'Select posts',
      'PASS',
      {
        selectedPostIds: selected.map(
          (item) => item.postId
        ),
      }
    );

    console.log(
      `\nSelected ${selected.length} post(s), up to ${config.postsToLike}:`
    );

    selected.forEach((item, index) => {
      const preview = (item.caption || '(no caption)')
        .replace(/\s+/g, ' ')
        .slice(0, 160);

      console.log(
        `    ${index + 1}. ${item.postId} | caption: ${preview}`
      );
    });

    // Step 6: Process each selected post.
    for (let i = 0; i < selected.length; i += 1) {
      const { postId, caption } = selected[i];

      await waitBetweenActions(
        username,
        `before like ${i + 1}/${selected.length}`
      );

      if (config.mode !== 'live') {
        recordLocalStep(
          username,
          `Like post ${postId}`,
          'SKIP',
          {
            reason:
              'Dry-run mode; no like request was sent.',
          }
        );
      } else {
        const likeResult = await likePost(
          username,
          postId
        );

        if (likeResult.ok) {
          recordLocalStep(
            username,
            `Like post ${postId}`,
            'PASS',
            {
              httpStatus: likeResult.status,
            }
          );
        } else {
          recordLocalStep(
            username,
            `Like post ${postId}`,
            'FAIL',
            {
              httpStatus: likeResult.status,
              reason: summarizeError(
                likeResult.body,
                likeResult.statusText
              ),
            }
          );
        }
      }

      if (config.commentOnPosts) {
        await waitBetweenActions(
          username,
          `like step → comment ${i + 1}/${selected.length}`
        );

        const commentText = commentForCaption(
          caption,
          config,
          postId
        );

        console.log(
          `\n    Prepared caption-based test comment for ${postId}: ${commentText}`
        );

        if (config.mode !== 'live') {
          recordLocalStep(
            username,
            `Comment on post ${postId}`,
            'SKIP',
            {
              reason:
                `Dry-run mode; the comment was prepared but not sent: ${commentText}`,
            }
          );
        } else {
          const commentResult = await commentPost(
            username,
            postId,
            commentText
          );

          if (commentResult.ok) {
            recordLocalStep(
              username,
              `Comment on post ${postId}`,
              'PASS',
              {
                httpStatus: commentResult.status,
                commentText,
              }
            );
          } else {
            recordLocalStep(
              username,
              `Comment on post ${postId}`,
              'FAIL',
              {
                httpStatus: commentResult.status,
                reason: summarizeError(
                  commentResult.body,
                  commentResult.statusText
                ),
                commentText,
              }
            );
          }
        }
      }
    }

    summary.finishedAt = new Date().toISOString();
  }

  function printSummary() {
    console.log('\n' + '='.repeat(76));
    console.log('FINAL RUN SUMMARY');
    console.log('='.repeat(76));

    if (!summaries.length) {
      console.log('No username cycles ran.');
    }

    for (const summary of summaries) {
      const counts = {
        PASS: 0,
        FAIL: 0,
        SKIP: 0,
        INFO: 0,
      };

      for (const step of summary.steps) {
        counts[step.status] =
          (counts[step.status] || 0) + 1;
      }

      console.log(
        `\n@${summary.username}: ✅ ${counts.PASS} passed | ❌ ${counts.FAIL} failed | ⏭️ ${counts.SKIP} skipped`
      );

      if (summary.failures.length) {
        for (const failure of summary.failures) {
          console.log(
            `    ❌ ${failure.action} [HTTP ${failure.status || 'N/A'}]: ${failure.message}`
          );
        }
      } else {
        console.log('    No failures recorded.');
      }
    }

    const failed = summaries.reduce(
      (count, item) => count + item.failures.length,
      0
    );

    console.log(
      `\nTarget cycles completed: ${summaries.length}; recorded failures: ${failed}`
    );

    console.log(`Detailed response log: ${logFile}`);
    console.log('='.repeat(76));
  }

  function printMenu() {
    console.log('\n==============================================================');
    console.log(' Instagram API Test Runner (Unipile)');
    console.log(` Mode: ${config.mode.toUpperCase()} | no Social Crawl`);
    console.log('==============================================================');
    console.log('1. Reconnect Instagram account');
    console.log(
      `2. Run complete sequential cycle for ${targets.length} username(s) in targets.json`
    );
    console.log(
      '3. Unfollow / cancel pending request (not configured in supplied collection)'
    );
    console.log('0. Exit');
  }

  try {
    console.log(`\nDetailed logs will be saved to: ${logFile}`);

    if (
      config.mode === 'dry-run' &&
      config.dryRunRandomBetweenUsers
    ) {
      console.log(
        `Configured delays: ${config.betweenActionsSeconds}s between dependent steps; randomized ${config.dryRunBetweenUsersMinSeconds}-${config.dryRunBetweenUsersMaxSeconds}s between usernames in dry-run mode.`
      );
    } else {
      console.log(
        `Configured delays: ${config.betweenActionsSeconds}s between dependent steps; ${config.betweenUsersSeconds}s between usernames in live mode.`
      );
    }

    while (true) {
      printMenu();

      const choice = await ask('\nChoose an option: ');

      if (choice === null) {
        console.log('Input closed; exiting runner.');
        break;
      }

      if (choice === '1') {
        await reconnectAccount();

      } else if (choice === '2') {
        if (!targets.length) {
          console.error(
            'targets.json has no usernames. Add test usernames before starting.'
          );
          continue;
        }

        console.log(
          '\nCycle order: profile lookup → resolve provider ID → follow decision/request → fetch posts → like/comment selected posts → next username.'
        );

        console.log(
          `Targets (${targets.length}): ${targets.map((name) => `@${name}`).join(', ')}`
        );

        console.log(
          `Mode is ${config.mode.toUpperCase()}; comments use the configured test prefix: ${config.commentPrefix}`
        );

        if (config.mode === 'live') {
          console.log(
            '\nLIVE MODE WILL SEND FOLLOW, LIKE AND COMMENT REQUESTS. Use only accounts you own or are explicitly authorized to test.'
          );

          const confirmation = await ask(
            'Type RUN LIVE TEST to begin the batch: '
          );

          if (confirmation !== 'RUN LIVE TEST') {
            console.log(
              'Batch cancelled; no target mutations were sent.'
            );
            continue;
          }
        } else {
          console.log(
            'Dry-run: profile/posts GET requests run; follow/like/comment mutations are skipped.'
          );
        }

        for (let i = 0; i < targets.length; i += 1) {
          await runOneTarget(
            targets[i],
            i + 1,
            targets.length
          );

          // Wait before beginning the next complete username cycle.
          if (i < targets.length - 1) {
            const useDryRunRandomWait =
              config.mode === 'dry-run' &&
              config.dryRunRandomBetweenUsers;

            const seconds = useDryRunRandomWait
              ? Math.floor(
                config.dryRunBetweenUsersMinSeconds +
                Math.random() *
                (
                  config.dryRunBetweenUsersMaxSeconds -
                  config.dryRunBetweenUsersMinSeconds +
                  1
                )
              )
              : config.betweenUsersSeconds;

            if (seconds > 0) {
              const delayLabel = useDryRunRandomWait
                ? 'randomized dry-run wait'
                : 'configured wait';

              console.log(
                `\n${'~'.repeat(64)}\nCompleted cycle for @${targets[i]}. ${delayLabel}: ${seconds}s before next username...\n${'~'.repeat(64)}`
              );

              await sleep(seconds * 1000);
            }
          }
        }

        printSummary();

      } else if (choice === '3') {
        console.error(
          '\nUNFOLLOW NOT RUN: the supplied Postman item has no URL and is marked GET despite its “Unfollow / Cancel Pending Request” name.'
        );

        console.error(
          'No request was sent. Add the confirmed Unipile endpoint and HTTP method before enabling this option.'
        );

        writeLog({
          type: 'step',
          username: null,
          action: 'Unfollow/cancel request',
          status: 'FAIL',
          reason:
            'No endpoint/method was provided in the supplied collection; no request sent.',
        });

      } else if (choice === '0') {
        console.log(
          'Exiting Instagram API Test Runner.'
        );
        break;

      } else {
        console.log('Please choose 1, 2, 3, or 0.');
      }
    }
  } catch (error) {
    console.error(
      `\nRunner error: ${error.stack || error.message}`
    );

    process.exitCode = 1;

  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});