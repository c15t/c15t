## @c15t/integrations@3.2.2-canary.0 (canary)

### Consent provider works again in browsers before Safari 15.4

Since 3.0, the consent provider has used `structuredClone`, `Object.hasOwn`,
`Array.prototype.at` and `Array.prototype.findLast`. Safari 15.4 was the first
Safari to ship them, and Chrome added them between 92 and 98. Without them, the
provider failed to mount or the banner did not render: Chrome and Android
WebView before 98, Firefox before 104, Safari and iOS Safari before 15.4, and
Samsung Internet before 18.

c15t no longer calls these built-ins in browser code. You can remove a polyfill
you added only for c15t.

## @c15t/integrations@3.2.1

### Load Databuddy scripts with subresource integrity

`databuddy()` now loads date-versioned copies of `databuddy.js` and
`replay.js` from the `@databuddy/sdk` 3.4.2 release, each with an `integrity`
attribute. The browser does not run a file that has changed on the CDN. A
custom `scriptUrl` or `replay.scriptUrl` loads without `integrity`, as before.
Pass `version` to load another Databuddy release, such as
`version: '2026-10-01.1'`. Other versions load without `integrity`.
If your Content Security Policy lists the exact Databuddy script URLs, allow
the new file names under `https://cdn.databuddy.cc/`.

### Consent provider works again in browsers before Safari 15.4

Since 3.0, the consent provider has used `structuredClone`, `Object.hasOwn`,
`Array.prototype.at` and `Array.prototype.findLast`. Safari 15.4 was the first
Safari to ship them, and Chrome added them between 92 and 98. Without them, the
provider failed to mount or the banner did not render: Chrome and Android
WebView before 98, Firefox before 104, Safari and iOS Safari before 15.4, and
Samsung Internet before 18.

c15t no longer calls these built-ins in browser code. You can remove a polyfill
you added only for c15t.

## @c15t/integrations@3.2.0

### Record Databuddy sessions with the `replay` option

`databuddy({ clientId: 'YOUR_CLIENT_ID', replay: true })` loads Databuddy's
session replay recorder, `replay.js`, while measurement is allowed. Recordings
mask page text and typed input. Pass `replay: { maskText: false }` to record
page text on pages that show no personal data, or `recordIframes: true` to
record your own embedded pages. On revocation the helper calls
`window.databuddyReplay.stop()` and removes the script, so recording stops
without waiting for a page reload.
Remove any `replay.js` script you registered yourself. See the
[Databuddy guide](https://c15t.com/docs/integrations/databuddy).

### Add Gainsight PX consent integration

Load Gainsight PX after measurement consent with the `gainsightPx` helper.

### Add consent-gated FullStory loading

Load FullStory after measurement consent with the `fullStory` helper.

### Add HubSpot consent integration

Load HubSpot after marketing consent with the `hubspot` helper.

### Add consent-gated ActiveCampaign loading

Load ActiveCampaign site tracking after marketing consent with the `activeCampaignTracking` helper.

### Add consent-gated Oracle Eloqua loading

Load Oracle Eloqua after marketing consent with the `eloquaTracking` helper.

### Load Databuddy after consent and turn off features you do not use

`databuddy()` now waits for `measurement` consent before it loads
`databuddy.js`, like most c15t analytics helpers. Until the visitor allows
measurement, the page makes no request to Databuddy and Databuddy stores
nothing in the browser. Pass `loadMode: 'always'` to keep loading Databuddy on
every page, as before.

New `features` switches turn Databuddy's interaction tracking, Web Vitals,
error tracking and outgoing link tracking on or off. `configWhenGranted` and
`configWhenDenied` are now optional.

The guide also shows how to load Databuddy's session replay script only with
measurement consent. See the
[Databuddy guide](https://c15t.com/docs/integrations/databuddy).

### Group built-in integrations by kind of tool

Add `IntegrationKind`, `BUILT_IN_INTEGRATION_KINDS` and an `integrationKind`
field on built-in registry entries for the groups used in the integrations
docs: web analytics, product analytics, replay and monitoring, experimentation
and personalization, ads and growth, data and tags, and chat and embeds.
These additions are also available through `@c15t/scripts/registry`.

The existing `IntegrationCategory` type, `BUILT_IN_INTEGRATION_CATEGORIES`
list and each entry's `integrationCategory` keep their v3 values. Consent
categories and loading behavior are unchanged.

The `c15t generate` script picker orders integrations by the new kinds.

### Add Default consent integration

Load the Default Pixel after measurement consent with `defaultComPixel`, or the Forms SDK after functionality consent with `defaultComFormsSdk`.

### Add Amazon Ads consent integration

Load Amazon Ads after marketing consent with the `amazonAdsTag` helper.

### Add Gorgias Chat consent integration

`gorgiasChat()` from `@c15t/integrations/gorgias` loads Gorgias Chat only after `functionality` consent. Without `measurement` consent it turns off the widget's Segment analytics. Gorgias has no shutdown API, so revocation relies on c15t's page reload. The CLI can add it during setup. See [Other chat and support tools](https://c15t.com/docs/integrations/other-chat-and-support#gorgias-chat).

### Add Salesforce Account Engagement integration

`pardotTracking` from `@c15t/integrations/salesforce-pardot` loads Salesforce Account Engagement (Pardot) after `marketing` consent. In the default consent mode, withdrawing consent calls Pardot's `revokeConsent` and reloads the page.

### Add Dynamic Yield consent integration

`dynamicYield()` from `@c15t/integrations/dynamic-yield` loads Dynamic Yield after `experience` consent and sends the choice through Dynamic Yield's Active Cookie Consent API. The CLI can add it during setup.

### Add Marketo Munchkin integration

`marketoMunchkin` from `@c15t/integrations/marketo` loads Adobe Marketo Munchkin after `marketing` consent. Munchkin has no API to stop tracking, so withdrawing consent reloads the page.

### Add LiveIntent consent integration

Load LiveIntent's LiveConnect tag after `marketing` consent with `liveIntentTag` from `@c15t/integrations/liveintent`. LiveConnect has no API to stop it, so keep the default page reload when consent is withdrawn. The CLI can now add it during setup.

### Add Customer.io integration

`customerIo` from `@c15t/integrations/customer-io` loads Customer.io Data Pipelines after `marketing` consent. Withdrawing consent clears the stored identity with `reset()` and reloads the page, because `reset()` does not stop the SDK from sending.

### Add Zendesk Messaging consent integration

`zendeskWidget()` from `@c15t/integrations/zendesk` loads Zendesk Messaging only after `functionality` consent. It sets Zendesk's cookie range to `all` with measurement consent and `functional` without it. On revocation it sends `none`, which hides the widget and clears its storage. The CLI can add it during setup. See [Other chat and support tools](https://c15t.com/docs/integrations/other-chat-and-support#zendesk-messaging).

### Add Vector

`vector` from `@c15t/integrations/vector` loads Vector after `marketing`
consent. Vector has no stop API, so keep the default page reload when consent
is withdrawn. The CLI can generate the integration too.

### Send c15t consent to Shopify

`@c15t/integrations/shopify` adds `createShopifyCustomerPrivacy`, a bridge that
sends each c15t choice to Shopify's Customer Privacy API. Pass its `setup` to
Hydrogen's `ShopifyScripts` with `consent: { mode: 'custom-banner' }`, and
Hydrogen holds analytics events until the visitor has answered the c15t
banner. Under an opt-out policy, Shopify applies its region defaults until the
visitor saves a choice. See the
[Shopify guide](https://c15t.com/docs/integrations/shopify).

### Add Lucky Orange

`luckyOrange` from `@c15t/integrations/lucky-orange` loads Lucky Orange after
`measurement` consent and sets its privacy consent status. Turn on Require
Consent in the Lucky Orange dashboard, and keep the default page reload when
consent is withdrawn. The CLI can generate the integration too.

### Add RB2B

`rb2b` from `@c15t/integrations/rb2b` loads RB2B after `marketing` consent.
RB2B has no stop API, so keep the default page reload when consent is
withdrawn. The CLI can generate the integration too.

### Add The Trade Desk consent integration

Load The Trade Desk Universal Pixel after `marketing` consent with `theTradeDeskPixel` from `@c15t/integrations/the-trade-desk`. The Trade Desk has no API to stop its SDK, so keep the default page reload when consent is withdrawn. The CLI can now add it during setup.

### Add Optimizely Web Experimentation consent integration

`optimizelyWeb()` from `@c15t/integrations/optimizely` loads Optimizely Web Experimentation after `experience` consent. On revocation, c15t removes the snippet and reloads the page. The CLI can add it during setup.

### Add Ada consent integration

`ada()` from `@c15t/integrations/ada` imports the Ada Messaging Web SDK only after `functionality` consent. On revocation it calls Ada's `stop()`, which removes the widget but keeps stored conversations. The CLI can add it during setup. See [Other chat and support tools](https://c15t.com/docs/integrations/other-chat-and-support#ada).

### Add AdRoll consent integration

Load AdRoll after `marketing` consent with `adrollPixel` from `@c15t/integrations/adroll`. AdRoll has no API to stop it, so keep the default page reload when consent is withdrawn. The CLI can now add it during setup.

### Add Appcues consent integration

`appcues()` from `@c15t/integrations/appcues` loads Appcues after `experience` consent. Use `onReady` to identify the visitor once the SDK loads. On revocation it calls `Appcues.reset()` and c15t reloads the page. The CLI can add it during setup.

### Add Statable analytics

`statableAnalytics` from `@c15t/integrations/statable-analytics` loads
Statable after `measurement` consent. Statable has no stop API, so keep the
default page reload when consent is withdrawn. The CLI can generate the
integration too.

### Add Insider One integration

`insiderTag` from `@c15t/integrations/insider` loads the Insider One tag after `marketing` consent, with optional user attributes, currency and page context. Withdrawing consent sends `gdpr_optin: false` to Insider and reloads the page.

### Add Clay consent integration

Load Clay after marketing consent with the `clay` helper, with vendor metadata, framework registration examples and CLI setup.

### Allowed scripts start from the server HTML

Next.js, TanStack Start, Nuxt and SvelteKit now start the `scripts` entries a
visitor's consent already allows from the server-rendered HTML, before the page
hydrates. An inline script runs after first paint and inserts their tags; the
script loader adopts them. On a throttled mobile profile, vendors started about
800 ms sooner. This covers React 18 and 19, and every vendor helper in
`@c15t/integrations` except Cloudflare Zaraz and Sentry.

Nothing starts while the policy asks the visitor to choose, or from prerendered
or cached HTML. Set `scriptLoader: { serverStart: false }` to start every entry
after hydration, as before.

### Rewrite npm descriptions for search

npm search scores a phrase in the description far above the same words in
keywords or the README. Each package description now names the phrases
people search for that package: "cookie banner", "cookie consent manager",
"consent management platform" and "Google Consent Mode v2" on `c15t`,
"React cookie banner" on `@c15t/react`, "Vue cookie consent" on `@c15t/vue`,
and so on. `c15t` keeps "The open standard for cookie banners". Supporting
packages describe their role in c15t instead of repeating the main
package's phrases. Keyword lists are shorter. No code changes.

### Add Adobe Target consent integration

`adobeTarget()` from `@c15t/integrations/adobe-target` loads Adobe Target after `experience` consent, using either a self-hosted at.js file or Adobe Experience Platform Web SDK 2.21 or later. On revocation it denies Target through Adobe's consent APIs; keep the page reload on to stop code that already ran. The CLI can add it during setup.

### Add Pendo

`pendo` from `@c15t/integrations/pendo` loads Pendo after `measurement`
consent. When consent is withdrawn it stops Pendo's event sending, and resumes
it with the same visitor if consent returns. The CLI can generate the
integration too.

### Add Attentive integration

`attentiveTag` from `@c15t/integrations/attentive` loads the Attentive tag after `marketing` consent. Attentive cannot be stopped once it runs, so withdrawing consent reloads the page.

### Add Wisepops consent integration

`wisepops()` from `@c15t/integrations/wisepops` loads Wisepops after `marketing` consent. Wisepops can't revoke consent from code, so c15t reloads the page on revocation. The CLI can add it during setup.

## @c15t/integrations@3.2.0-canary.0 (canary)

### Add Attentive integration

`attentiveTag` from `@c15t/integrations/attentive` loads the Attentive tag after `marketing` consent. Attentive cannot be stopped once it runs, so withdrawing consent reloads the page.

### Add Lucky Orange

`luckyOrange` from `@c15t/integrations/lucky-orange` loads Lucky Orange after
`measurement` consent and sets its privacy consent status. Turn on Require
Consent in the Lucky Orange dashboard, and keep the default page reload when
consent is withdrawn. The CLI can generate the integration too.

### Allowed scripts start from the server HTML

Next.js, TanStack Start, Nuxt and SvelteKit now start the `scripts` entries a
visitor's consent already allows from the server-rendered HTML, before the page
hydrates. An inline script runs after first paint and inserts their tags; the
script loader adopts them. On a throttled mobile profile, vendors started about
800 ms sooner. This covers React 18 and 19, and every vendor helper in
`@c15t/integrations` except Cloudflare Zaraz and Sentry.

Nothing starts while the policy asks the visitor to choose, or from prerendered
or cached HTML. Set `scriptLoader: { serverStart: false }` to start every entry
after hydration, as before.

### Add RB2B

`rb2b` from `@c15t/integrations/rb2b` loads RB2B after `marketing` consent.
RB2B has no stop API, so keep the default page reload when consent is
withdrawn. The CLI can generate the integration too.

### Add Wisepops consent integration

`wisepops()` from `@c15t/integrations/wisepops` loads Wisepops after `marketing` consent. Wisepops can't revoke consent from code, so c15t reloads the page on revocation. The CLI can add it during setup.

### Add AdRoll consent integration

Load AdRoll after `marketing` consent with `adrollPixel` from `@c15t/integrations/adroll`. AdRoll has no API to stop it, so keep the default page reload when consent is withdrawn. The CLI can now add it during setup.

### Add Adobe Target consent integration

`adobeTarget()` from `@c15t/integrations/adobe-target` loads Adobe Target after `experience` consent, using either a self-hosted at.js file or Adobe Experience Platform Web SDK 2.21 or later. On revocation it denies Target through Adobe's consent APIs; keep the page reload on to stop code that already ran. The CLI can add it during setup.

### Add Pendo

`pendo` from `@c15t/integrations/pendo` loads Pendo after `measurement`
consent. When consent is withdrawn it stops Pendo's event sending, and resumes
it with the same visitor if consent returns. The CLI can generate the
integration too.

### Add Statable analytics

`statableAnalytics` from `@c15t/integrations/statable-analytics` loads
Statable after `measurement` consent. Statable has no stop API, so keep the
default page reload when consent is withdrawn. The CLI can generate the
integration too.

### Add Insider One integration

`insiderTag` from `@c15t/integrations/insider` loads the Insider One tag after `marketing` consent, with optional user attributes, currency and page context. Withdrawing consent sends `gdpr_optin: false` to Insider and reloads the page.

### Add Zendesk Messaging consent integration

`zendeskWidget()` from `@c15t/integrations/zendesk` loads Zendesk Messaging only after `functionality` consent. It sets Zendesk's cookie range to `all` with measurement consent and `functional` without it. On revocation it sends `none`, which hides the widget and clears its storage. The CLI can add it during setup. See [Other chat and support tools](https://c15t.com/docs/integrations/other-chat-and-support#zendesk-messaging).

### Add Dynamic Yield consent integration

`dynamicYield()` from `@c15t/integrations/dynamic-yield` loads Dynamic Yield after `experience` consent and sends the choice through Dynamic Yield's Active Cookie Consent API. The CLI can add it during setup.

### Add Salesforce Account Engagement integration

`pardotTracking` from `@c15t/integrations/salesforce-pardot` loads Salesforce Account Engagement (Pardot) after `marketing` consent. In the default consent mode, withdrawing consent calls Pardot's `revokeConsent` and reloads the page.

### Add Gorgias Chat consent integration

`gorgiasChat()` from `@c15t/integrations/gorgias` loads Gorgias Chat only after `functionality` consent. Without `measurement` consent it turns off the widget's Segment analytics. Gorgias has no shutdown API, so revocation relies on c15t's page reload. The CLI can add it during setup. See [Other chat and support tools](https://c15t.com/docs/integrations/other-chat-and-support#gorgias-chat).

### Rewrite npm descriptions for search

npm search scores a phrase in the description far above the same words in
keywords or the README. Each package description now names the phrases
people search for that package: "cookie banner", "cookie consent manager",
"consent management platform" and "Google Consent Mode v2" on `c15t`,
"React cookie banner" on `@c15t/react`, "Vue cookie consent" on `@c15t/vue`,
and so on. `c15t` keeps "The open standard for cookie banners". Supporting
packages describe their role in c15t instead of repeating the main
package's phrases. Keyword lists are shorter. No code changes.

### Add The Trade Desk consent integration

Load The Trade Desk Universal Pixel after `marketing` consent with `theTradeDeskPixel` from `@c15t/integrations/the-trade-desk`. The Trade Desk has no API to stop its SDK, so keep the default page reload when consent is withdrawn. The CLI can now add it during setup.

### Send c15t consent to Shopify

`@c15t/integrations/shopify` adds `createShopifyCustomerPrivacy`, a bridge that
sends each c15t choice to Shopify's Customer Privacy API. Pass its `setup` to
Hydrogen's `ShopifyScripts` with `consent: { mode: 'custom-banner' }`, and
Hydrogen holds analytics events until the visitor has answered the c15t
banner. Under an opt-out policy, Shopify applies its region defaults until the
visitor saves a choice. See the
[Shopify guide](https://c15t.com/docs/integrations/shopify).

### Add Marketo Munchkin integration

`marketoMunchkin` from `@c15t/integrations/marketo` loads Adobe Marketo Munchkin after `marketing` consent. Munchkin has no API to stop tracking, so withdrawing consent reloads the page.

### Add LiveIntent consent integration

Load LiveIntent's LiveConnect tag after `marketing` consent with `liveIntentTag` from `@c15t/integrations/liveintent`. LiveConnect has no API to stop it, so keep the default page reload when consent is withdrawn. The CLI can now add it during setup.

### Add Appcues consent integration

`appcues()` from `@c15t/integrations/appcues` loads Appcues after `experience` consent. Use `onReady` to identify the visitor once the SDK loads. On revocation it calls `Appcues.reset()` and c15t reloads the page. The CLI can add it during setup.

### Add Ada consent integration

`ada()` from `@c15t/integrations/ada` imports the Ada Messaging Web SDK only after `functionality` consent. On revocation it calls Ada's `stop()`, which removes the widget but keeps stored conversations. The CLI can add it during setup. See [Other chat and support tools](https://c15t.com/docs/integrations/other-chat-and-support#ada).

### Add Clay consent integration

Load Clay after marketing consent with the `clay` helper, with vendor metadata, framework registration examples and CLI setup.

### Add Customer.io integration

`customerIo` from `@c15t/integrations/customer-io` loads Customer.io Data Pipelines after `marketing` consent. Withdrawing consent clears the stored identity with `reset()` and reloads the page, because `reset()` does not stop the SDK from sending.

### Add Optimizely Web Experimentation consent integration

`optimizelyWeb()` from `@c15t/integrations/optimizely` loads Optimizely Web Experimentation after `experience` consent. On revocation, c15t removes the snippet and reloads the page. The CLI can add it during setup.

### Add Vector

`vector` from `@c15t/integrations/vector` loads Vector after `marketing`
consent. Vector has no stop API, so keep the default page reload when consent
is withdrawn. The CLI can generate the integration too.

## @c15t/integrations@3.1.0

### PostHog no longer starts after a refusal that lands mid-download

With `posthog({ loadMode: 'after-consent' })`, a refusal that arrived while
`array.js` was still downloading did not stop PostHog. When the download
finished, PostHog started, sent a `$pageview` and a `/flags` request, and with
`cookieless_mode: 'never'` wrote its cookie and storage.

A refusal now clears PostHog's queued init, so `array.js` starts nothing. If the
visitor allows measurement again on the same page after `array.js` has run,
PostHog starts on the next page load.

### List Sentry in the preference dialog when the app runs the Sentry SDK

`sentry({ getClient })` declared the `sentry` vendor without a name or privacy
policy URL. Core logged a missing-declaration warning, and a site that shows
vendor switches could not list Sentry, so visitors could not turn it off inside
a granted category. The script now carries the same vendor details as
`sentry({ dsn })`.

### Get the provider's event dispatcher in every framework

Each framework now hands you one event dispatcher that sends to the provider's
registered scripts and reads consent when an event goes out:

- `useEventDispatcher()` from `c15t/react`, `c15t/next` and
  `c15t/tanstack-start`
- `useEventDispatcher()` from `c15t/vue/vue-plugin`, auto-imported in Nuxt
- `getEventDispatcher()` from `@c15t/svelte`
- `getEventDispatcher()` from `c15t/astro/client`
- `getEventDispatcher(runtime)` from `@c15t/browser`

All dispatchers for one provider share a pageview history, so a consent change
or a remount no longer drops or resends a pageview, and an event sent right
after a visitor withdraws consent is dropped. Pass `scripts` to add more
destinations and `pageviews` to choose which integrations get single-page-app
pageviews. `createEventDispatcher` from `@c15t/integrations/events` still works
for code without a provider.

### Clearer npm descriptions and keywords

Each package's npm description now says what it does in the words people
search for, such as cookie consent, cookie banner, GDPR, Google Consent Mode v2
and IAB TCF. Keywords add common search terms while preserving existing
framework, brand and integration terms. The schema and UI packages now link
to their directories in the repository. Framework, browser and core READMEs
now explain how consent policies handle GDPR and other privacy laws before
the setup instructions.

## @c15t/integrations@3.0.0

### c15t v3

c15t v3 is stable and published under the `latest` tag. See the
[3.0.0 changelog](https://c15t.com/changelog/3.0.0) for new features, breaking
changes and upgrade guides.

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
