import { NextResponse } from 'next/server';
import { getDefaultEnvironment } from '@/lib/unipileService';
import fs from 'node:fs';
import path from 'node:path';

export async function GET() {
  const env = getDefaultEnvironment();

  // Try reading runner-config.json
  let runnerConfig = {
    mode: 'dry-run',
    betweenActionsSeconds: 3,
    betweenUsersSeconds: 15,
    postsToLike: 3,
    commentOnPosts: true,
    commentPrefix: '[API TEST]',
    maxCaptionChars: 100,
  };

  try {
    const configPath = path.resolve(process.cwd(), 'runner-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      runnerConfig = { ...runnerConfig, ...parsed };
    }
  } catch {
    // Ignore error
  }

  // Read default targets
  let targets = ['sohil__2085'];
  try {
    const targetsPath = path.resolve(process.cwd(), 'targets.json');
    if (fs.existsSync(targetsPath)) {
      const parsed = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));
      if (Array.isArray(parsed.usernames) && parsed.usernames.length > 0) {
        targets = parsed.usernames;
      }
    }
  } catch {
    // Ignore
  }

  return NextResponse.json({
    dsn: env.dsn || 'api71.unipile.com:20132',
    accountId: env.accountId || 'BqO3d7scQma6rakq6P5fEQ',
    apiKey: env.apiKey || '', // Provided directly for easy test manipulation without secret env
    hasApiKey: Boolean(env.apiKey),
    apiKeyMasked: env.apiKey ? `${env.apiKey.slice(0, 6)}...${env.apiKey.slice(-4)}` : '',
    runnerConfig,
    targets,
  });
}
