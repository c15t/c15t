---
packages:
  "@c15t/integrations": patch
---

### Load Databuddy scripts with subresource integrity

`databuddy()` now loads date-versioned copies of `databuddy.js` and
`replay.js` from the `@databuddy/sdk` 3.4.2 release, each with an `integrity`
attribute. The browser does not run a file that has changed on the CDN. A
custom `scriptUrl` or `replay.scriptUrl` loads without `integrity`, as before.
If your Content Security Policy lists the exact Databuddy script URLs, allow
the new file names under `https://cdn.databuddy.cc/`.
