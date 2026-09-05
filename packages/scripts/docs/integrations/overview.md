---
title: Integrations
description: Load analytics, pixels, tag managers, and widgets through c15t so
  consent state controls when they run, update, and appear in your consent UI.
group: integrations
---
Third-party tools are easy to paste into app code, but consent makes them part
of your privacy runtime. Analytics SDKs, ad pixels, tag managers, and chat
widgets can load remote code, store identifiers, send events, and keep running
after the first page view.

> ℹ️ **Info:**
> Put consent-sensitive vendor tools in c15t instead of scattering script tags across your codebase. c15t becomes the place that decides when they can load, when they must stop, and which consent categories your UI needs to show.

## Why Manage Tools In c15t

When you install a vendor directly in your app, your consent logic has to chase
that vendor everywhere it appears: page layouts, route handlers, event helpers,
tag-manager snippets, and cleanup code.

Register the vendor with c15t instead. The integration becomes a declarative
`Script` that the consent runtime can reason about:

* c15t registers the tool with the runtime and evaluates it against the current
  consent state;
* c15t automatically adds the tool's consent category to the active categories,
  so GDPR-style consent UIs include `measurement`, `marketing`, or
  `functionality` when an enabled integration needs them;
* c15t blocks the script until consent is granted, or loads it with denied
  defaults when the vendor has its own consent mode;
* c15t handles revocation by unloading the script or calling the vendor's
  consent API;
* c15t runs vendor setup in the right order, including queue stubs, global
  functions, data attributes, default page-view events, and consent updates.

That gives your app one consent lifecycle instead of many scattered vendor
lifecycles.

## Built-In Helpers

c15t ships prebuilt script helpers in
[`@c15t/scripts`](https://www.npmjs.com/package/@c15t/scripts) for the
third-party tools developers integrate most often. Prefer them over copied
vendor snippets whenever c15t already supports the vendor.

Every helper returns a regular `Script` object, so it works anywhere the c15t
[script loader](/docs/frameworks/javascript/script-loader) accepts scripts. You
usually choose the helper, provide the vendor ID, and pass the result to your
provider's `scripts` option. The vendor page explains anything else that still
matters, such as custom events, region settings, privacy modes, or ecommerce
payloads.

## Choose An Integration Style

Most apps mix more than one style. Pick the smallest one that keeps consent behavior obvious.

|Style|Use when|
|--|--|
|**Built-in helper** from `@c15t/scripts`|The vendor is listed below — start here.|
|**Plain `Script`**|One-off app code with simple load and callback behavior.|
|**Manifest-backed helper**|Reusable vendor integration with structured setup phases, queues, stubs, or a vendor consent API.|
|**Iframe / renderable integration**|Vendor exposes an iframe or React component, not just a script tag.|

Setup is the same shape in every framework: import the helper, call it with vendor options, and pass the result to the consent runtime through your provider's `scripts` option. See the framework guides for end-to-end snippets — [JavaScript](/docs/frameworks/javascript/script-loader), [React](/docs/frameworks/react/script-loader), [Next.js](/docs/frameworks/next/script-loader).

## Renderable Integrations

Maps and video embeds need a visible component as well as consent-aware loading.
The React and Next.js packages include components that own the placeholder,
vendor loading, and rendered surface. They are imported from the framework
package rather than `@c15t/scripts`.

* [Google Maps](/docs/integrations/google-maps)
* [YouTube](/docs/integrations/youtube)

## Analytics

Analytics integrations usually require `measurement` consent. Some vendors can run in a consent-aware or cookieless mode; others should stay fully blocked until measurement consent is granted.

* [Google Tag (gtag.js)](/docs/integrations/google-tag)
* [Ahrefs Analytics](/docs/integrations/ahrefs-analytics)
* [Adobe Analytics](/docs/integrations/adobe-analytics)
* [Amplitude](/docs/integrations/amplitude)
* [Cloudflare Web Analytics](/docs/integrations/cloudflare-web-analytics)
* [Clearbit](/docs/integrations/clearbit)
* [Microsoft Clarity](/docs/integrations/microsoft-clarity)
* [Databuddy](/docs/integrations/databuddy)
* [Rybbit Analytics](/docs/integrations/rybbit-analytics)
* [Fathom Analytics](/docs/integrations/fathom-analytics)
* [Heap](/docs/integrations/heap)
* [Mixpanel Analytics](/docs/integrations/mixpanel-analytics)
* [Hotjar](/docs/integrations/hotjar)
* [Hightouch](/docs/integrations/hightouch)
* [LogRocket](/docs/integrations/logrocket)
* [Matomo Analytics](/docs/integrations/matomo-analytics)
* [PostHog](/docs/integrations/posthog)
* [Promptwatch](/docs/integrations/promptwatch)
* [Pirsch](/docs/integrations/pirsch)
* [RudderStack](/docs/integrations/rudderstack)
* [Segment](/docs/integrations/segment)
* [Plausible Analytics](/docs/integrations/plausible-analytics)
* [Umami Analytics](/docs/integrations/umami-analytics)
* [Vercel Analytics](/docs/integrations/vercel-analytics)

## Functional

Functional integrations usually require `functionality` consent. They add optional user-facing capabilities, such as chat widgets, that should only run after the user allows them.

* [Crisp](/docs/integrations/crisp)
* [Intercom](/docs/integrations/intercom)

## Ads & Pixels

Advertising pixels usually require `marketing` consent. Many of them need startup stubs so events can be queued safely before the remote SDK loads — built-in helpers handle this for you.

* [Meta Pixel](/docs/integrations/meta-pixel)
* [Snapchat Pixel](/docs/integrations/snapchat-pixel)
* [Reddit Pixel](/docs/integrations/reddit-pixel)
* [TikTok Pixel](/docs/integrations/tiktok-pixel)
* [LinkedIn Insight Tag](/docs/integrations/linkedin-insights)
* [Microsoft UET](/docs/integrations/microsoft-uet)
* [X (Twitter) Pixel](/docs/integrations/x-pixel)

## Tag Managers

Tag managers can load other scripts, so they deserve extra care. Prefer vendor consent modes and denied defaults before any tags are allowed to run.

* [Google Tag Manager](/docs/integrations/google-tag-manager)

## Build Your Own

If c15t does not ship the vendor you need, drop down a level:

* build a one-off `Script` directly in your app for simple cases,
* build a reusable manifest-backed helper for shared or package-level integrations,
* or combine the script loader with iframe gating for visible media and widget integrations.

### Build a Custom Integration

Learn when to use a raw `Script`, when to use a manifest, and how to debug and test custom integrations.

[Read the guide →](/docs/integrations/building-integrations)

## Where To Next

* Read the script loader guide for your framework: [JavaScript](/docs/frameworks/javascript/script-loader), [React](/docs/frameworks/react/script-loader), [Next.js](/docs/frameworks/next/script-loader).
* Use the [Google Maps](/docs/integrations/google-maps) and [YouTube](/docs/integrations/youtube) components for built-in renderable integrations.
* See the [iframe blocking](/docs/frameworks/react/components/frame) pattern for other visible embeds such as calendars and social widgets.
* Use [`has()`](/docs/frameworks/javascript/api/checking-consent) to conditionally run app code based on consent state.
