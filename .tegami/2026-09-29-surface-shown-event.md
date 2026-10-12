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
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/dev-tools":
    replay:
      - exit-prerelease(npm:@c15t/dev-tools)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Report banner impressions and time to decision

The kernel emits `surface:shown` when the banner or dialog becomes visible and
records the first impression of each in `snapshot.surfaceShownAt`. Providers
gain `callbacks.onSurfaceShown`, and `@c15t/browser` dispatches
`c15t:surfaceShown`. Recorded choices carry `timeToDecisionMs` on the
`choice:recorded` event, on `onChoiceRecorded` and in the saved consent's
`metadata.timeToDecisionMs`.

`kernel.commands.save()` accepts a `uiSource` override, and React's `uiSource`
prop reaches the save payload, so `ConsentWidget` saves are attributed to
`widget`. `kernel.markLive()` is public. Adapters that render from a
server-resolved prefetch and never call `init()` should call it after hydration
so the server-rendered banner counts as an impression.

The `onBannerFetched` callback, which never fired, and the
`OnBannerFetchedPayload` type are removed.

`consentAction` stays `all` or `necessary` when the host shows only some
categories through `consentCategories`, instead of `custom`. A choice saved
while a notice is owed also records the notice dismissal.
