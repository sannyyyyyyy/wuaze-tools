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

const json = (obj, status) =>
  new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const handler = async (req) => {
  const url = new URL(req.url);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  const p = url.searchParams.get('p') || '';
  if (p === '' || p[0] !== '/') {
    return json({ error: 'p parametresi gerekli (örn. ?p=/domains)' }, 400);
  }

  const upstream = 'https://api.mail.tm' + p;

  const headers = {};
  ['content-type', 'accept', 'authorization'].forEach((h) => {
    const v = req.headers.get(h);
    if (v) headers[h] = v;
  });

  let body = null;
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    body = await req.text().catch(() => null);
  }

  let resp;
  try {
    resp = await fetch(upstream, { method: req.method, headers, body });
  } catch (e) {
    return json({ error: 'upstream: ' + (e && e.message) }, 502);
  }

  const text = await resp.text().catch(() => '');
  return new Response(text, {
    status: resp.status,
    headers: { 'content-type': resp.headers.get('content-type') || 'application/json; charset=utf-8' },
  });
};

module.exports = handler;
