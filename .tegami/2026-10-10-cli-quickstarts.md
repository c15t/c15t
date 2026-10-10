---
packages:
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Framework generation writes the quickstart files

`setup --framework <target>` (and `generate`) now writes the same files the
framework quickstarts show, at the same paths, instead of wrapper files in
`src/consent/`. For example, `--framework next-app` writes `.env`,
`next.config.ts`, `c15t.config.ts` and `app/layout.tsx`.

```bash
npx @c15t/cli@alpha setup hosted --framework react --backend-url https://your-project.inth.app --apply
```

- Hosted mode writes the backend URL to `.env` under the framework's public
  env var (`NEXT_PUBLIC_C15T_BACKEND_URL`, `NUXT_PUBLIC_C15T_BACKEND_URL`,
  `PUBLIC_C15T_BACKEND_URL` or `VITE_C15T_BACKEND_URL`). An existing `.env`
  keeps its other keys. One that already sets the matching
  `*_INTH_PROJECT_URL` gets no c15t variable, which would override it. The
  CLI never creates or edits `.gitignore`.
- Generated code uses the v3 API only: `manifest()`, `hosted()` and
  `offline()`, `defineConsentConfig`, `withConsentManifest`, `ConsentRoot`
  and `ConsentDialogLink`. Templates that pass a backend URL in code write
  `hosted({ backendURL })`, not `hosted({ url })`. The Astro templates write
  `ConsentDialogLink` instead of `ConsentDialogTrigger`, and the TanStack
  Start template no longer writes `initRoute`.
- New targets: `astro-static` (static output, `hosted()`) and `html` (the
  `c15t.js` script tag). `--boilerplate` picks `astro` or `astro-static` from
  whether the project has a server adapter.
- An existing file with other contents stops generation and is listed in the
  error. Pass `--overwrite` to replace it. `.env`, `index.html` and
  SvelteKit's `src/app.d.ts` get the c15t lines added instead.
- Removed: `--output` and the generated `README.md`. In `@c15t/cli/generate`,
  `GenerateOptions.output` is gone, and plans gain a `merge` map with a
  `mergeFile()` helper for files the project already has.

The `consent-provider-options` codemod writes `hosted({ backendURL })`
instead of `hosted({ url })`. It imports `hosted()` and `offline()` from
`c15t/react` (or `@c15t/react`) when the provider comes from a Next.js or
TanStack Start entry, whose `hosted()` is plain data for
`defineConsentConfig`. It also leaves an existing `manifest()` mode alone.
