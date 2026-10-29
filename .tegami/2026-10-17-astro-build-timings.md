---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Diagnose slow Astro consent setup

Add troubleshooting guidance for Astro 7.4's build timing report. Explain
where to find c15t's setup hook duration, how it includes manifest loading,
and how to investigate a slow build-time manifest request.
