/**
 * Shared types for the Recipe Box share Worker.
 */

export interface Env {
  SHARES: KVNamespace
  MAX_HTML_BYTES: string
}

/** Allowed expiry windows, enforced server-side regardless of client input. */
export const ALLOWED_EXPIRY_DAYS = [7, 30, 90] as const
export type ExpiryDays = (typeof ALLOWED_EXPIRY_DAYS)[number]

export interface CreateShareRequest {
  userShortId: string
  name: string
  html: string
  expiresInDays: number
}

export interface CreateShareResponse {
  recipeSlug: string
  token: string
  url: string
  expiresAt: string
}

export interface DeleteShareRequest {
  token: string
}

/**
 * What's actually stored in KV under "{userShortId}/{recipeSlug}".
 * The delete token lives alongside the HTML so a single KV read can
 * both serve the page and validate a delete request without a second
 * lookup.
 */
export interface StoredShare {
  html: string
  token: string
  createdAt: string
  expiresAt: string
}
