/* ============================================================
   Mail.tm Vekili — Vercel Serverless (proxy.php'nin Vercel karşılığı)
   ------------------------------------------------------------
   Tarayıcı CORS engeli nedeniyle api.mail.tm'ye doğrudan erişilemez.
   Bu fonksiyon, /api/mailtm?p=/domains şeklinde çağrılır ve
   SADECE api.mail.tm'ye vekillik eder.

   Kullanım: /api/mailtm?p=/domains
             /api/mailtm?p=/accounts        (POST)
             /api/mailtm?p=/token           (POST)
             /api/mailtm?p=/messages        (GET, Authorization)
             /api/mailtm?p=/messages/{id}   (GET, Authorization)
   ============================================================ */

module.exports = async (req, res) => {
  /* CORS preflight */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization, accept');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const p = (req.query && req.query.p) || '';
  if (!p || p[0] !== '/') {
    res.status(400).json({ error: 'p parametresi gerekli (örn. ?p=/domains)' });
    return;
  }

  const upstream = 'https://api.mail.tm' + p;

  /* üst servise iletilecek başlıklar (host/content-length/connection çıkarılır) */
  const headers = {};
  ['content-type', 'accept', 'authorization'].forEach((h) => {
    const v = req.headers && req.headers[h];
    if (v) headers[h] = v;
  });

  let body = null;
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    body = req.body || null;
    if (body && typeof body !== 'string') body = JSON.stringify(body);
  }

  let upstreamResp;
  try {
    upstreamResp = await fetch(upstream, {
      method: req.method,
      headers,
      body: body || undefined,
    });
  } catch (e) {
    res.status(502).json({ error: 'upstream: ' + (e && e.message) });
    return;
  }

  const text = await upstreamResp.text().catch(() => '');
  const ct = upstreamResp.headers.get('content-type') || 'application/json; charset=utf-8';
  res.status(upstreamResp.status);
  res.setHeader('Content-Type', ct);
  res.send(text);
};