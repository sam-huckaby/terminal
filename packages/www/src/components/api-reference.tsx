import { createSignal, createEffect, For, Show } from 'solid-js'
import type { Component } from 'solid-js'
import type { OpenAPIV3_1 } from '@scalar/openapi-types'
import { Accordion } from '@kobalte/core/accordion'
import TabGroup from './tab-group'
import LineComponent from './line'

type EndpointType = {
  id: string
  path: string
  method: string
  operation: OpenAPIV3_1.OperationObject
}

type ApiReferenceProps = {
  schema: OpenAPIV3_1.Document
  specification: OpenAPIV3_1.Document
  endpointsByTag: Record<string, EndpointType[]>
}

const ApiReference: Component<ApiReferenceProps> = (props) => {
  const [activeEndpoint, setActiveEndpoint] = createSignal<string | undefined>(undefined)
  const [currentHash, setCurrentHash] = createSignal<string | undefined>(undefined)
  const [mobileMenuOpen, setMobileMenuOpen] = createSignal(false)

  // Handle URL hash changes
  const handleScroll = () => {
    // Find all endpoint section headings
    const headings = document.querySelectorAll('div[id]')

    // Find the one that's currently in view
    let current = undefined
    for (const heading of headings) {
      // Only consider elements that are actual route elements (endpoints or tags)
      const id = heading.id
      if (!id) continue

      // Check if this is a valid tag or endpoint ID
      let isValidId = false

      // Check if it's a tag
      if (Object.keys(props.endpointsByTag).includes(id)) {
        isValidId = true
      }

      // Check if it's an endpoint ID
      if (!isValidId) {
        for (const endpoints of Object.values(props.endpointsByTag)) {
          if (endpoints.some(e => e.id === id)) {
            isValidId = true
            break
          }
        }
      }

      // Check if it's a doc ID
      if (!isValidId) {
        for (const doc of docs) {
          if (doc.items.some(e => e.href.slice(1) === id)) {
            isValidId = true
            break
          }
        }
      }

      if (!isValidId) continue

      const rect = heading.getBoundingClientRect()
      if (rect.top <= 100) {
        current = id
      } else {
        break
      }
    }

    if (current && current !== currentHash()) {
      setCurrentHash(current)
      // Update URL without causing a page reload
      history.replaceState(undefined, '', `#${current}`)

      // Check if the hash matches a docs ID
      for (const doc of docs) {
        const docMatch = doc.items.find(e => e.href.slice(1) === current)
        if (docMatch) {
          setActiveEndpoint(docMatch.href.slice(1))
          break
        }
      }

      // Check if the hash matches an endpoint ID
      for (const [, endpoints] of Object.entries(props.endpointsByTag)) {
        const endpoint = endpoints.find(e => e.id === current)
        if (endpoint) {
          setActiveEndpoint(endpoint.id)

          // Scroll the navigation to make sure the active item is visible
          setTimeout(() => {
            const activeNavItem = document.querySelector(`[href="#${endpoint.id}"]`)
            if (activeNavItem) {
              const navContainer = document.querySelector('.api-nav-container')
              if (navContainer) {
                const itemRect = activeNavItem.getBoundingClientRect()
                const containerRect = navContainer.getBoundingClientRect()

                if (itemRect.bottom > containerRect.bottom || itemRect.top < containerRect.top) {
                  activeNavItem.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
              }
            }
          }, 100)

          break
        }
      }
    }
  }

  createEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Initial check for hash in URL
    if (window.location.hash) {
      const hash = window.location.hash.substring(1)
      setCurrentHash(hash)

      // Set active doc/endpoint based on initial hash
      // Check if the hash matches a doc ID
      for (const doc of docs) {
        const docMatch = doc.items.find(e => e.href.slice(1) === hash)
        if (docMatch) {
          setActiveEndpoint(docMatch.href.slice(1))
          break
        }
      }

      // Set active tag/endpoint based on initial hash
      for (const [, endpoints] of Object.entries(props.endpointsByTag)) {
        const endpoint = endpoints.find(e => e.id === hash)
        if (endpoint) {
          setActiveEndpoint(endpoint.id)
          break
        }
      }
    }

    // Handle window resize to close mobile menu when viewport becomes larger
    const mediaQuery = window.matchMedia('(min-width: 768px)')
    const handleMediaQueryChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setMobileMenuOpen(false)
      }
    }

    mediaQuery.addEventListener('change', handleMediaQueryChange)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      mediaQuery.removeEventListener('change', handleMediaQueryChange)
    }
  })

  const docs = [
    {
      title: 'quickstart',
      items: [
        {
          title: 'getting started',
          href: '#getting-started',
        },
        {
          title: 'authentication',
          href: '#authentication',
        },
        {
          title: 'client sdks',
          href: '#client-sdks',
        },
        // {
        //   title: 'examples',
        //   href: '#examples',
        // },
      ],
    },
  ]

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen())
  }

  const closeMenu = () => {
    setMobileMenuOpen(false)
  }

  // Sidebar navigation content that's reused between desktop and mobile
  const renderNavigation = () => (
    <nav>
      <For each={docs}>
        {(doc) => (
          <div class="mb-5">
            <h3 class="px-6 text-gray-7 leading-10">
              #{doc.title}
            </h3>
            <ul>
              <For each={doc.items}>
                {(item) => (
                  <li class="">
                    <LineComponent
                      internalLink
                      href={item.href}
                      state={activeEndpoint() === item.href.slice(1) ? 'active' : undefined}
                      onClick={() => closeMenu()}
                    >
                      <span class="lowercase">{item.title}</span>
                    </LineComponent>
                  </li>
                )}
              </For>
            </ul>
          </div>
        )}
      </For>
      <For each={Object.entries(props.endpointsByTag)}>
        {([tag, endpoints]) => (
          <div class="mb-5">
            <h3 class="px-6 text-gray-7 leading-10">
              #{tag.toLowerCase()}
            </h3>
            <ul>
              <For each={endpoints}>
                {(endpoint) => (
                  <li class="">
                    <LineComponent
                      internalLink
                      href={`#${endpoint.id}`}
                      state={activeEndpoint() === endpoint.id ? 'active' : undefined}
                      onClick={() => closeMenu()}
                    >
                      <div class="flex justify-between items-center w-full">
                        <span class="lowercase">{endpoint.operation.summary?.toLowerCase()}</span>
                        <span
                          classList={{
                            'text-blue-11': endpoint.method === 'get',
                            'text-green-11': endpoint.method === 'post',
                            'text-red-11': endpoint.method === 'delete',
                            'text-orange': endpoint.method === 'put',
                          }}
                        >
                          {endpoint.method.toUpperCase().replace("DELETE", "DEL")}
                        </span>
                      </div>
                    </LineComponent>
                  </li>
                )}
              </For>
            </ul>
          </div>
        )}
      </For>
    </nav>
  )

  return (
    <div class="relative flex flex-col md:flex-row gap-4 md:gap-2 px-4 md:px-0">
      {/* Mobile menu button */}
      <button
        class="md:hidden fixed top-10 right-1 z-40 p-2 bg-gray-3 rounded-md text-gray-11 hover:text-white transition-colors duration-150"
        onClick={toggleMobileMenu}
        aria-label="Toggle navigation menu"
      >
        <Show when={!mobileMenuOpen()} fallback={
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        }>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Show>
      </button>

      {/* Mobile overlay menu */}
      <Show when={mobileMenuOpen()}>
        <div class="md:hidden fixed inset-0 bg-gray-1 z-30 overflow-y-auto pt-16 pb-24 px-4 no-scrollbar">
          <div class="max-w-lg mx-auto">
            {renderNavigation()}
          </div>
        </div>
      </Show>

      {/* Desktop Sidebar */}
      <div class="hidden md:block pt-20 w-72 shrink-0 overflow-y-auto no-scrollbar sticky top-10 h-[calc(100vh-40px)] self-start api-nav-container">
        {renderNavigation()}
      </div>

      {/* Main Content */}
      <div class="flex-1 flex flex-col gap-48 w-full pt-20 md:px-8 md:max-w-xl xl:max-w-7xl overflow-hidden">
        <div class="flex flex-col gap-10 md:max-w-xl">
          <div>
            <div class="flex items-center gap-3 leading-10">
              <h1 class="font-bold">#{props.specification.info?.title?.toLowerCase() || 'api reference'}</h1>
              <span class="text-gray-7">
                v{props.specification.info?.version}
              </span>
            </div>
            <p class="text-gray-11">{props.specification.info?.description?.toLowerCase()}</p>
          </div>
          <div class="">
            <h3 class="font-bold lowercase leading-10">#servers</h3>
            <ul>
              <For each={props.specification.servers || []}>
                {(server) => (
                  <li class="text-gray-11 lowercase">{server.url} <span class="text-gray-7">({server.description})</span></li>
                )}
              </For>
            </ul>
          </div>
          <div class="pt-12 -mt-12" id="getting-started">
            <h3 class="font-bold lowercase leading-10">#getting started</h3>
            <p class="text-gray-11">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in
              voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </div>
          <div class="pt-12 -mt-12" id="authentication">
            <h3 class="font-bold lowercase leading-10">#authentication</h3>
            <p class="text-gray-11">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in
              voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </div>
          <div class="pt-12 -mt-12" id="client-sdks">
            <h3 class="font-bold lowercase leading-10">#client sdks</h3>
            <p class="text-gray-11">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in
              voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </div>
        </div>

        <For each={Object.entries(props.endpointsByTag)}>
          {([tag, endpoints]) => (
            <div class="flex flex-col gap-24" id={tag}>
              <div>
                <h2 class="font-bold mb-2 lowercase">#{tag}</h2>
                <For each={endpoints}>
                  {(endpoint) => (
                    <div class="flex items-center gap-3">
                      <span
                        classList={{
                          'text-blue-11': endpoint.method === 'get',
                          'text-green-11': endpoint.method === 'post',
                          'text-red-11': endpoint.method === 'delete',
                          'text-orange': endpoint.method === 'put',
                        }}
                      >
                        {endpoint.method.toUpperCase()}
                      </span>
                      <h3>{endpoint.path}</h3>
                      <p class="text-gray-11">{endpoint.operation.summary?.toLowerCase()}</p>
                      {endpoint.operation.security && <p class="text-gray-7">public</p>}
                    </div>
                  )}
                </For>
              </div>
              <For each={endpoints}>
                {(endpoint) => (
                  <div class="pt-12 -mt-12 flex flex-col gap-10" id={endpoint.id}>
                    <div>
                      <div class="flex items-center gap-3">
                        <span
                          classList={{
                            uppercase: true,
                            'text-blue-11': endpoint.method === 'get',
                            'text-green-11': endpoint.method === 'post',
                            'text-red-11': endpoint.method === 'delete',
                            'text-orange': endpoint.method === 'put',
                          }}
                        >
                          {endpoint.method}
                        </span>
                        <h3>{endpoint.path}</h3>
                        {endpoint.operation.security && <p class="text-gray-7">public</p>}
                      </div>
                      <p class="text-gray-11 lowercase">
                        {endpoint.operation.description}
                      </p>
                    </div>
                    <div class="flex flex-col gap-10 xl:grid xl:grid-cols-2 xl:gap-20 xl:items-start">
                      <Show when={endpoint.operation.responses}>
                        <div class="">
                          <Accordion collapsible multiple >
                            <For each={Object.entries(endpoint.operation.responses || {})}>
                              {([statusCode, response]) => (
                                <Accordion.Item value={`${endpoint.id}-${statusCode}`} class="">
                                  <Accordion.Header class="">
                                    <Accordion.Trigger class="relative flex items-start gap-2 text-left transition-colors hover:bg-gray-1/10 group/trigger">
                                      <span
                                        classList={{
                                          'text-green-11': statusCode.startsWith('2'),
                                          'text-blue-11': statusCode.startsWith('3'),
                                          'text-orange': statusCode.startsWith('4'),
                                          'text-red-11': statusCode.startsWith('5'),
                                        }}
                                      >
                                        {statusCode}
                                      </span>
                                      <span class="text-gray-11 lowercase">
                                        {response.description}
                                      </span>
                                      <div class="absolute -left-5">
                                        <div class="text-gray-7 group-hover/trigger:text-white group-data-[expanded]/trigger:rotate-90 transition-all duration-100">
                                          {`>`}
                                        </div>
                                      </div>
                                    </Accordion.Trigger>
                                  </Accordion.Header>
                                  <Accordion.Content class="pt-1 pb-3 pl-4 border-l border-gray-7/20">
                                    <Show when={response.content}>
                                      <For each={Object.entries(response.content || {})}>
                                        {([_contentType, content]) => (
                                          <Show when={content.schema}>
                                            <TabGroup
                                              tabs={[
                                                ...(content.example ? [{
                                                  label: "example",
                                                  value: "example",
                                                  content: JSON.stringify(content.example, null, 2)
                                                }] : []),
                                                {
                                                  label: "Schema",
                                                  value: "schema",
                                                  content: JSON.stringify(content.schema, null, 2)
                                                },
                                              ]}
                                            />
                                          </Show>
                                        )}
                                      </For>
                                    </Show>
                                  </Accordion.Content>
                                </Accordion.Item>
                              )}
                            </For>
                          </Accordion>
                        </div>
                      </Show>
                      <Show when={endpoint.operation['x-codeSamples']?.length}>
                        <div class="">
                          <TabGroup
                            tabs={endpoint.operation['x-codeSamples'].map((sample: any) => ({
                              label: sample.lang,
                              value: sample.lang.toLowerCase(),
                              content: sample.source
                            }))}
                          />
                        </div>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

export default ApiReference
