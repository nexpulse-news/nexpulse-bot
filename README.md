# NEXPULSE BOT ENGINE
## Complete Setup Guide — From Zero to Live in 30 Minutes

---

## FOLDER STRUCTURE
```
nexpulse-bot/
├── src/
│   ├── index.js              ← Main bot (runs 24/7)
│   ├── dashboard.js          ← Your control panel (localhost:3000)
│   ├── fetcher/
│   │   └── newsFetcher.js    ← Pulls news from 20+ sources
│   ├── writer/
│   │   └── aiWriter.js       ← Claude AI rewrites articles
│   ├── poster/
│   │   └── twitterPoster.js  ← Posts to Twitter automatically
│   ├── database/
│   │   └── connect.js        ← MongoDB connection + Article model
│   └── utils/
│       └── logger.js         ← Logs everything
├── logs/                     ← Auto-created on first run
├── .env.example              ← Copy this to .env and fill keys
├── .gitignore                ← .env is NEVER pushed to GitHub
├── package.json
├── railway.toml              ← Railway deployment config
└── README.md
```

---

## STEP 1 — SETUP MONGODB ATLAS (FREE)

1. Go to mongodb.com/atlas → Sign up free
2. Create a FREE cluster (M0 — 512MB free forever)
3. Click "Connect" → "Connect your application"
4. Copy the connection string — looks like:
   `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/`
5. Replace `<password>` with your real password
6. Add `/nexpulse` at the end: 
   `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/nexpulse`

---

## STEP 2 — CREATE .env FILE

```bash
# In your nexpulse-bot folder:
cp .env.example .env
```

Then open .env and fill in ALL your keys:
- ANTHROPIC_API_KEY (your Claude key)
- NEWS_API_KEY (your NewsAPI key)
- TWITTER_API_KEY, SECRET, ACCESS_TOKEN, ACCESS_SECRET, BEARER_TOKEN
- MONGODB_URI (from Step 1)

---

## STEP 3 — TEST LOCALLY

```bash
# Install dependencies
npm install

# Make logs folder
mkdir -p logs

# Start the bot
npm start
```

Open http://localhost:3000 → You should see your dashboard!

Watch the logs — within 2 minutes you'll see:
```
[BOT CYCLE STARTING]
Fetched 80+ raw articles
✅ AUTO-APPROVED (92%): OpenAI Launches GPT-5...
✅ AUTO-APPROVED (88%): Bitcoin Surges Past $100K...
⚠️  FLAGGED (71%): Opinion: Why AI Will...
[CYCLE COMPLETE] Approved: 12 | Flagged: 3 | Rejected: 2
```

---

## STEP 4 — DEPLOY TO RAILWAY (FREE, 24/7)

1. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Nexpulse bot v1.0"
git remote add origin https://github.com/nexpulse-news/bot
git push -u origin main
```

2. Go to railway.app → Your project → "Deploy from GitHub"
3. Select your repo
4. Go to Variables tab → Add ALL your .env keys one by one
5. Click Deploy → Bot goes live 24/7!

---

## STEP 5 — YOUR DAILY ROUTINE (5-10 minutes)

Every morning, open: http://localhost:3000

You'll see:
- How many articles fetched overnight
- How many auto-approved (confidence 85%+)
- FLAGGED articles needing your review

For each flagged article:
- Read the headline + excerpt
- Click "Approve" if it's good
- Click "Reject" if it's bad/clickbait/opinion
- Click "Source" to read original if unsure

That's it! Bot handles everything else automatically.

---

## HOW THE BOT WORKS

```
Every 30 minutes:
  1. Fetch news from 20+ sources (RSS + NewsAPI)
  2. For each new article → Claude AI rewrites it
  3. Confidence 85%+ → Auto-approve
  4. Confidence 60-84% → Flag for your review
  5. Confidence below 60% → Auto-reject

Every 60 minutes:
  1. Get approved articles not yet posted
  2. Post to Twitter (max 20/day)
  3. Mark as posted in database

Daily at midnight:
  1. Print stats to logs
```

---

## BOT SETTINGS (in .env)

| Setting | Default | Description |
|---------|---------|-------------|
| FETCH_INTERVAL_MINUTES | 30 | How often to fetch news |
| POST_INTERVAL_MINUTES | 60 | How often to post to Twitter |
| MAX_POSTS_PER_DAY | 20 | Daily post limit |
| AUTO_APPROVE_CONFIDENCE | 85 | Min score for auto-approve |
| DASHBOARD_PORT | 3000 | Dashboard URL port |

---

## TROUBLESHOOTING

**Bot won't start:**
- Check all .env keys are filled correctly
- Run `npm install` first
- Check MongoDB URI is correct

**No articles fetching:**
- Check NEWS_API_KEY is valid
- RSS feeds work without any key

**Twitter posts failing:**
- Twitter API needs "Read and Write" permissions
- Check all 5 Twitter keys are correct

**Dashboard not loading:**
- Make sure MongoDB is connected first
- Dashboard needs the bot running

---

## NEXT PHASES

Phase 1 (NOW): Twitter + Dashboard
Phase 2: Instagram image cards (Sharp/Canvas)
Phase 3: Facebook auto-posting
Phase 4: Website auto-updates (Vercel API)
Phase 5: TikTok + YouTube Shorts

---

Built with by Nexpulse Media Inc. — New York 2026
