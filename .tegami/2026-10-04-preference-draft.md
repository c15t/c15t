---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### One preference draft for every framework

React, Vue, Svelte and the `@c15t/browser` preference dialog share one draft,
`createPreferenceDraft` from `c15t/preference-draft`, so unsaved choices behave
the same everywhere.

- A draft with an unsaved change goes stale when the policy, the displayed
  categories or the vendor list changes. Saving it records nothing until the
  visitor reviews it (`reset()`). The `@c15t/browser` dialog shows a review
  notice instead of dropping the changes.
- When another surface or tab records a choice, switches the visitor left alone
  take the new value. React used to write the old values back on save.
- Every preference form and `runtime.consentCategories` list categories as
  necessary, functionality, measurement, experience, marketing, in that order.
- `values` lists every category. Ones the policy does not offer read `false`.
- In Vue, each IAB dialog switch writes the CMP selection at once, as in React
  and Svelte.

The draft ships with the preference dialog instead of React's banner or Svelte's
`ConsentManagerProvider`.

#### Breaking changes

- In headless Svelte code that renders neither `ConsentWidget` nor
  `ConsentDialog`, `selectedConsents` and `draft` read empty on first use and
  fill in once the draft loads. Read them in a reactive context (`$derived`,
  `$effect` or markup).
- The runtime's `stageVendorConsent()` and `resetVendorDraft()` are removed.
  Pass vendors to the save, as in
  `kernel.commands.save({}, { vendors: { 'x-pixel': false } })`, or stage them
  on a preference draft.
- Vue's `useConsentDraft()` takes no argument, returns `displayedCategories` and
  `vendors` as computed refs, and no longer has `reseedOnNextRecord()`. Call
  `reset()` after a bulk save instead.
