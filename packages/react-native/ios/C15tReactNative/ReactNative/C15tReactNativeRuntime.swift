#if canImport(C15tCore)
// SwiftPM builds the consent kernel as its own module. CocoaPods compiles the vendored
// copy into this module instead, where the import would fail, so it is conditional
// rather than assumed.
import C15tCore
#endif
#if canImport(C15tReactNativeBridge)
// SwiftPM builds the wire layer as its own module. CocoaPods compiles it into this
// module instead, where the import would fail, so it is conditional rather than
// assumed.
import C15tReactNativeBridge
#endif
import Foundation

/// The Objective-C entry point for starting the consent core.
///
/// Two things need to reach the bootstrap from Objective-C: the constructor in
/// `C15tReactNativeRuntimeInitializer.mm`, which runs before React Native
/// initializes, and a host app that would rather call it itself. This is the `@objc`
/// surface; the decisions live in `C15tReactNativeBootstrap`.
///
/// `C15tReactNativeEarlyStart`, which lives beside that launch hook in
/// `C15tReactNativeRuntimeInitializer.mm`, is what gets this called with no app wiring.
/// The pod is a static archive, so the file holding the hook survives a host's link only
/// because it also defines an Objective-C class.
@objc(C15tReactNativeRuntime)
public final class C15tReactNativeRuntime: NSObject {
    /// Start the core from `Info.plist`, unless the app opted out.
    ///
    /// Safe to call more than once and from any thread: the core's own bootstrap is
    /// idempotent, and hydration completes before this returns so the caller can read
    /// stored consent on the next line.
    ///
    /// - Returns: `true` when a core is running afterwards.
    @objc @discardableResult
    public static func startCoreIfNeeded() -> Bool {
        C15tReactNativeBootstrap.start()
    }

    /// Start the core even though the app opted out of automatic startup.
    ///
    /// For an app that set `com.c15t.reactnative.AutoBootstrap` to `false` and wants
    /// the `Info.plist` values after all, at a moment it chose.
    @objc @discardableResult
    public static func startCore() -> Bool {
        C15tReactNativeBootstrap.start(
            configuration: C15tBridgeConfiguration.from(infoPlist: Bundle.main.infoDictionary ?? [:])
        )
    }

    /// Adopt a core the app built itself.
    ///
    /// Call this from `application(_:didFinishLaunchingWithOptions:)` before the React
    /// host starts. The bridge attaches to this core and never builds its own, which is
    /// the only way a host can supply a transport, store, or header set that the
    /// `Info.plist` keys cannot express.
    ///
    /// Swift only, and deliberately so. `ConsentCore` has no Objective-C representation,
    /// so an `@objc` declaration of this method cannot compile. The pod does not need
    /// one: the only Objective-C caller inside it is the launch hook, and that calls
    /// `startCoreIfNeeded`. A host that owns its own core installs it from Swift, which
    /// is the only language in which a `ConsentCore` gets built anyway.
    ///
    /// - Returns: `true` when `core` is the instance the bridge will use.
    @discardableResult
    public static func install(core: ConsentCore) -> Bool {
        C15tReactNativeBootstrap.install(core)
    }

    /// Whether a core is running.
    @objc public static func isCoreRunning() -> Bool {
        C15tReactNativeBootstrap.isRunning
    }
}
