---
packages:
  '@c15t/core': minor
  c15t: minor
  '@c15t/react': minor
  '@c15t/nextjs': minor
  '@c15t/tanstack-start': minor
  '@c15t/vue': minor
  '@c15t/svelte': minor
  '@c15t/astro': minor
  '@c15t/browser': minor
  '@c15t/integrations': patch
---

### Get the provider's event dispatcher in every framework

Each framework now hands you one event dispatcher that sends to the provider's
registered scripts and reads consent when an event goes out:

- `useEventDispatcher()` from `c15t/react`, `c15t/next` and
  `c15t/tanstack-start`
- `useEventDispatcher()` from `c15t/vue/vue-plugin`, auto-imported in Nuxt
- `getEventDispatcher()` from `@c15t/svelte`
- `getEventDispatcher()` from `c15t/astro/client`
- `getEventDispatcher(runtime)` from `@c15t/browser`

All dispatchers for one provider share a pageview history, so a consent change
or a remount no longer drops or resends a pageview, and an event sent right
after a visitor withdraws consent is dropped. Pass `scripts` to add more
destinations and `pageviews` to choose which integrations get single-page-app
pageviews. `createEventDispatcher` from `@c15t/integrations/events` still works
for code without a provider.
