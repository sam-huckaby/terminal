# Terminal Shop - Development Guide

## Build & Test Commands
- `bun dev`: Run development environment with SST
- `bun typecheck`: Run type checking across all packages
- `bun test path/to/file.test.ts`: Run specific test file
- `bun test --watch path/to/file.test.ts`: Run test in watch mode
- `bun db:push`: Apply database migrations (in core package)
- `bun db:connect`: Connect to MySQL database (in core package)

## Code Style Guidelines
- **Imports**: Group by source, internal imports after external
- **Types**: Use Zod for runtime validation, explicit TypeScript types for interfaces
- **Naming**: PascalCase for modules/namespaces, camelCase for functions/variables
- **Error Handling**: Use explicit error throwing, wrap DB operations in transactions
- **Module Pattern**: Export functions through namespace modules
- **Testing**: Use `bun:test` with `describe`/`it` pattern and `withTestUser` helper
- **Documentation**: Use OpenAPI annotations with Zod schemas
- **Database**: Use Drizzle ORM with explicit transactions
- **Validation**: Use `fn()` utility for input validation