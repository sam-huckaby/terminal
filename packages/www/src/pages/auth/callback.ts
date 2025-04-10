import type { APIRoute } from 'astro'
import { client, setTokens } from '../../auth'

export const GET: APIRoute = async (ctx) => {
  const code = ctx.url.searchParams.get('code')
  const redirect = ctx.cookies.get('redirect')
  const tokens = await client.exchange(code!, ctx.url.origin + '/auth/callback')
  if (!tokens.err) setTokens(ctx, tokens.tokens.access, tokens.tokens.refresh)
  return ctx.redirect(redirect?.value || '/', 302)
}
