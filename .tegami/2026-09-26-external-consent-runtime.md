---
packages:
  '@c15t/core': minor
  '@c15t/astro': minor
  '@c15t/scripts': minor
---

### Share script lifecycle with external consent providers

Add an external consent source to the shared runtime and Astro client entrypoint. Provider decisions update effective gates without creating c15t receipts or mounting a second persistence layer. Add optional reload handling for withdrawal and forward Astro lifecycle callbacks.

Add consent-aware custom event and SPA pageview dispatch to the script SDK, preserve Google tag configuration, support custom GTM data layers and Segment load options, and declare the script SDK's core runtime dependency for isolated package installations.
