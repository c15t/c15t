---
packages:
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
---

### Fix consent handling, IDs and loader URLs in vendor helpers

- Amplitude queues `setOptOut(false)` when it loads with measurement consent,
  so an opt-out saved in its cookie no longer keeps tracking off. The script
  stays after revocation, and a later grant reuses the running SDK.
- Heap keeps a running heap.js when consent is granted again without a reload.
- Matomo with `defaultConsent: 'given'` queues `setConsentGiven` and the first
  page view only with measurement consent, and `requireConsent` otherwise.
  Vendor helpers react only to their own vendor's consent changes, so unrelated
  category changes no longer queue extra page views.
- Umami gets `domains` as a comma-separated `data-domains` list.
- `xPixelEvent` and the `metaPixel*Event` helpers do nothing when the pixel
  global is missing. `xPixelEvent` no longer throws before marketing consent.
- TikTok Pixel grants consent once instead of twice.
- Crisp keeps a `window.$crisp` queue the page filled before the helper ran.
- `cloudflareZaraz` sets `vendor: 'cloudflare-zaraz'`, so visitors can turn it
  off like other vendors.

Helpers with a required ID throw `<helper>: missing or invalid <option>` when
the ID is empty or whitespace, and trim it otherwise. This covers `metaPixel`,
`tiktokPixel`, `snapchatPixel`, `pinterestTag`, `redditPixel`, `xPixel`,
`linkedinInsights`, `microsoftUet`, `openaiPixel`, `googleTagManager`, `gtag`,
`posthog`, `databuddy`, `fathomAnalytics`, `crisp` and `intercom`. An empty
`scriptUrl` or `scriptSrc` uses the vendor's default loader.
