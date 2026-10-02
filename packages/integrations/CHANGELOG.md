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
