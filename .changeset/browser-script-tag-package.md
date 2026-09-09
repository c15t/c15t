---
"@c15t/browser": minor
---

Add `@c15t/browser`, consent for sites without a build step. One script tag from a CDN installs the banner and preference centre on Framer, Webflow, WordPress or plain HTML; `c15t.headless.js` ships the same runtime with no UI for sites that render their own. Both read their config from the tag's `data-*` attributes or calls queued on `window.c15t`, expose `window.c15t`, and wire any element carrying `data-c15t-action`. Bundler users get the same client as ES modules from `@c15t/browser` and `@c15t/browser/headless`. A `manifest` mode resolves the backend's consent manifest in the browser so a location-independent policy renders without waiting on `/init`. `c15t.devtools.js` mounts the c15t DevTools panel as a second tag, and `policyRules` accepts preset names such as `europeOptIn` so a JSON config can pick geo-keyed policy rules.

Use the current v3 policy contract for effective permissions, explicit receipts, notice dismissal, and host presentation. Save every displayed preference, preserve the dialog when persistence fails, honor queued configuration over script attributes, and activate only inert category scripts, including those inserted after initialization.
