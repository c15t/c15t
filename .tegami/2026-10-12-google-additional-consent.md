---
packages:
  "@c15t/backend": minor
  "@c15t/core": minor
  "@c15t/iab": minor
  "@c15t/react": minor
  "@c15t/schema": minor
  "@c15t/svelte": minor
  "@c15t/vue": minor
  "@c15t/browser": minor
  "@c15t/astro": minor
  "@c15t/translations": minor
---

### Support Google Additional Consent

IAB TCF setups can pass consent to Google ad tech providers that are not on
the Global Vendor List. List their Google ATP IDs in the manifest's
`iab.additionalConsent.providers`: the self-hosted backend loads their names
and privacy policies like the vendor list, caches them and sends them in
`/init`, and framework servers and browsers that resolve `/init` from the
manifest load them the same way. Setups without such a backend can pass
`additionalConsent.providers` to the browser instead. The React, Vue, Svelte
and script-tag preference centres show each provider with its privacy policy
and a consent switch, and the banner's partner count includes them.

`__tcfapi` returns an Additional Consent v2 string as `addtlConsent` beside
`tcString`, for example `2~89~dv.2572`. A provider counts as consented only
when its switch is on and the visitor consented to TCF purposes 1, 3 and 4.
c15t stores the string in the `addtl_consent` cookie and localStorage entry
with the TC String, restores it for returning visitors, and removes it when it
withdraws the TC String. Provider names and policy links load from
`https://gvl.inth.app/additional-consent` unless an endpoint is configured.
The backend keeps serving the last list it loaded when that endpoint fails.

`IABPreferenceCenterTranslations.vendorList` gains two required keys,
`adTechProvidersHeading` and `adTechProvidersNotice`, translated for every
built-in locale. Custom translation sets need both.
