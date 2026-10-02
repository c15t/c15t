---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
---

### Use the theme font in the preference list

The preference list in the consent dialog and consent widget now uses `typography.fontFamily` from your theme, like the dialog's title and buttons. It used a fixed system font stack before, so a themed dialog showed its category rows in a different font.
