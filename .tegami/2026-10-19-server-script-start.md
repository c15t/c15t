---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
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
