require('dotenv').config();
const cron = require('node-cron');
const express = require('express');
const cors = require('cors');
const { connect, Article } = require('./database/connect');
const { start: startDashboard } = require('./dashboard');
const logger = require('./utils/logger');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================
// PUBLIC API — Website fetches real articles from here
// ============================================================
const publicApp = express();
publicApp.use(cors());
publicApp.use(express.json());

// GET /api/articles — latest approved articles
publicApp.get('/api/articles', async (req, res) => {
  try {
    const { category, limit = 20, page = 1 } = req.query;
    const filter = { status: 'approved' };
    if (category && category !== 'all') filter.category = category;
    const articles = await Article.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('headline excerpt category source sourceUrl imageUrl createdAt readTime slug _id');
    res.json({ success: true, articles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/articles/:id — single article
publicApp.get('/api/articles/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, article });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/stats — public stats
publicApp.get('/api/stats', async (req, res) => {
  try {
    const total = await Article.countDocuments({ status: 'approved' });
    const today = new Date(new Date().setHours(0,0,0,0));
    const todayCount = await Article.countDocuments({ status: 'approved', createdAt: { $gte: today } });
    res.json({ success: true, total, today: todayCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
publicApp.get('/health', (req, res) => res.json({ status: 'ok', bot: 'Nexpulse Bot v1.0' }));

function startPublicAPI() {
  const port = process.env.PUBLIC_API_PORT || 4000;
  publicApp.listen(port, () => logger.info(`🌐 Public API live at port ${port}`));
}

// ============================================================
// BOT ENGINE
// ============================================================
async function runNewsCycle() {
  logger.info('--- BOT CYCLE STARTING ---');
  logger.info('📡 Fetching news from all sources...');
  try {
    const { fetchNews } = require('./fetcher/newsFetcher');
    const articles = await fetchNews();
    logger.info(`📰 Fetched ${articles.length} raw articles`);

    let approved = 0, flagged = 0, rejected = 0;

    for (const raw of articles) {
      try {
        const exists = await Article.findOne({ sourceUrl: raw.url });
        if (exists) continue;

        await wait(2000);

        const writer = require('./writer/aiWriter');
        const fn = writer.writeArticle || writer.processArticle;
        const written = await fn(raw);
        if (!written) continue;

        const headline = written.title || written.headline;
        if (!headline) continue;

        const confidence = written.confidence || 75;
        let status = confidence >= 85 ? 'approved' : confidence < 60 ? 'rejected' : 'flagged';

        const article = new Article({
          headline,
          excerpt: written.excerpt || written.summary || '',
          body: written.content || written.body || '',
          category: written.category || raw.category || 'World',
          confidence,
          sourceUrl: raw.url,
          source: raw.source,
          imageUrl: raw.imageUrl || '',
          status,
          tweetText: written.twitterPost || written.tweetText || `${headline} #Nexpulse #News`,
          postedTwitter: false,
        });

        await article.save();

        if (status === 'approved') { logger.info(`✅ AUTO-APPROVED (${confidence}%): ${headline.slice(0,60)}`); approved++; }
        else if (status === 'flagged') { logger.warn(`⚠️  FLAGGED (${confidence}%): ${headline.slice(0,60)}`); flagged++; }
        else { logger.warn(`❌ REJECTED (${confidence}%): ${headline.slice(0,60)}`); rejected++; }

      } catch (e) { /* silent skip */ }
    }

    logger.info(`--- CYCLE COMPLETE --- ✅ ${approved} | ⚠️ ${flagged} | ❌ ${rejected}`);
  } catch (err) {
    logger.error('❌ News cycle error: ' + err.message);
  }
}

async function runPostCycle() {
  try {
    const { postToTwitter } = require('./poster/twitterPoster');
    const toPost = await Article.find({ status: 'approved', postedTwitter: false }).limit(2);
    for (const article of toPost) {
      const posted = await postToTwitter(article);
      if (posted) {
        article.postedTwitter = true;
        article.postedAt = new Date();
        await article.save();
        logger.info(`🐦 Posted: ${article.headline.slice(0,60)}`);
      }
      await wait(3000);
    }
  } catch (err) {
    logger.error('❌ Post cycle error: ' + err.message);
  }
}

async function main() {
  logger.info('🚀 NEXPULSE BOT STARTING...');
  await connect();
  startDashboard();
  startPublicAPI();
  await runNewsCycle();
  cron.schedule('*/30 * * * *', runNewsCycle);
  cron.schedule('0 * * * *', runPostCycle);
  logger.info('✅ Bot is running 24/7!');
}

main().catch(err => logger.error(err.message));
