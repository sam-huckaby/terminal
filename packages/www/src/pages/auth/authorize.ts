import type { APIRoute } from 'astro'
import { client, setTokens } from '../../auth'

export const GET: APIRoute = async (ctx) => {
  const result = await client.authorize(
    ctx.url.origin + '/auth/callback',
    'code',
  )
  ctx.cookies.set('redirect', ctx.url.searchParams.get('redirect') || '/', {
    maxAge: 60 * 60 * 24 * 30,
  })
  return Response.redirect(result.url, 302)
}
