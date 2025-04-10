import { defineMiddleware } from 'astro:middleware'
import { client, setTokens, subjects } from './auth'

export const onRequest = defineMiddleware(async (ctx, next) => {
  if (ctx.routePattern === '/callback') {
    return next()
  }

  try {
    const accessToken = ctx.cookies.get('access_token')
    if (accessToken) {
      const refreshToken = ctx.cookies.get('refresh_token')
      const verified = await client.verify(subjects, accessToken.value, {
        refresh: refreshToken?.value,
      })
      if (!verified.err) {
        if (verified.tokens)
          setTokens(ctx, verified.tokens.access, verified.tokens.refresh)
        ctx.locals.subject = verified.subject
      }
    }
  } catch (e) {}

  return next()
})
