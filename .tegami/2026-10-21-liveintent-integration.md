---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add LiveIntent consent integration

Load LiveIntent after marketing consent with the `liveIntentTag` helper, with vendor metadata, framework registration examples and CLI setup.

Initial event payloads preserve literal strings such as `{{coupon}}`, including nested fields, without interpreting them as manifest placeholders.
