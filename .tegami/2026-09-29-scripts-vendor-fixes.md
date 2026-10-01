---
packages:
  '@c15t/integrations': patch
---

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
