---
"@c15t/scripts": minor
---

Add the Statable cookieless analytics integration (`statableAnalytics`), including its registry entry, subpath export, code-generation snippet, integration docs, and dedicated tests. The site id is embedded in the tracker path (`/js/{siteId}/s.js`) and mirrored to `data-id`; no bootstrap queue is installed because the live tracker initializes with `window.statable ||= {…}` and does not replay early calls.
