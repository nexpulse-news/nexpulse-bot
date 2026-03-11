// ============================================================
// NEXPULSE AI WRITER — POWERED BY GROQ
// Groq is FREE + SUPER FAST (Llama 3.3 70B model)
// ============================================================

const axios  = require('axios');
const logger = require('../utils/logger');

async function processArticle(raw) {
  try {
    if (!raw.headline || raw.headline.length < 10) return null;
    if (!raw.summary  || raw.summary.length < 30)  return null;

    logger.info(`  ✍️  Writing: ${raw.headline.substring(0, 60)}...`);

    const result = await rewriteWithGroq(raw);
    if (!result) return null;

    return {
      sourceUrl:     raw.url,
      sourceTitle:   raw.headline,
      source:        raw.source,
      category:      raw.category,
      publishedAt:   raw.publishedAt,
      imageUrl:      raw.imageUrl,
      headline:      result.headline,
      excerpt:       result.excerpt,
      body:          result.body,
      keyPoints:     result.keyPoints,
      tweetText:     result.tweetText,
      tags:          result.tags,
      confidence:    result.confidence,
      readTime:      estimateReadTime(result.body),
      slug:          generateSlug(result.headline),
      status:        'pending',
      autoApproved:  false,
      postedTwitter: false,
      createdAt:     new Date(),
    };
  } catch (err) {
    logger.error(`AI writer error: ${err.message}`);
    return null;
  }
}

async function rewriteWithGroq(raw) {
  const prompt = `You are the lead editor at Nexpulse, a world-class global news brand based in New York.

Rewrite this raw news article into polished Nexpulse-style content.

NEXPULSE STYLE:
- Dateline: "New York, [Date] —" for US, "[City], [Date] —" for international
- Tone: Authoritative, objective, like Reuters or BBC
- Headlines: Punchy, factual, no clickbait, max 12 words
- No emojis anywhere
- Short paragraphs (2-3 sentences max)
- Always cite the source

RAW ARTICLE:
Title: ${raw.headline}
Source: ${raw.source}
Category: ${raw.category}
Summary: ${raw.summary}

Respond ONLY with valid JSON:
{
  "headline": "Rewritten headline max 12 words",
  "excerpt": "One sentence under 25 words",
  "body": "Full article 3-4 paragraphs with dateline",
  "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4"],
  "tweetText": "Tweet max 240 chars, cite source, max 2 hashtags",
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 90
}

Confidence: 90-100 clear facts, 75-89 good, 60-74 needs review, below 60 reject.
Return ONLY the JSON.`;

  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.3,
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const text = response.data.choices[0]?.message?.content || '';
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (err) {
    logger.warn(`JSON parse failed: ${raw.headline.substring(0, 40)}`);
    return null;
  }
}

function generateSlug(headline) {
  return headline.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 80);
}

function estimateReadTime(body) {
  return `${Math.max(1, Math.ceil((body || '').split(/\s+/).length / 200))} min read`;
}

module.exports = { processArticle };
