---
packages:
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/scripts":
    replay:
      - exit-prerelease(npm:@c15t/scripts)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Add Adobe Target consent integration

`adobeTarget()` from `@c15t/integrations/adobe-target` loads Adobe Target after `experience` consent, using either a self-hosted at.js file or Adobe Experience Platform Web SDK 2.21 or later. On revocation it denies Target through Adobe's consent APIs; keep the page reload on to stop code that already ran. The CLI can add it during setup.
