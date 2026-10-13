# c15t shadcn registry

Source for the c15t items in the shadcn registry, served from
`https://c15t.com/r`. The items are presentation only. Each one renders the
project's own shadcn components and gets its state and actions from c15t's
headless hooks, so consent logic stays in the `c15t` package.

Users install items with the shadcn CLI:

```bash
npx shadcn add @c15t/next-consent-manager @c15t/next-consent-banner
```

The `@c15t` namespace resolves through the shadcn directory, or through this
entry in the project's `components.json`:

```json
{
  "registries": {
    "@c15t": "https://c15t.com/r/{style}/{name}.json"
  }
}
```

## Layout

| Path | What it holds |
| --- | --- |
| `registry/shared` | UI items for Radix and Base UI projects |
| `registry/aria` | UI items for React Aria projects |
| `registry/setup/<framework>` | The `consent-manager` item and, for Next.js, `c15t.config.ts` |
| `src/items.ts` | Item names, titles, descriptions, install notes and the c15t range |
| `src/build-registry.ts` | Turns the sources into one JSON file per item per style |
| `vendor/<base>` | Copies of the shadcn components the items import, used only for type-checking |

Every UI item ships three times, as `next-*`, `react-*` and
`tanstack-start-*`. The build writes the Next.js and TanStack Start copies
by pointing `c15t/react` imports at `c15t/next` or `c15t/tanstack-start`.
Nothing else changes. Each framework has its own `consent-manager`, because
that's where the setups differ.

shadcn requests items at `{style}/{name}.json` using the project's raw
`style` value, so the build writes a folder for each of the 26 styles. Items
that share a base are identical apart from their file paths and the URLs of
the items they depend on.

## Writing items

- Write in shadcn's style: 2-space indent, double quotes, no semicolons,
  function declarations. Oxfmt skips `registry/`, and `oxlint.config.ts` has
  an override for it.
- Import c15t only from `c15t/react` and `c15t/react/headless`. Any other
  c15t entry point fails the build, because the other frameworks have no
  twin for it.
- Import local code only from `@/components/ui/*`, `@/components/c15t/*` and
  `@/lib/utils`. shadcn rewrites those to the project's aliases.
- A `@/components/ui/*` import must be vendored for every base, so
  `check-types` covers it.
- `registry/shared` and `registry/aria` must behave the same. A change to one
  needs the matching change in the other.
- The build derives dependencies from imports. Don't list them in
  `src/items.ts`.

When an item starts using a hook or prop from a newer c15t release, raise
`c15tRange` in `src/items.ts`.

## Commands

Run these from `apps/shadcn-registry`. `check-types` and `fixtures` need a
built `c15t`, so run `bun turbo run build --filter=c15t` from the repo root
first.

```bash
bun run build         # write dist/r for https://c15t.com/r
bun run check-types   # each base against its vendored components, plus each framework's copies
bun run test          # build output: names, dependency links, imports, install paths
bun run lint
bun run fixtures      # real shadcn projects, see below
```

`fixtures` scaffolds a shadcn project for each framework and base with
`shadcn init`, serves the registry from memory, runs `shadcn add` for every
item, declares one marketing vendor, and type-checks the result. It packs
the built workspace `c15t` and the `@c15t` packages it depends on, and the
projects install those tarballs the way they would install a release. The
TanStack Start fixtures also replace `src/routes/__root.tsx` with the root
route the install notes describe. Projects live in
`/tmp/c15t-shadcn-fixtures` and are reused between runs. Pass `--fresh` to
scaffold them again, or narrow the run:

```bash
bun run fixtures --framework next --base aria
```

Pass `--browser` to also build each project for production and click
through it in Chromium. The run accepts, rejects and saves through the
banner, dialog, sheet, trigger, widget and gate, and checks that the choice
survives a reload. It checks that the vendor's switch stays disabled while
Marketing is off, turns it off once Marketing is on, and checks where the
"Secured by" links on the banner, dialog and sheet point. For Next.js and
TanStack Start it also checks that the server HTML has the banner on a
first visit and not after a choice. The projects talk to the demo backend,
so `--browser` needs network access. Install Chromium once first:

```bash
bunx playwright@1.61.1 install chromium
bun run fixtures --browser
```

Each fixture writes its command output to
`/tmp/c15t-shadcn-fixtures/<framework>-<base>.log`. A failed browser step
saves a screenshot next to it.

## Refreshing the vendored components

The vendored files are shadcn's own components, as `shadcn init` installs
them. To refresh them after a shadcn release, run `bun run fixtures --fresh`
and copy `components/ui` and `lib/utils.ts` from each
`/tmp/c15t-shadcn-fixtures/react-<base>/src` into `vendor/<base>`.

## Deploying

The items pin `c15t@^3.1.0`. Publish that release before deploying, or
installs fail to resolve the dependency.

```bash
bun run build
```

Copy `dist/r` to c15t.com so `https://c15t.com/r/radix-nova/registry.json`
resolves. Serve the files as `application/json`. The shadcn CLI fetches them
from Node, so they don't need CORS headers.

Set `REGISTRY_BASE_URL` to build for another host, such as a preview
deployment. Cross-item dependencies use full URLs, so the output only works
at the URL it was built for.
