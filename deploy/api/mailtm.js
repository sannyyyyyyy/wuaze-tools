module.exports = async (req, res) => {
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

  try {
    const upstreamResp = await fetch(upstream, {
      method: req.method,
      headers,
      body: body || undefined,
    });

    const text = await upstreamResp.text().catch(() => '');
    const ct = upstreamResp.headers.get('content-type') || 'application/json; charset=utf-8';
    res.status(upstreamResp.status);
    res.setHeader('Content-Type', ct);
    res.send(text);
  } catch (e) {
    console.error('mailtm proxy error:', e);
    res.status(502).json({ error: 'upstream: ' + (e && e.message ? e.message : String(e)) });
  }
};