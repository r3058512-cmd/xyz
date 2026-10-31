// Background remover proxy (remove.bg). The key lives in the REMOVEBG_API_KEY secret.
const MAX_BYTES = 10 * 1024 * 1024;

const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  if (!env.REMOVEBG_API_KEY) return reply({ error: 'The background remover is not set up on this site.' }, 503);

  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return reply({ error: 'Not allowed.' }, 403);

  let form;
  try { form = await request.formData(); } catch { return reply({ error: 'Send the image as form data.' }, 400); }
  const file = form.get('image');
  if (!file || typeof file === 'string') return reply({ error: 'No image was sent.' }, 400);
  if (!file.type.startsWith('image/')) return reply({ error: 'Please send an image file.' }, 400);
  if (file.size > MAX_BYTES) return reply({ error: 'The image is larger than 10 MB.' }, 413);

  const out = new FormData();
  out.append('image_file', file, file.name || 'image.png');
  out.append('size', 'auto');
  out.append('format', 'png');

  const r = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': env.REMOVEBG_API_KEY },
    body: out,
  });
  if (!r.ok) {
    let msg = 'The background service could not process this image.';
    try { const j = await r.json(); msg = (j.errors && j.errors[0] && j.errors[0].title) || msg; } catch {}
    return reply({ error: msg }, r.status === 402 ? 402 : 502);
  }
  return new Response(r.body, { headers: { 'content-type': 'image/png', 'cache-control': 'no-store' } });
}
