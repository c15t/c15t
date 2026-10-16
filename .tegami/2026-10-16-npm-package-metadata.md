---
packages:
  '@c15t/astro': patch
  '@c15t/backend': patch
  '@c15t/browser': patch
  'c15t': patch
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

### Clearer npm descriptions and keywords

Each package's npm description now says what it does in the words people
search for, such as cookie consent, cookie banner, GDPR, Google Consent Mode v2
and IAB TCF. Keywords add common search terms while preserving existing
framework, brand and integration terms. The schema and UI packages now link
to their directories in the repository. Framework, browser and core READMEs
now explain how consent policies handle GDPR and other privacy laws before
the setup instructions.
