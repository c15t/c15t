---
packages:
  '@c15t/integrations': minor
  '@c15t/scripts': patch
  '@c15t/cli': patch
---

### Add Ada consent integration

`ada()` from `@c15t/integrations/ada` imports the Ada Messaging Web SDK only after `functionality` consent. On revocation it calls Ada's `stop()`, which removes the widget but keeps stored conversations. The CLI can add it during setup. See [Other chat and support tools](https://c15t.com/docs/integrations/other-chat-and-support#ada).
