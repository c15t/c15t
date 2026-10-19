---
packages:
  'c15t': patch
  '@c15t/core': patch
  '@c15t/integrations': patch
  '@c15t/nextjs': patch
  '@c15t/react': patch
  '@c15t/svelte': patch
  '@c15t/tanstack-start': patch
  '@c15t/vue': patch
---

### Allowed scripts start from the server HTML

Next.js, TanStack Start, Nuxt and SvelteKit now start the `scripts` entries a
visitor's consent already allows from the server-rendered HTML, before the page
hydrates. An inline script runs after first paint and inserts their tags; the
script loader adopts them. On a throttled mobile profile, vendors started about
800 ms sooner. This covers React 18 and 19, and every vendor helper in
`@c15t/integrations` except Cloudflare Zaraz and Sentry.

Nothing starts while the policy asks the visitor to choose, or from prerendered
or cached HTML. Set `scriptLoader: { serverStart: false }` to start every entry
after hydration, as before.
