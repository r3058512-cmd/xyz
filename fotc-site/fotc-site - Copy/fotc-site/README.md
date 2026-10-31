# Free Online Tools Converter Website

A static website plus three small server functions. The functions keep your API keys on the server,
so visitors never see them in the page.

```
index.html                  the website
functions/api/health.js     tells the page which AI options are set up
functions/api/remove-bg.js  Image Background Remover (remove.bg)
functions/api/enhance.js    Image Quality Increaser (service set by environment variables)
.dev.vars                   your keys for local testing (never uploaded, ignored by git)
```

## Run it on your computer

```
npx wrangler pages dev .
```

Open the address it prints. The two AI checkboxes appear in the tools once the keys are found.

## Put it online (Cloudflare Pages, free)

```
npx wrangler login
npx wrangler pages deploy . --project-name free-online-tools
npx wrangler pages secret put REMOVEBG_API_KEY --project-name free-online-tools
npx wrangler pages secret put ENHANCER_API_KEY --project-name free-online-tools
npx wrangler pages secret put ENHANCER_URL --project-name free-online-tools
```

Paste each key or address when asked. `.dev.vars` is only for testing on your computer, so the secrets
must be set with these commands (or in the Cloudflare dashboard under Settings, Variables and Secrets).

## Background remover

The key format matches remove.bg, and `functions/api/remove-bg.js` calls their API. If the key belongs to
a different service, tell me and I will change that one file. remove.bg free keys return smaller
preview-size cutouts; paid credits return full size.

## Image enhancer: one thing is still needed

I could not tell which service the enhancer key belongs to, and each service uses a different address and
request format, so `ENHANCER_URL` is empty. Until it is set, the enhancer's AI option stays hidden and the
browser-only method is used. Set these variables (names in `.dev.vars`):

| Variable | Meaning | Default |
| --- | --- | --- |
| `ENHANCER_URL` | The service's upscale endpoint | none |
| `ENHANCER_AUTH_HEADER` | Header that carries the key | `X-API-Key` |
| `ENHANCER_AUTH_PREFIX` | Text before the key, for example `Bearer ` | empty |
| `ENHANCER_FILE_FIELD` | Form field for the image | `image` |
| `ENHANCER_SCALE_FIELD` | Form field for 2, 3 or 4 | `scale` |
| `ENHANCER_RESPONSE_URL_PATH` | If the service replies with JSON, the path to the result link, for example `data.url` | empty |

This works for services that accept a multipart image upload and reply with an image or a JSON link.
Services that need several steps (upload, wait, then fetch) need a custom function instead.

## Safety notes

- Rotate both keys, because they were pasted in a chat.
- Each AI request costs credits. Anyone who opens your site can use them. Set a spending limit at the
  provider, and consider Cloudflare rate limiting on `/api/*`.
- Images are limited to 10 MB on the server.
