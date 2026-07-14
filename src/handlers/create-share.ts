/**
 * POST /share
 *
 * Validates the request, slugifies the recipe name, resolves any slug
 * collision within the user's namespace, stores the HTML in KV, and
 * returns the public URL plus the secret delete token.
 */

import { getShare, putShare, putImage } from '../kv'
import { randomSuffix, slugify } from '../slugify'
import { generateToken } from '../tokens'
import { ALLOWED_EXPIRY_DAYS, type CreateShareRequest, type CreateShareResponse, type Env } from '../types'

const MAX_COLLISION_ATTEMPTS = 5
const DEFAULT_MAX_IMAGE_BYTES = 500 * 1024
const IMAGE_PLACEHOLDER = '__RB_IMAGE_URL__'

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

  const { userShortId, name, html, expiresInDays, imageBase64, imageContentType } = body

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

  const requestUrl = new URL(request.url)
  const shareOrigin = requestUrl.origin

  // If the plugin sent image bytes, store them at a separate KV key and
  // replace the placeholder in the HTML with the real public URL. Both keys
  // use the same TTL so they expire together, and DELETE removes both.
  let resolvedHtml = html
  if (imageBase64 && typeof imageBase64 === 'string') {
    const maxImageBytes = Number(env.MAX_IMAGE_BYTES) || DEFAULT_MAX_IMAGE_BYTES
    // atob is available in the Workers runtime.
    let imageBytes: Uint8Array
    try {
      const binary = atob(imageBase64)
      imageBytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) imageBytes[i] = binary.charCodeAt(i)
    } catch {
      return Response.json({ error: 'imageBase64 is not valid base64' }, { status: 400 })
    }
    if (imageBytes.byteLength > maxImageBytes) {
      return Response.json({ error: 'image payload too large' }, { status: 413 })
    }
    const contentType = (typeof imageContentType === 'string' && imageContentType) ? imageContentType : 'image/jpeg'
    await putImage(env, userShortId, recipeSlug, imageBytes, contentType, expiresInDays)
    const imageUrl = `${shareOrigin}/${userShortId}/${recipeSlug}/image`
    resolvedHtml = html.split(IMAGE_PLACEHOLDER).join(imageUrl)
  }

  await putShare(
    env,
    userShortId,
    recipeSlug,
    {
      html: resolvedHtml,
      token,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    },
    expiresInDays
  )

  const response: CreateShareResponse = {
    recipeSlug,
    token,
    url: `${shareOrigin}/${userShortId}/${recipeSlug}`,
    expiresAt: expiresAt.toISOString(),
  }

  return Response.json(response, { status: 201 })
}
