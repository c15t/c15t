// swift-tools-version:5.9
import PackageDescription

// C15tCore is the native consent kernel for mobile. It owns consent state and
// depends on nothing outside the OS: no UIKit, no AppKit, no React Native, no
// Expo. That keeps the same binary usable from an app extension, a Command Line
// Tools build, and a `swift test` run on macOS.
let package = Package(
    name: "C15tCore",
    platforms: [
        .macOS(.v13),
        .iOS("16.4"),
        .tvOS("16.4"),
        .watchOS("9.3"),
    ],
    products: [
        .library(name: "C15tCore", targets: ["C15tCore"]),
        .executable(name: "C15tCoreBench", targets: ["C15tCoreBench"]),
    ],
    targets: [
        .target(name: "C15tCore"),
        .executableTarget(name: "C15tCoreBench", dependencies: ["C15tCore"]),
        .testTarget(name: "C15tCoreTests", dependencies: ["C15tCore"]),
    ]
)
