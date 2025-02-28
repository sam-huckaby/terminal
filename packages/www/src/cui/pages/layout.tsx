import { TerminalContext } from '../terminal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Terminal from '@terminaldotshop/sdk'
import { getToken } from '../auth'
import type { PropsWithChildren } from 'react'

const queryClient = new QueryClient()
const baseURL = document
  .querySelector('meta[property="api-url"]')!
  .getAttribute('content')!
const terminal = async () => {
  const bearerToken = await getToken()
  if (!bearerToken) return
  return new Terminal({ bearerToken, baseURL, appId: 'console.shop' })
}

export default function Layout(props: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <TerminalContext.Provider value={terminal}>
        <div className="w-75 h-30 leading-tight font-mono">
          {props.children}
        </div>
      </TerminalContext.Provider>
    </QueryClientProvider>
  )
}
