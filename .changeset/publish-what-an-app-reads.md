---
"@c15t/react-native": patch
---

Ship the files a host app actually reads, and nothing else. The package allowlisted the whole `ios` and `android` directories, and npm discards a package's root `.gitignore` as soon as `files` names an allowlist, so a `pod install` or a Gradle build left sitting in the checkout would have been published along with the sources. `Package.swift` shipped as well, and it resolves the core at `../../native/core-swift`, a path that exists in nobody's installed tree. The podspec license pointed at `../../LICENSE.md`, which resolves only through a symlinked workspace install; it now points at the package's own copy, which is also what Apache-2.0 asks for. `src/specs` is allowlisted explicitly, because both platforms' Codegen reads that directory out of `react-native config` and an app cannot generate a spec from a directory that is not there.
