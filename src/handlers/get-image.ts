/**
 * GET /:userShortId/:recipeSlug/image
 *
 * Returns the stored image bytes with their original Content-Type.
 * Same expiry semantics as the HTML share: KV TTL handles deletion
 * automatically, an expired or absent key is a 404.
 */

import { getImage } from '../kv'
import type { Env } from '../types'

export async function handleGetImage(
  env: Env,
  userShortId: string,
  recipeSlug: string
): Promise<Response> {
  const image = await getImage(env, userShortId, recipeSlug)
  if (!image) {
    return new Response('Not found or expired', { status: 404 })
  }
  return new Response(image.bytes, {
    status: 200,
    headers: {
      'Content-Type': image.contentType,
      // Shared recipe images don't change after publication, so a day of
      // browser caching is safe and saves redundant KV reads.
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
