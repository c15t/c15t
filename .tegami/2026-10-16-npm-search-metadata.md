---
packages:
  c15t: patch
  '@c15t/astro': patch
  '@c15t/backend': patch
  '@c15t/browser': patch
  '@c15t/cli': patch
  '@c15t/core': patch
  '@c15t/dev-tools': patch
  '@c15t/iab': patch
  '@c15t/integrations': patch
  '@c15t/nextjs': patch
  '@c15t/node-sdk': patch
  '@c15t/react': patch
  '@c15t/schema': patch
  '@c15t/svelte': patch
  '@c15t/tanstack-start': patch
  '@c15t/translations': patch
  '@c15t/ui': patch
  '@c15t/vue': patch
---

### Rewrite npm descriptions for search

npm search scores a phrase in the description far above the same words in
keywords or the README. Each package description now names the phrases
people search for that package: "cookie banner", "cookie consent manager",
"consent management platform" and "Google Consent Mode v2" on `c15t`,
"React cookie banner" on `@c15t/react`, "Vue cookie consent" on `@c15t/vue`,
and so on. `c15t` keeps "The open standard for cookie banners". Supporting
packages describe their role in c15t instead of repeating the main
package's phrases. Keyword lists are shorter. No code changes.
