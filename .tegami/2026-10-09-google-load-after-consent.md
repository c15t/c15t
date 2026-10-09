---
packages:
  '@c15t/integrations': minor
---

### Load the Google tag and Google Tag Manager only after consent

`gtag()` and `googleTagManager()` take a `loadMode` option, with the same
values as `posthog()`. The default, `'always'`, keeps today's behavior: the
script loads before a choice and sends Google Consent Mode signals.

With `loadMode: 'after-consent'`, the helper sends no request to Google and
creates no `dataLayer` until its category is allowed. The script then loads
once. The `consent` `default` command still comes first, with the visitor's
current choices, and later changes send `update`. Visitors who have not
chosen or who refused send Google nothing, so Consent Mode cannot model their
conversions.

`gtag()` waits for its `category`. `googleTagManager()` gains a `category`
option. With `'after-consent'` it defaults to
`{ or: ['measurement', 'marketing'] }`, so the container loads once the
visitor allows either; pass `'measurement'` for a container with only
Analytics tags. With `'always'` the default stays `'necessary'`.

```ts
gtag({ id: 'G-XXXXXXXXXX', category: 'measurement', loadMode: 'after-consent' });
googleTagManager({ id: 'GTM-XXXXXXX', loadMode: 'after-consent' });
```
