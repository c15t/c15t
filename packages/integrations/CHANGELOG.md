## @c15t/integrations@3.0.0-alpha.11 (alpha)

### Add a Vercel Speed Insights integration

`vercelSpeedInsights()` from `@c15t/integrations/vercel-speed-insights` loads
Vercel's Web Vitals collector once measurement is allowed. The collector keeps
running after its script is removed, so on revocation the helper also drops
every report through Speed Insights' `beforeSend` hook. Pass your own
`beforeSend` to edit reports while measurement is allowed. Remove
`<SpeedInsights />` or `injectSpeedInsights()` from `@vercel/speed-insights`
when you switch. The CLI offers Vercel Speed Insights in its integration picker.

## @c15t/integrations@3.0.0-alpha.10 (alpha)

### Log and skip a helper with a missing vendor ID instead of throwing

Helpers that need an account ID, such as `posthog()`, `googleTagManager()` and
`metaPixel()`, threw when the ID was empty or only whitespace. IDs usually come
from environment variables, so a blank `VITE_POSTHOG_KEY=` threw while the app
rendered and took the consent banner down with it.

These helpers now log an error such as
`posthog: missing or invalid id. The script will not load.` with
`console.error` and return a script that never loads. The rest of the page,
including the consent UI, keeps working, and the vendor stays listed in the
preference center. An ID in the wrong format, such as a
malformed Mixpanel token, LogRocket app ID or Klaviyo public key, is handled the
same way, with the existing message.

Other configuration mistakes, such as a non-https `scriptUrl` override or an
invalid RudderStack consent mapping, still throw. `@c15t/scripts` re-exports
these helpers and behaves the same way.

### Load the Google tag and Google Tag Manager only after consent

`gtag()` and `googleTagManager()` take a `loadMode` option, with the same
values as `posthog()`. The default, `'always'`, keeps today's behavior: the
script loads before a choice and sends Google Consent Mode signals.

With `loadMode: 'after-consent'`, the helper sends no request to Google and
creates no `dataLayer` until its category is allowed. The script then loads
once. The `consent` `default` command still comes first, with the visitor's
current choices, and later changes send `update`. Visitors whose category is
denied send Google nothing, so Consent Mode cannot model their conversions.

The helper waits for the category to be allowed, not for a recorded choice.
Under an `opt-in` policy, that means after the visitor allows it. Under an
`opt-out` or `none` policy, optional categories are allowed before a choice,
so the script loads on the first page.

`gtag()` waits for its `category`. `googleTagManager()` gains a `category`
option. With `'after-consent'` it defaults to
`{ or: ['measurement', 'marketing'] }`, so the container loads once the
visitor allows either; pass `'measurement'` for a container with only
Analytics tags. With `'always'` the default stays `'necessary'`.

```ts
gtag({ id: 'G-XXXXXXXXXX', category: 'measurement', loadMode: 'after-consent' });
googleTagManager({ id: 'GTM-XXXXXXX', loadMode: 'after-consent' });
```

## @c15t/integrations@3.0.0-alpha.8 (alpha)

### List integration vendors in the preference dialog

`@c15t/integrations` helpers now set `vendorDetails` (name and privacy policy)
on their scripts, so the dialog gives each vendor its own switch without a
`vendors` declaration. A vendor declared in `vendors` or by the backend still
replaces these details.

## @c15t/integrations@3.0.0-alpha.6 (alpha)

### Add a Sentry integration

Add `sentry()` from `@c15t/integrations/sentry`, with CDN and app-managed SDK modes,
CLI setup and the `@c15t/scripts/sentry` compatibility export. Errors run before
consent by default; Replay and SDK data collection wait for measurement.
`loadMode: 'after-consent'` gates errors too.

Apply consent at initialization and before sending data. Withdrawal stops Replay
without flushing pending recordings. Shared configurations coordinate consent and
reuse the SDK bundle and recorder across renders.

Add core `Script.observeConsentBeforeLoad` and `Script.resourceKey`. Shared
resources retain each registration's callbacks, consent and ownership, including
registrations that join after loading completes.

### Stop the first vendor helper call from loading the ICU collator

Integration helpers such as `googleTagManager()` and `metaPixel()` built their
manifest cache key by sorting config keys with `localeCompare`. The first
`localeCompare` call in a page makes the browser set up its collator, so a page
that had not compared strings yet paid for it on the first helper call. The
cache key now sorts keys with a plain comparison.

The preference draft's vendor list sort had the same problem. It now uses
`compareCanonical` like the rest of core, so mounting a preference center no
longer loads the collator either.

In headless Chromium with 4x CPU throttling, a page that calls the GTM, GA4 and
Meta Pixel helpers spends about 30 ms less on the main thread during load.

## @c15t/integrations@3.0.0-alpha.4 (alpha)

### Turn off PostHog modules you do not use

`posthog()` from `@c15t/integrations/posthog` takes a `features` option with `surveys`, `heatmaps`, `deadClicks`, `webVitals` and `featureFlags` switches. Set one to `false` and PostHog skips that feature's module or its `/flags` requests. `surveys: false` is the only way to skip `surveys.js`, which PostHog downloads even when surveys are off in the project. Unset switches keep today's behavior, and `initOptions` still wins over a switch for the same key.

## @c15t/integrations@3.0.0-alpha.3 (alpha)

### Add a Klaviyo integration

`klaviyo()` from `@c15t/integrations/klaviyo` loads Klaviyo.js, which serves both signup forms and onsite tracking, only once marketing and measurement are both allowed. Pass `category` to use a different consent condition. `mode: 'forms-only'` loads on marketing alone and sets Klaviyo's `__kla_off` cookie before the bundle runs, so forms render while Klaviyo's web tracking stays off. The helper installs Klaviyo's queued `klaviyo` object and sends no `identify` or `track` calls of its own. Unlike Klaviyo's snippet, awaiting, serializing or stringifying that object before Klaviyo.js loads queues nothing, so it cannot stall the calls queued after it.

Registry entries can now declare a compound consent condition in `consentCategory`, such as `{ and: ['marketing', 'measurement'] }`, and there is a new `email-and-sms` integration category. Code that reads `consentCategory` as a string must handle the object form. The CLI offers Klaviyo in its integration picker.

### Ship a c15t skill and the v3 guides in every package

Each package now ships a `SKILL.md` next to `AGENTS.md`, telling coding agents
how to pick a setup, which rules to follow and how to verify consent, with
links into the bundled Markdown. `@c15t/core`, `@c15t/react`, `@c15t/nextjs`,
`@c15t/scripts`, `@c15t/browser`, `@c15t/integrations` and `@c15t/cli` publish
it for the first time.

The bundled docs follow the rewritten v3 guides: concept pages, a setup
chooser, a full page set for every framework, and a new HTML guide for the
script tag in `@c15t/browser`. `@c15t/iab` points its homepage and README at
the new IAB page.

### Fix consent handling, IDs and loader URLs in vendor helpers

Amplitude now queues `setOptOut(false)` when it loads with measurement consent, so an opt-out Amplitude saved in its cookie after an earlier revocation no longer keeps tracking off. The Amplitude script now stays on the page after revocation (`persistAfterConsentRevoked: true`) and a later grant calls `setOptOut(false)` on the running SDK instead of loading the bundle a second time.

Heap keeps the methods of a running heap.js when measurement consent is granted again without a page reload, instead of replacing them with queue stubs.

Matomo with `defaultConsent: 'given'` queues `setConsentGiven` and the initial page view only when the visitor has measurement consent as the script loads, and queues `requireConsent` otherwise. Vendor helpers now run their consent-granted and consent-denied steps only when that vendor's consent changes, so a change to an unrelated category no longer queues another Matomo page view.

Umami receives an array of `domains` as the comma-separated `data-domains` list its tracker reads, instead of a JSON array.

`xPixelEvent`, `metaPixelEvent`, `metaPixelCustomEvent`, `metaPixelSingleEvent` and `metaPixelSingleCustomEvent` now do nothing when the pixel global is missing, like the other event helpers. `xPixelEvent` no longer throws before marketing consent.

The TikTok Pixel records the pixel in `ttq._i`, `ttq._t` and `ttq._o` the way `ttq.load()` does in TikTok's base code, and grants TikTok consent once instead of twice.

Helpers with a required ID now throw `<helper>: missing or invalid <option>` when the ID is empty or only whitespace: `metaPixel`, `tiktokPixel`, `snapchatPixel`, `pinterestTag`, `redditPixel`, `xPixel`, `linkedinInsights`, `microsoftUet`, `openaiPixel`, `googleTagManager`, `gtag`, `posthog`, `databuddy`, `fathomAnalytics`, `crisp` and `intercom`. These IDs are also trimmed. An empty or whitespace-only `scriptUrl` or `scriptSrc` now counts as unset and uses the vendor's default loader.

Crisp keeps a `window.$crisp` queue the page filled before the helper ran.

`cloudflareZaraz` now sets `vendor: 'cloudflare-zaraz'`, so visitors can turn it off like other vendors. While it is off, every Zaraz purpose mapped to an optional category is denied.

### Rename the vendor integrations package

Replace `@c15t/scripts` with `@c15t/integrations` in v3 dependencies and imports.
Vendor subpaths, helper names, and the `scripts` configuration option stay the
same. `@c15t/scripts` remains available as a deprecated compatibility package
throughout v3, re-exporting the same implementation and types. Compatibility
ends in v4; previously published versions remain available on npm.

The CLI installs and imports `@c15t/integrations` in generated applications.
Run `c15t codemods scripts-to-integrations --dry-run --json` to preview import
changes in JavaScript and TypeScript files, then repeat without `--dry-run` to
apply them. Update package dependencies and Vue or Svelte component imports
separately.
