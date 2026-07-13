/**
 * DELETE /:userShortId/:recipeSlug
 *
 * Requires the secret delete token issued at creation time. There's no
 * account/ownership check beyond the token, by design, v1 has no
 * accounts, so token possession is the only proof of ownership.
 */

import { deleteShare, getShare } from '../kv'
import type { DeleteShareRequest, Env } from '../types'

export async function handleDeleteShare(
  request: Request,
  env: Env,
  userShortId: string,
  recipeSlug: string
): Promise<Response> {
  let body: DeleteShareRequest
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.token !== 'string' || body.token.length === 0) {
    return Response.json({ error: 'token is required' }, { status: 400 })
  }

  const share = await getShare(env, userShortId, recipeSlug)
  if (!share) {
    return new Response(null, { status: 404 })
  }

  if (share.token !== body.token) {
    return new Response(null, { status: 403 })
  }

  await deleteShare(env, userShortId, recipeSlug)
  return new Response(null, { status: 204 })
}
