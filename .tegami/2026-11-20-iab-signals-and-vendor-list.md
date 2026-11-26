---
packages:
  "@c15t/iab":
    replay:
      - exit-prerelease(npm:@c15t/iab)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/dev-tools":
    replay:
      - exit-prerelease(npm:@c15t/dev-tools)
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
---

### Fix IAB TCF signals and vendor disclosures

- Restricting two vendors no longer restricts the vendors between them.
- Purposes that allow consent only (1, 3, 4, 5 and 6) no longer get a
  legitimate interest signal from a custom vendor.
- Legitimate interest switches show what Save records.
- Vendor links render only for absolute `http` and `https` URLs.
- Vendor disclosures show the standard TCF Features text.
