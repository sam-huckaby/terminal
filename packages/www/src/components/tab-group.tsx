import { createSignal, type Component, For } from 'solid-js'
import { Tabs as KTabs } from '@kobalte/core'
import Code from './code';

type TabItem = {
  label: string
  value: string
  content: string
}

export type TabGroupProps = {
  tabs: TabItem[]
  defaultValue?: string
}

const TabGroup: Component<TabGroupProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal<string>(
    props.defaultValue || (props.tabs.length > 0 ? props.tabs[0].value : '')
  )

  // Each tab needs a unique ID to avoid conflicts between multiple TabGroups
  const tabGroupId = Math.random().toString(36).substring(2, 10);

  return (
    <KTabs.Root
      value={activeTab()}
      onChange={setActiveTab}
      class=""
    >
      <KTabs.List class="flex gap-4 overflow-x-auto no-scrollbar">
        <For each={props.tabs}>
          {(tab) => (
            <KTabs.Trigger
              value={tab.value}
              class="px-3 pb-1 text-gray-11 hover:text-white lowercase transition-colors"
              classList={{
                'border-b-2': true,
                'text-white border-white': activeTab() === tab.value,
                'border-transparent': activeTab() !== tab.value,
              }}
              id={`${tabGroupId}-tab-${tab.value}`}
            >
              {tab.label.toLowerCase()}
            </KTabs.Trigger>
          )}
        </For>
      </KTabs.List>
      <For each={props.tabs}>
        {(tab) => (
          <KTabs.Content value={tab.value} class="overflow-hidden">
            <Code code={tab.content} language={tab.value === 'schema' || tab.value === 'example' ? 'json' : tab.value.toLowerCase()} />
          </KTabs.Content>
        )}
      </For>
    </KTabs.Root>
  )
}

export default TabGroup
