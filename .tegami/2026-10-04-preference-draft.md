---
packages:
  "@c15t/core": major
  "@c15t/react": minor
  "@c15t/vue": major
  "@c15t/svelte": minor
  "@c15t/browser": minor
  c15t: major
---

### One preference draft for every framework

React, Vue, Svelte and the `@c15t/browser` preference dialog now share one
draft, `createPreferenceDraft` from `c15t/preference-draft`, so unsaved
choices behave the same everywhere:

- **Stale drafts.** A draft with an unsaved change goes stale when the
  policy, the displayed categories or the vendor list changes. Saving it
  records nothing until the visitor reviews it (`reset()`). A draft with no
  unsaved change follows the policy and is never stale; Vue used to mark it
  stale. The `@c15t/browser` dialog used to drop unsaved changes silently;
  it now shows a review notice.
- **Choices saved elsewhere.** When another surface or tab records a choice,
  switches the visitor left alone take the new value and moved ones keep
  theirs. React used to write the old values back on save.
- **Category order.** Every preference form, and `runtime.consentCategories`,
  lists categories in one fixed order: necessary, functionality,
  measurement, experience, marketing. Vue and `@c15t/browser` used the
  configured `consentCategories` order.
- **Draft values.** `values` lists every category; ones the policy does not
  offer read `false`. Vue and Svelte listed only the displayed ones.
- **Late defaults.** Presentation defaults from an experiment arm assigned
  after the dialog opened apply only while the visitor has changed nothing.
- **IAB dialog in Vue.** Each switch writes the CMP selection at once, as in
  React and Svelte. Closing the dialog keeps those changes, and saving can
  no longer overwrite a newer receipt with an older copy.

React's banner buttons no longer load the draft: it ships with the
preference dialog, which takes about 1.4 KB gzip off the first load of a
page that renders a banner. The `@c15t/browser` ES module build loads its
preference dialog and the draft as a separate chunk, in idle time once the
banner or trigger shows; the script-tag files stay one file each.

In Svelte the draft now ships with `ConsentWidget` and `ConsentDialog`
instead of `ConsentManagerProvider`. The state API keeps its synchronous
shape. `setSelectedConsent()` calls made before the draft loads apply in order
when it lands, and `saveConsents('custom')` waits for it.

**Breaking:** in headless Svelte code that renders neither component,
`selectedConsents` and `draft` read empty on first use, because the draft
loads then, and fill in reactively once it lands. A one-off read outside a
reactive context gets the empty values. Migration: read them in a reactive
context (`$derived`, `$effect` or markup).

**Breaking:** the runtime's `stageVendorConsent()` and `resetVendorDraft()`
are removed. Pass vendors to the save
(`kernel.commands.save({}, { vendors: { 'x-pixel': false } })`) or stage
them on a preference draft. Vue's `useConsentDraft()` returns
`displayedCategories` and `vendors` as computed refs, takes no argument, and
no longer has `reseedOnNextRecord()`; call `reset()` after a bulk save
instead.
