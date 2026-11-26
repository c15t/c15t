---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
---

### Add an optional close button to the preference dialog

The stock preference dialog can now show a close button in its header, like
the IAB dialog. It closes the dialog without saving, the same as Escape: the
banner comes back if the policy still owes a choice. On touch screens it is
the only way out besides a consent choice, since the backdrop does not close
the dialog.

It is off by default, so existing dialogs look the same.

- React, Next.js and TanStack Start: `<ConsentDialog showCloseButton />`. In a
  composed dialog, `<ConsentDialog.Header showCloseButton>` renders it after the
  header's children.
- Vue and Nuxt: `dialogShowCloseButton: true` in the plugin options.
- Svelte and SvelteKit: `<ConsentDialog showCloseButton />`.
- Script tag: `ui: { dialog: { showCloseButton: true } }`.

The button is labelled with the `common.close` translation and has
`data-testid="consent-dialog-close"`. Style it with the `dialog.closeButton`
component slot or the `consentDialogCloseButton` theme slot.
