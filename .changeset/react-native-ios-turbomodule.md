---
"@c15t/react-native": patch
---

Build the React Native binding on iOS. The pod did not compile at all: it declared conformance to a Codegen protocol that exists only inside an Objective-C++ umbrella header, and marked a method `@objc` whose Swift-only parameter type has no Objective-C spelling. The Codegen conformance, the module name, and the `getTurboModule:` provider now live in an Objective-C++ category on the Swift class, every selector is stated rather than inferred, and the dead header search paths are gone, so a host app's `pod install` and build end with a registered `C15t` TurboModule. `C15tReactNativeRuntime.install(core:)` is Swift only: `ConsentCore` has no Objective-C representation, and a host that builds its own core does so in Swift anyway.
