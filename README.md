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

## Quick start

Everything below gets you from a fresh clone to a live URL you can
paste into Recipe Box's `shareServerUrl` setting.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your KV namespace

```bash
cp wrangler.toml.sample wrangler.toml
npx wrangler kv:namespace create SHARES
npx wrangler kv:namespace create SHARES --preview
```

Each command prints an `id`. Paste them into your local `wrangler.toml`
(it's gitignored, your ids never get committed):

```toml
[[kv_namespaces]]
binding = "SHARES"
id = "paste-the-first-id-here"
preview_id = "paste-the-preview-id-here"
```

### 3. Run it locally (optional, for testing)

```bash
npm run dev
```

Starts a local dev server and prints a `localhost` URL you can hit with
curl to sanity-check the three endpoints before deploying anywhere
public.

### 4. Authenticate with Cloudflare

```bash
npx wrangler login
```

Opens a browser to authorize this machine against your Cloudflare
account. Requires a free Cloudflare account if you don't already have
one.

### 5. Deploy

```bash
npm run deploy
```

This publishes the Worker and prints a live URL on Cloudflare's free
default subdomain:

```
https://recipebox-share-worker.<your-subaccount>.workers.dev
```

**This URL works immediately** — no domain purchase needed. Paste it
into Recipe Box's `shareServerUrl` setting and sharing is fully
functional at this point. Everything below is optional polish.

### 6. (Optional) Attach a custom domain

Only needed if you want share links to read
`recipes.yourdomain.com/abc123/banana-bread` instead of the
`workers.dev` URL. Purely cosmetic, has no effect on functionality.

1. Own a domain (buy one via Cloudflare Registrar, Namecheap, or
   anywhere else).
2. That domain's DNS must be managed by Cloudflare. If it's registered
   elsewhere, add it as a "site" in the Cloudflare dashboard and update
   your registrar's nameservers to point to Cloudflare. This is a
   one-time change; propagation can take minutes to a few hours.
3. In the Cloudflare dashboard: **Workers & Pages → this worker →
   Settings → Domains & Routes → Add Custom Domain.** Pick a subdomain
   (e.g. `share.yourdomain.com`). Cloudflare handles routing and the
   TLS certificate automatically.
4. Update `shareServerUrl` in Recipe Box's settings to the new domain.

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
