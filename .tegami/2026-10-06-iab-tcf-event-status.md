---
packages:
  '@c15t/iab': patch
---

### Stop reporting tcloaded before the visitor chooses

On a first visit, `__tcfapi('addEventListener')` told listeners `tcloaded`
with an empty TC string while the banner was showing, and repeated it on
every state change. An ad tag that trusts `tcloaded` could start before the
visitor chose anything.

The CMP API now follows the TCF CMP API v2 event rules:

- A listener registered while the banner or dialog is open gets
  `cmpuishown`, and the visitor's choice arrives as `useractioncomplete`,
  without a `tcloaded` in between.
- `tcloaded` means a TC string is available and no UI is showing, as for a
  returning visitor, or that GDPR does not apply.
- Listeners hear about changes only, including expiry or a save in another
  tab while the dialog is open. A replacement string reaches them as
  `cmpuishown` while UI is showing. A withdrawn string reaches them with no
  event status rather than as `tcloaded`.
