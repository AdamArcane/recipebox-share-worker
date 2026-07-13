/**
 * Thin wrapper around the SHARES KV namespace. Keys are always
 * "{userShortId}/{recipeSlug}" so a user's shares live in a natural
 * namespace without any cross-user coordination.
 */

import type { Env, StoredShare } from './types'

export function shareKey(userShortId: string, recipeSlug: string): string {
  return `${userShortId}/${recipeSlug}`
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
