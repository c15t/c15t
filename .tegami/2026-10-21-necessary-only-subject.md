---
packages:
  '@c15t/core': patch
---

### Keep the subject ID with a notice acknowledgement

Every notice acknowledgement now stores the visitor's subject ID with it, in a
new `<storageKey>-notice-subject` cookie (`c15t-notice-subject` by default).
That includes a choice that acknowledges a notice. A visitor whose only action
was acknowledging a banner that offers only necessary categories keeps their ID
through this record. The acknowledgement still grants no optional category. The
`<storageKey>-notice` cookie keeps its old format, so an older c15t runtime on
the same site still reads it.

`clear()` removes the acknowledgement and its `-notice-subject` cookie. The
visitor keeps their subject ID in `<storageKey>-sid`, as after any other clear.
`kernel.set.subjectId(null)` gives the visitor a new ID in both places.

`clearOnRevocation` patterns never delete the notice identity cookie, even when a
wildcard matches its name.

If your cookie policy lists c15t cookies, add `c15t-notice-subject`.
