---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(@c15t/astro)
  "@c15t/backend":
    replay:
      - exit-prerelease(@c15t/backend)
  "@c15t/browser":
    replay:
      - exit-prerelease(@c15t/browser)
  "@c15t/cli":
    replay:
      - exit-prerelease(@c15t/cli)
  "@c15t/core":
    replay:
      - exit-prerelease(@c15t/core)
  "@c15t/dev-tools":
    replay:
      - exit-prerelease(@c15t/dev-tools)
  "@c15t/iab":
    replay:
      - exit-prerelease(@c15t/iab)
  "@c15t/logger":
    replay:
      - exit-prerelease(@c15t/logger)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(@c15t/nextjs)
  "@c15t/node-sdk":
    replay:
      - exit-prerelease(@c15t/node-sdk)
  "@c15t/react":
    replay:
      - exit-prerelease(@c15t/react)
  "@c15t/schema":
    replay:
      - exit-prerelease(@c15t/schema)
  "@c15t/scripts":
    replay:
      - exit-prerelease(@c15t/scripts)
  "@c15t/svelte":
    replay:
      - exit-prerelease(@c15t/svelte)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(@c15t/tanstack-start)
  "@c15t/translations":
    replay:
      - exit-prerelease(@c15t/translations)
  "@c15t/ui":
    replay:
      - exit-prerelease(@c15t/ui)
  "@c15t/vue":
    replay:
      - exit-prerelease(@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(c15t)
---

### Introduce c15t v3

This v3 alpha is for internal use only. APIs are unstable, and breaking changes will occur between alpha releases.

Introduce the c15t umbrella package, shared consent runtime and policy rules, rewritten backend, and new framework and script-tag integrations. Update the CLI, IAB support, DevTools, and shared styles for v3.

Packages now ship ESM only. Keep related packages on compatible v3 alpha versions.

Export `defineTheme` and the `Theme` type from the React, Next.js, TanStack Start, and Vue entries so themes can use the same imports as their framework integration.

Restrict iframe-blocker URL activation to HTTP and HTTPS. Replace backtracking URL and theme parsing expressions, correct the PostHog hostname boundary, and fix CLI layout detection for nested route groups and locale directories.

Serve a stale consent manifest from the server adapters' in-process cache inside the backend's `stale-while-revalidate` window while one background request revalidates it, instead of blocking every request after `s-maxage` expires; a failed or timed-out revalidation keeps the stale manifest. The backend sends its manifest cache policy as `CDN-Cache-Control` too, so Vercel's CDN forwards it. Add `onBackgroundRevalidate` to the core cache and every server adapter for runtimes that stop detached work after the response.
