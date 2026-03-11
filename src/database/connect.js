// ============================================================
// NEXPULSE DATABASE
// MongoDB Atlas — stores all articles, status, posting history
// ============================================================

const mongoose = require('mongoose');
const logger   = require('../utils/logger');

// ============================================================
// ARTICLE SCHEMA
// ============================================================
const articleSchema = new mongoose.Schema({
  // Source info
  sourceUrl:    { type: String, required: true, unique: true },
  sourceTitle:  { type: String },
  source:       { type: String },
  category:     { type: String, index: true },
  publishedAt:  { type: Date, default: Date.now },
  imageUrl:     { type: String },

  // AI-generated content
  headline:     { type: String, required: true },
  excerpt:      { type: String },
  body:         { type: String },
  keyPoints:    [{ type: String }],
  tweetText:    { type: String },
  tags:         [{ type: String }],
  readTime:     { type: String },
  slug:         { type: String, index: true },

  // Quality control
  confidence:   { type: Number, default: 0 },
  status:       { type: String, enum: ['pending', 'approved', 'flagged', 'rejected'], default: 'pending', index: true },
  autoApproved: { type: Boolean, default: false },
  reviewNote:   { type: String },

  // Posting status
  postedTwitter:  { type: Boolean, default: false, index: true },
  postedAt:       { type: Date },
  twitterPostId:  { type: String },

  // Timestamps
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Auto-update updatedAt on save
articleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Article = mongoose.model('Article', articleSchema);

// ============================================================
// CONNECT TO MONGODB
// ============================================================
async function connect() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not set in .env file');

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    logger.info('✅ MongoDB Atlas connected');
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    throw err;
  }
}

module.exports = { connect, Article };
