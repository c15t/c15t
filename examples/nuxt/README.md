# c15t × Nuxt example

Minimal `@c15t/vue` integration: one module entry in `nuxt.config.ts`, one
`<ConsentRoot />` in `app.vue`.

```bash
bun install
bun run dev
```

Point `NUXT_PUBLIC_C15T_BACKEND_URL` at your instance (defaults to a demo
backend). `manifest: true` enables same-origin, CDN-cacheable consent
resolution — see `internals/rfcs/0001-consent-manifest.md`. The banner is
server-rendered into the first HTML with zero CLS; live state is read via
auto-imported composables (`useConsentActiveUI`, `useHasConsent`,
`useConsentInit`).
