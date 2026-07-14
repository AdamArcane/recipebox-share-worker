/**
 * Entry point and routing for the Recipe Box share Worker. Routing
 * stays here and is intentionally thin, actual logic lives in
 * src/handlers/*, one file per endpoint.
 */

import { handleCreateShare } from './handlers/create-share'
import { handleDeleteShare } from './handlers/delete-share'
import { handleGetShare } from './handlers/get-share'
import { handleGetImage } from './handlers/get-image'
import type { Env } from './types'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)

    if (request.method === 'POST' && url.pathname === '/share') {
      return handleCreateShare(request, env)
    }

    // GET /:userShortId/:recipeSlug/image -- served separately from the HTML page
    if (segments.length === 3 && segments[2] === 'image' && request.method === 'GET') {
      const [userShortId, recipeSlug] = segments as [string, string, string]
      return handleGetImage(env, userShortId, recipeSlug)
    }

    // Both GET and DELETE operate on /:userShortId/:recipeSlug
    if (segments.length === 2) {
      const [userShortId, recipeSlug] = segments as [string, string]

      if (request.method === 'GET') {
        return handleGetShare(env, userShortId, recipeSlug)
      }
      if (request.method === 'DELETE') {
        return handleDeleteShare(request, env, userShortId, recipeSlug)
      }
    }

    return new Response('Not found', { status: 404 })
  },
}
