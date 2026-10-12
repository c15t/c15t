---
packages:
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Let the page decide the scheme with `colorScheme: null`

`mountConsentUI()` and `init()` accept `ui.colorScheme: null`, and the script
tag accepts `data-color-scheme="none"`. The UI then turns dark while `<html>`
has a `dark` or `c15t-dark` class and follows changes to it. The default stays
`system`.
