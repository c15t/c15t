---
'@c15t/react-native': patch
---

Deliver a queued consent write on iOS when the app comes back to the foreground, or when the device gains a network it did not have.

The offline queue asks for three retry moments and iOS served one: launch. A device that spent the night offline delivered its decision when the app was opened on Android, and waited for the next cold launch on iOS. The bridge now watches `UIApplication.didBecomeActiveNotification`, which replays the queue and then refreshes policy, and `NWPathMonitor`, where a genuine gain earns the replay alone because policy was already served at launch and at foreground. The path the process started with is the state it began in rather than a gain, so the first connectivity callback cannot race the launch replay, and a link that changes interface without dropping counts once. Neither leg needs an entitlement on iOS, and both hand their work to the core's scheduler instead of sending from the callback. A host that would rather drive the queue and the refresh itself calls `C15tReactNativeBootstrap.shutdown()`.
