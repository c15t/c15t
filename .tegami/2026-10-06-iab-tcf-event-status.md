---
packages:
  "@c15t/iab":
    replay:
      - exit-prerelease(npm:@c15t/iab)
---

### Stop reporting tcloaded before the visitor chooses

On a first visit, `__tcfapi('addEventListener')` reported `tcloaded` with an
empty TC string while the banner showed, so an ad tag that trusts `tcloaded`
could start before the visitor chose. The CMP API now follows the TCF CMP API
v2 event rules:

- While the banner or dialog is open, listeners get `cmpuishown`, then
  `useractioncomplete` for the choice.
- `tcloaded` means a TC string is available and no UI is showing, or GDPR
  does not apply.
- Listeners hear about changes only. A withdrawn string arrives with no event
  status.
