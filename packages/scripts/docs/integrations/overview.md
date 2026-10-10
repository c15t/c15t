---
title: Integrations
description: Find all c15t integrations for analytics, tag managers,
  advertising, email and SMS, chat and embedded content.
group: integrations
---

## Choose an integration

Each vendor helper in `@c15t/integrations` returns a script configuration that you
register with your c15t provider. Importing a helper installs nothing on its
own. Set up consent with your [framework quickstart](https://v3.c15t.com/docs/frameworks) first,
then follow the vendor guide.

| Package manager | Command                                |
| :-------------- | :------------------------------------- |
| npm             | `npm install @c15t/integrations@alpha` |
| pnpm            | `pnpm add @c15t/integrations@alpha`    |
| yarn            | `yarn add @c15t/integrations@alpha`    |
| bun             | `bun add @c15t/integrations@alpha`     |

`@c15t/integrations` is a separate package. Keep importing c15t itself from `c15t`,
for example `c15t/react` or `c15t/next`.

The Loading behavior column shows when each helper requests the vendor. Most
wait for the category to be allowed. A few load on every page and pass the
permission to the vendor's own consent API, so the browser contacts the vendor
before a choice.

## Embeds

| Integration                     | v3 implementation                             | Loading behavior                                          |
| ------------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| [Google Maps](./google-maps.md) | Framework-specific consent-gated map iframe   | Iframe mounts only while the chosen permission is allowed |
| [YouTube](./youtube.md)         | Framework-specific consent-gated video iframe | Iframe mounts only while the chosen permission is allowed |

Both guides include all nine framework examples. React and Svelte use `ConsentGate`;
Vue conditionally renders the iframe, and Astro and JavaScript use the existing
kernel to control its DOM lifecycle. Embeds do not require `@c15t/integrations`.

## Tag managers

| Integration                                   | Helper             | Category    | Loading behavior                                  |
| --------------------------------------------- | ------------------ | ----------- | ------------------------------------------------- |
| [Cloudflare Zaraz](./cloudflare-zaraz.md)     | `cloudflareZaraz`  | `necessary` | Always runs; syncs purposes, Zaraz runs the tools |
| [Google Tag Manager](./google-tag-manager.md) | `googleTagManager` | `necessary` | Always loads; signals Google consent              |

## Analytics

| Integration                                               | Helper                   | Category                                        | Loading behavior                                                             |
| --------------------------------------------------------- | ------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| [Google Tag](./google-tag.md)                             | `gtag`                   | `measurement` or `marketing`                    | Always loads; signals Google consent                                         |
| [Ahrefs Analytics](./ahrefs-analytics.md)                 | `ahrefsAnalytics`        | `measurement`                                   | Waits for effective permission                                               |
| [Adobe Analytics](./adobe-analytics.md)                   | `adobeAnalytics`         | `measurement`                                   | Waits for effective permission                                               |
| [Amplitude](./amplitude.md)                               | `amplitude`              | `measurement`                                   | Waits for effective permission; opts the SDK out on revocation               |
| [Cloudflare Web Analytics](./cloudflare-web-analytics.md) | `cloudflareWebAnalytics` | `measurement`                                   | Waits for effective permission                                               |
| [Clearbit](./clearbit.md)                                 | `clearbit`               | `marketing`                                     | Waits for effective permission                                               |
| [Microsoft Clarity](./microsoft-clarity.md)               | `clarity`                | `measurement`                                   | Gated initially; keeps the SDK and signals storage consent                   |
| [Databuddy](./databuddy.md)                               | `databuddy`              | `measurement`                                   | Always loads; switches the SDK's disabled flag                               |
| [Fathom Analytics](./fathom-analytics.md)                 | `fathomAnalytics`        | `measurement`                                   | Waits for effective permission                                               |
| [Heap](./heap.md)                                         | `heap`                   | `measurement`                                   | Waits for effective permission                                               |
| [Matomo Analytics](./matomo-analytics.md)                 | `matomoAnalytics`        | `measurement`                                   | Gated by default; optional consent mode                                      |
| [Mixpanel](./mixpanel-analytics.md)                       | `mixpanelAnalytics`      | `measurement`                                   | Always loads; calls opt-in and opt-out APIs                                  |
| [OneDollarStats](./one-dollar-stats.md)                   | `oneDollarStats`         | `measurement`                                   | Waits for effective permission                                               |
| [Hotjar](./hotjar.md)                                     | `hotjar`                 | `measurement`                                   | Waits for effective permission                                               |
| [Hightouch](./hightouch.md)                               | `hightouch`              | `measurement`                                   | Waits for effective permission                                               |
| [LogRocket](./logrocket.md)                               | `logRocket`              | `measurement`                                   | Waits for effective permission                                               |
| [Plausible Analytics](./plausible-analytics.md)           | `plausibleAnalytics`     | `measurement`                                   | Waits for effective permission                                               |
| [PostHog](./posthog.md)                                   | `posthog`                | `measurement`                                   | Configurable; defaults to always loading and calling opt-in and opt-out APIs |
| [Promptwatch](./promptwatch.md)                           | `promptwatch`            | `measurement`                                   | Waits for effective permission                                               |
| [Pirsch](./pirsch.md)                                     | `pirsch`                 | `measurement`                                   | Waits for effective permission                                               |
| [RudderStack](./rudderstack.md)                           | `rudderstack`            | `measurement`                                   | Gated by default; optional destination consent mode                          |
| [Segment](./segment.md)                                   | `segment`                | `measurement`                                   | Waits for effective permission                                               |
| [Sentry](./sentry.md)                                     | `sentry`                 | `necessary`; Replay and user data `measurement` | Configurable; defaults to always loading and loads Replay after permission   |
| [Rybbit Analytics](./rybbit-analytics.md)                 | `rybbitAnalytics`        | `measurement`                                   | Waits for effective permission                                               |
| [Umami Analytics](./umami-analytics.md)                   | `umamiAnalytics`         | `measurement`                                   | Waits for effective permission                                               |
| [Vercel Analytics](./vercel-analytics.md)                 | `vercelAnalytics`        | `measurement`                                   | Waits for effective permission                                               |

## Chat and support

| Integration                   | Helper      | Category        | Loading behavior               |
| ----------------------------- | ----------- | --------------- | ------------------------------ |
| [Crisp](./crisp.md)           | `crisp`     | `functionality` | Waits for effective permission |
| [Front Chat](./front-chat.md) | `frontChat` | `functionality` | Waits for effective permission |
| [Intercom](./intercom.md)     | `intercom`  | `functionality` | Waits for effective permission |

## Email and SMS

| Integration             | Helper    | Category                      | Loading behavior                                           |
| ----------------------- | --------- | ----------------------------- | ---------------------------------------------------------- |
| [Klaviyo](./klaviyo.md) | `klaviyo` | `marketing` and `measurement` | Waits for both; optional forms-only mode needs `marketing` |

## Ads and pixels

| Integration                                    | Helper             | Category    | Loading behavior                                                 |
| ---------------------------------------------- | ------------------ | ----------- | ---------------------------------------------------------------- |
| [Meta Pixel](./meta-pixel.md)                  | `metaPixel`        | `marketing` | Gated initially; keeps the SDK and signals consent               |
| [OpenAI Pixel](./openai-pixel.md)              | `openaiPixel`      | `marketing` | Gated initially; keeps the SDK and signals consent               |
| [Pinterest Tag](./pinterest-tag.md)            | `pinterestTag`     | `marketing` | Gated initially; keeps the tag and signals consent               |
| [Reddit Pixel](./reddit-pixel.md)              | `redditPixel`      | `marketing` | Gated initially; keeps the pixel and toggles first-party cookies |
| [TikTok Pixel](./tiktok-pixel.md)              | `tiktokPixel`      | `marketing` | Gated initially; keeps the SDK and signals consent               |
| [LinkedIn Insight Tag](./linkedin-insights.md) | `linkedinInsights` | `marketing` | Waits for effective permission                                   |
| [Microsoft UET](./microsoft-uet.md)            | `microsoftUet`     | `marketing` | Always loads; signals ad storage consent                         |
| [Snapchat Pixel](./snapchat-pixel.md)          | `snapchatPixel`    | `marketing` | Waits for effective permission                                   |
| [X Pixel](./x-pixel.md)                        | `xPixel`           | `marketing` | Waits for effective permission                                   |

## Load each vendor once

Remove the vendor's own snippet, tracking image, framework plugin or tag
manager entry before adding its helper. c15t cannot gate a copy it did not
load. Tag managers and data pipelines such as Segment can load further
destinations, which need consent settings of their own.

When a visitor turns off a category they had allowed, c15t reloads the page so
that code which already ran stops. Each vendor guide lists what its helper does
on revocation and how to check it.

## Vendor switches and cookie cleanup

Every helper sets a `vendor` slug, so once you declare that vendor a visitor
can allow its category and still switch the vendor off. Gating also leaves
behind the cookies a vendor already wrote; `clearOnRevocation` deletes them
when their category is denied. Each framework documents both in its Scripts
and embeds group:

| Framework      | Vendor consent                                                                      | Clear on revocation                                                                           |
| -------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Next.js        | [Vendor consent](https://v3.c15t.com/docs/frameworks/next/vendor-consent)           | [Clear on revocation](https://v3.c15t.com/docs/frameworks/next/clear-on-revocation)           |
| TanStack Start | [Vendor consent](https://v3.c15t.com/docs/frameworks/tanstack-start/vendor-consent) | [Clear on revocation](https://v3.c15t.com/docs/frameworks/tanstack-start/clear-on-revocation) |
| React          | [Vendor consent](https://v3.c15t.com/docs/frameworks/react/vendor-consent)          | [Clear on revocation](https://v3.c15t.com/docs/frameworks/react/clear-on-revocation)          |
| Nuxt           | [Vendor consent](https://v3.c15t.com/docs/frameworks/nuxt/vendor-consent)           | [Clear on revocation](https://v3.c15t.com/docs/frameworks/nuxt/clear-on-revocation)           |
| Vue            | [Vendor consent](https://v3.c15t.com/docs/frameworks/vue/vendor-consent)            | [Clear on revocation](https://v3.c15t.com/docs/frameworks/vue/clear-on-revocation)            |
| Astro          | [Vendor consent](https://v3.c15t.com/docs/frameworks/astro/vendor-consent)          | [Clear on revocation](https://v3.c15t.com/docs/frameworks/astro/clear-on-revocation)          |
| Svelte         | [Vendor consent](https://v3.c15t.com/docs/frameworks/svelte/vendor-consent)         | [Clear on revocation](https://v3.c15t.com/docs/frameworks/svelte/clear-on-revocation)         |
| SvelteKit      | [Vendor consent](https://v3.c15t.com/docs/frameworks/sveltekit/vendor-consent)      | [Clear on revocation](https://v3.c15t.com/docs/frameworks/sveltekit/clear-on-revocation)      |
| HTML           | [Vendor consent](https://v3.c15t.com/docs/frameworks/html/vendor-consent)           | [Clear on revocation](https://v3.c15t.com/docs/frameworks/html/clear-on-revocation)           |
| JavaScript     | [Vendor consent](https://v3.c15t.com/docs/frameworks/javascript/vendor-consent)     | [Clear on revocation](https://v3.c15t.com/docs/frameworks/javascript/clear-on-revocation)     |

## Send events only to allowed integrations

`createEventDispatcher` from `@c15t/integrations/events` sends one named event to
every registered integration that has an event API and is allowed right now.
It drops events while measurement is denied, and one vendor's error does not
stop delivery to the others:

```ts
import { createEventDispatcher } from '@c15t/integrations/events';

const events = createEventDispatcher({
	scripts,
	getSnapshot: () => runtime.kernel.getSnapshot(),
	pageviews: ['segment'],
});

events.track('docs_search', { resultCount: 4 });
events.pageview(location.pathname);
```

Pass the same `scripts` you registered and a function that returns the live
consent snapshot. `track` supports Google Tag Manager, Google Tag, PostHog,
Mixpanel, Segment, Hightouch, Heap, Amplitude, LogRocket, Adobe Analytics,
Databuddy, Plausible, Fathom, Pirsch, Microsoft Clarity, Hotjar, Vercel
Analytics, OneDollarStats, Umami, Rybbit, RudderStack and Matomo.
`pageview` sends single-page-app page views only to the integrations named in
`pageviews`: PostHog, Segment or Hightouch. Call it from your router's
navigation hook. The first call records the path without sending, and repeated
paths or hash-only changes are skipped.

## Add a vendor without a helper

Use [custom integrations](./building-integrations.md) for a
vendor without a helper, or an SDK your app already loads. Test every
integration with the [consent verification guide](../guides/verify-consent.md).
