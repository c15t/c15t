---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
---

### Keep a dialog open when consent init resolves

A preference center opened before the consent backend answered closed when
the answer arrived, for example when a visitor clicked a consent gate's
button right after the page loaded. The dialog now stays open until the
visitor saves or closes it.
