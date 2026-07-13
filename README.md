# recipe-box-share-worker

Cloudflare Worker backend for [Recipe Box](https://github.com/AdamArcane/obsidian-recipebox)'s
recipe sharing feature.

This is **operated as a hosted service**, not distributed as end-user
software. It has no shared code with the Recipe Box plugin, only an
HTTP API contract. 

## What it does

Stores a static HTML page generated from a single shared recipe, keyed
by `{userShortId}/{recipeSlug}`, and serves it at a public read-only
URL until it expires (7/30/90 days, chosen at share time).

## Endpoints

- `POST /share` — create a share, returns `{ recipeSlug, token, url, expiresAt }`
- `GET /:userShortId/:recipeSlug` — public, serves the stored HTML
- `DELETE /:userShortId/:recipeSlug` — requires `{ token }` in the body

## Setup

```bash
npm install
wrangler kv:namespace create SHARES
# paste the returned id into wrangler.toml
npm run dev
```

## Deploy

```bash
npm run deploy
```

## Notes

- No accounts in v1. Ownership of a share is proven by possessing its
  delete token, nothing else.
- Expiry is enforced by KV's native TTL, not application logic.
- Rate limiting and payload size caps are enforced Worker-side
  (`MAX_HTML_BYTES` in `wrangler.toml`); add Cloudflare-native rate
  limiting rules on the routes at the dashboard/API level as well.
