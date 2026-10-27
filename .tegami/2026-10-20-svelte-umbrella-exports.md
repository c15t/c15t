---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
---

### Install Svelte and SvelteKit through c15t

Use `c15t/svelte` for Svelte components and consent modes, with SvelteKit
helpers at `c15t/svelte/kit`, server resolution at `c15t/svelte/server` and
the Vite plugin at `c15t/svelte/vite`. The package also includes headless
APIs, dev tools, locals types and stylesheets. Svelte and SvelteKit docs now
install `c15t` and use these imports.

The CLI now installs `c15t` and generates `c15t/svelte` imports for Svelte
and SvelteKit. Runtime setup errors recommend the same import paths.
