---
packages:
  c15t: minor
  "@c15t/react": minor
  "@c15t/nextjs": minor
  "@c15t/tanstack-start": minor
  "@c15t/vue": minor
  "@c15t/svelte": minor
  "@c15t/browser": minor
  "@c15t/ui": minor
  "@c15t/schema": minor
---

### Add an optional close button to the preference dialog

The stock preference dialog can now show a close button in its header, like
the IAB dialog. It closes the dialog without saving, the same as Escape: the
banner comes back if the policy still owes a choice. On touch screens it is
the only way out besides a consent choice, since the backdrop does not close
the dialog.

It is off by default, so existing dialogs look the same.

- React and Next.js: `<ConsentDialog showCloseButton />`. In a composed
  dialog, `<ConsentDialog.Header showCloseButton>` renders it after the
  header's children.
- Vue and Nuxt: `dialogShowCloseButton: true` in the plugin options.
- Svelte and SvelteKit: `<ConsentDialog showCloseButton />`.
- Script tag: `ui: { dialog: { showCloseButton: true } }`.

The button is labelled with the `common.close` translation and has
`data-testid="consent-dialog-close"`. Style it with the `dialog.closeButton`
component slot or the `consentDialogCloseButton` theme slot.
