---
title: Overview
description: Find all c15t integrations for analytics, tag managers,
  advertising, chat and embedded content.
group: integrations
---

## Choose an integration

Use the vendor helper from `@c15t/scripts` with your existing c15t provider or
script loader. Every helper returns a script configuration; importing one does
not install the vendor. Start with your [framework quickstart](https://c15t.com/docs/frameworks)
to connect Inth and render consent UI, then follow the vendor guide.

| Package manager | Command                     |
| :-------------- | :-------------------------- |
| npm             | `npm install @c15t/scripts` |
| pnpm            | `pnpm add @c15t/scripts`    |
| yarn            | `yarn add @c15t/scripts`    |
| bun             | `bun add @c15t/scripts`     |

`@c15t/scripts` is a separate add-on. Keep the main `c15t` package for imports
such as `c15t/react` and `c15t/next`.

Browse integrations by service type below. The tables distinguish helpers that
wait for permission from helpers
that load immediately and send consent signals. Read the vendor's revocation
behavior before choosing either approach.

## Embeds

| Integration                     | v3 implementation           | Loading behavior                                          |
| ------------------------------- | --------------------------- | --------------------------------------------------------- |
| [Google Maps](./google-maps.md) | `Frame` with a map iframe   | Iframe mounts only while the chosen permission is allowed |
| [YouTube](./youtube.md)         | `Frame` with a video iframe | Iframe mounts only while the chosen permission is allowed |

Embeds use the framework's UI adapter and do not require `@c15t/scripts`.

## Tag managers

| Integration                                   | Helper             | Category    | Loading behavior                     |
| --------------------------------------------- | ------------------ | ----------- | ------------------------------------ |
| [Google Tag Manager](./google-tag-manager.md) | `googleTagManager` | `necessary` | Always loads; signals Google consent |

## Analytics

| Integration                                               | Helper                   | Category                   | Loading behavior                                         |
| --------------------------------------------------------- | ------------------------ | -------------------------- | -------------------------------------------------------- |
| [Google Tag](./google-tag.md)                             | `gtag`                   | `measurement or marketing` | Always loads; signals Google consent                     |
| [Ahrefs Analytics](./ahrefs-analytics.md)                 | `ahrefsAnalytics`        | `measurement`              | Waits for effective permission                           |
| [Adobe Analytics](./adobe-analytics.md)                   | `adobeAnalytics`         | `measurement`              | Waits for effective permission                           |
| [Amplitude](./amplitude.md)                               | `amplitude`              | `measurement`              | Waits for effective permission                           |
| [Cloudflare Web Analytics](./cloudflare-web-analytics.md) | `cloudflareWebAnalytics` | `measurement`              | Waits for effective permission                           |
| [Clearbit](./clearbit.md)                                 | `clearbit`               | `marketing`                | Waits for effective permission                           |
| [Microsoft Clarity](./microsoft-clarity.md)               | `clarity`                | `measurement`              | Gated initially; retains SDK and signals storage consent |
| [Databuddy](./databuddy.md)                               | `databuddy`              | `measurement`              | Always loads; switches SDK configuration                 |
| [Fathom Analytics](./fathom-analytics.md)                 | `fathomAnalytics`        | `measurement`              | Waits for effective permission                           |
| [Heap](./heap.md)                                         | `heap`                   | `measurement`              | Waits for effective permission                           |
| [Matomo Analytics](./matomo-analytics.md)                 | `matomoAnalytics`        | `measurement`              | Gated by default; optional consent mode                  |
| [Mixpanel](./mixpanel-analytics.md)                       | `mixpanelAnalytics`      | `measurement`              | Always loads; calls opt-in and opt-out APIs              |
| [Hotjar](./hotjar.md)                                     | `hotjar`                 | `measurement`              | Waits for effective permission                           |
| [Hightouch](./hightouch.md)                               | `hightouch`              | `measurement`              | Waits for effective permission                           |
| [LogRocket](./logrocket.md)                               | `logRocket`              | `measurement`              | Waits for effective permission                           |
| [Plausible Analytics](./plausible-analytics.md)           | `plausibleAnalytics`     | `measurement`              | Waits for effective permission                           |
| [PostHog](./posthog.md)                                   | `posthog`                | `measurement`              | Configurable; default always loads                       |
| [Promptwatch](./promptwatch.md)                           | `promptwatch`            | `measurement`              | Waits for effective permission                           |
| [Pirsch](./pirsch.md)                                     | `pirsch`                 | `measurement`              | Waits for effective permission                           |
| [RudderStack](./rudderstack.md)                           | `rudderstack`            | `measurement`              | Gated by default; optional destination consent mode      |
| [Segment](./segment.md)                                   | `segment`                | `measurement`              | Waits for effective permission                           |
| [Rybbit Analytics](./rybbit-analytics.md)                 | `rybbitAnalytics`        | `measurement`              | Waits for effective permission                           |
| [Umami Analytics](./umami-analytics.md)                   | `umamiAnalytics`         | `measurement`              | Waits for effective permission                           |
| [Vercel Analytics](./vercel-analytics.md)                 | `vercelAnalytics`        | `measurement`              | Waits for effective permission                           |

## Functionality

| Integration               | Helper     | Category        | Loading behavior               |
| ------------------------- | ---------- | --------------- | ------------------------------ |
| [Crisp](./crisp.md)       | `crisp`    | `functionality` | Waits for effective permission |
| [Intercom](./intercom.md) | `intercom` | `functionality` | Waits for effective permission |

## Ads and pixels

| Integration                                    | Helper             | Category    | Loading behavior                                  |
| ---------------------------------------------- | ------------------ | ----------- | ------------------------------------------------- |
| [Meta Pixel](./meta-pixel.md)                  | `metaPixel`        | `marketing` | Waits for effective permission                    |
| [Reddit Pixel](./reddit-pixel.md)              | `redditPixel`      | `marketing` | Gated initially; retains SDK and switches cookies |
| [TikTok Pixel](./tiktok-pixel.md)              | `tiktokPixel`      | `marketing` | Gated initially; retains SDK and signals consent  |
| [LinkedIn Insight Tag](./linkedin-insights.md) | `linkedinInsights` | `marketing` | Waits for effective permission                    |
| [Microsoft UET](./microsoft-uet.md)            | `microsoftUet`     | `marketing` | Always loads; signals ad storage consent          |
| [Snapchat Pixel](./snapchat-pixel.md)          | `snapchatPixel`    | `marketing` | Waits for effective permission                    |
| [X Pixel](./x-pixel.md)                        | `xPixel`           | `marketing` | Waits for effective permission                    |

## Keep one owner per vendor

Remove direct snippets, tracking images, framework plugins and duplicate
SDK initializers before adding a helper. A vendor loaded outside c15t is not
controlled by the configuration here. Tag managers and data pipelines can load
other destinations, which need their own consent settings.

Initial loading and later event calls are separate. Some helpers keep an SDK
loaded to send consent updates. Others remove their script element without a
vendor stop callback. Neither approach can reverse code or requests that already
ran. Guard application events and verify automatic tracking after revocation.

Use [custom integrations](./building-integrations.md) for a service
without a helper, or an SDK your application already owns. Follow
[consent verification](../guides/verify-consent.md) for fresh sessions, rejection,
acceptance, revocation and navigation.
