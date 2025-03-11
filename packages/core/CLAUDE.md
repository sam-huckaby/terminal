# Terminal Shop - Core Package Guide

## Build & Test Commands

- `bun typecheck`: Run type checking for this package
- `bun test path/to/file.test.ts`: Run specific test file
- `bun test --watch path/to/file.test.ts`: Run test in watch mode
- `bun db:push`: Apply database migrations 
- `bun db:connect`: Connect to MySQL database

## Code Style Guidelines

- **Imports**: Group by source, internal imports after external
- **Types**: Use Zod for runtime validation, explicit TypeScript types for interfaces
- **Naming**: PascalCase for modules/namespaces, camelCase for functions/variables
- **Error Handling**: Use explicit error throwing, wrap DB operations in transactions
- **Module Pattern**: Export functions through namespace modules (e.g., `export module User`)
- **Testing**: Use `bun:test` with `describe`/`it` pattern and `withTestUser` helper
- **Documentation**: Use OpenAPI annotations with Zod schemas
- **Database**: Use Drizzle ORM with explicit transactions via `useTransaction` and `createTransaction`
- **Validation**: Use `fn()` utility for input validation and schema definition