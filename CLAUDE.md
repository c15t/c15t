---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `vitest` to run tests. Each package has its own `vitest.config.ts`. Import test utilities from `vitest`, not `bun:test`.

```sh
# Run tests for a specific package
bunx vitest run packages/backend/
bunx vitest run packages/schema/

# Run a specific test file
bunx vitest run packages/backend/src/routes/policy-packs-e2e.test.ts

# Watch mode
bunx vitest packages/backend/
```

```ts#index.test.ts
import { describe, expect, it, vi } from "vitest";

describe("example", () => {
  it("works", () => {
    expect(1).toBe(1);
  });
});
```

**Important:** Use `vitest` APIs (`vi.fn()`, `vi.mock()`, `vi.hoisted()`, `vi.mocked()`, `vi.useFakeTimers()`, `vi.setSystemTime()`) — these are NOT available in `bun test`.

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## Project-Specific Conventions

### Package Names
- The core package is `c15t` (NOT `@c15t/core`)
- All other packages use the `@c15t/` scope:
  - `@c15t/react`
  - `@c15t/nextjs`
  - `@c15t/backend`
  - `@c15t/node-sdk`
  - `@c15t/cli`
  - `@c15t/ui`
  - `@c15t/schema`
  - `@c15t/logger`
  - `@c15t/translations`
  - `@c15t/dev-tools`
