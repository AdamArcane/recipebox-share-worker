/**
 * Thin wrapper around the SHARES KV namespace. Two key patterns:
 *   "{userShortId}/{recipeSlug}"        -- JSON-encoded StoredShare (HTML + token + timestamps)
 *   "{userShortId}/{recipeSlug}/image"  -- raw image bytes (KV metadata carries Content-Type)
 *
 * Both keys for a given share always use the same TTL so they expire together.
 */

import type { Env, StoredShare } from './types'

export function shareKey(userShortId: string, recipeSlug: string): string {
  return `${userShortId}/${recipeSlug}`
}

export function imageKey(userShortId: string, recipeSlug: string): string {
  return `${userShortId}/${recipeSlug}/image`
}

export async function getShare(
  env: Env,
  userShortId: string,
  recipeSlug: string
): Promise<StoredShare | null> {
  const raw = await env.SHARES.get(shareKey(userShortId, recipeSlug))
  if (!raw) return null
  return JSON.parse(raw) as StoredShare
}

export async function putShare(
  env: Env,
  userShortId: string,
  recipeSlug: string,
  share: StoredShare,
  expiresInDays: number
): Promise<void> {
  // KV's built-in TTL is the source of truth for expiry, not
  // expiresAt in the stored value alone. If TTL expiry and the
  // expiresAt field ever disagree, KV's automatic deletion wins,
  // the stored field is only there for the response payload and
  // any future "time remaining" display.
  const expirationTtl = expiresInDays * 24 * 60 * 60
  await env.SHARES.put(shareKey(userShortId, recipeSlug), JSON.stringify(share), {
    expirationTtl,
  })
}

export async function deleteShare(
  env: Env,
  userShortId: string,
  recipeSlug: string
): Promise<void> {
  await env.SHARES.delete(shareKey(userShortId, recipeSlug))
}

export async function getImage(
  env: Env,
  userShortId: string,
  recipeSlug: string
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const { value, metadata } = await env.SHARES.getWithMetadata<{ contentType: string }>(
    imageKey(userShortId, recipeSlug),
    'arrayBuffer'
  )
  if (!value) return null
  return { bytes: value, contentType: metadata?.contentType ?? 'application/octet-stream' }
}

export async function putImage(
  env: Env,
  userShortId: string,
  recipeSlug: string,
  bytes: Uint8Array,
  contentType: string,
  expiresInDays: number
): Promise<void> {
  const expirationTtl = expiresInDays * 24 * 60 * 60
  await env.SHARES.put(imageKey(userShortId, recipeSlug), bytes, {
    expirationTtl,
    metadata: { contentType },
  })
}

export async function deleteImage(
  env: Env,
  userShortId: string,
  recipeSlug: string
): Promise<void> {
  // Best-effort: if the share had no image the key simply won't exist.
  await env.SHARES.delete(imageKey(userShortId, recipeSlug))
}
