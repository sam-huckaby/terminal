# Terminal Functions Package Guide

## Build & Test Commands

- `bun run test`: Run all tests with SST shell
- `bun run test path/to/file.test.ts`: Run specific test file
- `bun run test --watch path/to/file.test.ts`: Run tests in watch mode
- `bun run test --timeout 10000 path/to/file.test.ts`: Run with longer timeout
- `bun run typecheck`: Run TypeScript type checking

## Code Style Guidelines

- **API Structure**: Use Hono.js for routing and module pattern `export module NameApi { export const route = new Hono()... }`
- **Validation**: Use `validator()` utility from common.ts with Zod schemas
- **Error Handling**: Use standardized error responses from ErrorResponses
- **Documentation**: Use `describeRoute()` with OpenAPI annotations and Zod schemas
- **Testing**: Use `setupApiTest()` helper with `describe`/`test` pattern from bun:test
- **Response Format**: Wrap success responses with `Result()` for standardized `{ data: T }` pattern
- **Auth**: Use `authRequired` middleware when endpoint requires authentication
- **Types**: Import domain types from @terminal/core, use Zod for API validation
- **Examples**: Use Examples namespace for test/documentation data

## Module Organization

- `/api/`: API endpoints organized by domain resource
- `/cron/`: Scheduled Lambda functions
- `/event/`: Event handlers
- `/shortener/`: URL shortening service

