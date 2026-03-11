// ============================================================
// NEXPULSE NEWS FETCHER
// Pulls latest news from NewsAPI + RSS feeds every 30 min
// ============================================================

const axios     = require('axios');
const RSSParser = require('rss-parser');
const logger    = require('../utils/logger');

const rss = new RSSParser();

// ============================================================
// ALL NEWS SOURCES
// ============================================================
const RSS_SOURCES = [
  // WORLD
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',           category: 'World',        source: 'BBC News' },
  { url: 'https://feeds.reuters.com/reuters/worldNews',            category: 'World',        source: 'Reuters' },
  { url: 'https://rss.cnn.com/rss/edition_world.rss',             category: 'World',        source: 'CNN' },
  // TECHNOLOGY
  { url: 'https://feeds.feedburner.com/TechCrunch',               category: 'Technology',   source: 'TechCrunch' },
  { url: 'https://www.theverge.com/rss/index.xml',                 category: 'Technology',   source: 'The Verge' },
  { url: 'https://feeds.arstechnica.com/arstechnica/index',        category: 'Technology',   source: 'Ars Technica' },
  { url: 'https://feeds.wired.com/wired/index',                    category: 'Technology',   source: 'Wired' },
  // BUSINESS
  { url: 'https://feeds.bloomberg.com/markets/news.rss',           category: 'Business',     source: 'Bloomberg' },
  { url: 'https://feeds.reuters.com/reuters/businessNews',         category: 'Business',     source: 'Reuters Business' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml',        category: 'Business',     source: 'BBC Business' },
  // SCIENCE & SPACE
  { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss',         category: 'Science',      source: 'NASA' },
  { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', category: 'Science', source: 'BBC Science' },
  { url: 'https://www.sciencedaily.com/rss/top/science.xml',       category: 'Science',      source: 'Science Daily' },
  // SPORTS
  { url: 'https://www.espn.com/espn/rss/news',                    category: 'Sports',       source: 'ESPN' },
  { url: 'https://feeds.bbci.co.uk/sport/rss.xml',                category: 'Sports',       source: 'BBC Sport' },
  // GULF / MIDDLE EAST
  { url: 'https://www.aljazeera.com/xml/rss/all.xml',             category: 'World',        source: 'Al Jazeera' },
  { url: 'https://gulfnews.com/rss',                              category: 'Gulf',         source: 'Gulf News' },
  // HEALTH
  { url: 'https://feeds.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC', category: 'Health',   source: 'WebMD' },
];

// NewsAPI categories
const NEWSAPI_CATEGORIES = ['general', 'technology', 'business', 'sports', 'science', 'health', 'entertainment'];

// ============================================================
// MAIN FETCH FUNCTION
// ============================================================
async function fetchAll() {
  logger.info('📡 Fetching news from all sources...');

  const results = [];

  // Fetch from RSS sources
  const rssArticles = await fetchFromRSS();
  results.push(...rssArticles);

  // Fetch from NewsAPI
  const apiArticles = await fetchFromNewsAPI();
  results.push(...apiArticles);

  // Deduplicate by URL
  const seen = new Set();
  const unique = results.filter(article => {
    if (!article.url || seen.has(article.url)) return false;
    seen.add(article.url);
    return true;
  });

  logger.info(`📰 Total unique articles fetched: ${unique.length}`);
  return unique;
}

// ============================================================
// FETCH FROM RSS FEEDS
// ============================================================
async function fetchFromRSS() {
  const articles = [];

  for (const source of RSS_SOURCES) {
    try {
      const feed = await Promise.race([
        rss.parseURL(source.url),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ]);

      const items = (feed.items || []).slice(0, 5); // Max 5 per source

      for (const item of items) {
        articles.push({
          headline:    item.title || '',
          summary:     item.contentSnippet || item.content || item.summary || '',
          url:         item.link || '',
          source:      source.source,
          category:    source.category,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          imageUrl:    extractImage(item) || null,
        });
      }

      logger.info(`  ✅ ${source.source}: ${items.length} articles`);

    } catch (err) {
      logger.warn(`  ⚠️  ${source.source}: ${err.message}`);
    }
  }

  return articles;
}

// ============================================================
// FETCH FROM NEWSAPI
// ============================================================
async function fetchFromNewsAPI() {
  const articles = [];
  const key = process.env.NEWS_API_KEY;
  if (!key) return articles;

  for (const category of NEWSAPI_CATEGORIES) {
    try {
      const res = await axios.get('https://newsapi.org/v2/top-headlines', {
        params: {
          apiKey:   key,
          category: category,
          language: 'en',
          pageSize: 10,
        },
        timeout: 10000
      });

      const items = (res.data.articles || []).filter(a => a.title && a.url);

      for (const item of items) {
        articles.push({
          headline:    item.title,
          summary:     item.description || item.content || '',
          url:         item.url,
          source:      item.source?.name || 'News API',
          category:    capitalize(category),
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
          imageUrl:    item.urlToImage || null,
        });
      }

      logger.info(`  ✅ NewsAPI ${category}: ${items.length} articles`);

    } catch (err) {
      logger.warn(`  ⚠️  NewsAPI ${category}: ${err.message}`);
    }
  }

  return articles;
}

// ============================================================
// HELPERS
// ============================================================
function extractImage(item) {
  if (item.enclosure?.url) return item.enclosure.url;
  if (item['media:content']?.$.url) return item['media:content'].$.url;
  const match = (item.content || '').match(/src="([^"]+\.(jpg|png|webp))"/i);
  return match ? match[1] : null;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = { fetchAll };
