---
packages:
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Add a Front Chat integration

`frontChat()` from `@c15t/integrations/front-chat` loads Front's chat widget
once functionality is granted and forwards CSP nonces to Front's scripts. Call
`shutdownFrontChat()` from `onBeforeConsentRevocationReload` to clear the
visitor's session. The CLI offers Front Chat in its integration picker.
