# Setup — getting Universal Mail running

## TL;DR — fastest path to a working demo

```bash
npm install
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env
echo 'SESSION_SECRET=dev-secret-change-me' >> .env
echo 'DEMO_MODE=1' >> .env
echo 'APP_URL=http://localhost:3000' >> .env
npm run dev
```

Open <http://localhost:3000>. You'll see the demo inbox with 8 fixture threads. Open any one to see Claude summarize it. Click "Draft a reply" to see drafts. Inbox sorts itself by Claude priority.

## Deploy to Vercel — one-time setup (10 minutes)

### 1. Create a free Vercel account

→ https://vercel.com/signup

### 2. Push this repo to GitHub

```bash
gh repo create universal-mail --public --source=. --push
```

(Or use the GitHub UI; it works the same.)

### 3. Import into Vercel

In the Vercel dashboard → **Add New Project** → import the GitHub repo. Framework auto-detects as Next.js.

### 4. Set environment variables (Vercel project → Settings → Environment Variables)

**Required for any deployment:**
- `SESSION_SECRET` — `openssl rand -base64 32`
- `APP_URL` — your Vercel URL, e.g. `https://universal-mail.vercel.app`

**Required for AI features:**
- `ANTHROPIC_API_KEY` — from https://console.anthropic.com/

**For demo-only deploy (instant working URL):**
- `DEMO_MODE` — `1`

**For real Gmail accounts:**
- `GOOGLE_CLIENT_ID` — see Google Cloud setup below
- `GOOGLE_CLIENT_SECRET` — same

**For real Outlook / O365 accounts:**
- `MICROSOFT_CLIENT_ID` — see Azure setup below
- `MICROSOFT_CLIENT_SECRET` — same
- `MICROSOFT_TENANT` — `common` (works for personal + work accounts)

**For multi-instance prod (recommended once live):**
- `UPSTASH_REDIS_REST_URL` — from Vercel Marketplace → Upstash → free tier
- `UPSTASH_REDIS_REST_TOKEN` — same

### 5. Deploy

```bash
vercel --prod
```

(Or push to `main` and let Vercel auto-deploy.)

The URL Vercel returns is your live deployment. Update README.md's `{{VERCEL_URL}}` placeholder.

## Setting up Gmail OAuth (15 minutes, one-time)

1. Go to https://console.cloud.google.com/
2. Create a new project → "Universal Mail"
3. **APIs & Services → Library** → enable **Gmail API**
4. **APIs & Services → OAuth consent screen** → External → app name "Universal Mail" → add the Gmail scopes:
   - `gmail.modify`
   - `gmail.send`
   - `userinfo.email`
   - `userinfo.profile`
5. **APIs & Services → Credentials** → **Create Credentials → OAuth client ID** → Web application
   - Authorized redirect URI: `https://your-app.vercel.app/api/auth/callback/gmail`
   - Also add `http://localhost:3000/api/auth/callback/gmail` for local dev
6. Copy the **Client ID** and **Client Secret** into Vercel env vars
7. While in testing mode, add yourself as a test user under OAuth consent screen → Test users

## Setting up Microsoft / O365 OAuth (10 minutes, one-time)

1. Go to https://portal.azure.com/ → **Microsoft Entra ID** → **App registrations** → **New registration**
2. Name "Universal Mail", **Supported account types**: "Accounts in any organizational directory and personal Microsoft accounts"
3. **Redirect URI**: Web → `https://your-app.vercel.app/api/auth/callback/microsoft` (also add localhost for dev)
4. After creation, **Certificates & secrets** → **New client secret** → copy the **Value** (NOT the Secret ID)
5. **API permissions** → **Add a permission → Microsoft Graph → Delegated**:
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `User.Read`
   - `offline_access`
   - `openid`, `profile`, `email`
6. Copy the **Application (client) ID** and the secret value into Vercel env vars

## Connecting Yahoo / AOL / IMAP

No app registration needed — just an app password.

1. **Yahoo**: https://login.yahoo.com/account/security → **Generate app password**
2. **AOL**: https://login.aol.com/account/security → **Generate app password**
3. **iCloud**: https://account.apple.com → Sign-In and Security → **App-Specific Passwords**

Then in the app: **Settings → Add an IMAP account** → pick the preset, enter your email + app password.

## Local development

```bash
cp .env.example .env
# Fill in at least ANTHROPIC_API_KEY and SESSION_SECRET
npm install
npm run dev                  # real OAuth (needs Google/Microsoft creds)
DEMO_MODE=1 npm run dev      # demo inbox, AI on, no OAuth
```

## Running tests

```bash
npm run typecheck            # TS strict
npm run test                 # Vitest unit
npm run test:e2e:install     # one-time Playwright browsers
npm run test:e2e             # Playwright e2e against DEMO_MODE
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Empty state on first load with OAuth env vars set | Cookie blocked by browser | Check `SESSION_SECRET` is set; check `APP_URL` matches the URL you're visiting |
| OAuth callback "redirect URI mismatch" | URI in Google/Azure doesn't match exactly | Update the OAuth client redirect URI to match your actual deploy URL (no trailing slash) |
| AI features error: "ANTHROPIC_API_KEY required" | Env var not set | Set in `.env` locally or in Vercel project settings |
| IMAP "auth failed" for Yahoo/AOL | Using regular password | Generate an app password (see above) |
| Service worker not updating | Cached old version | DevTools → Application → Service Workers → Unregister, then reload |
