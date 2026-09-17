---
"@c15t/react-native": patch
---

Make `com.c15t.reactnative.AUTO_BOOTSTRAP = false` mean it on Android. The core library registers its own `androidx.startup` initializer, and it merged alongside the binding's, so two entries shipped in the app manifest. The core's has no opt-out flag and starts a core from `com.c15t.PORTAL_URL` whenever that key is present, and `C15t.bootstrap` keeps the first core installed. A host that set the flag to install its own configured core therefore got the manifest core anyway, with its own install refused and no warning. The binding's manifest now removes the core's initializer, leaving one owner for the launch hook that reads the flag.
