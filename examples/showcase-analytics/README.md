# Analytics and marketing stack

Northwind's shop with Google Tag Manager, GA4, PostHog and the Meta Pixel
wired through `@c15t/integrations`. Open the c15t DevTools panel and watch
each script wait for consent, then load. Adding a coffee to the cart sends an
`add_to_cart` event only to the tools the visitor allows, and the toast says
where it went.

## Files

- `lib/scripts.ts` registers the four helpers and declares each vendor for
  the preference dialog. The IDs are placeholders, with a comment on where to
  find your own.
- `lib/use-track-add-to-cart.ts` sends the cart event. `createEventDispatcher`
  delivers it to GTM, GA4 and PostHog while measurement is allowed. The Meta
  `AddToCart` event goes out only while `useVendorAllowed('meta-pixel')` is
  true.
- `components/consent.tsx` is the `ConsentRoot` with the scripts, the
  revocation callback, `clearOnRevocation` and DevTools, which loads only in
  development.

## What loads when

| Vendor | Category | Before a choice | After it is allowed |
| --- | --- | --- | --- |
| Google Tag Manager | necessary | `gtm.js` loads, every Consent Mode type `denied` | `consent update`, then a `consent-update` event |
| GA4 (`gtag`) | measurement | `gtag/js` loads, `analytics_storage` `denied` | `analytics_storage` `granted` |
| PostHog | measurement | Nothing | `array.js` loads and capture starts |
| Meta Pixel | marketing | Nothing, not even `fbq` | `fbevents.js` loads and sends `PageView` |

The two Google helpers load before a choice on purpose. That is how Consent
Mode v2 works: Google's tags start in a denied state and adjust when c15t
sends an update. If your policy allows no Google request before consent,
don't use these helpers unchanged. Most sites configure GA4 inside their GTM
container. This shop loads it separately so you can watch both helpers.

## When a visitor withdraws consent

Taking consent back can't unload code. Once the Meta Pixel has run, its
listeners, timers and queued events stay in the page, and removing the
`<script>` element doesn't stop them.

So when a visitor turns off a category they had allowed, `ConsentRoot`
reloads the page. The new page never starts the Meta Pixel. Turn off
marketing in Privacy settings and you'll see:

1. Before the reload, the helper calls `fbq('consent', 'revoke')`, and
   `useVendorAllowed('meta-pixel')` turns false, so the next add to cart sends
   no `AddToCart`, although `window.fbq` still exists.
2. c15t calls `onBeforeConsentRevocationReload`. This shop uses it to leave a
   note for the next page.
3. The page reloads. `fbevents.js` doesn't load, `fbq` is undefined and
   `clearOnRevocation` deletes the `_fbp` and `_fbc` cookies. A short notice
   confirms the change.

Withdrawing measurement works the same way. Before the reload PostHog gets
`opt_out_capturing()` and Google gets a Consent Mode `update` with
`analytics_storage` set to `denied`.

To handle revocation without a reload, set `reloadOnConsentRevoked: false`
and stop each vendor yourself through its opt-out API. Only do that when every
vendor you load has one.

## Run

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/showcase-analytics dev
```

Open `http://localhost:3113`. The DevTools button sits in the bottom right
corner and opens on the Scripts tab.

The shop runs in offline mode, so it needs no account: c15t's bundled policy
rules show the opt-in banner, and choices stay in this browser. For
production, replace `offline()` in `components/consent.tsx` with
`hosted({ url: 'https://your-project.inth.app' })`.

The placeholder IDs belong to no real account. GTM answers `gtm.js` with a
404, which DevTools shows as an error, PostHog can't find the project's
config, and the Meta Pixel logs an invalid pixel ID. Put your own IDs in
`lib/scripts.ts` to see real loads.

## Docs

- [Google Tag Manager](https://c15t.com/docs/integrations/google-tag-manager),
  [Google Tag](https://c15t.com/docs/integrations/google-tag),
  [PostHog](https://c15t.com/docs/integrations/posthog) and
  [Meta Pixel](https://c15t.com/docs/integrations/meta-pixel)
- [Send events only to allowed integrations](https://c15t.com/docs/integrations/overview#send-events-only-to-allowed-integrations)
- [Next.js scripts](https://c15t.com/docs/frameworks/next/scripts) and
  [reload after revocation](https://c15t.com/docs/frameworks/next/components/consent-root#reload-after-revocation)
- [DevTools](https://c15t.com/docs/frameworks/next/components/dev-tools)
