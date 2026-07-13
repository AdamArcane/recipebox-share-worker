/**
 * GET /:userShortId/:recipeSlug
 *
 * Public, unauthenticated. Serves the stored HTML directly, or 404 if
 * missing/expired. KV's TTL handles actual expiry; this handler never
 * needs to check expiresAt itself, an expired key simply isn't there.
 */

import { getShare } from '../kv'
import type { Env } from '../types'

export async function handleGetShare(
  env: Env,
  userShortId: string,
  recipeSlug: string
): Promise<Response> {
  const share = await getShare(env, userShortId, recipeSlug)

  if (!share) {
    return new Response('Not found or expired', { status: 404 })
  }

  return new Response(share.html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
