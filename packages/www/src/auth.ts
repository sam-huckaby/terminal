import { createClient } from '@openauthjs/openauth/client'
import type { APIContext } from 'astro'
import { Resource } from 'sst'
export { subjects } from '@terminal/functions/subject'

export const client = createClient({
  clientID: 'www',
  issuer: Resource.Auth.url,
})

export function setTokens(ctx: APIContext, access: string, refresh: string) {
  ctx.cookies.set('refresh_token', refresh, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 34560000,
  })
  ctx.cookies.set('access_token', access, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 34560000,
  })
}
