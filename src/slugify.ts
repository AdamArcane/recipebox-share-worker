/**
 * Turns a user-supplied recipe name into a URL-safe slug, and resolves
 * collisions within a single user's namespace by appending a short
 * random suffix (e.g. "banana-bread" -> "banana-bread-x7q2").
 *
 * Collisions are scoped per userShortId, not global, so this never
 * needs to check slugs belonging to other users.
 */

const MAX_SLUG_LENGTH = 60

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/g, '')

  // Fall back to a generic name if the input slugifies to nothing
  // (e.g. a name that's only emoji or punctuation).
  return slug.length > 0 ? slug : 'recipe'
}

/** Short random suffix used to resolve a slug collision. Not a secret. */
export function randomSuffix(length = 4): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  for (const byte of bytes) {
    result += alphabet[byte % alphabet.length]
  }
  return result
}
