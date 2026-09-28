---
packages:
  '@c15t/react': patch
  '@c15t/vue': patch
  '@c15t/svelte': patch
  '@c15t/browser': patch
---

### Close consent surfaces without waiting for the backend

Save, Accept all and Reject all now close the preference dialog in the same
task as the click, in React, Next.js, TanStack Start, Vue, Nuxt, Svelte,
Astro's dialog islands and the browser client. The choice, storage, scripts,
iframes and network rules update from the local record first; the backend
request runs afterwards. Before, the dialog stayed open until the request
answered. In a Next.js production build with 170 ms of network latency, a 4x
CPU slowdown and a 200 ms backend, Save now closes the dialog after 18 ms
instead of 486 ms. The browser client's
banner waited the same way and now closes on the click too. IAB banners and
dialogs close on the click and come back only if the choice could not be
recorded locally, for example when the vendor list failed to load.

A failed request no longer keeps the dialog open or reopens it. The choice
stays, the failure reaches `onError` and the kernel's `command:error` event,
and the kernel replays the queued save after the next initialization or when
the browser comes back online.

Callback timing is unchanged: `onChoiceRecorded` and `onPermissionsChanged`
still run in the click task, and the promises returned by `performAction()`,
`saveConsents()` and the browser client's `save()` still settle when the
request does. Svelte's `ConsentButton` no longer leaves an unhandled rejection
when a save fails.
