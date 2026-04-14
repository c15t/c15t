---
'@c15t/cli': patch
---

Update the CLI hosted-backend URL contract to recognize the new `*.inth.app` project domain alongside legacy `*.c15t.dev` URLs.

- `@c15t/cli`: accept `https://<project>.inth.app` as a valid hosted backend URL, refresh validation and prompt copy to point at the new domain, and update generated hosted config/env/rewrite examples accordingly.
