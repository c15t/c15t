require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# The consent core. In this repository it is `native/core-swift`, a pure Swift package
# with no React Native in it, and the app's Podfile points the `C15tCore` pod at that
# directory:
#
#   pod "C15tCore", :path => "../native/core-swift"
#
# `C15T_CORE_POD_VERSION` switches the dependency to a published version for a release
# build, which is the escape hatch for shipping the binding without the monorepo.
# Overridable from the environment so one file serves both without editing it.
core_version = ENV["C15T_CORE_POD_VERSION"]

Pod::Spec.new do |s|
  s.name         = "C15tReactNative"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["repository"]["url"]
  s.license      = { :type => "Apache-2.0", :file => "../../LICENSE.md" }
  s.authors      = { "c15t" => "https://c15t.com" }
  s.source       = { :git => "https://github.com/c15t/c15t.git", :tag => "react-native@#{s.version}" }

  # The TurboModule, the ObjC export shim, the startup constructor, and the React-free
  # wire layer underneath them.
  s.source_files = "ios/C15tReactNative/**/*.{h,swift,m,mm}"
  s.public_header_files = "ios/C15tReactNative/C15tReactNative.h"
  s.resource_bundle = { "C15tReactNative" => "ios/C15tReactNative/Resources/Privacy.xcprivacy" }
  s.preserve_paths = "ios", "package.json", "react-native.config.cjs", "Package.swift"

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

  if core_version && !core_version.empty?
    s.dependency "C15tCore", core_version
  else
    s.dependency "C15tCore"
  end

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
  }

end
