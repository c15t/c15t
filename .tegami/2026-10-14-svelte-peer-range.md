---
packages:
  '@c15t/svelte': patch
---

### State the Svelte 5.20 requirement in the peer range

`@c15t/svelte` now declares `svelte@^5.20.0` as its peer dependency. The
components use `$props.id()`, which Svelte added in 5.20, so earlier Svelte 5
versions already failed to compile them. Package managers now warn at install
time instead. CI builds and smoke-tests a SvelteKit 2.63 app on Svelte 5.20 to
keep this floor accurate.
