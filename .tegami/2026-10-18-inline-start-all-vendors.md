---
packages:
  'c15t': patch
  '@c15t/integrations': patch
---

### PostHog, Amplitude, Heap, Clarity, Klaviyo and Speed Insights start from the server HTML

The server start now covers every snippet vendor in `@c15t/integrations`
except Sentry. For a returning visitor whose stored consent already allows
them, PostHog, Amplitude, Heap, Microsoft Clarity, Klaviyo and Vercel Speed
Insights now run their setup from the server-rendered HTML and start loading
before the app hydrates, as the Google tag, Google Tag Manager and Meta Pixel
already did. Calls made before the script loads queue the same way they do
after hydration.

Microsoft Clarity's consent signal now runs from the manifest. A subject who
has turned the vendor off is told nothing is granted, even when
`defaultConsent` grants it.

Vercel Speed Insights with a `beforeSend` option still starts after
hydration, so your callback sees every report.
