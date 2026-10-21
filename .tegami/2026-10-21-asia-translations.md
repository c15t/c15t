---
packages:
  "@c15t/translations": minor
  "@c15t/core": patch
  "@c15t/schema": patch
---

### Add Japanese, Thai, Malay, Vietnamese, Turkish and six Indian languages

`@c15t/translations` now ships consent copy for Japanese (`ja`), Thai
(`th`), Malay (`ms`), Vietnamese (`vi`), Turkish (`tr`), Tamil (`ta`),
Telugu (`te`), Marathi (`mr`), Kannada (`kn`), Malayalam (`ml`) and Punjabi
in Gurmukhi script (`pa`).

Import one with `@c15t/translations/<code>`, or load them all with
`@c15t/translations/all`. `manifest()` loads them on demand like the other
languages, and the backend serves them from `/init`.
