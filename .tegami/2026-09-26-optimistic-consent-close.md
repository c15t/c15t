---
packages:
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
---

### Close consent surfaces without waiting for the backend

Save, Accept all and Reject all close the preference dialog, and the browser
client's banner, on the click instead of after the backend answers. Consent,
storage, scripts, iframes and network rules update from the local record
first. In a throttled Next.js test, Save closed the dialog after 18 ms
instead of 486 ms. IAB surfaces come back only if the choice could not be
recorded locally.

A failed request keeps the choice, reports to `onError` and the kernel's
`command:error` event, and replays the save after the next initialization or
when the browser comes back online. `onChoiceRecorded` and
`onPermissionsChanged` timing is unchanged, and the promises from
`performAction()`, `saveConsents()` and the browser client's `save()` still
settle with the request. Svelte's `ConsentButton` no longer leaves an
unhandled rejection when a save fails.
