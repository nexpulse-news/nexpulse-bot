// ============================================================
// NEXPULSE TWITTER POSTER
// Posts AI-written news to @nexpulse_news automatically
// ============================================================

const { TwitterApi } = require('twitter-api-v2');
const logger         = require('../utils/logger');

// Initialize Twitter client
const twitter = new TwitterApi({
  appKey:            process.env.TWITTER_API_KEY,
  appSecret:         process.env.TWITTER_API_SECRET,
  accessToken:       process.env.TWITTER_ACCESS_TOKEN,
  accessSecret:      process.env.TWITTER_ACCESS_SECRET,
});

const rwClient = twitter.readWrite;

// ============================================================
// POST TO TWITTER
// ============================================================
async function postToTwitter(article) {
  try {
    // Format tweet text
    let tweet = formatTweet(article);

    // Post the tweet
    const result = await rwClient.v2.tweet(tweet);

    logger.info(`🐦 Tweeted: ${result.data.id}`);
    return result.data.id;

  } catch (err) {
    // Handle rate limits gracefully
    if (err.code === 429) {
      logger.warn('⚠️  Twitter rate limit hit — will retry next cycle');
    } else {
      logger.error(`Twitter post error: ${err.message}`);
    }
    throw err;
  }
}

// ============================================================
// FORMAT TWEET
// ============================================================
function formatTweet(article) {
  // Start with AI-generated tweet text if available
  let text = article.tweetText || '';

  // Fallback: build from headline + excerpt
  if (!text || text.length < 20) {
    text = `${article.headline}\n\n${article.excerpt}`;
  }

  // Add category label
  const catLabel = getCategoryLabel(article.category);

  // Add source URL
  const url = article.sourceUrl || '';

  // Build final tweet: [CATEGORY] Headline... URL
  let tweet = `${catLabel} ${text}\n\n${url}`;

  // Enforce 280 char Twitter limit
  if (tweet.length > 280) {
    const allowance = 280 - url.length - catLabel.length - 10;
    tweet = `${catLabel} ${text.substring(0, allowance)}...\n\n${url}`;
  }

  return tweet;
}

// ============================================================
// CATEGORY LABELS
// ============================================================
function getCategoryLabel(category) {
  const labels = {
    'World':       '[WORLD]',
    'Technology':  '[TECH]',
    'Business':    '[BUSINESS]',
    'Sports':      '[SPORTS]',
    'Science':     '[SCIENCE]',
    'Health':      '[HEALTH]',
    'Gulf':        '[GULF]',
    'Entertainment': '[ENTERTAINMENT]',
  };
  return labels[category] || '[NEWS]';
}

module.exports = { postToTwitter };
