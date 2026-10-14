'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  RotateCcw,
  Settings,
  Terminal,
  UserCheck,
  Heart,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  Layers,
  Search,
  Link as LinkIcon,
  HelpCircle,
  Activity,
  ShieldCheck,
  Zap,
  Eye,
  EyeOff,
  Save,
  Users,
  UploadCloud,
  RefreshCw,
  Info,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  getRandomDelay,
  getRandomRange,
  shouldPerformAction,
  generateHumanComment,
  getSimulatedTypingDelay,
  evaluateSafetyScore,
} from '@/lib/humanizer';

function InstagramIcon({ size = 20, className, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function Home() {
  // Navigation Tabs: 'runner' | 'targets' | 'settings' | 'playground' | 'reconnect'
  const [activeTab, setActiveTab] = useState('runner');

  // Configuration & Environment Variables
  const [dsn, setDsn] = useState('api71.unipile.com:20132');
  const [apiKey, setApiKey] = useState('');
  const [accountId, setAccountId] = useState('BqO3d7scQma6rakq6P5fEQ');
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasServerApiKey, setHasServerApiKey] = useState(false);

  // Execution Mode: 'dry-run' | 'live'
  const [mode, setMode] = useState('dry-run');

  // Runner Parameters
  const [betweenActionsSeconds, setBetweenActionsSeconds] = useState(15);
  const [betweenUsersSeconds, setBetweenUsersSeconds] = useState(60);
  const [postsToLike, setPostsToLike] = useState(3);
  const [commentOnPosts, setCommentOnPosts] = useState(true);
  const [commentPrefix, setCommentPrefix] = useState('[API TEST]');
  const [maxCaptionChars, setMaxCaptionChars] = useState(100);

  // Anti-Ban Humanization Settings
  const [humanJitterEnabled, setHumanJitterEnabled] = useState(true);
  const [randomSkipEnabled, setRandomSkipEnabled] = useState(true);
  const [likeProbability, setLikeProbability] = useState(85);
  const [humanCommentsEnabled, setHumanCommentsEnabled] = useState(true);
  const [humanTypingSimEnabled, setHumanTypingSimEnabled] = useState(true);

  // Targets
  const [targets, setTargets] = useState(['sohil__2085']);
  const [newTargetInput, setNewTargetInput] = useState('');
  const [bulkTargetsText, setBulkTargetsText] = useState('');

  // Modals & Notifications
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Connection Tester State
  const [testConnLoading, setTestConnLoading] = useState(false);
  const [testConnResult, setTestConnResult] = useState(null);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const isStoppedRef = useRef(false);
  const [currentTargetIndex, setCurrentTargetIndex] = useState(-1);
  const [currentStepName, setCurrentStepName] = useState('idle');
  const [countdown, setCountdown] = useState(0);
  const [targetSummaries, setTargetSummaries] = useState({});

  // Session Statistics for Safety Monitoring
  const [sessionActions, setSessionActions] = useState({ likes: 0, comments: 0, follows: 0 });

  // Terminal Logs
  const [logs, setLogs] = useState([]);
  const terminalEndRef = useRef(null);

  // Standalone Playground State
  const [playUsername, setPlayUsername] = useState('sohil__2085');
  const [playLoading, setPlayLoading] = useState(false);
  const [playProfile, setPlayProfile] = useState(null);
  const [playPosts, setPlayPosts] = useState([]);
  const [playPostId, setPlayPostId] = useState('');
  const [playCommentText, setPlayCommentText] = useState('Awesome post! Loving the perspective.');
  const [playResult, setPlayResult] = useState(null);

  // Reconnect state
  const [recManagerName, setRecManagerName] = useState('TEST_MANAGER_001');
  const [recCallbackUrl, setRecCallbackUrl] = useState('https://webhook.site/test');
  const [recLoading, setRecLoading] = useState(false);
  const [recLink, setRecLink] = useState('');

  // 502 notice banner
  const [show502Banner, setShow502Banner] = useState(false);

  // Calculate Anti-Ban Safety Score
  const safetyAssessment = evaluateSafetyScore({
    betweenActionsSeconds,
    betweenUsersSeconds,
    humanJitterEnabled,
    randomSkipEnabled,
  });

  // Load initial environment & LocalStorage
  useEffect(() => {
    async function loadInitial() {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const cfg = await res.json();
          const savedDsn = localStorage.getItem('unipile_dsn');
          const savedApiKey = localStorage.getItem('unipile_api_key');
          const savedAccountId = localStorage.getItem('unipile_account_id');
          const savedMode = localStorage.getItem('unipile_mode');
          const savedTargets = localStorage.getItem('unipile_targets');
          const savedActionsSec = localStorage.getItem('unipile_actions_sec');
          const savedUsersSec = localStorage.getItem('unipile_users_sec');
          const savedPostsToLike = localStorage.getItem('unipile_posts_to_like');
          const savedCommentPrefix = localStorage.getItem('unipile_comment_prefix');
          const savedJitter = localStorage.getItem('unipile_jitter');
          const savedSkip = localStorage.getItem('unipile_skip');

          setDsn(savedDsn || cfg.dsn || 'api71.unipile.com:20132');
          setAccountId(savedAccountId || cfg.accountId || 'BqO3d7scQma6rakq6P5fEQ');
          if (savedApiKey) {
            setApiKey(savedApiKey);
          } else if (cfg.apiKey) {
            setApiKey(cfg.apiKey);
          }
          setHasServerApiKey(cfg.hasApiKey);

          if (savedMode === 'live' || savedMode === 'dry-run') {
            setMode(savedMode);
          } else {
            setMode('dry-run');
          }

          if (savedTargets) {
            try {
              const parsed = JSON.parse(savedTargets);
              if (Array.isArray(parsed) && parsed.length > 0) setTargets(parsed);
            } catch {}
          } else if (cfg.targets && Array.isArray(cfg.targets) && cfg.targets.length > 0) {
            setTargets(cfg.targets);
          }

          if (savedActionsSec) setBetweenActionsSeconds(Number(savedActionsSec));
          else if (cfg.runnerConfig?.betweenActionsSeconds) setBetweenActionsSeconds(cfg.runnerConfig.betweenActionsSeconds);

          if (savedUsersSec) setBetweenUsersSeconds(Number(savedUsersSec));
          else if (cfg.runnerConfig?.betweenUsersSeconds) setBetweenUsersSeconds(cfg.runnerConfig.betweenUsersSeconds);

          if (savedPostsToLike) setPostsToLike(Number(savedPostsToLike));
          else if (cfg.runnerConfig?.postsToLike) setPostsToLike(cfg.runnerConfig.postsToLike);

          if (savedCommentPrefix) setCommentPrefix(savedCommentPrefix);
          else if (cfg.runnerConfig?.commentPrefix) setCommentPrefix(cfg.runnerConfig.commentPrefix);

          if (savedJitter !== null) setHumanJitterEnabled(savedJitter === 'true');
          if (savedSkip !== null) setRandomSkipEnabled(savedSkip === 'true');
        }
      } catch {
        // Fallback
      }

      addLog('info', 'Instagram Flow Runner initialized in [DRY-RUN] mode with Anti-Ban Humanization Active.');
    }
    loadInitial();
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Logging helper
  const addLog = (type, message, details = null) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random()}`,
        time,
        type,
        message,
        details,
      },
    ]);
  };

  // Open Live Modal Safely (Stops any event propagation that caused premature dismissal)
  const handleOpenLiveModal = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowLiveModal(true);
  };

  // Target Queue Handlers
  const handleAddTarget = () => {
    const clean = newTargetInput.trim().replace(/^@+/, '');
    if (clean && !targets.includes(clean)) {
      const updated = [...targets, clean];
      setTargets(updated);
      setNewTargetInput('');
      localStorage.setItem('unipile_targets', JSON.stringify(updated));
      addLog('info', `Added target: @${clean}`);
    }
  };

  const handleBulkAddTargets = () => {
    if (!bulkTargetsText.trim()) return;
    const split = bulkTargetsText
      .split(/[\n,; ]+/)
      .map((t) => t.trim().replace(/^@+/, ''))
      .filter(Boolean);

    const merged = Array.from(new Set([...targets, ...split]));
    setTargets(merged);
    setBulkTargetsText('');
    localStorage.setItem('unipile_targets', JSON.stringify(merged));
    addLog('info', `Imported ${split.length} target(s). Total queue: ${merged.length}`);
  };

  const handleRemoveTarget = (handle) => {
    const updated = targets.filter((t) => t !== handle);
    setTargets(updated);
    localStorage.setItem('unipile_targets', JSON.stringify(updated));
  };

  const handleClearAllTargets = () => {
    if (confirm('Clear all targets from the testing queue?')) {
      setTargets([]);
      localStorage.setItem('unipile_targets', JSON.stringify([]));
      addLog('info', 'Cleared all targets from queue.');
    }
  };

  const handlePresetSelect = (handle) => {
    if (!targets.includes(handle)) {
      const updated = [...targets, handle];
      setTargets(updated);
      localStorage.setItem('unipile_targets', JSON.stringify(updated));
    }
  };

  // Save Settings to LocalStorage
  const handleSaveSettings = () => {
    localStorage.setItem('unipile_dsn', dsn.trim());
    localStorage.setItem('unipile_api_key', apiKey.trim());
    localStorage.setItem('unipile_account_id', accountId.trim());
    localStorage.setItem('unipile_mode', mode);
    localStorage.setItem('unipile_actions_sec', String(betweenActionsSeconds));
    localStorage.setItem('unipile_users_sec', String(betweenUsersSeconds));
    localStorage.setItem('unipile_posts_to_like', String(postsToLike));
    localStorage.setItem('unipile_comment_prefix', commentPrefix);
    localStorage.setItem('unipile_jitter', String(humanJitterEnabled));
    localStorage.setItem('unipile_skip', String(randomSkipEnabled));

    setSaveSuccessNotice(true);
    addLog('info', 'All environment variables and anti-ban settings saved to browser storage.');
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  const handleResetDefaults = async () => {
    if (confirm('Reset all environment variables and runner parameters to defaults?')) {
      localStorage.removeItem('unipile_dsn');
      localStorage.removeItem('unipile_api_key');
      localStorage.removeItem('unipile_account_id');
      localStorage.removeItem('unipile_actions_sec');
      localStorage.removeItem('unipile_users_sec');
      localStorage.removeItem('unipile_posts_to_like');
      localStorage.removeItem('unipile_comment_prefix');
      localStorage.removeItem('unipile_jitter');
      localStorage.removeItem('unipile_skip');

      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const cfg = await res.json();
          setDsn(cfg.dsn);
          setApiKey(cfg.apiKey || '');
          setAccountId(cfg.accountId);
          setBetweenActionsSeconds(15);
          setBetweenUsersSeconds(60);
          setPostsToLike(3);
          setCommentPrefix('[API TEST]');
          setHumanJitterEnabled(true);
          setRandomSkipEnabled(true);
        }
      } catch {}
      addLog('info', 'Reset settings to safe defaults.');
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    setTestConnLoading(true);
    setTestConnResult(null);
    addLog('get', `Testing connection to DSN: ${dsn}...`);

    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dsn, apiKey, accountId }),
      });
      const data = await res.json();
      setTestConnResult(data);

      if (data.ok) {
        addLog('pass', `Connection successful (${data.durationMs}ms): ${data.message}`);
      } else {
        addLog('fail', `Connection test error: ${data.message || data.error}`);
        if (data.is502) setShow502Banner(true);
      }
    } catch (err) {
      setTestConnResult({ ok: false, error: err.message });
      addLog('fail', `Network error during connection test: ${err.message}`);
    } finally {
      setTestConnLoading(false);
    }
  };

  // Delay countdown utility with natural humanized jitter
  const delayWithCountdown = async (baseSeconds, reason) => {
    const finalSeconds = humanJitterEnabled
      ? getRandomDelay(baseSeconds, 0.35, 2)
      : Math.max(1, baseSeconds);

    const jitterDiff = finalSeconds - baseSeconds;
    const jitterText = humanJitterEnabled
      ? ` (Randomized jitter: ${jitterDiff >= 0 ? '+' : ''}${jitterDiff}s)`
      : '';

    addLog('info', `Waiting ${finalSeconds}s${jitterText} before next action (${reason})...`);

    for (let s = finalSeconds; s > 0; s--) {
      if (isStoppedRef.current) break;
      setCountdown(s);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(0);
  };

  // Master Sequential Batch Runner
  const handleStartBatch = async () => {
    if (targets.length === 0) {
      alert('Please add at least one username in the Target Queue.');
      setActiveTab('targets');
      return;
    }

    setIsRunning(true);
    isStoppedRef.current = false;
    setTargetSummaries({});
    addLog(
      'info',
      `Starting sequential cycle for ${targets.length} target(s) in [${mode.toUpperCase()}] mode with Anti-Ban Humanizer active.`
    );

    for (let i = 0; i < targets.length; i++) {
      if (isStoppedRef.current) break;

      const username = targets[i];
      setCurrentTargetIndex(i);

      const summary = {
        username,
        index: i + 1,
        total: targets.length,
        profile: null,
        providerId: null,
        followState: null,
        followResult: null,
        posts: [],
        likes: [],
        comments: [],
        status: 'in-progress',
        error: null,
      };

      setTargetSummaries((prev) => ({ ...prev, [username]: summary }));
      addLog('info', `\n=======================================================\nTARGET ${i + 1}/${targets.length}: @${username}\n=======================================================`);

      // STEP 1: Profile Lookup
      setCurrentStepName('profile');
      addLog('get', `[${username}] Profile lookup: GET /api/v1/users/${username}?account_id=${accountId}`);

      try {
        const profRes = await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, dsn, apiKey, accountId }),
        });

        const profData = await profRes.json();

        if (!profData.ok) {
          const errMsg = profData.error || `HTTP ${profData.status}`;
          addLog('fail', `❌ Profile lookup failed for @${username}: ${errMsg}`);
          if (profData.is502) {
            setShow502Banner(true);
            addLog('fail', `⚠️ Unipile API returned 502 Bad Gateway. Upstream host (${dsn}) is down or restarting.`);
          }
          summary.status = 'failed';
          summary.error = errMsg;
          setTargetSummaries((prev) => ({ ...prev, [username]: { ...summary } }));
          continue;
        }

        addLog('pass', `✅ Profile lookup OK: Found ${profData.profile?.full_name || username} (${profData.durationMs}ms)`);
        summary.profile = profData.profile;
        summary.followState = profData.followState;

        // STEP 2: Extract Provider ID
        setCurrentStepName('provider');
        const providerId = profData.providerId;

        if (!providerId) {
          addLog('fail', `❌ Extract provider ID failed: No usable provider_id found in profile response.`);
          summary.status = 'failed';
          summary.error = 'No provider_id found';
          setTargetSummaries((prev) => ({ ...prev, [username]: { ...summary } }));
          continue;
        }

        addLog('pass', `✅ Resolved Provider ID for @${username}: ${providerId}`);
        summary.providerId = providerId;
        setTargetSummaries((prev) => ({ ...prev, [username]: { ...summary } }));

        // STEP 3: Follow Decision / Request
        setCurrentStepName('follow');
        await delayWithCountdown(betweenActionsSeconds, 'profile lookup → follow decision');
        if (isStoppedRef.current) break;

        const isAlreadyConnected = profData.followState?.state === 'already-connected-or-pending';

        if (isAlreadyConnected) {
          addLog('skip', `⏭️ Follow skipped: Account indicates already following or follow request pending.`);
          summary.followResult = { status: 'skipped', reason: 'already-following-or-pending' };
        } else if (mode === 'dry-run') {
          addLog('skip', `⏭️ Follow skipped [DRY-RUN]: Provider ID resolved, but follow request was not dispatched.`);
          summary.followResult = { status: 'skipped', reason: 'dry-run-mode' };
        } else {
          addLog('post', `[${username}] Sending follow request: POST /api/v1/users/invite`);
          const folRes = await fetch('/api/follow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ providerId, dsn, apiKey, accountId }),
          });
          const folData = await folRes.json();
          if (folData.ok) {
            addLog('pass', `✅ Follow request succeeded (HTTP ${folData.status})`);
            summary.followResult = { status: 'success', data: folData };
            setSessionActions((prev) => ({ ...prev, follows: prev.follows + 1 }));
          } else {
            addLog('fail', `❌ Follow request failed: ${folData.error || folData.statusText}`);
            summary.followResult = { status: 'failed', error: folData.error };
          }
        }
        setTargetSummaries((prev) => ({ ...prev, [username]: { ...summary } }));

        // STEP 4: Fetch Posts
        setCurrentStepName('posts');
        await delayWithCountdown(betweenActionsSeconds, 'follow decision → fetch posts');
        if (isStoppedRef.current) break;

        addLog('get', `[${username}] Fetch posts: GET /api/v1/users/${providerId}/posts?limit=20`);
        const postRes = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerId, username, dsn, apiKey, accountId }),
        });
        const postData = await postRes.json();

        if (!postData.ok) {
          addLog('fail', `❌ Fetch posts failed: ${postData.error || postData.statusText}`);
          summary.status = 'failed';
          summary.error = 'Failed to fetch posts';
          setTargetSummaries((prev) => ({ ...prev, [username]: { ...summary } }));
          continue;
        }

        const retrievedPosts = postData.posts || [];
        addLog('pass', `✅ Retrieved ${retrievedPosts.length} posts for @${username}`);
        summary.posts = retrievedPosts;
        setTargetSummaries((prev) => ({ ...prev, [username]: { ...summary } }));

        if (retrievedPosts.length === 0) {
          addLog('skip', `⏭️ No posts returned. Skipping like and comment actions.`);
          summary.status = 'completed';
          setTargetSummaries((prev) => ({ ...prev, [username]: { ...summary } }));
          continue;
        }

        // STEP 5 & 6: Humanized Like & Comment on selected posts
        const selectedPosts = retrievedPosts.slice(0, postsToLike);
        addLog('info', `Selected ${selectedPosts.length} post(s) to process with anti-ban protections.`);

        for (let pIdx = 0; pIdx < selectedPosts.length; pIdx++) {
          if (isStoppedRef.current) break;
          const post = selectedPosts[pIdx];

          // Randomized human delay before interaction
          setCurrentStepName('like');
          await delayWithCountdown(betweenActionsSeconds, `browsing before post ${pIdx + 1}/${selectedPosts.length}`);
          if (isStoppedRef.current) break;

          // Organic skipping check (mimics real human browsing behavior)
          const willLike = randomSkipEnabled
            ? shouldPerformAction(likeProbability / 100)
            : true;

          if (!willLike) {
            addLog('skip', `⏭️ Humanizer organically skipped like for post ${post.id} (natural browsing variance).`);
            summary.likes.push({ postId: post.id, status: 'skipped', reason: 'human-skip-variance' });
          } else if (mode === 'dry-run') {
            addLog('skip', `⏭️ Like skipped [DRY-RUN]: Post ${post.id}`);
            summary.likes.push({ postId: post.id, status: 'skipped', reason: 'dry-run' });
          } else {
            addLog('post', `[${username}] Like post ${post.id}: POST /api/v1/posts/reaction`);
            const likeRes = await fetch('/api/like', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postId: post.id, dsn, apiKey, accountId }),
            });
            const likeData = await likeRes.json();
            if (likeRes.ok && likeData.ok) {
              addLog('pass', `✅ Liked post ${post.id} (HTTP ${likeData.status})`);
              summary.likes.push({ postId: post.id, status: 'success' });
              setSessionActions((prev) => ({ ...prev, likes: prev.likes + 1 }));
            } else {
              addLog('fail', `❌ Like failed for post ${post.id}: ${likeData.error || likeData.statusText}`);
              summary.likes.push({ postId: post.id, status: 'failed', error: likeData.error });
            }
          }
          setTargetSummaries((prev) => ({ ...prev, [username]: { ...summary } }));

          // Comment step with human typing simulation and randomized phrases
          if (commentOnPosts) {
            setCurrentStepName('comment');
            await delayWithCountdown(betweenActionsSeconds, `reading caption before comment ${pIdx + 1}/${selectedPosts.length}`);
            if (isStoppedRef.current) break;

            // Generate humanized, varied comment
            const commentText = humanCommentsEnabled
              ? generateHumanComment({
                  caption: post.caption,
                  prefix: commentPrefix,
                  maxChars: maxCaptionChars,
                })
              : `${commentPrefix} Caption: "${String(post.caption || '').slice(0, maxCaptionChars)}"`;

            // Simulate realistic typing time
            if (humanTypingSimEnabled) {
              const typingMs = getSimulatedTypingDelay(commentText);
              addLog('info', `⌨️ Simulating human typing delay (${(typingMs / 1000).toFixed(1)}s)...`);
              await new Promise((r) => setTimeout(r, typingMs));
            }

            if (mode === 'dry-run') {
              addLog('skip', `⏭️ Comment prepared [DRY-RUN]: "${commentText}"`);
              summary.comments.push({ postId: post.id, status: 'skipped', text: commentText });
            } else {
              addLog('post', `[${username}] Post comment on ${post.id}: "${commentText}"`);
              const cmtRes = await fetch('/api/comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: post.id, commentText, dsn, apiKey, accountId }),
              });
              const cmtData = await cmtRes.json();
              if (cmtRes.ok && cmtData.ok) {
                addLog('pass', `✅ Commented on post ${post.id} (HTTP ${cmtData.status})`);
                summary.comments.push({ postId: post.id, status: 'success', text: commentText });
                setSessionActions((prev) => ({ ...prev, comments: prev.comments + 1 }));
              } else {
                addLog('fail', `❌ Comment failed on post ${post.id}: ${cmtData.error || cmtData.statusText}`);
                summary.comments.push({ postId: post.id, status: 'failed', error: cmtData.error });
              }
            }
            setTargetSummaries((prev) => ({ ...prev, [username]: { ...summary } }));
          }
        }

        summary.status = 'completed';
        setTargetSummaries((prev) => ({ ...prev, [username]: { ...summary } }));
        addLog('pass', `🎉 Completed cycle for @${username}!`);

        // Wait between users if not the last target (with human jitter)
        if (i < targets.length - 1 && !isStoppedRef.current) {
          setCurrentStepName('wait');
          await delayWithCountdown(betweenUsersSeconds, `finished @${username} → natural pause before next user`);
        }
      } catch (err) {
        addLog('fail', `❌ Error processing @${username}: ${err.message}`);
        summary.status = 'failed';
        summary.error = err.message;
        setTargetSummaries((prev) => ({ ...prev, [username]: { ...summary } }));
      }
    }

    setIsRunning(false);
    setCurrentStepName('idle');
    setCountdown(0);
    addLog('info', 'Batch cycle finished. Review detailed cards and logs below.');
  };

  const handleStopBatch = () => {
    isStoppedRef.current = true;
    setIsRunning(false);
    setCurrentStepName('idle');
    setCountdown(0);
    addLog('skip', 'Batch runner stopped by user.');
  };

  const handleResetBatch = () => {
    setIsRunning(false);
    isStoppedRef.current = true;
    setCurrentTargetIndex(-1);
    setCurrentStepName('idle');
    setCountdown(0);
    setTargetSummaries({});
    addLog('info', 'Batch run reset.');
  };

  // Playground actions
  const handlePlaygroundLookup = async () => {
    if (!playUsername.trim()) return;
    setPlayLoading(true);
    setPlayResult(null);
    const username = playUsername.trim().replace(/^@+/, '');
    addLog('get', `[Playground] Profile lookup for @${username}`);

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, dsn, apiKey, accountId }),
      });
      const data = await res.json();
      setPlayResult(data);
      if (data.ok) {
        setPlayProfile(data.profile);
        addLog('pass', `[Playground] Found profile for @${username}`);

        if (data.providerId) {
          const postRes = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ providerId: data.providerId, username, dsn, apiKey, accountId }),
          });
          const postData = await postRes.json();
          if (postData.ok) {
            setPlayPosts(postData.posts || []);
            if (postData.posts?.length > 0) {
              setPlayPostId(postData.posts[0].id);
            }
          }
        }
      } else {
        addLog('fail', `[Playground] Lookup failed: ${data.error}`);
        if (data.is502) setShow502Banner(true);
      }
    } catch (err) {
      addLog('fail', `[Playground] Error: ${err.message}`);
    } finally {
      setPlayLoading(false);
    }
  };

  const handlePlaygroundLike = async () => {
    if (!playPostId) return;
    setPlayLoading(true);
    addLog('post', `[Playground] Like post ${playPostId}`);

    try {
      const res = await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: playPostId, dsn, apiKey, accountId }),
      });
      const data = await res.json();
      setPlayResult(data);
      if (data.ok) {
        addLog('pass', `[Playground] Post ${playPostId} liked successfully!`);
        setSessionActions((prev) => ({ ...prev, likes: prev.likes + 1 }));
      } else {
        addLog('fail', `[Playground] Like failed: ${data.error}`);
      }
    } catch (err) {
      addLog('fail', `[Playground] Error: ${err.message}`);
    } finally {
      setPlayLoading(false);
    }
  };

  const handlePlaygroundComment = async () => {
    if (!playPostId || !playCommentText) return;
    setPlayLoading(true);
    addLog('post', `[Playground] Post comment on ${playPostId}`);

    try {
      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: playPostId, commentText: playCommentText, dsn, apiKey, accountId }),
      });
      const data = await res.json();
      setPlayResult(data);
      if (data.ok) {
        addLog('pass', `[Playground] Comment posted successfully!`);
        setSessionActions((prev) => ({ ...prev, comments: prev.comments + 1 }));
      } else {
        addLog('fail', `[Playground] Comment failed: ${data.error}`);
      }
    } catch (err) {
      addLog('fail', `[Playground] Error: ${err.message}`);
    } finally {
      setPlayLoading(false);
    }
  };

  // Reconnect link generator
  const handleGenerateReconnect = async () => {
    setRecLoading(true);
    setRecLink('');
    addLog('post', `Requesting reconnect link for account ${accountId}`);

    try {
      const res = await fetch('/api/reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerName: recManagerName, notifyUrl: recCallbackUrl, dsn, apiKey, accountId }),
      });
      const data = await res.json();
      if (data.ok && data.url) {
        setRecLink(data.url);
        addLog('pass', `Reconnect link generated: ${data.url}`);
      } else {
        addLog('fail', `Reconnect link failed: ${data.error}`);
        if (data.is502) setShow502Banner(true);
      }
    } catch (err) {
      addLog('fail', `Error: ${err.message}`);
    } finally {
      setRecLoading(false);
    }
  };

  // Export logs as JSONL
  const handleExportLogs = () => {
    const content = logs.map((l) => JSON.stringify(l)).join('\n');
    const blob = new Blob([content], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instagram-run-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Application Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-wrapper">
            <div className="brand-icon-box">
              <InstagramIcon size={24} />
            </div>
            <div className="brand-text">
              <h1>
                Unipile Instagram Flow Runner
                <span
                  className={`badge-tag ${
                    mode === 'live' ? 'badge-live' : 'badge-dryrun'
                  }`}
                >
                  <span className="pulse-dot" />
                  {mode.toUpperCase()} MODE
                </span>
                <span
                  className="badge-tag"
                  style={{
                    background: `${safetyAssessment.color}15`,
                    color: safetyAssessment.color,
                    border: `1px solid ${safetyAssessment.color}35`,
                  }}
                  title="Anti-Ban Safety Rating"
                >
                  <ShieldCheck size={12} />
                  {safetyAssessment.score}% SAFE
                </span>
              </h1>
              <div className="brand-subtitle">
                DSN: <code style={{ color: 'var(--accent-cyan)' }}>{dsn}</code> • Acc:{' '}
                <code style={{ color: '#ff85a2' }}>
                  {accountId ? accountId.slice(0, 8) + '...' : 'none'}
                </code>
              </div>
            </div>
          </div>

          <div className="header-actions">
            {/* 2-Mode Switcher: Dry-Run vs Live */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 'var(--radius-md)',
                padding: '2px',
              }}
            >
              <button
                type="button"
                className={`tab-btn ${mode === 'dry-run' ? 'active' : ''}`}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setMode('dry-run');
                  localStorage.setItem('unipile_mode', 'dry-run');
                }}
              >
                <ShieldCheck size={14} /> Dry-Run (Read-Only)
              </button>
              <button
                type="button"
                className={`tab-btn ${mode === 'live' ? 'active' : ''}`}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                onClick={handleOpenLiveModal}
              >
                <Zap size={14} /> Live Mode
              </button>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => setActiveTab('settings')}
              title="Configure all Environment Variables and Anti-Ban settings"
            >
              <Settings size={15} />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-content">
        {/* Anti-Ban Safety Warning Banner (If delays are dangerously fast) */}
        {safetyAssessment.level === 'danger' && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              color: '#fb7185',
              fontSize: '0.84rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <ShieldAlert size={22} color="#f43f5e" />
              <div>
                <strong>High Ban Risk Warning:</strong> Configured delays are dangerously fast for Instagram automation.
                {safetyAssessment.warnings.map((w, i) => (
                  <span key={i} style={{ display: 'block', fontSize: '0.76rem', color: '#fca5a5' }}>
                    • {w}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderColor: '#f43f5e' }}
              onClick={() => {
                setBetweenActionsSeconds(15);
                setBetweenUsersSeconds(60);
                setHumanJitterEnabled(true);
                setRandomSkipEnabled(true);
                addLog('info', 'Applied Anti-Ban Safe Delays (15s actions / 60s users).');
              }}
            >
              🛡️ Apply Safe Delays (15s/60s)
            </button>
          </div>
        )}

        {/* 502 Alert Banner */}
        {show502Banner && (
          <div className="banner-alert">
            <div className="banner-alert-content">
              <AlertTriangle size={20} color="#f59e0b" />
              <div>
                <strong>Unipile API returned 502 Bad Gateway:</strong> The upstream Unipile server cluster (
                <code>{dsn}</code>) is temporarily restarting or unreachable.
                You can change your DSN host in the <strong>Environment & Config</strong> page or test your connection.
              </div>
            </div>
            <button
              type="button"
              className="banner-alert-btn"
              onClick={() => {
                setActiveTab('settings');
                setShow502Banner(false);
              }}
            >
              Open Environment Settings
            </button>
          </div>
        )}

        {/* Top Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="tabs-nav">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'runner' ? 'active' : ''}`}
              onClick={() => setActiveTab('runner')}
            >
              <Layers size={16} /> Batch Runner
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'targets' ? 'active' : ''}`}
              onClick={() => setActiveTab('targets')}
            >
              <Users size={16} /> Targets Queue ({targets.length})
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={16} /> Environment & Anti-Ban
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'playground' ? 'active' : ''}`}
              onClick={() => setActiveTab('playground')}
            >
              <Search size={16} /> Single Explorer
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'reconnect' ? 'active' : ''}`}
              onClick={() => setActiveTab('reconnect')}
            >
              <LinkIcon size={16} /> Reconnect
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', color: 'var(--text-sub)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={14} color="var(--accent-magenta)" />
              Delay: <strong>{betweenActionsSeconds}s</strong>/step • <strong>{betweenUsersSeconds}s</strong>/user
              {humanJitterEnabled && <span style={{ color: '#34d399' }}>(±35% Jitter)</span>}
            </span>
            <span>•</span>
            <span>Likes: <strong>{postsToLike}</strong></span>
            <span>•</span>
            <span style={{ color: 'var(--accent-cyan)' }}>
              Session: ❤️ {sessionActions.likes} | 💬 {sessionActions.comments}
            </span>
          </div>
        </div>

        {/* TAB 1: BATCH FLOW RUNNER */}
        {activeTab === 'runner' && (
          <div className="dashboard-grid">
            {/* Left Control Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="glass-panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <Activity size={18} color="var(--accent-magenta)" />
                    Target Usernames Queue
                  </div>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--accent-magenta)', fontSize: '0.75rem', cursor: 'pointer' }}
                    onClick={() => setActiveTab('targets')}
                  >
                    Manage Queue →
                  </button>
                </div>

                {/* Target Chips */}
                <div className="tags-container">
                  {targets.map((handle) => (
                    <div key={handle} className="tag-chip">
                      <span>@{handle}</span>
                      <button
                        type="button"
                        className="tag-remove"
                        onClick={() => handleRemoveTarget(handle)}
                        disabled={isRunning}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <input
                    type="text"
                    className="tag-input-field"
                    placeholder="Add username (press Enter)..."
                    value={newTargetInput}
                    onChange={(e) => setNewTargetInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTarget();
                      }
                    }}
                    disabled={isRunning}
                  />
                </div>

                {/* Presets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Quick presets:</span>
                  <div className="presets-row">
                    {['sohil__2085', 'natgeo', 'nasa', 'instagram', 'cristiano'].map((h) => (
                      <button
                        key={h}
                        type="button"
                        className="preset-chip"
                        onClick={() => handlePresetSelect(h)}
                        disabled={isRunning}
                      >
                        + @{h}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
                  {!isRunning ? (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: '0.75rem 1.25rem', fontSize: '0.92rem' }}
                      onClick={handleStartBatch}
                    >
                      <Play size={18} fill="currentColor" />
                      Start Complete Batch Cycle ({targets.length})
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-outline-danger"
                        style={{ flex: 1, padding: '0.65rem' }}
                        onClick={handleStopBatch}
                      >
                        <Square size={16} fill="currentColor" /> Stop
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '0.65rem' }}
                        onClick={handleResetBatch}
                      >
                        <RotateCcw size={16} /> Reset
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Anti-Ban Humanizer Quick Panel */}
              <div className="glass-panel" style={{ padding: '1.15rem' }}>
                <div className="panel-header">
                  <div className="panel-title" style={{ fontSize: '0.85rem' }}>
                    <ShieldCheck size={16} color="#10b981" />
                    Anti-Ban Protections
                  </div>
                  <span style={{ fontSize: '0.72rem', color: safetyAssessment.color, fontWeight: 700 }}>
                    {safetyAssessment.label}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <span style={{ color: 'var(--text-sub)' }}>🎲 Randomized Jitter (±35%)</span>
                    <input
                      type="checkbox"
                      checked={humanJitterEnabled}
                      onChange={(e) => setHumanJitterEnabled(e.target.checked)}
                      style={{ accentColor: '#10b981', width: '15px', height: '15px' }}
                    />
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <span style={{ color: 'var(--text-sub)' }}>🍃 Organic Skip ({likeProbability}% like chance)</span>
                    <input
                      type="checkbox"
                      checked={randomSkipEnabled}
                      onChange={(e) => setRandomSkipEnabled(e.target.checked)}
                      style={{ accentColor: '#10b981', width: '15px', height: '15px' }}
                    />
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <span style={{ color: 'var(--text-sub)' }}>💬 Human Dynamic Comments</span>
                    <input
                      type="checkbox"
                      checked={humanCommentsEnabled}
                      onChange={(e) => setHumanCommentsEnabled(e.target.checked)}
                      style={{ accentColor: '#10b981', width: '15px', height: '15px' }}
                    />
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <span style={{ color: 'var(--text-sub)' }}>⌨️ Human Typing Simulation</span>
                    <input
                      type="checkbox"
                      checked={humanTypingSimEnabled}
                      onChange={(e) => setHumanTypingSimEnabled(e.target.checked)}
                      style={{ accentColor: '#10b981', width: '15px', height: '15px' }}
                    />
                  </label>
                </div>
              </div>

              {/* Execution Settings Quick Glance */}
              <div className="glass-panel" style={{ padding: '1.15rem' }}>
                <div className="panel-header">
                  <div className="panel-title" style={{ fontSize: '0.85rem' }}>
                    <Settings size={15} /> Delays & Posts Settings
                  </div>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--accent-magenta)', fontSize: '0.75rem', cursor: 'pointer' }}
                    onClick={() => setActiveTab('settings')}
                  >
                    Edit All →
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <div className="slider-container">
                    <span style={{ minWidth: '100px', color: 'var(--text-sub)' }}>Step Pause:</span>
                    <input
                      type="range"
                      min="5"
                      max="45"
                      value={betweenActionsSeconds}
                      onChange={(e) => setBetweenActionsSeconds(Number(e.target.value))}
                      disabled={isRunning}
                    />
                    <span className="slider-value">{betweenActionsSeconds}s</span>
                  </div>

                  <div className="slider-container">
                    <span style={{ minWidth: '100px', color: 'var(--text-sub)' }}>User Pause:</span>
                    <input
                      type="range"
                      min="15"
                      max="120"
                      value={betweenUsersSeconds}
                      onChange={(e) => setBetweenUsersSeconds(Number(e.target.value))}
                      disabled={isRunning}
                    />
                    <span className="slider-value">{betweenUsersSeconds}s</span>
                  </div>

                  <div className="slider-container">
                    <span style={{ minWidth: '100px', color: 'var(--text-sub)' }}>Posts to Like:</span>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={postsToLike}
                      onChange={(e) => setPostsToLike(Number(e.target.value))}
                      disabled={isRunning}
                    />
                    <span className="slider-value">{postsToLike}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.3rem' }}>
                    <span style={{ color: 'var(--text-sub)' }}>Post Comments:</span>
                    <input
                      type="checkbox"
                      checked={commentOnPosts}
                      onChange={(e) => setCommentOnPosts(e.target.checked)}
                      disabled={isRunning}
                      style={{ accentColor: 'var(--accent-magenta)', width: '16px', height: '16px' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Execution & Results Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Stepper Pipeline Card */}
              <div className="stepper-card">
                <div className="progress-header">
                  <div>
                    <h2 style={{ fontSize: '0.96rem', fontWeight: 700 }}>
                      Sequential Flow Pipeline
                    </h2>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)' }}>
                      {isRunning && currentTargetIndex >= 0 ? (
                        <span>
                          Currently processing target <strong>{currentTargetIndex + 1} of {targets.length}</strong>:{' '}
                          <code style={{ color: 'var(--accent-magenta)' }}>@{targets[currentTargetIndex]}</code>
                        </span>
                      ) : (
                        <span>Pipeline standing by. Click Start Complete Batch Cycle to begin.</span>
                      )}
                    </div>
                  </div>

                  {/* Countdown Badge */}
                  {countdown > 0 && (
                    <div className="countdown-banner" style={{ padding: '0.4rem 0.85rem' }}>
                      <Clock size={16} color="var(--accent-magenta)" />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}>Next step in:</span>
                      <span className="countdown-digits" style={{ fontSize: '1rem' }}>{countdown}s</span>
                    </div>
                  )}
                </div>

                {/* Visual Progress Bar */}
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width:
                        targets.length === 0
                          ? '0%'
                          : `${Math.round(((Math.max(0, currentTargetIndex) + (isRunning ? 0.5 : 1)) / targets.length) * 100)}%`,
                    }}
                  />
                </div>

                {/* 6 Step Nodes */}
                <div className="pipeline-steps">
                  {[
                    { id: 'profile', label: '1. Profile Lookup', icon: Search },
                    { id: 'provider', label: '2. Provider ID', icon: UserCheck },
                    { id: 'follow', label: '3. Follow State', icon: UserCheck },
                    { id: 'posts', label: '4. Fetch Posts', icon: InstagramIcon },
                    { id: 'like', label: '5. Like Posts', icon: Heart },
                    { id: 'comment', label: '6. Add Comments', icon: MessageCircle },
                  ].map((step) => {
                    const isActive = isRunning && currentStepName === step.id;
                    const StepIcon = step.icon;
                    return (
                      <div key={step.id} className={`step-node ${isActive ? 'active' : ''}`}>
                        <div className="step-top">
                          <div className="step-icon-wrap">
                            <StepIcon size={12} color={isActive ? 'var(--accent-magenta)' : 'currentColor'} />
                          </div>
                          {isActive && <span className="pulse-dot" style={{ color: 'var(--accent-magenta)' }} />}
                        </div>
                        <div className="step-name">{step.label}</div>
                        <div className="step-status-text">
                          {isActive ? 'Processing...' : 'Ready'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Targets Result Showcase Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Object.keys(targetSummaries).length === 0 ? (
                  <div
                    className="glass-panel"
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '3rem 1.5rem',
                      textAlign: 'center',
                      color: 'var(--text-dim)',
                    }}
                  >
                    <InstagramIcon size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-sub)' }}>
                      No target cycles recorded yet.
                    </p>
                    <p style={{ fontSize: '0.78rem' }}>
                      Add target handles on the left and run the pipeline to see live profiles, posts, and like/comment results.
                    </p>
                  </div>
                ) : (
                  Object.values(targetSummaries).map((summary) => (
                    <div key={summary.username} className="target-card">
                      <div className="target-header">
                        <div className="target-profile-info">
                          {summary.profile?.avatar_url || summary.profile?.profile_picture_url ? (
                            <img
                              src={summary.profile.avatar_url || summary.profile.profile_picture_url}
                              alt={summary.username}
                              className="profile-avatar"
                            />
                          ) : (
                            <div className="avatar-placeholder">
                              {summary.username.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="target-names">
                            <h3>
                              {summary.profile?.full_name || summary.profile?.name || summary.username}
                              {summary.profile?.is_verified && (
                                <CheckCircle2 size={15} color="var(--accent-cyan)" />
                              )}
                            </h3>
                            <div className="target-handle">@{summary.username}</div>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {summary.providerId && (
                            <span className="badge-tag" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-sub)' }}>
                              Provider: <code>{summary.providerId.slice(0, 16)}</code>
                            </span>
                          )}

                          {summary.status === 'completed' ? (
                            <span className="badge-tag badge-live">
                              <CheckCircle2 size={12} /> CYCLE COMPLETE
                            </span>
                          ) : summary.status === 'failed' ? (
                            <span className="badge-tag badge-danger">
                              <XCircle size={12} /> FAILED
                            </span>
                          ) : (
                            <span className="badge-tag badge-dryrun">
                              <Activity size={12} /> RUNNING...
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bio & Stats */}
                      {summary.profile && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                          {summary.profile.biography && (
                            <p style={{ color: 'var(--text-sub)' }}>{summary.profile.biography}</p>
                          )}
                          <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                            <span><strong>{summary.profile.follower_count || 0}</strong> followers</span>
                            <span><strong>{summary.profile.following_count || 0}</strong> following</span>
                            <span><strong>{summary.profile.posts_count || summary.posts.length}</strong> posts</span>
                            <span>Follow state: <strong style={{ color: 'var(--text-main)' }}>{summary.followResult?.status || 'checked'}</strong></span>
                          </div>
                        </div>
                      )}

                      {/* Error Banner if any */}
                      {summary.error && (
                        <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.65rem', fontSize: '0.78rem', color: '#fb7185' }}>
                          <strong>Stop reason:</strong> {summary.error}
                        </div>
                      )}

                      {/* Posts Gallery */}
                      {summary.posts && summary.posts.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-sub)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Target Posts Processed ({summary.posts.length}):</span>
                            <span style={{ color: 'var(--accent-magenta)' }}>
                              ❤️ {summary.likes.filter((l) => l.status === 'success').length} liked • 💬 {summary.comments.filter((c) => c.status === 'success').length} commented
                            </span>
                          </div>

                          <div className="posts-grid">
                            {summary.posts.slice(0, postsToLike).map((post) => {
                              const isLiked = summary.likes.some((l) => l.postId === post.id && l.status === 'success');
                              const commentObj = summary.comments.find((c) => c.postId === post.id);

                              return (
                                <div key={post.id} className="post-item-card">
                                  <div className="post-thumb-wrap">
                                    {post.mediaUrl ? (
                                      <img src={post.mediaUrl} alt="Instagram Post" className="post-thumb-img" />
                                    ) : (
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
                                        <InstagramIcon size={24} />
                                      </div>
                                    )}
                                    {isLiked && (
                                      <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(225,48,108,0.9)', borderRadius: '50%', padding: '4px', display: 'flex' }}>
                                        <Heart size={14} color="white" fill="white" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="post-body">
                                    <div className="post-caption-snippet">
                                      {post.caption || '(No caption)'}
                                    </div>

                                    {commentObj && (
                                      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '4px', padding: '4px 6px', fontSize: '0.68rem', color: '#cbd5e1' }}>
                                        💬 {commentObj.text}
                                      </div>
                                    )}

                                    <div className="post-stats-row">
                                      <span>ID: {post.id.slice(0, 10)}</span>
                                      <span>❤️ {post.likeCount || 0}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TARGETS MANAGER (Dedicated Page) */}
        {activeTab === 'targets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel">
              <div className="panel-header">
                <div className="panel-title">
                  <Users size={20} color="var(--accent-magenta)" />
                  Target Usernames Manager
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setActiveTab('runner')}
                  >
                    <Play size={14} fill="currentColor" /> Run Batch With These Targets
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {/* Single Add */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Add Individual Target Handle</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. sohil__2085 or natgeo"
                      value={newTargetInput}
                      onChange={(e) => setNewTargetInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTarget();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleAddTarget}
                    >
                      <Plus size={16} /> Add
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>Quick Preset Targets:</span>
                    <div className="presets-row">
                      {['sohil__2085', 'natgeo', 'nasa', 'instagram', 'cristiano', 'techcrunch'].map((h) => (
                        <button
                          key={h}
                          type="button"
                          className="preset-chip"
                          onClick={() => handlePresetSelect(h)}
                        >
                          + @{h}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bulk Import */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Bulk Paste Usernames</h3>
                  <textarea
                    className="form-textarea"
                    placeholder="Paste usernames separated by commas, newlines, or spaces&#10;e.g.&#10;sohil__2085&#10;natgeo&#10;nasa"
                    rows={4}
                    value={bulkTargetsText}
                    onChange={(e) => setBulkTargetsText(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleBulkAddTargets}
                  >
                    <UploadCloud size={16} /> Import Usernames to Queue
                  </button>
                </div>
              </div>
            </div>

            {/* Targets Table */}
            <div className="targets-table-wrapper">
              <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                  Active Queue ({targets.length} handles)
                </span>
                {targets.length > 0 && (
                  <button
                    type="button"
                    className="btn-outline-danger"
                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
                    onClick={handleClearAllTargets}
                  >
                    <Trash2 size={12} /> Clear All
                  </button>
                )}
              </div>

              {targets.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  No target handles in queue. Add usernames using the forms above or select presets.
                </div>
              ) : (
                <table className="targets-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>#</th>
                      <th>Username</th>
                      <th>Format</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map((handle, idx) => (
                      <tr key={handle}>
                        <td>
                          <span style={{ color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
                            {idx + 1}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div className="avatar-placeholder" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>
                              {handle.charAt(0).toUpperCase()}
                            </div>
                            <strong style={{ fontSize: '0.88rem' }}>@{handle}</strong>
                          </div>
                        </td>
                        <td>
                          <span className="badge-tag" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-sub)' }}>
                            Instagram Public Profile
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-outline-danger"
                            style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem' }}
                            onClick={() => handleRemoveTarget(handle)}
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ENVIRONMENT VARIABLES & ANTI-BAN SETTINGS */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {saveSuccessNotice && (
              <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1.25rem', color: '#34d399', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} />
                <strong>Settings Saved!</strong> All environment variables and anti-ban settings have been stored in your browser LocalStorage.
              </div>
            )}

            <div className="settings-grid">
              {/* Credentials & API Setup */}
              <div className="glass-panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <Settings size={18} color="var(--accent-magenta)" />
                    Unipile API Credentials (Environment Variables)
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                    Editable in-app (No secret env required)
                  </span>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>
                  Configure your private Unipile DSN, Access Key, and Instagram Account ID. Any changes you make here are automatically used by the API endpoints and can be saved to your browser.
                </p>

                <div className="form-group">
                  <label className="form-label">
                    <span>Unipile DSN Host (Host & Port)</span>
                    <span style={{ color: 'var(--text-dim)' }}>Default: api71.unipile.com:20132</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={dsn}
                    onChange={(e) => setDsn(e.target.value)}
                    placeholder="api71.unipile.com:20132"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Unipile API Key (X-API-KEY)</span>
                    <span style={{ color: 'var(--accent-emerald)' }}>
                      {hasServerApiKey ? '✓ Pre-configured' : 'Required'}
                    </span>
                  </label>
                  <div className="password-input-wrap">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      className="form-input"
                      style={{ paddingRight: '40px', fontFamily: 'JetBrains Mono, monospace' }}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your Unipile API Key"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowApiKey(!showApiKey)}
                      title={showApiKey ? 'Hide key' : 'Show key'}
                    >
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Connected Instagram Account ID (ACC)</span>
                    <span style={{ color: 'var(--text-dim)' }}>From Unipile dashboard</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="BqO3d7scQma6rakq6P5fEQ"
                  />
                </div>

                {/* Connection Test Button */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '0.65rem' }}
                    onClick={handleTestConnection}
                    disabled={testConnLoading}
                  >
                    <RefreshCw size={15} className={testConnLoading ? 'spin' : ''} />
                    {testConnLoading ? 'Testing API Connection...' : '⚡ Test API Connection With These Credentials'}
                  </button>

                  {testConnResult && (
                    <div
                      style={{
                        background: testConnResult.ok ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                        border: `1px solid ${testConnResult.ok ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.75rem',
                        fontSize: '0.78rem',
                        color: testConnResult.ok ? '#34d399' : '#fb7185',
                      }}
                    >
                      <strong>{testConnResult.ok ? '✅ Connection OK:' : '❌ Connection Notice:'}</strong> {testConnResult.message || testConnResult.error}
                      {testConnResult.durationMs ? ` (${testConnResult.durationMs}ms)` : ''}
                    </div>
                  )}
                </div>

                {/* Save Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ flex: 1 }}
                    onClick={handleSaveSettings}
                  >
                    <Save size={16} /> Save to Browser (LocalStorage)
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleResetDefaults}
                  >
                    <RotateCcw size={15} /> Reset Safe Defaults
                  </button>
                </div>
              </div>

              {/* Anti-Ban Humanization Configuration Card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="glass-panel">
                  <div className="panel-header">
                    <div className="panel-title">
                      <ShieldCheck size={18} color="#10b981" />
                      Anti-Ban & Humanization System
                    </div>
                    <span
                      style={{
                        fontSize: '0.76rem',
                        color: safetyAssessment.color,
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: 'var(--radius-full)',
                        background: `${safetyAssessment.color}15`,
                        border: `1px solid ${safetyAssessment.color}35`,
                      }}
                    >
                      {safetyAssessment.label}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-sub)' }}>
                    Instagram uses AI pattern-recognition algorithms that flag repetitive uniform timings and robotic interaction sequences. These controls simulate authentic human browsing.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: '0.84rem' }}>
                    {/* Jitter */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <strong>Randomized Delay Jitter (±35%)</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>
                          Varies each pause (e.g. 15s becomes 11s, 19s, 14s, 17s).
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={humanJitterEnabled}
                        onChange={(e) => setHumanJitterEnabled(e.target.checked)}
                        style={{ accentColor: '#10b981', width: '18px', height: '18px' }}
                      />
                    </div>

                    {/* Like probability */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <strong>Organic Interaction Chance</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>
                            Humans don't like 100% of posts. Skips occasional posts organically.
                          </div>
                        </div>
                        <span style={{ color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>
                          {randomSkipEnabled ? `${likeProbability}%` : '100% (Robotic)'}
                        </span>
                      </div>
                      {randomSkipEnabled && (
                        <input
                          type="range"
                          min="50"
                          max="95"
                          value={likeProbability}
                          onChange={(e) => setLikeProbability(Number(e.target.value))}
                          style={{ accentColor: '#10b981' }}
                        />
                      )}
                    </div>

                    {/* Dynamic Comments */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <strong>Dynamic Varied Comments & Emojis</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>
                          Randomizes comment phrasing & emojis (🔥, 👏, ✨, 💯) instead of identical spam.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={humanCommentsEnabled}
                        onChange={(e) => setHumanCommentsEnabled(e.target.checked)}
                        style={{ accentColor: '#10b981', width: '18px', height: '18px' }}
                      />
                    </div>

                    {/* Typing delay */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <strong>Simulated Keyboard Typing Delay</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>
                          Adds a natural 1.5s–3.5s pause as if someone is physically typing.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={humanTypingSimEnabled}
                        onChange={(e) => setHumanTypingSimEnabled(e.target.checked)}
                        style={{ accentColor: '#10b981', width: '18px', height: '18px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Timing Delays & Limits */}
                <div className="glass-panel">
                  <div className="panel-header">
                    <div className="panel-title" style={{ fontSize: '0.88rem' }}>
                      <Clock size={16} color="var(--accent-magenta)" />
                      Delays & Limits (Higher is Safer)
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">
                        <span>Step Delay ({betweenActionsSeconds}s)</span>
                        <span style={{ fontSize: '0.68rem', color: betweenActionsSeconds >= 15 ? '#10b981' : '#f59e0b' }}>
                          {betweenActionsSeconds >= 15 ? '✓ Safe' : '⚠️ Fast'}
                        </span>
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="60"
                        className="form-input"
                        value={betweenActionsSeconds}
                        onChange={(e) => setBetweenActionsSeconds(Number(e.target.value))}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <span>User Delay ({betweenUsersSeconds}s)</span>
                        <span style={{ fontSize: '0.68rem', color: betweenUsersSeconds >= 45 ? '#10b981' : '#f59e0b' }}>
                          {betweenUsersSeconds >= 45 ? '✓ Safe' : '⚠️ Fast'}
                        </span>
                      </label>
                      <input
                        type="number"
                        min="15"
                        max="180"
                        className="form-input"
                        value={betweenUsersSeconds}
                        onChange={(e) => setBetweenUsersSeconds(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                    <div className="form-group">
                      <label className="form-label">Posts to Like (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        className="form-input"
                        value={postsToLike}
                        onChange={(e) => setPostsToLike(Number(e.target.value))}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Comment Prefix</label>
                      <input
                        type="text"
                        className="form-input"
                        value={commentPrefix}
                        onChange={(e) => setCommentPrefix(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SINGLE ACTION PLAYGROUND */}
        {activeTab === 'playground' && (
          <div className="glass-panel">
            <div className="panel-header">
              <div className="panel-title">
                <Search size={18} color="var(--accent-magenta)" />
                Single Action Playground & API Inspector
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-sub)' }}>
                Test individual endpoints on demand without running a batch
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {/* Profile Card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Lookup Instagram Username</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Username (e.g. sohil__2085)"
                      value={playUsername}
                      onChange={(e) => setPlayUsername(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handlePlaygroundLookup}
                      disabled={playLoading}
                    >
                      Lookup
                    </button>
                  </div>
                </div>

                {playProfile && (
                  <div className="target-card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      {playProfile.avatar_url && (
                        <img src={playProfile.avatar_url} alt="Profile" className="profile-avatar" style={{ width: '40px', height: '40px' }} />
                      )}
                      <div>
                        <h4 style={{ fontSize: '0.9rem' }}>{playProfile.full_name || playProfile.username}</h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>ID: {playProfile.provider_id}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)' }}>
                      {playProfile.biography}
                    </div>
                  </div>
                )}

                {/* Posts Selector */}
                {playPosts.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Select Fetched Post ID</label>
                    <select
                      className="form-select"
                      value={playPostId}
                      onChange={(e) => setPlayPostId(e.target.value)}
                    >
                      {playPosts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id} - {p.caption ? p.caption.slice(0, 40) + '...' : 'Post'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Actions: Like and Comment */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ flex: 1 }}
                    onClick={handlePlaygroundLike}
                    disabled={playLoading || !playPostId}
                  >
                    <Heart size={15} color="#e1306c" /> Like Post
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label">Custom Comment Text</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={playCommentText}
                    onChange={(e) => setPlayCommentText(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handlePlaygroundComment}
                    disabled={playLoading || !playPostId}
                  >
                    <MessageCircle size={15} /> Send Comment
                  </button>
                </div>
              </div>

              {/* JSON Response Inspector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">API Response Inspector</label>
                  {playResult && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem' }}
                      onClick={() => handleCopy(JSON.stringify(playResult, null, 2))}
                    >
                      {copiedText ? <Check size={12} /> : <Copy size={12} />} Copy JSON
                    </button>
                  )}
                </div>
                <div
                  style={{
                    background: '#06080d',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.75rem',
                    height: '360px',
                    overflowY: 'auto',
                    color: '#94a3b8',
                  }}
                >
                  {playResult ? (
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {JSON.stringify(playResult, null, 2)}
                    </pre>
                  ) : (
                    <span style={{ color: 'var(--text-dim)' }}>
                      Trigger a profile lookup, like, or comment to inspect the live HTTP status and JSON response body.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: RECONNECT ACCOUNT */}
        {activeTab === 'reconnect' && (
          <div className="glass-panel" style={{ maxWidth: '720px', margin: '0 auto', width: '100%' }}>
            <div className="panel-header">
              <div className="panel-title">
                <LinkIcon size={18} color="var(--accent-magenta)" />
                Reconnect Instagram Account (Unipile Hosted Link)
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)' }}>
              Generates a hosted authorization link to reconnect the Instagram account configured in your Unipile dashboard.
            </p>

            <div className="form-group">
              <label className="form-label">Account ID to Reconnect</label>
              <input
                type="text"
                className="form-input"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Manager / Connection Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="TEST_MANAGER_001"
                value={recManagerName}
                onChange={(e) => setRecManagerName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Public HTTPS Notify / Webhook URL</label>
              <input
                type="text"
                className="form-input"
                placeholder="https://webhook.site/..."
                value={recCallbackUrl}
                onChange={(e) => setRecCallbackUrl(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{ padding: '0.75rem' }}
              onClick={handleGenerateReconnect}
              disabled={recLoading}
            >
              {recLoading ? 'Generating Link...' : 'Generate Reconnect Link'}
            </button>

            {recLink && (
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>
                  Hosted Reconnect Link Ready:
                </span>
                <a
                  href={recLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {recLink} <ExternalLink size={14} />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Live Terminal & Logs Window */}
        <div className="terminal-window">
          <div className="terminal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="terminal-dots">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </div>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-sub)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Terminal size={14} /> Live Activity Log ({logs.length} entries)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem' }}
                onClick={handleExportLogs}
                title="Download JSONL Log File"
              >
                <Download size={12} /> Export JSONL
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem' }}
                onClick={() => setLogs([])}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="terminal-body">
            {logs.map((log) => (
              <div key={log.id} className="log-entry">
                <span className="log-time">[{log.time}]</span>
                <span className={`log-level log-level-${log.type}`}>
                  {log.type.toUpperCase()}
                </span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </main>

      {/* Solid In-App Live Mode Confirmation Modal (With zero-glitch event guards) */}
      {showLiveModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            // Close only if user explicitly clicks the dark background, not an accidental click
            if (e.target === e.currentTarget) {
              setShowLiveModal(false);
            }
          }}
        >
          <div
            className="modal-dialog"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px' }}
          >
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24' }}>
                <AlertTriangle size={20} color="#fbbf24" />
                Switch to LIVE MUTATION Mode?
              </h3>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.3rem', padding: '0 4px' }}
                onClick={() => setShowLiveModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem', color: 'var(--text-sub)' }}>
              <p>
                In <strong>LIVE MODE</strong>, the flow runner will execute <strong>real API mutations</strong> on Instagram accounts through Unipile:
              </p>
              <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', color: 'var(--text-main)' }}>
                <li>Dispatches real follow invitations (<code>/api/v1/users/invite</code>)</li>
                <li>Likes real target posts (<code>/api/v1/posts/reaction</code>)</li>
                <li>Posts real comments on posts (<code>/api/v1/posts/:id/comments</code>)</li>
              </ul>

              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: '#34d399', fontSize: '0.8rem' }}>
                🛡️ <strong>Anti-Ban Engine Active:</strong> Random delay jitter (±35%), dynamic comment phrasing, and organic skipping will be used to protect your account.
              </div>

              <p style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', color: '#fb7185', fontSize: '0.78rem' }}>
                ⚠️ <strong>Safety Notice:</strong> Use only authorized test accounts that you own.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowLiveModal(false)}
              >
                Cancel (Keep Dry-Run)
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
                onClick={() => {
                  setMode('live');
                  localStorage.setItem('unipile_mode', 'live');
                  setShowLiveModal(false);
                  addLog('info', 'Switched to LIVE MODE with Anti-Ban Humanization protections enabled.');
                }}
              >
                Confirm & Enable Live Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Footer */}
      <footer className="app-footer">
        <div>
          <strong>Unipile Instagram Flow Runner</strong> — Built for seamless Vercel deployment with Anti-Ban Protections.
        </div>
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <span>Next.js 14</span>
          <span>Anti-Ban Humanizer Active</span>
          <span>Zero Vercel Secret Setup Required</span>
        </div>
      </footer>
    </div>
  );
}
