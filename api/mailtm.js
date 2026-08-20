export const config = {
  runtime: 'edge',
};

export default async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, authorization, accept',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const p = url.searchParams.get('p') || '';
  if (!p || p[0] !== '/') {
    return new Response(JSON.stringify({ error: 'p parametresi gerekli (örn. ?p=/domains)' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
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

  try {
    console.log('Fetching upstream:', upstream);
    const upstreamResp = await fetch(upstream, {
      method: req.method,
      headers,
      body: body || undefined,
    });
    console.log('Upstream status:', upstreamResp.status);

    const text = await upstreamResp.text().catch(() => '');
    console.log('Upstream text length:', text.length);

    const responseHeaders = new Headers(corsHeaders);
    const contentType = upstreamResp.headers.get('content-type') || 'application/json; charset=utf-8';
    responseHeaders.set('Content-Type', contentType);

    return new Response(text, {
      status: upstreamResp.status,
      headers: responseHeaders,
    });
  } catch (e) {
    console.error('mailtm proxy error:', e, 'stack:', e.stack);
    return new Response(JSON.stringify({ error: 'upstream: ' + (e && e.message ? e.message : String(e)) }), {
      status: 502,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }
};