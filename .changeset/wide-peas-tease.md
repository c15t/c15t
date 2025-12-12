---
"@c15t/react": patch
"@c15t/cli": patch
"c15t": patch
---

* feat(core): Added ability to disable c15t with the `enabled` prop. c15t will grant all consents by default when disabled as well as loading all scripts by default. Useful for when you want to disable consent handling but still allow the integration code to be in place.
* fix(react): Frame component CSS overriding
* fix(react): Legal links using the asChild slot causing multi-child error

https://c15t.com/changelog/2025-12-12-v1.8.2
