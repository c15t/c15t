---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/dev-tools":
    replay:
      - exit-prerelease(npm:@c15t/dev-tools)
---

### Share script lifecycle with external consent providers

The framework-independent runtime, React, Vue and Nuxt, Svelte and SvelteKit,
browser and Astro entrypoints accept an external consent source. Next.js and
TanStack Start get it through the React options. The provider's decisions update
consent gates without creating c15t receipts, and preference controls route to
the external provider. When the source withdraws a granted category, the page
reloads under the existing `reloadOnConsentRevoked` option and
`onBeforeConsentRevocationReload` callback. External permissions disable c15t
IAB authority, and IAB saves owned by an external CMP are rejected. If
subscribing to the external CMP fails, startup continues with optional
permissions denied.

The script SDK adds consent-aware custom events and SPA pageviews, supports
custom GTM data layers and Segment load options, and delivers events to the
built-in Umami, Rybbit and Matomo integrations.
