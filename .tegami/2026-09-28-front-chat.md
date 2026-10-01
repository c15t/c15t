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

`frontChat()` from `@c15t/integrations/front-chat` loads Front's chat widget after functionality permission and initializes it once the SDK loads. It forwards CSP nonces, including a loader-level nonce, to Front's generated scripts. `shutdownFrontChat()` asks Front to clear the visitor's session; call it from `onBeforeConsentRevocationReload`. The CLI offers Front Chat in its integration picker.
