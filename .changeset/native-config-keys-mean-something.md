---
'@c15t/react-native': patch
---

Make every native configuration key the Expo config plugin writes mean something.

An `initURL` was honoured on Android and ignored on iOS. The plugin wrote `com.c15t.backend.initUrl` into `Info.plist` and nothing read it, so an app that points initialization at a same-origin proxy saved consent through the proxy on Android while iOS went straight to `${backendURL}/init`. The iOS bridge now passes the key to its transport the way `@c15t/core` and the Android core do: the value is used as given, and only an absent key falls back to `${backendURL}/init`.

Drop the `publicKey` plugin parameter, its `extra.c15t` field, and the `com.c15t.backend.publicKey` / `com.c15t.PUBLIC_KEY` keys. Nothing read them on either platform, and a c15t project is identified by its backend URL: neither `/init` nor `/subjects` carries a key, so the parameter only ever moved a value into a public `.ipa` and `.apk` where no code could look at it. Remove it from `app.json`; nothing replaces it.

Read Android `<meta-data>` values whichever type the manifest parser chose. An unquoted `android:value="true"` arrives as a boolean and an unquoted `1` as a number, so `com.c15t.FORCE_GPC` and `com.c15t.reactnative.AUTO_BOOTSTRAP` are now read from the raw entry, which accepts `true`, `TRUE`, `1`, `false`, and `0`. A value that means neither reads as absent rather than `false`, so GPC is still derived when nothing declared it.
