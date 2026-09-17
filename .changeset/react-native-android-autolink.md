---
"@c15t/react-native": patch
---

Link the React Native binding on Android. A library's autolinking entries belong under `dependency.platforms` in `react-native.config.cjs`, the shape an app writes was read as valid and then ignored, so the CLI fell back to guessing the source directory. Android autolinking now points at `android/c15t-react-native`, the module that declares the `com.c15t.reactnative` namespace React Native looks for, so `react-native config` resolves the package instead of exiting non-zero and a host app's Gradle build gets past configuration.
