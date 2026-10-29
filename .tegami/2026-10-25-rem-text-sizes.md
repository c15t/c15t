---
packages:
  "@c15t/ui": patch
---

### Dialog close-button offset and trigger labels follow the text size

The consent dialog's close-button offset and the dialog trigger's small and
large labels now use `rem`, so they scale with the visitor's text-size setting
like the rest of the dialog. At the default 16px root they render exactly as
before.
