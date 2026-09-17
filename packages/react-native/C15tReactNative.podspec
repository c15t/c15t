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
  s.license      = { :type => "Apache-2.0", :file => "../../LICENSE" }
  s.authors      = { "c15t" => "https://c15t.com" }
  s.source       = { :git => "https://github.com/c15t/c15t.git", :tag => "react-native@#{s.version}" }

  # The TurboModule, the ObjC export shim, the startup constructor, and the React-free
  # wire layer underneath them.
  s.source_files = "ios/C15tReactNative/**/*.{h,swift,m,mm}"
  s.public_header_files = "ios/C15tReactNative/C15tReactNative.h"
  s.resource_bundle = { "C15tReactNative" => "ios/C15tReactNative/Resources/Privacy.xcprivacy" }
  s.preserve_paths = "ios", "package.json", "react-native.config.js", "Package.swift"

  s.platforms = { :ios => "16.4" }
  s.swift_versions = ["5.9"]
  s.requires_arc = true
  s.static_framework = true

  s.frameworks = "Foundation", "Security"

  # RCTEventEmitter, RCTBridgeModule, and the promise blocks. The generated
  # `NativeC15tSpec` protocol lives in the app's `ReactCodegen` pod, which every React
  # Native app build has: it is generated during that app's `pod install`, which is why
  # it is reached through the header search paths below rather than declared as a
  # dependency. A published pod cannot depend on an artifact only an app build creates.
  s.dependency "React-Core"

  if core_version && !core_version.empty?
    s.dependency "C15tCore", core_version
  else
    s.dependency "C15tCore"
  end

  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    "SWIFT_OBJC_INTERFACE_HEADER_NAME" => "C15tReactNative-Swift.h",
    "HEADER_SEARCH_PATHS" => [
      "\"${PODS_ROOT}/Build/Products/Debug-iphonesimulator\"",
      "\"${PODS_ROOT}/Build/Products/Debug-iphoneos\"",
      "\"$(PODS_ROOT)/../../../build/generated/ios\"",
      "\"$(PODS_CONFIGURATION_BUILD_DIR)/ReactCodegen\"",
    ].join(" "),
  }

end
