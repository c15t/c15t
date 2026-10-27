---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/dev-tools":
    replay:
      - exit-prerelease(npm:@c15t/dev-tools)
  "@c15t/iab":
    replay:
      - exit-prerelease(npm:@c15t/iab)
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/node-sdk":
    replay:
      - exit-prerelease(npm:@c15t/node-sdk)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/translations":
    replay:
      - exit-prerelease(npm:@c15t/translations)
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
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
