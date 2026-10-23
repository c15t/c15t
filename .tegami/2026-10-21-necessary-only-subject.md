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

A save that records only vendor decisions while a notice is shown, such as
turning off a vendor switch, now stores the notice acknowledgement too, so a
reload no longer shows the notice again.

Notice acknowledgements stored in localStorage keep their linked account when
cookies cannot be read.

When the consent record cannot be read, a tab now follows another tab's change
of the subject ID that a notice or vendor record carries, instead of keeping
the old ID and saving it later.

A tab drops a linked account when an older c15t runtime removes or replaces
the notice acknowledgement that carried it. The subject ID stays.

A seed from a backend keeps the linked account it names for a stored ID. A tab
follows another tab's linked account on the record that gave its own.

A save under a subject ID or linked account with no URI encoding, such as
one with a lone surrogate, keeps the whole record in localStorage and skips
its cookie copy instead of throwing. A tab follows the notice's subject once
the vendor record that carried another is removed or loses its subject.

The `StoredRecords` type exported from `@c15t/core/modules/persistence` gains
optional `recordedSubjectId` and `subjectCarrier` fields. An object typed as
`StoredRecords` with the earlier fields still type-checks. `readStoredRecords()`
always sets both, and its return type says so. A stand-in typed through the
reader, such as `typeof readStoredRecords`, its return type or a mocked
reader, must now return both fields.

If your cookie policy lists c15t cookies, add `c15t-notice-subject`.
