# recipebox-share-worker

Cloudflare Worker backend for [Recipe Box](https://github.com/AdamArcane/recipe-box)'s
recipe sharing feature.

This is **operated as a hosted service** by the Recipe Box author, not
distributed as end-user software. It has no shared code with the
Recipe Box plugin, only an HTTP API contract.

This repo is public for transparency, so anyone can see exactly what
happens to a recipe's data when it's shared. Self-hosting your own
instance is possible if you're comfortable with Cloudflare Workers and
KV, but **it isn't officially supported**. Issues specific to a
self-hosted deployment (your own Cloudflare account, your own KV
namespace, your own DNS) may not get attention, this repo exists to be
readable and forkable, not to be a supported multi-tenant product.

Licensed under MIT, see `LICENSE`.

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
cp wrangler.toml.sample wrangler.toml
wrangler kv:namespace create SHARES
wrangler kv:namespace create SHARES --preview
# paste both returned ids into your local wrangler.toml (it's gitignored,
# your ids never get committed)
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
- `wrangler.toml` is gitignored on purpose, it holds a real KV
  namespace id once configured. Use `wrangler.toml.sample` as the
  template.
