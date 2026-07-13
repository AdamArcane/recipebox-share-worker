/**
 * POST /share
 *
 * Validates the request, slugifies the recipe name, resolves any slug
 * collision within the user's namespace, stores the HTML in KV, and
 * returns the public URL plus the secret delete token.
 */

import { getShare, putShare } from '../kv'
import { randomSuffix, slugify } from '../slugify'
import { generateToken } from '../tokens'
import { ALLOWED_EXPIRY_DAYS, type CreateShareRequest, type CreateShareResponse, type Env } from '../types'

const MAX_COLLISION_ATTEMPTS = 5

function isValidExpiry(value: unknown): value is (typeof ALLOWED_EXPIRY_DAYS)[number] {
  return typeof value === 'number' && (ALLOWED_EXPIRY_DAYS as readonly number[]).includes(value)
}

export async function handleCreateShare(request: Request, env: Env): Promise<Response> {
  let body: CreateShareRequest
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { userShortId, name, html, expiresInDays } = body

  if (typeof userShortId !== 'string' || userShortId.length === 0) {
    return Response.json({ error: 'userShortId is required' }, { status: 400 })
  }
  if (typeof name !== 'string' || name.trim().length === 0) {
    return Response.json({ error: 'name is required' }, { status: 400 })
  }
  if (typeof html !== 'string' || html.length === 0) {
    return Response.json({ error: 'html is required' }, { status: 400 })
  }
  if (!isValidExpiry(expiresInDays)) {
    return Response.json(
      { error: `expiresInDays must be one of ${ALLOWED_EXPIRY_DAYS.join(', ')}` },
      { status: 400 }
    )
  }

  const maxBytes = Number(env.MAX_HTML_BYTES)
  if (new TextEncoder().encode(html).length > maxBytes) {
    return Response.json({ error: 'html payload too large' }, { status: 413 })
  }

  const baseSlug = slugify(name)
  let recipeSlug = baseSlug
  let attempts = 0

  // Collision is scoped to this user's namespace only, so this loop
  // never needs to consider any other user's slugs.
  while ((await getShare(env, userShortId, recipeSlug)) !== null) {
    attempts += 1
    if (attempts > MAX_COLLISION_ATTEMPTS) {
      return Response.json({ error: 'Could not generate a unique slug, try again' }, { status: 500 })
    }
    recipeSlug = `${baseSlug}-${randomSuffix()}`
  }

  const token = generateToken()
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + expiresInDays * 24 * 60 * 60 * 1000)

  await putShare(
    env,
    userShortId,
    recipeSlug,
    {
      html,
      token,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    },
    expiresInDays
  )

  const url = new URL(request.url)
  const response: CreateShareResponse = {
    recipeSlug,
    token,
    url: `${url.origin}/${userShortId}/${recipeSlug}`,
    expiresAt: expiresAt.toISOString(),
  }

  return Response.json(response, { status: 201 })
}
