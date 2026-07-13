/**
 * Generates the secret delete token. This is a capability token, not a
 * lookup key: it's only ever compared against the value stored
 * alongside a share's HTML, and it's never derivable from the
 * userShortId or recipeSlug.
 */
export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
