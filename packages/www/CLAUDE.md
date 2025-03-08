# Terminal Shop - Development Guide

## Build & Run Commands
- `bun dev` or `npm run dev`: Run Astro dev server
- `bun build` or `npm run build`: Build Astro site
- `bun preview` or `npm run preview`: Preview Astro build
- `bun format` or `npm run format`: Format code with Prettier
- `bun typecheck`: Run type checking
- `bun test path/to/file.test.ts`: Run specific test file
- `bun test --watch path/to/file.test.ts`: Run tests in watch mode

## Code Style Guidelines
- **Imports**: External packages first, then internal imports with path aliases
- **Types**: Use TypeScript types for component props (PascalCase with suffix)
- **Formatting**: No semicolons, single quotes (configured in .prettierrc.cjs)
- **Components**: Use SolidJS with proper types and splitProps pattern
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Path Aliases**: Use @ prefix for imports (@components, @layouts, @styles)
- **Error Handling**: Use React Query patterns with proper error callbacks
- **File Structure**: Organize by feature/function with clear separation
- **Testing**: Use Bun test with describe/it pattern

This project uses Astro with SolidJS components, Tailwind CSS for styling, and Bun as the JavaScript runtime.