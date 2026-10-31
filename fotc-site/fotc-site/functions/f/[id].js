// Serves a file that was uploaded for a QR code: /f/<id>
const PAGE = (msg) => new Response(
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>File not found</title>' +
  '<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;text-align:center;color:#14142b">' +
  '<h1 style="font-size:1.4rem">' + msg + '</h1><p>QR links on this site expire after the time the creator chose. Ask the sender for a fresh QR code.</p></body>',
  { status: 404, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } }
);

export async function onRequest({ request, env, params }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  const id = String(params.id || '');
  if (!env.FILES || !/^[a-z0-9]{12}$/.test(id)) return PAGE('This file does not exist');
  const hit = await env.FILES.getWithMetadata(id, { type: 'arrayBuffer' });
  if (!hit || !hit.value) return PAGE('This file has expired or does not exist');

  const meta = hit.metadata || {};
  const type = meta.type || 'application/octet-stream';
  const total = hit.value.byteLength;
  const h = new Headers({
    'content-type': type,
    'accept-ranges': 'bytes',
    'cache-control': 'public, max-age=3600',
    'x-content-type-options': 'nosniff',
    'cross-origin-resource-policy': 'cross-origin',
    'referrer-policy': 'no-referrer',
    'content-disposition': "inline; filename*=UTF-8''" + encodeURIComponent(meta.name || 'file'),
  });
  // Text and images get a locked-down policy; PDF/video/audio need the browser's own viewers.
  if (/^(text|image)\//.test(type)) h.set('content-security-policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");

  let start = 0, end = total - 1, status = 200;
  const range = request.headers.get('range');
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (m && (m[1] || m[2])) {
    if (m[1] === '') { start = Math.max(0, total - Number(m[2])); }
    else { start = Number(m[1]); if (m[2] !== '') end = Math.min(end, Number(m[2])); }
    if (start > end || start >= total) {
      h.set('content-range', 'bytes */' + total);
      return new Response(null, { status: 416, headers: h });
    }
    status = 206;
    h.set('content-range', 'bytes ' + start + '-' + end + '/' + total);
  }
  h.set('content-length', String(end - start + 1));
  const body = request.method === 'HEAD' ? null : hit.value.slice(start, end + 1);
  return new Response(body, { status, headers: h });
}
