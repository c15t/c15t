---
packages:
  '@c15t/cli': patch
---

### Point setup agents at upgrade guides that exist

The upgrade rules in `c15t setup --codex` and `createC15tSetupInstructions()`
sent Vue, Nuxt, Svelte, Astro and TanStack Start apps to the root
`/docs/upgrade-v3.md` guide, which has been removed. The agent now picks the
Next.js, React or JavaScript guide by the v2 package the app uses:
`@c15t/nextjs`, `@c15t/react` or the `c15t` store. An app that runs its own
`@c15t/backend` is pointed at the self-host upgrade guide.
