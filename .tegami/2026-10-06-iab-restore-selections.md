---
packages:
  '@c15t/iab': patch
---

### Show saved IAB choices in the preference dialog after a reload

A returning visitor who opened the IAB preference dialog saw every purpose,
vendor and special feature switch off, although `__tcfapi` reported their
saved consent. Pressing Save from there revoked everything. The dialog now
starts from the choices in the stored TC string, in every framework and in
`@c15t/browser`. An Accept All or Reject All the visitor clicks while the
vendor list is still loading still wins over the stored choice.
