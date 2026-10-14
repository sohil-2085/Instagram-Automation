/**
 * Anti-Ban & Humanization Engine for Instagram Automation
 * Designed to mimic authentic human behavior and prevent account flags/suspensions.
 */

export const HUMAN_COMMENT_TEMPLATES = [
  'Really love this perspective! 🔥',
  'Great shot and well captured 👏',
  'This is amazing, thanks for sharing ✨',
  'Totally agree with this! 💯',
  'Awesome capture, loving the vibe 🙌',
  'Super insightful post, great content 🚀',
  'Great work on this one! Keep it up 🔥',
  'Spot on! Such a clean presentation ✨',
];

export const HUMAN_EMOJIS = ['🔥', '👏', '🙌', '💯', '✨', '🚀', '👌', '💫'];

/**
 * Calculates randomized delay with natural Gaussian/uniform jitter
 * @param {number} baseSeconds Base delay in seconds
 * @param {number} jitterRatio Ratio of randomness (e.g. 0.35 = ±35%)
 * @param {number} minFloor Minimum allowed seconds
 */
export function getRandomDelay(baseSeconds, jitterRatio = 0.35, minFloor = 3) {
  const base = Math.max(minFloor, Number(baseSeconds) || 10);
  const variance = base * jitterRatio;
  const randomDelta = (Math.random() * 2 - 1) * variance;
  const result = Math.round(base + randomDelta);
  return Math.max(minFloor, result);
}

/**
 * Returns a randomized range between min and max seconds
 */
export function getRandomRange(minSeconds, maxSeconds) {
  const min = Math.max(1, Number(minSeconds) || 15);
  const max = Math.max(min, Number(maxSeconds) || 60);
  return Math.floor(min + Math.random() * (max - min + 1));
}

/**
 * Determines whether to perform an optional action (e.g., like or comment)
 * Mimics human browsing by not interacting with 100% of posts.
 * @param {number} probability Chance from 0.0 to 1.0 (default 0.85 = 85%)
 */
export function shouldPerformAction(probability = 0.85) {
  return Math.random() < probability;
}

/**
 * Generates human-like, varied comments with randomized phrasing and emojis
 */
export function generateHumanComment({
  caption = '',
  prefix = '[API TEST]',
  customTemplates = [],
  includeExcerpt = true,
  maxChars = 100,
}) {
  const templates = customTemplates.length > 0 ? customTemplates : HUMAN_COMMENT_TEMPLATES;
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  const randomEmoji = HUMAN_EMOJIS[Math.floor(Math.random() * HUMAN_EMOJIS.length)];

  const cleanCaption = String(caption || '').replace(/\s+/g, ' ').trim();
  const excerpt = cleanCaption.slice(0, maxChars);

  if (includeExcerpt && excerpt) {
    const variations = [
      `${prefix} ${randomTemplate} Regarding: "${excerpt}"`,
      `${prefix} Love this point: "${excerpt}" ${randomEmoji}`,
      `${prefix} "${excerpt}" — great thought! ${randomEmoji}`,
      `${prefix} ${randomTemplate}`,
    ];
    return variations[Math.floor(Math.random() * variations.length)];
  }

  return `${prefix} ${randomTemplate} ${randomEmoji}`;
}

/**
 * Calculates human typing simulation delay in milliseconds
 */
export function getSimulatedTypingDelay(text) {
  const chars = String(text || '').length;
  // Humans type at approx 150-250ms per character with micro-pauses
  const typingTime = chars * (40 + Math.random() * 50);
  return Math.min(6000, Math.max(1200, Math.round(typingTime)));
}

/**
 * Calculates safety / ban risk rating based on timing parameters
 */
export function evaluateSafetyScore({
  betweenActionsSeconds,
  betweenUsersSeconds,
  humanJitterEnabled,
  randomSkipEnabled,
}) {
  let score = 100;
  const warnings = [];

  if (betweenActionsSeconds < 5) {
    score -= 40;
    warnings.push('Actions pause (<5s) is dangerously fast. High ban risk!');
  } else if (betweenActionsSeconds < 12) {
    score -= 20;
    warnings.push('Action pause is below recommended 15s.');
  }

  if (betweenUsersSeconds < 20) {
    score -= 30;
    warnings.push('User delay (<20s) triggers Instagram velocity filters.');
  } else if (betweenUsersSeconds < 45) {
    score -= 15;
    warnings.push('User delay is below recommended 60s.');
  }

  if (!humanJitterEnabled) {
    score -= 15;
    warnings.push('Delays are fixed/uniform. Robots are easily detected.');
  }

  if (!randomSkipEnabled) {
    score -= 10;
    warnings.push('Liking 100% of posts is an unnatural pattern.');
  }

  if (score >= 80) {
    return {
      level: 'safe',
      label: '🟢 Safe & Organic (Low Ban Risk)',
      color: '#10b981',
      score,
      warnings,
    };
  } else if (score >= 50) {
    return {
      level: 'moderate',
      label: '🟡 Moderate Risk (Exercise Caution)',
      color: '#f59e0b',
      score,
      warnings,
    };
  } else {
    return {
      level: 'danger',
      label: '🔴 High Ban Risk (Slow Down Delays)',
      color: '#f43f5e',
      score,
      warnings,
    };
  }
}
