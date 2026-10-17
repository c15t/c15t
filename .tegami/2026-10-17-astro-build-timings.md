---
packages:
  '@c15t/astro': patch
  c15t: patch
---

### Diagnose slow Astro consent setup

Add troubleshooting guidance for Astro 7.4's build timing report. Explain
where to find c15t's setup hook duration, how it includes manifest loading,
and how to investigate a slow build-time manifest request.
