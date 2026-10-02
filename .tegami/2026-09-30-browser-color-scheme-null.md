---
packages:
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Let the page decide the scheme with `colorScheme: null`

`mountConsentUI()` and `init()` accept `ui.colorScheme: null`, and the script tag accepts `data-color-scheme="none"`. The UI is then dark while `<html>` has a `dark` or `c15t-dark` class, and follows the class as the page changes it. The UI renders in a shadow root that the page's class cannot reach, so c15t copies it onto the UI host. Before, the only choices were `light`, `dark` and `system`, and the default stays `system`.
