# Examples

Apps you can read, run and copy from. Each one shows one thing.

Each **starter** (`examples/<framework>`) is the smallest correct c15t setup
for one framework and one rendering mode. The framework quickstarts quote them.

Test apps live in `internals/fixtures`, and type-checked docs snippets live in
`internals/doc-snippets`. Nothing in `examples/` exists only for a test.

## Rules

1. **One idea per example.** The directory name says what it is. If the README
   needs "this example also shows…", split it.
2. **c15t code first.** The file a reader opens first holds the c15t setup.
   Page chrome stays minimal.
3. **No test code.** No `testBackend` helpers, no `#hide docs` blocks, no
   environment switches that change what gets built. A server-rendered example
   may read its backend URL from the framework's usual public environment
   variable, with `https://your-project.inth.app` as the fallback, because a
   real app does the same.
4. **Runs on clone.** `bun install`, build the workspace packages, then
   `bun run --cwd examples/<name> dev`.
5. **Real app code.** No `?design=` switches, debug readouts or links to other
   variants. A reader can paste a file into their own app.
6. **Short README.** What it shows, the two or three files that matter, how to
   run it, and a link to the docs page that explains it.
7. **Smoke-tested.** CI builds every example, checks that the banner renders
   and that Accept persists across a reload. The full consent journeys run
   against `internals/fixtures`.

Docs regions (`#region docs:<name>`) in starters feed the framework
quickstarts. See `scripts/example-doc-sources.ts` for the marker syntax.

## Run one

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/nuxt dev
```

Replace `https://your-project.inth.app` with your project's backend URL, and
add the app's origin to the project's trusted origins.
