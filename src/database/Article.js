const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  headline: { type: String, required: true },
  excerpt: String,
  content: String,
  category: { type: String, default: 'World' },
  confidence: { type: Number, default: 0 },
  sourceUrl: { type: String, unique: true },
  sourceName: String,
  imageUrl: String,
  twitterPost: String,
  status: { type: String, enum: ['approved', 'flagged', 'rejected'], default: 'flagged' },
  posted: { type: Boolean, default: false },
  postedAt: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Article || mongoose.model('Article', ArticleSchema);