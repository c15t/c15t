---
'@c15t/astro': minor
'@c15t/backend': minor
'@c15t/browser': minor
'@c15t/core': minor
'@c15t/iab': minor
'@c15t/react': minor
'@c15t/schema': minor
'@c15t/svelte': minor
'@c15t/translations': minor
'@c15t/vue': minor
---

Support Google Additional Consent v2. A manifest or backend can list Google ad
tech providers in `iab.additionalConsent`. The preference dialog lists them
with their privacy policies, and the CMP API returns the `addtlConsent` string
(`2~<consented>~dv.<disclosed>`) beside the TC String. A provider counts as
consented only when its switch is on and TCF purposes 1, 3 and 4 have consent.

The backend serves the provider list from Google's published CSV, caches it
for a day, and keeps serving the last good list when Google is unreachable.

`adTechProvidersHeading` and `adTechProvidersNotice` are now required in
`IABPreferenceCenterTranslations.vendorList`. Custom translation sets need
both keys.
