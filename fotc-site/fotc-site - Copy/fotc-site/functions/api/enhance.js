// Image Quality Increaser proxy, using the PicWish "Photo Enhancement" API.
// The key lives in the ENHANCER_API_KEY secret and is never sent to the browser.
// Docs: https://picwish.com/photo-enhancer-api-doc
const API = 'https://techhk.aoscdn.com/api/tasks/visual/scale';
const MAX_BYTES = 25 * 1024 * 1024;

const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function onRequestPost({ request, env }) {
  if (!env.ENHANCER_API_KEY) return reply({ error: 'The image enhancer is not set up on this site.' }, 503);

  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return reply({ error: 'Not allowed.' }, 403);

  let form;
  try { form = await request.formData(); } catch { return reply({ error: 'Send the image as form data.' }, 400); }
  const file = form.get('image');
  if (!file || typeof file === 'string') return reply({ error: 'No image was sent.' }, 400);
  if (!file.type.startsWith('image/')) return reply({ error: 'Please send an image file.' }, 400);
  if (file.size > MAX_BYTES) return reply({ error: 'The image is larger than 25 MB.' }, 413);

  // PicWish supports 2x and 4x, so 3x is sent as 4x.
  const scale = (parseInt(form.get('scale'), 10) || 2) >= 3 ? 4 : 2;

  const out = new FormData();
  out.append('image_file', file, file.name || 'image.png');
  out.append('sync', '1');
  out.append('type', env.ENHANCER_TYPE === 'face' ? 'face' : 'clean'); // set ENHANCER_TYPE=face for portraits
  out.append('scale_factor', String(scale));

  const headers = { 'X-API-KEY': env.ENHANCER_API_KEY };
  let r;
  try { r = await fetch(API, { method: 'POST', headers, body: out }); }
  catch { return reply({ error: 'Could not reach the enhancement service.' }, 502); }

  let j;
  try { j = await r.json(); } catch { return reply({ error: 'Unexpected answer from the enhancement service.' }, 502); }
  if (!r.ok || (j.status && j.status !== 200)) {
    const code = j.status || r.status;
    const msg = 'PicWish said: ' + (typeof j.message === 'string' && j.message !== 'success' ? j.message : 'the image could not be processed') + ' (code ' + code + ').';
    return reply({ error: msg }, r.status === 429 ? 429 : 502);
  }

  let data = j.data || {};
  // If the service answered with a task instead of a finished image, wait for it (up to about 40 seconds).
  for (let i = 0; i < 40 && !data.image && data.task_id; i++) {
    await sleep(1000);
    let q;
    try { q = await (await fetch(API + '/' + encodeURIComponent(data.task_id), { headers })).json(); } catch { continue; }
    data = q.data || data;
    if (data.state < 0) return reply({ error: 'PicWish could not process this image (task failed).' }, 502);
  }

  if (typeof data.image !== 'string' || !data.image.startsWith('https://')) {
    return reply({ error: 'The enhancement service did not return an image in time.' }, 502);
  }
  const img = await fetch(data.image);
  if (!img.ok) return reply({ error: 'Could not download the enhanced image.' }, 502);
  return new Response(img.body, {
    headers: { 'content-type': img.headers.get('content-type') || 'image/png', 'cache-control': 'no-store' },
  });
}
