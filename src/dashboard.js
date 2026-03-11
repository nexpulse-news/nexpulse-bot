// ============================================================
// NEXPULSE DASHBOARD
// Your 5-10 min/day control panel at localhost:3000
// Review flagged articles, approve, reject, see stats
// ============================================================

const express = require('express');
const cors    = require('cors');
const db      = require('./database/connect');
const logger  = require('./utils/logger');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// DASHBOARD HTML — Served at localhost:3000
// ============================================================
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nexpulse Dashboard</title>
<style>
  :root {
    --navy: #050D1A; --blue: #0A1628; --yellow: #FFD000;
    --red: #CC0000; --green: #2DC653; --white: #fff;
    --gray: #8892A4; --border: rgba(255,255,255,0.07);
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background: var(--navy); color: var(--white); font-family: 'Segoe UI', system-ui, sans-serif; }

  .topbar {
    background: var(--blue);
    border-bottom: 3px solid var(--yellow);
    padding: 16px 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .logo { font-size: 22px; font-weight: 900; letter-spacing: 3px; }
  .logo span { color: var(--yellow); }
  .live { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--green); }
  .live-dot { width: 8px; height: 8px; background: var(--green); border-radius: 50%; animation: blink 1s infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

  .container { max-width: 1200px; margin: 0 auto; padding: 28px 32px; }

  /* Stats */
  .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 32px; }
  .stat { background: var(--blue); border-radius: 8px; padding: 20px; border: 1px solid var(--border); text-align: center; }
  .stat-num { font-size: 36px; font-weight: 900; line-height: 1; margin-bottom: 6px; }
  .stat-label { font-size: 11px; letter-spacing: 2px; color: var(--gray); text-transform: uppercase; }
  .yellow { color: var(--yellow); }
  .green  { color: var(--green); }
  .red    { color: var(--red); }
  .orange { color: #FF8C00; }

  /* Section */
  .section-title {
    font-size: 14px; letter-spacing: 3px; text-transform: uppercase;
    color: var(--gray); margin-bottom: 16px;
    display: flex; align-items: center; gap: 10px;
  }
  .badge { background: var(--red); color: white; font-size: 11px; padding: 2px 8px; border-radius: 10px; }

  /* Articles */
  .article-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 40px; }

  .article-card {
    background: var(--blue);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 18px 20px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 16px;
    align-items: start;
  }
  .article-card.flagged { border-left: 3px solid #FF8C00; }
  .article-card.approved { border-left: 3px solid var(--green); opacity: 0.6; }

  .article-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .article-cat  { background: rgba(255,208,0,0.1); color: var(--yellow); font-size: 10px; letter-spacing: 2px; padding: 2px 10px; border-radius: 3px; text-transform: uppercase; }
  .article-source { font-size: 11px; color: var(--gray); }
  .article-conf { font-size: 11px; color: var(--gray); }
  .article-conf.high { color: var(--green); }
  .article-conf.mid  { color: #FF8C00; }

  .article-headline { font-size: 15px; font-weight: 700; line-height: 1.4; margin-bottom: 8px; }
  .article-excerpt  { font-size: 13px; color: var(--gray); line-height: 1.5; }

  .article-actions { display: flex; flex-direction: column; gap: 8px; }
  .btn {
    padding: 8px 18px; border-radius: 5px; border: none; cursor: pointer;
    font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
    transition: all 0.2s; white-space: nowrap;
  }
  .btn-approve { background: var(--green);  color: #000; }
  .btn-approve:hover { filter: brightness(1.1); }
  .btn-reject  { background: rgba(204,0,0,0.2); color: var(--red); border: 1px solid rgba(204,0,0,0.3); }
  .btn-reject:hover  { background: rgba(204,0,0,0.35); }
  .btn-view    { background: rgba(255,255,255,0.05); color: var(--gray); border: 1px solid var(--border); }
  .btn-view:hover    { background: rgba(255,255,255,0.1); }

  .empty { text-align: center; padding: 40px; color: var(--gray); font-size: 14px; }

  /* Toast */
  .toast {
    position: fixed; bottom: 24px; right: 24px;
    background: var(--green); color: #000;
    padding: 12px 20px; border-radius: 6px;
    font-weight: 700; font-size: 13px;
    display: none; z-index: 999;
    animation: slideIn 0.3s ease;
  }
  @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

  .refresh-btn {
    background: transparent; border: 1px solid var(--border);
    color: var(--gray); padding: 6px 14px; border-radius: 4px;
    font-size: 11px; letter-spacing: 1px; cursor: pointer;
    transition: all 0.2s;
  }
  .refresh-btn:hover { border-color: var(--yellow); color: var(--yellow); }
</style>
</head>
<body>

<div class="topbar">
  <div class="logo">NEX<span>PULSE</span> DASHBOARD</div>
  <div style="display:flex;align-items:center;gap:20px">
    <div class="live"><div class="live-dot"></div> BOT RUNNING LIVE</div>
    <button class="refresh-btn" onclick="location.reload()">Refresh</button>
  </div>
</div>

<div class="container">

  <!-- STATS -->
  <div class="stats" id="stats">
    <div class="stat"><div class="stat-num yellow" id="stat-today">-</div><div class="stat-label">Today</div></div>
    <div class="stat"><div class="stat-num green"  id="stat-approved">-</div><div class="stat-label">Approved</div></div>
    <div class="stat"><div class="stat-num orange" id="stat-flagged">-</div><div class="stat-label">Flagged</div></div>
    <div class="stat"><div class="stat-num"        id="stat-posted">-</div><div class="stat-label">Posted</div></div>
    <div class="stat"><div class="stat-num"        id="stat-total">-</div><div class="stat-label">Total DB</div></div>
  </div>

  <!-- FLAGGED: Needs Your Review -->
  <div class="section-title">
    Needs Your Review
    <span class="badge" id="flagged-badge">0</span>
  </div>
  <div class="article-list" id="flagged-list">
    <div class="empty">Loading...</div>
  </div>

  <!-- RECENT AUTO-APPROVED -->
  <div class="section-title">Auto-Approved Today</div>
  <div class="article-list" id="approved-list">
    <div class="empty">Loading...</div>
  </div>

</div>

<div class="toast" id="toast"></div>

<script>
// ============================================================
// DASHBOARD JS
// ============================================================

async function loadStats() {
  const res  = await fetch('/api/stats');
  const data = await res.json();
  document.getElementById('stat-today').textContent    = data.today    || 0;
  document.getElementById('stat-approved').textContent = data.approved || 0;
  document.getElementById('stat-flagged').textContent  = data.flagged  || 0;
  document.getElementById('stat-posted').textContent   = data.posted   || 0;
  document.getElementById('stat-total').textContent    = data.total    || 0;
  document.getElementById('flagged-badge').textContent = data.flagged  || 0;
}

async function loadFlagged() {
  const res   = await fetch('/api/articles?status=flagged');
  const items = await res.json();
  renderArticles('flagged-list', items, true);
}

async function loadApproved() {
  const res   = await fetch('/api/articles?status=approved&limit=10');
  const items = await res.json();
  renderArticles('approved-list', items, false);
}

function renderArticles(containerId, items, showActions) {
  const container = document.getElementById(containerId);
  if (!items.length) {
    container.innerHTML = '<div class="empty">Nothing here right now</div>';
    return;
  }
  container.innerHTML = items.map(a => \`
    <div class="article-card \${a.status}" id="card-\${a._id}">
      <div>
        <div class="article-meta">
          <span class="article-cat">\${a.category}</span>
          <span class="article-source">\${a.source}</span>
          <span class="article-conf \${a.confidence >= 85 ? 'high' : 'mid'}">\${a.confidence}% confidence</span>
          <span class="article-source">\${a.readTime || ''}</span>
        </div>
        <div class="article-headline">\${a.headline}</div>
        <div class="article-excerpt">\${a.excerpt || ''}</div>
      </div>
      \${showActions ? \`
      <div class="article-actions">
        <button class="btn btn-approve" onclick="approve('\${a._id}')">Approve</button>
        <button class="btn btn-reject"  onclick="reject('\${a._id}')">Reject</button>
        <button class="btn btn-view"    onclick="window.open('\${a.sourceUrl}','_blank')">Source</button>
      </div>\` : \`
      <div class="article-actions">
        <button class="btn btn-view" onclick="window.open('\${a.sourceUrl}','_blank')">Source</button>
      </div>\`}
    </div>
  \`).join('');
}

async function approve(id) {
  await fetch(\`/api/articles/\${id}/approve\`, { method: 'POST' });
  document.getElementById(\`card-\${id}\`).remove();
  showToast('Approved!');
  loadStats();
}

async function reject(id) {
  await fetch(\`/api/articles/\${id}/reject\`, { method: 'POST' });
  document.getElementById(\`card-\${id}\`).remove();
  showToast('Rejected');
  loadStats();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 2500);
}

// Init
loadStats();
loadFlagged();
loadApproved();

// Auto-refresh every 2 minutes
setInterval(() => { loadStats(); loadFlagged(); loadApproved(); }, 120000);
</script>
</body>
</html>`);
});

// ============================================================
// API ROUTES
// ============================================================

// GET stats
app.get('/api/stats', async (req, res) => {
  try {
    const today = new Date(new Date().setHours(0,0,0,0));
    res.json({
      today:    await db.Article.countDocuments({ createdAt: { $gte: today } }),
      approved: await db.Article.countDocuments({ status: 'approved', createdAt: { $gte: today } }),
      flagged:  await db.Article.countDocuments({ status: 'flagged' }),
      posted:   await db.Article.countDocuments({ postedTwitter: true, postedAt: { $gte: today } }),
      total:    await db.Article.countDocuments(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET articles by status
app.get('/api/articles', async (req, res) => {
  try {
    const { status, limit } = req.query;
    const articles = await db.Article
      .find(status ? { status } : {})
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 20)
      .select('headline excerpt category source confidence readTime sourceUrl status postedTwitter createdAt _id');
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST approve
app.post('/api/articles/:id/approve', async (req, res) => {
  try {
    await db.Article.findByIdAndUpdate(req.params.id, { status: 'approved' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST reject
app.post('/api/articles/:id/reject', async (req, res) => {
  try {
    await db.Article.findByIdAndUpdate(req.params.id, { status: 'rejected' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// START SERVER
// ============================================================
function start() {
  const port = process.env.DASHBOARD_PORT || 3000;
  app.listen(port, () => {
    logger.info(`📊 Dashboard live at http://localhost:${port}`);
  });
}

module.exports = { start };
