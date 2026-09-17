// swift-tools-version:5.9
import Foundation
import PackageDescription

// C15tReactNative is the React Native binding for the c15t consent core: the iOS
// TurboModule, the event pump, and the launch hook that starts the core before React
// Native initializes.
//
// This manifest serves React Native's CocoaPods-disabled path (`RCTUseSPM`, Expo's
// SPM mode). It is not the only way to integrate: the CocoaPods path uses
// ../C15tReactNative.podspec, and both resolve the consent core from this repository
// rather than from a published artifact, so the Swift, Kotlin, and JavaScript layers
// in one checkout cannot disagree about which core is running.
//
// Two facts shape the layout:
//
// 1. The consent core is a pure Swift package with no React Native in it, per
//    native/CONTRACT.md. It is a path dependency at ../../native/core-swift, and this
//    package adds nothing to it beyond the `C15t` install point the bridge needs.
// 2. The TurboModule cannot compile without React Native's headers and the Codegen
//    artifacts that `pod install` (or SPM sync) generates for the host app. Those
//    exist only inside an app build, so `swift build` on this manifest alone compiles
//    the React-free half, which is where every wire-format decision lives.
//
// Environment switches, all optional:
//
//   C15T_SPM_INCLUDE_RN=1   Also build the React-linked target. Needs a host app that
//                           vends React's headers and the generated `NativeC15tSpec`
//                           protocol. Without it the product is the bridge layer only.
//   C15T_CORE_PATH=<path>   Where native/core-swift lives, when the checkout layout
//                           differs. Defaults to ../../native/core-swift.
//   C15T_CORE_VERSION=<v>   Escape hatch for the published core: resolve C15tCore at
//                           this version from C15T_CORE_URL instead of the repo path.
//   C15T_CORE_URL=<url>     Repository the published core resolves from. Defaults to
//                           the public c15t repository.
let env = ProcessInfo.processInfo.environment

let corePath = env["C15T_CORE_PATH"] ?? "../../native/core-swift"
let coreVersion = env["C15T_CORE_VERSION"]
let coreURL = env["C15T_CORE_URL"] ?? "https://github.com/c15t/c15t.git"
let includeReact = env["C15T_SPM_INCLUDE_RN"] == "1"

// The identity the product reference must use: the pinned name for the repo path,
// and the repository name for the published-version escape hatch. They deliberately
// differ, so a manifest cannot silently mix the two.
let corePackageID = coreVersion == nil ? "C15tCore" : "c15t"

let coreDependency: [Package.Dependency] = {
    if let coreVersion {
        return [.package(url: coreURL, from: Version(coreVersion)!)]
    }
    return [.package(name: "C15tCore", path: corePath)]
}()

let coreProduct = Target.Dependency.product(name: "C15tCore", package: corePackageID)

var targets: [Target] = [
    // The wire boundary: encoders, decoders, the event pump, and the launch
    // configuration. No `React` import anywhere in here, which is what lets it be
    // compiled and tested outside an app build.
    .target(
        name: "C15tReactNativeBridge",
        dependencies: [coreProduct],
        path: "ios/C15tReactNative",
        exclude: ["ReactNative"],
        sources: ["Bridge"],
        resources: [.copy("Resources/Privacy.xcprivacy")]
    ),
]

var products: [Product] = [
    .library(name: "C15tReactNativeBridge", targets: ["C15tReactNativeBridge"])
]

if includeReact {
    targets.append(
        // The TurboModule itself: the Codegen spec conformance, the ObjC export shim,
        // and the hook that starts the core before React Native initializes.
        .target(
            name: "C15tReactNative",
            dependencies: ["C15tReactNativeBridge", coreProduct],
            path: "ios/C15tReactNative",
            exclude: ["Bridge", "Resources"],
            sources: ["ReactNative"]
        )
    )
    products.append(
        .library(name: "C15tReactNative", targets: ["C15tReactNative"])
    )
}

targets.append(
    .testTarget(
        name: "C15tReactNativeTests",
        dependencies: ["C15tReactNativeBridge", coreProduct],
        path: "ios/Tests/C15tReactNativeTests"
    )
)

let package = Package(
    name: "C15tReactNative",
    platforms: [
        .iOS("16.4"),
        .macOS(.v13),
    ],
    products: products,
    dependencies: coreDependency,
    targets: targets,
    cxxLanguageStandard: .cxx20
)
