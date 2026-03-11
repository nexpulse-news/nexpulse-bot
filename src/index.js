// ============================================================
// NEXPULSE BOT ENGINE — MAIN ENTRY POINT
// The brain of Nexpulse — runs 24/7 on Railway
// ============================================================

require('dotenv').config();
const cron      = require('node-cron');
const logger    = require('./utils/logger');
const db        = require('./database/connect');
const fetcher   = require('./fetcher/newsFetcher');
const writer    = require('./writer/aiWriter');
const poster    = require('./poster/twitterPoster');
const dashboard = require('./dashboard');

// ============================================================
// STARTUP
// ============================================================
async function startup() {
  logger.info('🚀 NEXPULSE BOT STARTING...');
  logger.info('================================');

  // Connect to database
  await db.connect();
  logger.info('✅ Database connected');

  // Start dashboard server
  dashboard.start();
  logger.info(`✅ Dashboard running at http://localhost:${process.env.DASHBOARD_PORT || 3000}`);

  // Run once immediately on startup
  await runBotCycle();

  // Schedule: Fetch news every 30 minutes
  const fetchInterval = process.env.FETCH_INTERVAL_MINUTES || 30;
  cron.schedule(`*/${fetchInterval} * * * *`, async () => {
    logger.info('⏰ SCHEDULED FETCH starting...');
    await runBotCycle();
  });

  // Schedule: Post to Twitter every 60 minutes
  const postInterval = process.env.POST_INTERVAL_MINUTES || 60;
  cron.schedule(`*/${postInterval} * * * *`, async () => {
    logger.info('⏰ SCHEDULED POST starting...');
    await postPendingArticles();
  });

  // Schedule: Daily stats at midnight
  cron.schedule('0 0 * * *', async () => {
    await printDailyStats();
  });

  logger.info('✅ Bot is running 24/7!');
  logger.info(`📰 Fetching every ${fetchInterval} minutes`);
  logger.info(`📤 Posting every ${postInterval} minutes`);
  logger.info('================================');
}

// ============================================================
// MAIN BOT CYCLE
// Fetch → AI Write → Save → Auto-approve or Flag
// ============================================================
async function runBotCycle() {
  try {
    logger.info('--- BOT CYCLE STARTING ---');

    // STEP 1: Fetch latest news
    const rawArticles = await fetcher.fetchAll();
    logger.info(`📰 Fetched ${rawArticles.length} raw articles`);

    if (rawArticles.length === 0) {
      logger.info('No new articles found');
      return;
    }

    let approved = 0;
    let flagged  = 0;
    let rejected = 0;

    // STEP 2: Process each article
    for (const raw of rawArticles) {
      try {
        // Check if already processed
        const exists = await db.Article.findOne({ sourceUrl: raw.url });
        if (exists) continue;

        // STEP 3: AI writes the article
        const article = await writer.processArticle(raw);
        if (!article) continue;

        // STEP 4: Auto-approve based on confidence score
        const confidence = article.confidence || 0;

        if (confidence >= 85) {
          article.status = 'approved';
          article.autoApproved = true;
          approved++;
          logger.info(`✅ AUTO-APPROVED (${confidence}%): ${article.headline}`);
          // STEP 4b: Generate images for approved articles
          try {
            const imageGen = require('./imageGenerator');
            const images = await imageGen.generateArticleImages(article);
            article.images = images;
          } catch (imgErr) {
            logger.warn(`Image generation skipped: ${imgErr.message}`);
          }
        } else if (confidence >= 60) {
          article.status = 'flagged';
          flagged++;
          logger.warn(`⚠️  FLAGGED (${confidence}%): ${article.headline}`);
        } else {
          article.status = 'rejected';
          rejected++;
          logger.warn(`❌ REJECTED (${confidence}%): ${article.headline}`);
        }

        // STEP 5: Save to database
        await db.Article.create(article);

      } catch (err) {
        logger.error(`Error processing article: ${err.message}`);
      }
    }

    logger.info(`--- CYCLE COMPLETE ---`);
    logger.info(`✅ Approved: ${approved} | ⚠️ Flagged: ${flagged} | ❌ Rejected: ${rejected}`);

  } catch (err) {
    logger.error(`Bot cycle error: ${err.message}`);
  }
}

// ============================================================
// POST PENDING ARTICLES TO ALL PLATFORMS
// ============================================================
async function postPendingArticles() {
  try {
    // Get approved articles not yet posted
    const pending = await db.Article.find({
      status: 'approved',
      postedTwitter: false
    }).sort({ publishedAt: -1 }).limit(3);

    if (pending.length === 0) {
      logger.info('No pending articles to post');
      return;
    }

    logger.info(`📤 Posting ${pending.length} articles...`);

    for (const article of pending) {
      try {
        // Check daily post limit
        const todayPosts = await db.Article.countDocuments({
          postedTwitter: true,
          postedAt: { $gte: new Date(new Date().setHours(0,0,0,0)) }
        });

        const maxPosts = parseInt(process.env.MAX_POSTS_PER_DAY) || 20;
        if (todayPosts >= maxPosts) {
          logger.warn(`Daily post limit (${maxPosts}) reached`);
          break;
        }

        // Post to Twitter
        await poster.postToTwitter(article);

        // Mark as posted
        await db.Article.findByIdAndUpdate(article._id, {
          postedTwitter: true,
          postedAt: new Date()
        });

        logger.info(`✅ Posted to Twitter: ${article.headline}`);

        // Wait 5 seconds between posts
        await sleep(5000);

      } catch (err) {
        logger.error(`Error posting article: ${err.message}`);
      }
    }

  } catch (err) {
    logger.error(`Post cycle error: ${err.message}`);
  }
}

// ============================================================
// DAILY STATS
// ============================================================
async function printDailyStats() {
  const today = new Date(new Date().setHours(0,0,0,0));

  const stats = {
    fetched:  await db.Article.countDocuments({ createdAt: { $gte: today } }),
    approved: await db.Article.countDocuments({ status: 'approved', createdAt: { $gte: today } }),
    flagged:  await db.Article.countDocuments({ status: 'flagged', createdAt: { $gte: today } }),
    posted:   await db.Article.countDocuments({ postedTwitter: true, postedAt: { $gte: today } }),
    total:    await db.Article.countDocuments()
  };

  logger.info('========= DAILY STATS =========');
  logger.info(`📰 Fetched today:   ${stats.fetched}`);
  logger.info(`✅ Approved today:  ${stats.approved}`);
  logger.info(`⚠️  Flagged today:   ${stats.flagged}`);
  logger.info(`📤 Posted today:    ${stats.posted}`);
  logger.info(`📚 Total articles:  ${stats.total}`);
  logger.info('================================');
}

// Helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// START THE BOT
// ============================================================
startup().catch(err => {
  logger.error(`Fatal startup error: ${err.message}`);
  process.exit(1);
});
