# Terminal Shop Website Improvement Plan

This document outlines specific improvements to enhance code quality, maintainability, and developer experience in the Terminal Shop website codebase. Each improvement includes implementation details to guide future Claude code sessions.

## 1. Consolidate Frontend Frameworks

**Current State:** Codebase mixes SolidJS (general components) and React (CUI components).

**Implementation Plan:**
1. Choose one framework (recommend SolidJS for performance or React for ecosystem)
2. Create migration plan for components in non-chosen framework
   - For each `.tsx` file in `/src/cui/` if choosing SolidJS:
     - Convert React hooks to SolidJS signals/stores
     - Replace `useState` with `createSignal`
     - Replace `useEffect` with `createEffect`
     - Update event handlers to SolidJS pattern
   - For each `.tsx` file in `/src/components/` if choosing React:
     - Convert SolidJS signals to React state
     - Replace `createSignal` with `useState`
     - Replace `createEffect` with `useEffect`
     - Update event handlers to React pattern
3. Update `astro.config.mjs` to use single framework integration
4. Update dependencies in `package.json` to remove unused framework

## 2. Add Comprehensive Testing

**Current State:** No visible test files in the codebase.

**Implementation Plan:**
1. Set up testing framework:
   ```bash
   bun add -D vitest @testing-library/react @testing-library/user-event jsdom @solidjs/testing-library
   ```
2. Create test configuration file `vitest.config.ts`:
   ```typescript
   import { defineConfig } from 'vitest/config'
   import path from 'path'

   export default defineConfig({
     test: {
       environment: 'jsdom',
       globals: true,
       setupFiles: ['./test/setup.ts'],
     },
     resolve: {
       alias: {
         '@': path.resolve(__dirname, './src'),
       },
     },
   })
   ```
3. Create test setup file:
   ```typescript
   // test/setup.ts
   import '@testing-library/jest-dom'
   ```
4. Add test scripts to `package.json`:
   ```json
   "scripts": {
     "test": "vitest run",
     "test:watch": "vitest",
     "test:coverage": "vitest run --coverage"
   }
   ```
5. Create test files for key components:
   - Create `/test/components/` directory
   - Write tests for `button`, `line`, `editor` components first
   - Add tests for hooks in `cui/hooks/`

## 3. Improve Error Handling

**Current State:** Silent failures, minimal user feedback for errors.

**Implementation Plan:**
1. Create error boundary component:
   ```typescript
   // src/components/error-boundary.tsx
   export function ErrorBoundary(props) {
     const [error, setError] = createSignal<Error | null>(null);
     
     return (
       <ErrorBoundary
         fallback={(err) => {
           setError(err);
           return <ErrorDisplay error={err} />;
         }}
       >
         {error() ? null : props.children}
       </ErrorBoundary>
     );
   }

   function ErrorDisplay(props: { error: Error }) {
     return (
       <div class="p-4 border border-red-500 rounded bg-red-50">
         <h3 class="text-red-700 font-bold">Error Occurred</h3>
         <p class="text-red-600">{props.error.message}</p>
       </div>
     );
   }
   ```

2. Add toast notification system:
   ```bash
   bun add solid-toast # or react-hot-toast depending on framework choice
   ```

3. Update API error handling in hooks:
   - Modify `/src/cui/hooks/use-cart.ts` to include proper error handling
   - Add error state to all React Query usages
   - Create helper for standardized error parsing

4. Add validation for user inputs:
   ```bash
   bun add zod
   ```

## 4. Enhance TypeScript Usage

**Current State:** Non-null assertions, missing interfaces, inconsistent type safety.

**Implementation Plan:**
1. Update `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true,
       "noUncheckedIndexedAccess": true
     }
   }
   ```

2. Create `/src/types/` directory for shared types
   - Add API response types
   - Add common UI component prop types
   - Document state management types

3. Remove non-null assertions (`!`) with proper checks:
   - Scan for `!` usage and replace with proper null checks
   - Use optional chaining where appropriate
   - Add guards for undefined values

4. Add consistent type exports pattern:
   ```typescript
   // src/types/index.ts
   export * from './api';
   export * from './components';
   export * from './state';
   ```

## 5. Add Code Quality Tools

**Current State:** Limited linting, no pre-commit hooks, no CI.

**Implementation Plan:**
1. Add ESLint:
   ```bash
   bun add -D eslint eslint-plugin-astro @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-jsx-a11y
   ```

2. Create `.eslintrc.js`:
   ```javascript
   module.exports = {
     extends: [
       'eslint:recommended',
       'plugin:@typescript-eslint/recommended',
       'plugin:astro/recommended',
       'plugin:jsx-a11y/recommended'
     ],
     parser: '@typescript-eslint/parser',
     plugins: ['@typescript-eslint', 'jsx-a11y'],
     root: true,
     overrides: [
       {
         files: ['*.astro'],
         parser: 'astro-eslint-parser',
         parserOptions: {
           parser: '@typescript-eslint/parser',
           extraFileExtensions: ['.astro'],
         },
         rules: {
           // Astro-specific rules
         }
       }
     ]
   };
   ```

3. Add Husky for pre-commit hooks:
   ```bash
   bun add -D husky lint-staged
   npx husky install
   npm set-script prepare "husky install"
   npx husky add .husky/pre-commit "npx lint-staged"
   ```

4. Configure `lint-staged` in `package.json`:
   ```json
   "lint-staged": {
     "*.{ts,tsx}": "eslint --fix",
     "*.{ts,tsx,css,md,astro}": "prettier --write"
   }
   ```

5. Set up GitHub Actions for CI:
   Create `.github/workflows/ci.yml`:
   ```yaml
   name: CI
   on: [push, pull_request]
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: oven-sh/setup-bun@v1
         - name: Install dependencies
           run: bun install
         - name: Lint
           run: bun run lint
         - name: Typecheck
           run: bun run typecheck
         - name: Test
           run: bun run test
         - name: Build
           run: bun run build
   ```

## 6. Restructure Component Organization

**Current State:** Flat structure, inconsistent patterns, duplicate implementations.

**Implementation Plan:**
1. Reorganize `/src/components/` by feature:
   ```
   /src/components/
     /core/ - Base components like Button, Input
     /layout/ - Layout components
     /editor/ - Editor related components
     /markdown/ - Markdown rendering components
     /easter-eggs/ - Easter egg components
   ```

2. Normalize component file structure:
   - Each component gets a directory with index.ts export
   - Separate types.ts file for complex components
   - Include styles.ts for component-specific styling
   - Example:
   ```
   /button/
     index.tsx - Main component
     types.ts - Type definitions
     styles.ts - Styling definitions
     button.test.tsx - Component tests
   ```

3. Create component index barrel files:
   ```typescript
   // src/components/core/index.ts
   export * from './button';
   export * from './input';
   // etc.
   ```

4. Update imports across the codebase to use new structure

## 7. Implement Documentation Standards

**Current State:** Minimal documentation, missing JSDoc comments.

**Implementation Plan:**
1. Add Storybook for visual documentation:
   ```bash
   npx storybook init --type astro
   ```

2. Create document template for component JSDoc comments:
   ```typescript
   /**
    * Button component with multiple variants
    * 
    * @param {ButtonProps} props - Component props
    * @param {string} props.variant - Button style variant ('primary' | 'secondary' | 'text')
    * @param {string} props.size - Button size ('sm' | 'md' | 'lg')
    * @param {boolean} props.disabled - Whether button is disabled
    * @param {JSX.Element} props.children - Button content
    * 
    * @example
    * ```tsx
    * <Button variant="primary" size="md" onClick={() => console.log('clicked')}>
    *   Click me
    * </Button>
    * ```
    */
   ```

3. Create README.md files for major directories:
   - `/src/components/README.md`
   - `/src/cui/README.md`
   - `/src/layouts/README.md`

4. Add TypeDoc for API documentation:
   ```bash
   bun add -D typedoc
   ```

5. Add script to generate documentation:
   ```json
   "scripts": {
     "docs": "typedoc --entryPointStrategy expand ./src"
   }
   ```

## 8. Fix Dependency Management

**Current State:** Wildcard dependencies, direct DOM access, tight coupling.

**Implementation Plan:**
1. Update `package.json` to use specific versions:
   - Scan for `*` versions and replace with specific version numbers
   - Add `~` for minor version updates

2. Create service layer for API interactions:
   ```typescript
   // src/services/api.ts
   export class ApiService {
     constructor(private baseUrl: string, private authToken?: string) {}
     
     async get<T>(path: string): Promise<T> {
       // Implementation
     }
     
     async post<T>(path: string, data: unknown): Promise<T> {
       // Implementation
     }
     // etc.
   }
   ```

3. Create context provider for dependency injection:
   ```typescript
   // src/contexts/services.tsx
   interface ServiceContext {
     api: ApiService;
     // other services
   }
   
   const ServiceContext = createContext<ServiceContext>();
   
   export function ServiceProvider(props) {
     const api = new ApiService('/api');
     
     return (
       <ServiceContext.Provider value={{ api }}>
         {props.children}
       </ServiceContext.Provider>
     );
   }
   
   export function useServices() {
     const context = useContext(ServiceContext);
     if (!context) {
       throw new Error('useServices must be used within ServiceProvider');
     }
     return context;
   }
   ```

4. Refactor direct DOM access in `/src/cui/auth.ts` to use refs

## 9. Add Performance Optimizations

**Current State:** No visible memoization, code splitting, or bundle analysis.

**Implementation Plan:**
1. Add build analyze script:
   ```bash
   bun add -D rollup-plugin-visualizer
   ```

2. Update `astro.config.mjs` for code splitting:
   ```javascript
   export default defineConfig({
     // existing config
     vite: {
       build: {
         rollupOptions: {
           output: {
             manualChunks: {
               'vendor': ['solid-js', 'react', 'react-dom'],
               'editor': ['./src/components/editor'],
               'cui': ['./src/cui']
             }
           }
         }
       },
       plugins: [
         process.env.ANALYZE === 'true' && visualizer({
           open: true,
           filename: 'dist/stats.html',
           gzipSize: true,
           brotliSize: true
         })
       ]
     }
   });
   ```

3. Add analyze script to `package.json`:
   ```json
   "scripts": {
     "analyze": "ANALYZE=true astro build"
   }
   ```

4. Implement lazy loading for heavy components:
   ```typescript
   const LazyEditor = lazy(() => import('./editor'));
   ```

5. Add image optimization for all images:
   ```bash
   bun add -D sharp # For Astro image optimization
   ```

## 10. Standardize State Management

**Current State:** Global mutable state, inconsistent patterns.

**Implementation Plan:**
1. Create central state management:
   ```bash
   bun add @nanostores/solid # or @nanostores/react
   ```

2. Create store files in `/src/stores/`:
   ```typescript
   // src/stores/auth.ts
   import { atom } from 'nanostores';
   
   export interface AuthState {
     isAuthenticated: boolean;
     accessToken: string | null;
     user: User | null;
   }
   
   export const authStore = atom<AuthState>({
     isAuthenticated: false,
     accessToken: null,
     user: null
   });
   
   export function login(token: string, user: User) {
     authStore.set({
       isAuthenticated: true,
       accessToken: token,
       user
     });
   }
   
   export function logout() {
     authStore.set({
       isAuthenticated: false,
       accessToken: null,
       user: null
     });
   }
   ```

3. Replace global state in `/src/cui/auth.ts` with store usage
4. Create store for each major state slice (cart, products, etc.)
5. Add persistence layer for selected stores:
   ```typescript
   function persistStore<T>(store, key: string) {
     // Load from localStorage on init
     const saved = localStorage.getItem(key);
     if (saved) {
       try {
         store.set(JSON.parse(saved));
       } catch (e) {
         console.error(`Failed to restore state for ${key}`, e);
       }
     }
     
     // Subscribe to changes and save
     store.subscribe((value) => {
       localStorage.setItem(key, JSON.stringify(value));
     });
   }
   
   // Usage
   persistStore(authStore, 'auth');
   ```