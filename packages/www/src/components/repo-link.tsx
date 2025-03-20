import { Show } from 'solid-js'
import type { Component } from 'solid-js'

type RepoLinkProps = {
  githubUrl: string
  packageUrl?: string
  language: string
}

const RepoLink: Component<RepoLinkProps> = (props) => {
  // Function to get the package icon based on language
  const getPackageIcon = (language: string) => {
    switch (language.toLowerCase()) {
      case 'javascript':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h20c.6 0 1 .4 1 1v16c0 .6-.4 1-1 1H2c-.6 0-1-.4-1-1V4c0-.6.4-1 1-1z"/>
            <path d="M14 8v8"/>
            <path d="M10 8v8"/>
            <path d="M10 12h4"/>
          </svg>
        )
      case 'python':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m8 9 5 3 5-3v10l-5 3-5-3z"/>
            <path d="m8 9-5 3 5 3"/>
            <path d="m18 9 5 3-5 3"/>
            <path d="m2 12 6-3.5V2l6 3.5V12"/>
            <path d="m18 9 4-2-4-2-4 2 4 2"/>
          </svg>
        )
      case 'ruby':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2h12l4 10-10 10L2 12Z"/>
            <path d="m6 12 6-6"/>
            <path d="M6 2v10"/>
            <path d="M18 2v10"/>
          </svg>
        )
      case 'java':
      case 'kotlin':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v3"/>
            <path d="M9 6h6"/>
            <path d="M5 19h14"/>
            <path d="M5 12a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v7H5z"/>
          </svg>
        )
      case 'go':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22v-7l-2.5-2.5L12 10l2.5 2.5L12 15"/>
            <circle cx="19" cy="6" r="3"/>
            <circle cx="5" cy="6" r="3"/>
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
          </svg>
        )
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 18H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2Z"></path>
            <path d="m12 9 4 3-4 3-4-3 4-3Z"></path>
          </svg>
        )
    }
  }

  return (
    <div class="flex items-center gap-2">
      <a
        href={props.githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="text-gray-7 hover:text-white transition-colors"
        title="GitHub Repository"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
        </svg>
      </a>
      <Show when={props.packageUrl}>
        <a
          href={props.packageUrl}
          target="_blank"
          rel="noopener noreferrer" 
          class="text-gray-7 hover:text-white transition-colors"
          title="Package Repository"
        >
          {getPackageIcon(props.language)}
        </a>
      </Show>
    </div>
  )
}

export default RepoLink