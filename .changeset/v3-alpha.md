---
'@c15t/astro': major
'@c15t/backend': major
'@c15t/browser': major
'@c15t/cli': major
'@c15t/core': major
'@c15t/dev-tools': major
'@c15t/iab': major
'@c15t/logger': major
'@c15t/nextjs': major
'@c15t/node-sdk': major
'@c15t/react': major
'@c15t/schema': major
'@c15t/scripts': major
'@c15t/svelte': major
'@c15t/tanstack-start': major
'@c15t/translations': major
'@c15t/ui': major
'@c15t/vue': major
'c15t': major
---

This v3 alpha is for internal use only. APIs are unstable, and breaking changes will occur between alpha releases.

Introduce the c15t umbrella package, shared consent runtime and policy rules, rewritten backend, and new framework and script-tag integrations. Update the CLI, IAB support, DevTools, and shared styles for v3.

Packages now ship ESM only. Keep related packages on compatible v3 alpha versions.

Export `defineTheme` and the `Theme` type from the React, Next.js, TanStack Start, and Vue entries so themes can use the same imports as their framework integration.

Restrict iframe-blocker URL activation to HTTP and HTTPS. Replace backtracking URL and theme parsing expressions, correct the PostHog hostname boundary, and fix CLI layout detection for nested route groups and locale directories.

Serve a stale consent manifest from the server adapters' in-process cache inside the backend's `stale-while-revalidate` window while one background request revalidates it, instead of blocking every request after `s-maxage` expires; a failed or timed-out revalidation keeps the stale manifest. The backend sends its manifest cache policy as `CDN-Cache-Control` too, so Vercel's CDN forwards it. Add `onBackgroundRevalidate` to the core cache and every server adapter for runtimes that stop detached work after the response.
