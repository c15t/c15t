---
"@c15t/react-native": patch
---

Link the React Native binding in Expo apps on Android. Expo's autolinker reads only `react-native.config.js` and `react-native.config.ts`, so the package's `react-native.config.cjs` was never opened: Expo fell back to the wrapper `android` directory, could not parse a Java package from a build file with no namespace, and dropped the library from the generated `PackageList.java` without a warning. The config is now `react-native.config.js`, written as ESM, which both Expo and the community CLI read, and the autolink check asserts the Expo linker resolves the library rather than only the community CLI.
