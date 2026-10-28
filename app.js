const express = require('express');
const fs = require('fs');
const path = require('path');
const materials = require('./materials.json');

const app = express();
const PUBLIC_DIR = path.join(__dirname, 'public');

app.disable('x-powered-by');

app.use(express.static(PUBLIC_DIR, {
  maxAge: '1h',
  setHeaders(res, file) {
    if (file.endsWith('.pdf')) res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'TKAORA', version: '2.5.0', author: 'HMMODZ' });
});

app.get('/api/materials', (req, res) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  const type = String(req.query.type || 'semua').toLowerCase();
  const list = materials
    .filter(m => (!q || `${m.title} ${m.kind} ${m.description}`.toLowerCase().includes(q)) &&
                 (type === 'semua' || m.kind.toLowerCase() === type))
    .map(m => ({
      ...m,
      hasPdf: Boolean(m.hasPdf) || fs.existsSync(path.join(PUBLIC_DIR, 'pdfs', `${m.id}.pdf`))
    }));
  res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.json({ total: list.length, materials: list });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => console.log(`TKAORA berjalan di http://localhost:${PORT}`));
}

module.exports = app;
