require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# The consent kernel is compiled from `vendor/C15tCore`, a generated copy of
# `native/core-swift/Sources/C15tCore` written by `scripts/sync-vendored-core.ts`.
#
# This spec used to declare `s.dependency "C15tCore"`. That resolved here only because the
# example Podfiles write `pod "C15tCore", :path => "../native/core-swift"`; CocoaPods cannot
# attach a path to a `s.dependency`, and nothing publishes the pod, so an app installed from
# npm had no source for the kernel and `pod install` failed there. `C15T_CORE_POD_VERSION`
# left with it: there is no published version to pin.
#
# One target rather than two, because a second podspec in this package would still ask the host
# Podfile to name `C15tCore`, which is the same request made of the consumer. The kernel's
# sources come along inside the package and compile into this module, and the bridge's
# `import C15tCore` sites sit behind `#if canImport(C15tCore)` so the SwiftPM path, where the
# kernel is its own module, keeps working. See vendor/README.md.

Pod::Spec.new do |s|
  s.name         = "C15tReactNative"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["repository"]["url"]
  # The package's own copy, shipped in the tarball. It used to name the repository's
  # `../../LICENSE.md`, which only resolves through a symlinked workspace install: an app
  # that installs from npm gets `node_modules/@c15t/LICENSE.md`, a path that exists in
  # nobody's tree, and Apache-2.0 asks that the text travel with the software.
  s.license      = { :type => "Apache-2.0", :file => "LICENSE.md" }
  s.authors      = { "c15t" => "https://c15t.com" }
  s.source       = { :git => "https://github.com/c15t/c15t.git", :tag => "react-native@#{s.version}" }

  # The TurboModule, the ObjC export shim, the startup constructor, the React-free wire layer
  # underneath them, and the consent kernel they are built on. One line on purpose:
  # `scripts/react-native-autolink.ts` reads these declarations line by line when it checks
  # that every pattern resolves inside the packed package.
  #
  # The kernel brings no privacy manifest of its own. Its own spec ships one, and it declares the
  # same four keys with the same values as the bundle below, so the copy compiled into this
  # target is described by it.
  s.source_files = "ios/C15tReactNative/**/*.{h,swift,m,mm}", "vendor/C15tCore/**/*.swift"
  s.public_header_files = "ios/C15tReactNative/C15tReactNative.h"
  s.resource_bundle = { "C15tReactNative" => "ios/C15tReactNative/Resources/Privacy.xcprivacy" }
  # `Package.swift` is not in here because it is not in the package: the SPM manifest
  # resolves the core at `../../native/core-swift`, a path no installed tarball has.
  s.preserve_paths = "ios", "package.json", "react-native.config.js"

  s.platforms = { :ios => "16.4" }
  s.swift_versions = ["5.9"]
  s.requires_arc = true
  s.static_framework = true

  s.frameworks = "Foundation", "Security"

  # RCTEventEmitter, RCTBridgeModule, and the promise blocks.
  s.dependency "React-Core"

  # Codegen generates the `NativeC15tSpec` protocol and the `NativeC15tSpecJSI` glue that
  # the module provider returns, and it writes both into the `ReactCodegen` pod of the app
  # being built. That pod is created by the same `pod install` that resolves this podspec,
  # which is why a published library survives naming it: `install_modules_dependencies`,
  # the helper in `react-native/scripts/cocoapods/new_architecture.rb` that every
  # third-party library podspec is pointed at, adds this exact dependency. Declaring it
  # rather than hand-writing a search path also gives the build ordering, since
  # `ReactCodegen` has to be compiled before this pod can include its headers.
  #
  # The rest of the block is the include tree that umbrella header pulls in.
  s.dependency "ReactCodegen"
  s.dependency "ReactCommon/turbomodule/core"
  s.dependency "RCTRequired"
  s.dependency "RCTTypeSafety"
  s.dependency "React-bridging"

  # No `HEADER_SEARCH_PATHS` here on purpose. CocoaPods puts the headers of every declared
  # dependency under `${PODS_ROOT}/Headers/Public`, which is already on the include path
  # for this pod, and `ReactCodegen.podspec` keeps `header_mappings_dir` at `./`, so the
  # `C15tSpec` subdirectory the import names is the layout on disk. The four entries that
  # used to sit here were dead: two pointed at `Pods/Build/Products`, a directory nothing
  # writes, one pointed three levels above the app at a `build/generated/ios` that does
  # not exist there, and one pointed at the build products directory of
  # `ReactCodegen`, which holds only `libReactCodegen.a`.
  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    "SWIFT_OBJC_INTERFACE_HEADER_NAME" => "C15tReactNative-Swift.h",
    # The generated spec includes `std::optional` and jsi, so the pod compiles as the
    # same C++ standard React Native itself uses.
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
    # The vendored kernel marks a few types `package`, and the compiler accepts that access
    # level only once it is told which package it is building. SwiftPM passes the flag itself;
    # CocoaPods does not, which is why ../native/core-swift/C15tCore.podspec passes it too. The
    # copy is part of this module now, so it names this pod and not the kernel.
    "OTHER_SWIFT_FLAGS" => '$(inherited) -package-name "C15tReactNative"',
  }

end
