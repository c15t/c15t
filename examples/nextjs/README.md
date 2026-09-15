# Next.js consent example

One application demonstrates c15t with App Router and Pages Router, a gated
YouTube video, PostHog, X Pixel, three banner designs and persistent preferences.
It uses the public `c15t/next` integration and a cached Inth manifest.

## Run

From the repository root, install and build the workspace dependencies. Then:

```sh
cd examples/nextjs
cp .env.example .env.local
bun run dev
```

Set `NEXT_PUBLIC_C15T_BACKEND_URL` to the exact endpoint from your Inth project.
Configure its policy with measurement and marketing categories, an
unknown-location rule, and trusted origins for `http://localhost:3011` and your
production host. This demo overrides the visitor location to the United Kingdom
using `country: 'GB'` in `demoLocation`. Remove that override to use trusted
geography headers from your deployment platform.

Open `http://localhost:3011/app-router`. For a production build:

```sh
bun run build
bun run start --port 3011
```

Public environment values are included in the client build. Rebuild after
changing them. Optional `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
and `NEXT_PUBLIC_X_PIXEL_ID` configure your test projects. Without an ID, that
integration is disabled and labelled "Not configured".

## Follow the setup files

- `c15t.config.ts` shares the backend and explicit manifest URL. There is no
  local init route or backend rewrite.
- `app/api/c15t/manifest/route.ts` serves the cached public manifest for both
  routers. The handler uses the backend environment variable configured above.
- `app/app-router/layout.tsx` awaits server prefetch before rendering
  the boundary, so consent UI is included in the initial HTML.
- `pages/pages-router.tsx` awaits the Pages Router helper in `getServerSideProps`.
  `pages/_app.tsx` passes `initialConsent` to the same client wrapper.
- `app/client-init/page.tsx` skips prefetch. The browser resolves the manifest,
  using the same UK location override.
- `components/consent.tsx` registers scripts, consent UI and DevTools once.
- `components/demo.tsx` shows the iframe, permission indicators and footer link.
- `lib/theme.ts` and `components/custom-banner.tsx` contain the branded theme
  and compound banner. Custom markup retains policy-defined copy and actions.

Each router owns one boundary. Navigation between routers reloads the document;
choices survive through c15t persistence. The gallery owns one `usePersistence()`
instance so its Reset demo button can call `clear()`. The boundary's automatic
persistence is disabled to avoid creating a second owner. Reset clears c15t
records for this site and reloads, removing previously executed vendor code.
It does not delete records already submitted to Inth.

## Try the behavior

1. Start with an opt-in policy and no saved choice. The video should be replaced
   by its placeholder; configured PostHog and X Pixel integrations are blocked.
2. Allow measurement only. YouTube and PostHog can load; X Pixel stays blocked.
3. Open Privacy settings in the footer and revoke measurement. The iframe is
   removed. Already-sent vendor requests cannot be undone.
4. Reject, reload, then switch routers. Your saved choice should remain.
5. Switch Default, Branded and Custom designs. Reset to see a dismissed banner
   again. The policy's actions remain the same across designs.
6. Enable the floating preferences trigger and inspect c15t DevTools.

PostHog uses `loadMode: 'after-consent'`, so its SDK waits for measurement
permission. X Pixel waits for marketing. The indicators show effective
permission, not successful delivery into either vendor's dashboard. DevTools is
included deliberately in this demo, including production builds.

The video is `https://www.youtube-nocookie.com/embed/czTksCF6X8Y`. The `Frame`
component keeps its iframe unmounted until measurement is allowed. A nocookie
URL is still a third-party request once loaded.

Browser acceptance tests should intercept vendor and YouTube requests with
fixtures for deterministic results. Check actual playback separately with the
live video. Backend initialization failures must not grant optional permissions.
