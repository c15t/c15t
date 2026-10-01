# Next.js consent example

One application demonstrates c15t with the App Router and the Pages Router, a
gated YouTube video, PostHog, X Pixel, a branded design and persistent
preferences. It uses the public `c15t/next` integration and a cached Inth
manifest. The setup code in the Next.js docs is published from marked regions
in these files.

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
production host. Local requests carry no geography headers, so the example
shows your unknown-location rule until you deploy to a host that sends them.

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

- `c15t.config.ts` shares the backend and explicit manifest URL.
- `app/api/c15t/manifest/route.ts` serves the cached public manifest for both
  routers.
- `components/consent.tsx` is the client wrapper: `ConsentRoot`, scripts,
  banner, dialog and the Privacy settings link. Layouts pass it only `state`.
- Each App Router route group has its own root layout:
  - `app/(streamed)/layout.tsx` starts `resolveConsent` without awaiting it,
    for `/app-router` and `/branded`. The page renders first and the banner
    mounts after hydration.
  - `app/(awaited)/layout.tsx` awaits `resolveConsent` inside `Suspense`, for
    `/awaited`. The banner is part of the server HTML.
  - `app/(browser)/layout.tsx` passes `state={{}}`, for `/client-init`. The
    page is static and the browser resolves the manifest.
- `pages/pages-router.tsx` resolves consent in `getServerSideProps`, and
  `pages/_app.tsx` passes `initialConsent` to the same wrapper.
- `app/(streamed)/branded/layout.tsx` renders `ConsentTheme` with the theme in
  `lib/theme.ts`.
- `components/demo.tsx` is demo-only: the gallery, gated iframe, permission
  indicators, the floating trigger toggle and c15t DevTools.

Moving between route groups or routers loads the whole page. Choices survive
through c15t persistence. To start over, open c15t DevTools, choose
**Clear stored records**, and reload. Clearing does not delete records already
submitted to Inth.

## Try the behavior

1. Start with an opt-in policy and no saved choice. The video shows its
   placeholder, and configured PostHog and X Pixel integrations are blocked.
2. Allow measurement only. YouTube and PostHog can load; X Pixel stays blocked.
3. Open Privacy settings in the footer and revoke measurement. The page
   reloads and the iframe is gone. Already-sent vendor requests cannot be
   undone.
4. Reject, reload, then switch routes. Your saved choice remains.
5. Open the branded design. The policy's actions and your choice stay the same.
6. Enable the floating preferences trigger and inspect c15t DevTools.

## Banner experiment

`/experiment` runs the banner-shape experiment with the arm resolved on the
server. Its layout, `app/(experiment)/layout.tsx`, asks `lib/flags.ts` for the
arm and passes it to `resolveConsent`, so the banner in the server HTML
already shows that arm. `lib/flags.ts` stands in for a flag provider and reads
`?arm=` from a header that `proxy.ts` sets: `?arm=wall` runs the `wall` arm,
`?arm=off` leaves the visitor out, and anything else runs `control`.
`components/experiment-consent.tsx` adds `onSurfaceShown` and
`onChoiceRecorded` callbacks that list each impression and choice under the
arm and push them to `window.dataLayer` as `c15t_surface_shown` and
`c15t_choice_recorded`. See
https://c15t.com/docs/guides/banner-experiments.

PostHog uses `loadMode: 'after-consent'`, so its SDK waits for measurement
permission. X Pixel waits for marketing. The indicators show effective
permission, not successful delivery into either vendor's dashboard. DevTools is
included deliberately in this demo, including production builds.

The video is `https://www.youtube-nocookie.com/embed/czTksCF6X8Y`. The
`ConsentGate` component keeps its iframe unmounted until measurement is
allowed. A nocookie URL is still a third-party request once loaded.

Browser acceptance tests in `examples/shared` intercept vendor and YouTube
requests with fixtures for deterministic results. Check actual playback
separately with the live video. Backend initialization failures must not grant
optional permissions.
