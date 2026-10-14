# Instagram API Test Runner (Unipile)

A sequential Node.js runner based on the supplied Postman collection. Social Crawl is intentionally excluded. Use only accounts you own or are explicitly authorized to test.

## Menu

1. Reconnect Instagram account
2. Run the complete cycle for each username in `targets.json`
3. Unfollow / cancel pending request (currently unavailable because the supplied collection has no endpoint URL or confirmed method)
0. Exit

## Files

- `instagram-runner.js` — sequential runner
- `instagram-environment.json` — your private Unipile DSN, API key, and connected account ID
- `targets.json` — ordered array of target usernames
- `runner-config.json` — mode and delay settings
- `logs/` — detailed JSONL logs for API responses and step outcomes

## Setup

Copy `instagram-environment.example.json` to `instagram-environment.json` and fill `DSN`, `API_KEY`, and `ACC`. Keep that file private; it is listed in `.gitignore`.

Edit `targets.json`:

```json
{
  "usernames": [
    "your_authorized_test_account_one",
    "your_authorized_test_account_two"
  ]
}
```

## Sequential run behavior

Option 2 processes each username fully before moving to the next:

1. Request profile and print the full (redacted) response.
2. Extract the target's provider ID from the profile response. If it cannot be found, stop that target and print the reason.
3. Inspect available follow-state booleans and avoid sending a follow request if response indicates already following/request pending. Otherwise call the invite endpoint in live mode.
4. Fetch up to 20 posts using the resolved provider ID.
5. Select the first five posts with usable IDs.
6. For each selected post, call the like endpoint and then the comment endpoint (if configured), printing HTTP status and response for each step.
7. Finish this target's cycle, wait the configured between-user delay, and then start the next username.

A single API failure is captured with its HTTP status and response-derived reason. The runner keeps going where dependencies allow. Profile lookup/provider-ID failure stops that target because later actions depend on it; post-fetch failure skips its like/comment steps.

## Delays

`runner-config.json` uses a fixed, configurable pause between dependent requests. In `dry-run` mode only, the wait between complete username cycles can be randomized within a configured minimum/maximum to exercise timing behavior during read-only testing. Live follow/like/comment cycles keep a predictable configured interval rather than randomized pacing.

```json
{
  "mode": "dry-run",
  "betweenActionsSeconds": 2,
  "betweenUsersSeconds": 60,
  "dryRunRandomBetweenUsers": true,
  "dryRunBetweenUsersMinSeconds": 30,
  "dryRunBetweenUsersMaxSeconds": 90,
  "postsToLike": 5,
  "commentOnPosts": true,
  "commentPrefix": "[API TEST]",
  "maxCaptionChars": 100
}
```

- `mode: "dry-run"` (default): performs read-only profile/post lookups, but skips follow/like/comment mutations while showing what would be attempted.
- `mode: "live"`: enables mutations. Before the batch, the runner asks you to type `RUN LIVE TEST`. Only use this with accounts you own or are explicitly authorized to test.
- `betweenActionsSeconds`: pause between dependent API calls.
- `betweenUsersSeconds`: fixed pause after finishing a username cycle in live mode.
- `dryRunRandomBetweenUsers`: enable random wait between username cycles in dry-run mode only.
- `dryRunBetweenUsersMinSeconds` / `dryRunBetweenUsersMaxSeconds`: inclusive range for dry-run waits; default 30–90 seconds.
- Comments are deliberately labeled with `[API TEST]` and include a short excerpt from the post caption, so they're visibly test comments. Use only test/authorized targets.

## Logs and failure diagnosis

Every request displays:

- target username and action name
- HTTP method and endpoint
- HTTP status, status text, and duration
- response body (sensitive fields redacted)
- failure reason if the response is not successful

All request/step results are also appended as JSON Lines in `logs/instagram-run-<timestamp>.jsonl`. The final summary lists failures by target and action. Response fields that look like API keys, tokens, passwords, cookies, or authorization headers are redacted before printing/logging.

## Web Dashboard & Frontend

This project includes a **Next.js Web Dashboard** that allows anyone to run Instagram automation flows directly from a browser.

### Features
- **Batch Flow Runner**: Visual queue manager with step-by-step pipeline tracking (Profile Lookup → Provider ID → Follow → Posts → Likes/Comments).
- **Three Execution Modes**:
  - `Simulation Mode`: Generates high-fidelity mock Instagram data so anyone can demo the pipeline without server errors or live mutations.
  - `Dry-Run Mode`: Real API lookups, but skips follow/like/comment mutations.
  - `Live Mode`: Real API calls and real mutations on Instagram.
- **Single Action Explorer**: Standalone UI to lookup any Instagram handle, inspect recent posts, send test likes, and post custom comments.
- **Account Reconnect Panel**: Generate signed hosted reconnect links directly from the UI.
- **Real-Time Terminal & Logs**: Streaming logs with HTTP status codes, latency, response bodies, and JSONL export.

### Run Web App Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port displayed in your terminal).

---

## Deploy to Vercel

The application is built with Next.js 14 and is 100% ready for zero-configuration deployment to Vercel:

### Method 1: Using GitHub + Vercel Dashboard (Recommended)
1. Push this repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Instagram Flow Runner web application"
   git remote add origin https://github.com/your-username/instagram-flow-runner.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. In **Project Settings → Environment Variables**, add:
   - `UNIPILE_DSN`: `api71.unipile.com:20132` (or your Unipile host)
   - `UNIPILE_API_KEY`: your private Unipile API key
   - `UNIPILE_ACCOUNT_ID`: your connected Instagram account ID
5. Click **"Deploy"**. Your website is live and shareable with anyone!

### Method 2: Using Vercel CLI
```bash
npm i -g vercel
vercel
```
Follow the interactive prompts to link and deploy your project.

---

## CLI Test Runner

You can also run the sequential terminal runner:

```bash
npm run test:instagram
```

Node.js 18+ is required.

## Known limitation: unfollow

The supplied Postman item named `Unfollow / Cancel Pending Request` has no request URL and is marked `GET` despite the operation name. Option 3 reports this and sends no request; the route and method must be confirmed from Unipile documentation or your configured API first.

# Instagram-Automation
