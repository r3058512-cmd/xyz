// Tells the page which AI options are configured. It never returns the keys.
export async function onRequestGet({ env }) {
  return new Response(
    JSON.stringify({
      removeBg: Boolean(env.REMOVEBG_API_KEY),
      enhance: Boolean(env.ENHANCER_API_KEY),
    }),
    { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
  );
}
