---
packages:
  '@c15t/ui': patch
  '@c15t/react': patch
  '@c15t/nextjs': patch
  '@c15t/tanstack-start': patch
  '@c15t/vue': patch
  c15t: patch
---

### Load the preferences dialog after the page's images

The preferences dialog used to start downloading in the first idle moment
after the `load` event. A single-page app often starts its largest image
after `load`, so the dialog's code shared the connection with that image on
slow networks. The dialog now waits until the page is quiet: no resource
completing for one second and no visible image still downloading, or 10
seconds after `load` at the latest. Hover, focus or touch on a button that
opens the dialog still loads it at once.

In React, Next.js and TanStack Start this applies with the default
`preloadDialog: 'idle'`. In Vue and Nuxt:

- `ConsentRoot` prefetches the dialog only while the banner is shown, so a
  returning visitor no longer downloads it on every page.
  `ConsentDialogTrigger`, `ConsentPreferencesLink` and the `ConsentGate`
  button keep it prefetched while they are mounted.
- Hover, focus or touch on Customize, the notice's rights buttons, the IAB
  banner's Customize and partners link, the trigger, the link and the gate
  button loads the dialog at once.
- The prefetch is skipped with Save-Data on, on 2G connections and offline,
  as in React.
