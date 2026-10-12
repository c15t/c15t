---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/scripts":
    replay:
      - exit-prerelease(npm:@c15t/scripts)
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
  "@c15t/iab":
    replay:
      - exit-prerelease(npm:@c15t/iab)
---

### Ship a c15t skill and the v3 guides in every package

Each package ships a `SKILL.md` next to `AGENTS.md` that tells coding agents how
to pick a setup and verify consent, with links into the bundled Markdown.
`@c15t/core`, `@c15t/react`, `@c15t/nextjs`, `@c15t/scripts`, `@c15t/browser`,
`@c15t/integrations` and `@c15t/cli` publish it for the first time. The bundled
docs follow the rewritten v3 guides, including a new HTML guide for the
`@c15t/browser` script tag.
