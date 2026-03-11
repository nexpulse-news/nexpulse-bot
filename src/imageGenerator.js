// ============================================================
// NEXPULSE AUTO IMAGE GENERATOR
// Creates branded news cards for ALL platforms automatically
// Uses Canvas (no API needed, 100% free, copyright free)
// ============================================================
// SIZES GENERATED PER ARTICLE:
// - Instagram Square  1080x1080
// - Instagram Story   1080x1920
// - Twitter/X         1200x675
// - Facebook          1200x630
// - TikTok            1080x1920
// ============================================================

const { createCanvas, loadImage, registerFont } = require('canvas');
const fs     = require('fs');
const path   = require('path');
const axios  = require('axios');
const logger = require('../utils/logger');

// Output folder
const OUTPUT_DIR = path.join(__dirname, '../../generated-images');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ============================================================
// NEXPULSE BRAND COLORS
// ============================================================
const COLORS = {
  navy:    '#050D1A',
  blue:    '#0A1628',
  royal:   '#1A3A6B',
  yellow:  '#FFD000',
  red:     '#CC0000',
  white:   '#FFFFFF',
  gray:    '#8892A4',
  green:   '#2DC653',
};

// ============================================================
// ALL CARD SIZES
// ============================================================
const SIZES = {
  instagram_square: { width: 1080, height: 1080, label: 'Instagram' },
  instagram_story:  { width: 1080, height: 1920, label: 'Story' },
  twitter:          { width: 1200, height: 675,  label: 'Twitter' },
  facebook:         { width: 1200, height: 630,  label: 'Facebook' },
  tiktok:           { width: 1080, height: 1920, label: 'TikTok' },
};

// ============================================================
// CATEGORY COLORS
// ============================================================
const CAT_COLORS = {
  'World':         '#CC0000',
  'Technology':    '#0066FF',
  'Business':      '#FF8C00',
  'Sports':        '#00AA44',
  'Science':       '#9900CC',
  'Health':        '#00AAAA',
  'Gulf':          '#CC6600',
  'Entertainment': '#CC0066',
};

// ============================================================
// MAIN: GENERATE ALL IMAGES FOR ONE ARTICLE
// ============================================================
async function generateArticleImages(article) {
  logger.info(`🎨 Generating images for: ${article.headline?.substring(0, 50)}...`);

  const results = {};
  const slug    = article.slug || 'article';
  const folder  = path.join(OUTPUT_DIR, slug);

  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  // Fetch background image from Unsplash (free, copyright free)
  let bgImage = null;
  try {
    bgImage = await fetchUnsplashImage(article.category, article.tags);
  } catch (e) {
    logger.warn('Could not fetch background image, using gradient');
  }

  // Generate each size
  for (const [sizeName, size] of Object.entries(SIZES)) {
    try {
      const filePath = path.join(folder, `${sizeName}.jpg`);
      await generateCard({ article, size, sizeName, bgImage, filePath });
      results[sizeName] = filePath;
      logger.info(`  ✅ ${size.label} (${size.width}x${size.height})`);
    } catch (err) {
      logger.warn(`  ⚠️  ${sizeName}: ${err.message}`);
    }
  }

  logger.info(`🎨 Images saved to: ${folder}`);
  return results;
}

// ============================================================
// GENERATE ONE CARD
// ============================================================
async function generateCard({ article, size, sizeName, bgImage, filePath }) {
  const canvas = createCanvas(size.width, size.height);
  const ctx    = canvas.getContext('2d');
  const isStory = size.height > size.width;

  // 1. BACKGROUND
  await drawBackground(ctx, size, bgImage, article.category);

  // 2. GRADIENT OVERLAY
  drawGradientOverlay(ctx, size, isStory);

  // 3. TOP BAR
  drawTopBar(ctx, size, article.category);

  // 4. NEXPULSE LOGO
  drawLogo(ctx, size, isStory);

  // 5. HEADLINE
  drawHeadline(ctx, size, article.headline, isStory);

  // 6. EXCERPT
  if (!isStory) {
    drawExcerpt(ctx, size, article.excerpt);
  }

  // 7. BOTTOM META BAR
  drawBottomBar(ctx, size, article.source, article.readTime, isStory);

  // 8. BREAKING BADGE (if breaking news)
  if (article.category === 'World' || article.isBreaking) {
    drawBreakingBadge(ctx, size);
  }

  // Save as JPEG
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.92 });
  fs.writeFileSync(filePath, buffer);
}

// ============================================================
// DRAW FUNCTIONS
// ============================================================

async function drawBackground(ctx, size, bgImage, category) {
  if (bgImage) {
    try {
      const img = await loadImage(bgImage);
      // Cover fit
      const scale = Math.max(size.width / img.width, size.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (size.width - w) / 2;
      const y = (size.height - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      return;
    } catch(e) {}
  }
  // Fallback: gradient background
  const catColor = CAT_COLORS[category] || COLORS.royal;
  const grad = ctx.createLinearGradient(0, 0, size.width, size.height);
  grad.addColorStop(0, COLORS.navy);
  grad.addColorStop(0.5, COLORS.blue);
  grad.addColorStop(1, catColor + '44');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size.width, size.height);
}

function drawGradientOverlay(ctx, size, isStory) {
  // Bottom heavy dark overlay for text readability
  const grad = ctx.createLinearGradient(0, 0, 0, size.height);
  if (isStory) {
    grad.addColorStop(0,   'rgba(5,13,26,0.3)');
    grad.addColorStop(0.4, 'rgba(5,13,26,0.1)');
    grad.addColorStop(0.7, 'rgba(5,13,26,0.8)');
    grad.addColorStop(1,   'rgba(5,13,26,0.98)');
  } else {
    grad.addColorStop(0,   'rgba(5,13,26,0.2)');
    grad.addColorStop(0.4, 'rgba(5,13,26,0.3)');
    grad.addColorStop(0.7, 'rgba(5,13,26,0.85)');
    grad.addColorStop(1,   'rgba(5,13,26,0.99)');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size.width, size.height);
}

function drawTopBar(ctx, size, category) {
  const catColor = CAT_COLORS[category] || COLORS.yellow;
  // Top accent line
  ctx.fillStyle = COLORS.yellow;
  ctx.fillRect(0, 0, size.width, 6);
  // Category badge
  const badgeX   = size.width * 0.06;
  const badgeY   = 30;
  const fontSize = Math.round(size.width * 0.025);
  const text      = (category || 'NEWS').toUpperCase();
  ctx.font        = `bold ${fontSize}px Arial`;
  const tw        = ctx.measureText(text).width;
  const padX      = fontSize * 0.8;
  const padY      = fontSize * 0.5;
  ctx.fillStyle   = catColor;
  roundRect(ctx, badgeX, badgeY, tw + padX * 2, fontSize + padY * 2, 6);
  ctx.fillStyle = COLORS.navy;
  ctx.font      = `bold ${fontSize}px Arial`;
  ctx.fillText(text, badgeX + padX, badgeY + padY + fontSize * 0.75);
}

function drawLogo(ctx, size, isStory) {
  const fontSize = Math.round(size.width * (isStory ? 0.055 : 0.04));
  const x = size.width * 0.06;
  const y = isStory ? size.height * 0.88 : size.height * 0.82;

  // Draw logo bars (simplified pulse icon)
  const barW = fontSize * 0.18;
  const barGap = fontSize * 0.08;
  const barHeights = [0.4, 0.65, 1.0, 0.85, 0.5];
  const totalW = barW * 5 + barGap * 4;
  let bx = x;

  // Yellow background square
  ctx.fillStyle = COLORS.yellow;
  roundRect(ctx, bx - 4, y - fontSize * 0.15, totalW + 8, fontSize * 1.1, 4);

  // Dark bars
  ctx.fillStyle = COLORS.navy;
  barHeights.forEach((h, i) => {
    const bh = fontSize * h * 0.8;
    const by = y + fontSize * 0.8 - bh;
    ctx.fillRect(bx + i * (barW + barGap), by, barW, bh);
  });

  // NEXPULSE text
  const textX = x + totalW + fontSize * 0.4;
  ctx.font      = `900 ${fontSize}px Arial`;
  ctx.fillStyle = COLORS.white;
  ctx.fillText('NEX', textX, y + fontSize * 0.8);
  const nexW = ctx.measureText('NEX').width;
  ctx.fillStyle = COLORS.yellow;
  ctx.fillText('PULSE', textX + nexW, y + fontSize * 0.8);

  // Tagline
  const tagSize = Math.round(fontSize * 0.35);
  ctx.font      = `${tagSize}px Arial`;
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('YOUR PULSE ON THE WORLD', textX, y + fontSize * 1.25);
}

function drawHeadline(ctx, size, headline, isStory) {
  if (!headline) return;
  const maxW    = size.width * 0.88;
  const x       = size.width * 0.06;
  const fontSize = Math.round(size.width * (isStory ? 0.07 : 0.055));
  const lineH   = fontSize * 1.25;
  const y       = isStory ? size.height * 0.62 : size.height * 0.62;

  ctx.font      = `bold ${fontSize}px Arial`;
  ctx.fillStyle = COLORS.white;

  // Word wrap
  const words = headline.split(' ');
  const lines  = [];
  let line     = '';

  words.forEach(word => {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);

  // Max 3 lines
  const displayLines = lines.slice(0, 3);
  if (lines.length > 3) displayLines[2] = displayLines[2].replace(/\s+\S+$/, '...');

  displayLines.forEach((l, i) => {
    ctx.fillText(l, x, y + i * lineH);
  });
}

function drawExcerpt(ctx, size, excerpt) {
  if (!excerpt) return;
  const x       = size.width * 0.06;
  const y       = size.height * 0.76;
  const fontSize = Math.round(size.width * 0.028);
  const maxW    = size.width * 0.88;

  ctx.font      = `${fontSize}px Arial`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';

  // Truncate if too long
  let text = excerpt;
  while (ctx.measureText(text).width > maxW && text.length > 20) {
    text = text.slice(0, -4) + '...';
  }
  ctx.fillText(text, x, y);
}

function drawBottomBar(ctx, size, source, readTime, isStory) {
  const barH = size.height * 0.08;
  const y    = size.height - barH;

  // Dark bar background
  ctx.fillStyle = 'rgba(5,13,26,0.85)';
  ctx.fillRect(0, y, size.width, barH);

  // Top border yellow line
  ctx.fillStyle = COLORS.yellow;
  ctx.fillRect(0, y, size.width, 3);

  const fontSize = Math.round(size.width * 0.025);
  const textY    = y + barH * 0.65;

  // Source
  ctx.font      = `bold ${fontSize}px Arial`;
  ctx.fillStyle = COLORS.gray;
  ctx.fillText((source || 'Nexpulse').toUpperCase(), size.width * 0.06, textY);

  // Read time
  if (readTime) {
    ctx.font      = `${fontSize}px Arial`;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    const rtW = ctx.measureText(readTime).width;
    ctx.fillText(readTime, size.width - size.width * 0.06 - rtW, textY);
  }

  // nexpulse.com
  ctx.font      = `${Math.round(fontSize * 0.85)}px Arial`;
  ctx.fillStyle = 'rgba(255,208,0,0.5)';
  const url  = 'nexpulse-nine.vercel.app';
  const urlW = ctx.measureText(url).width;
  ctx.fillText(url, (size.width - urlW) / 2, textY);
}

function drawBreakingBadge(ctx, size) {
  const fontSize = Math.round(size.width * 0.022);
  const x = size.width * 0.06;
  const y = size.height * 0.55;

  ctx.fillStyle = COLORS.red;
  roundRect(ctx, x, y, fontSize * 7.5, fontSize * 1.8, 4);
  ctx.fillStyle = COLORS.white;
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillText('● BREAKING NEWS', x + fontSize * 0.5, y + fontSize * 1.25);
}

// ============================================================
// FETCH FREE UNSPLASH IMAGE
// ============================================================
async function fetchUnsplashImage(category, tags) {
  const key = process.env.UNSPLASH_ACCESS_KEY;

  // Query based on category
  const queries = {
    'World':         'world politics global',
    'Technology':    'technology computer digital',
    'Business':      'business finance market',
    'Sports':        'sports stadium athlete',
    'Science':       'science space universe',
    'Health':        'health medical doctor',
    'Gulf':          'dubai uae middle east',
    'Entertainment': 'entertainment cinema music',
  };

  const query = queries[category] || tags?.[0] || 'news global';

  if (key) {
    // Use Unsplash API if key available
    const res = await axios.get('https://api.unsplash.com/photos/random', {
      params: { query, orientation: 'landscape', content_filter: 'high' },
      headers: { Authorization: `Client-ID ${key}` },
      timeout: 8000,
    });
    return res.data.urls.regular;
  } else {
    // Fallback: Unsplash Source (no key needed, free)
    return `https://source.unsplash.com/1200x800/?${encodeURIComponent(query)}`;
  }
}

// ============================================================
// HELPER: ROUNDED RECTANGLE
// ============================================================
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

module.exports = { generateArticleImages };
