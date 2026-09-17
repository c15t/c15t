---
'@c15t/react-native': patch
---

Deliver a queued consent write the moment the app comes back to the foreground on Android.

The offline queue asks for three retry moments and Android served two. The foreground replay ran on the thread the lifecycle callback arrived on, and Android refuses an HTTP request made there outright: the connection answered `NetworkOnMainThreadException`, the transport reported that as unreachable, and the payload stayed queued until the next cold launch or a flush the host drove itself. A decision made on a train reached the backend when the app was next started rather than when the app came back up. The replay now runs on the core's own executor, which is also what keeps a launch replay and a foreground replay from delivering one write twice.
