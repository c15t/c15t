---
"@c15t/react-native": patch
---

Load the Expo config plugin as CommonJS. `@c15t/react-native/expo-plugin` now publishes a `require` export condition that resolves to a bundled `dist/expo-plugin/index.cjs`, so `expo config` and `expo prebuild` can load it on every Node version Expo supports instead of only on a Node that can `require()` an ES module. The ES module entry stays the `import` target, so Metro and other bundlers see no change.
