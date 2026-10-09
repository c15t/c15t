---
packages:
  '@c15t/tanstack-start': minor
  c15t: minor
---

### Read the backend URL from VITE_C15T_BACKEND_URL in the TanStack Start manifest plugin

`consentManifest()` from `c15t/tanstack-start/build` no longer needs a
`backendURL` option. Without one it reads `VITE_C15T_BACKEND_URL` from Vite's
environment, including `.env` files, and stops the build if neither is set.

When `VITE_C15T_BACKEND_URL` is unset, the plugin now sets
`import.meta.env.VITE_C15T_BACKEND_URL` to the URL it downloaded the manifest
from. Server and browser code can read that variable instead of repeating the
URL. A value your environment already sets is left alone.

The quickstart no longer registers `consentRequestMiddleware` or declares a
separate consent options module. The server function reads the location
headers from the request itself, and the middleware stays available for apps
that want `context.consent` or one override for every request.
