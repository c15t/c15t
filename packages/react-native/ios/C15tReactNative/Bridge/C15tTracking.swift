import Foundation

#if canImport(AppTrackingTransparency)
import AppTrackingTransparency
#endif

/// The only file in this package that talks to App Tracking Transparency.
///
/// Two facts come out of here: whether this binary is allowed to show Apple's dialog, and
/// what Apple currently answers. Neither is a consent statement, and neither is derived
/// from one. The decisions those facts lead to live in ``C15tTrackingGate``, which is why
/// this file holds no `if` that a test cannot reach without a device.
///
/// The availability guard is not for old iPhones. The pod's deployment floor is iOS 16.4,
/// a release after ATT became the only route to the identifier, so on every device this
/// package supports ATT is there. The guard is for the builds that compile this target
/// without an iPhone in sight: a macOS `swift test` run, and anything else where the
/// framework is not in the SDK. Those reads answer `nil`, which the gate turns into
/// `unsupported`, rather than failing to link.
public enum C15tTracking {
    /// The `Info.plist` key that makes the Apple dialog possible.
    ///
    /// This is the runtime half of the Expo plugin's `enableAppTrackingTransparency`, and
    /// the plugin writes the key only under that flag. Reading the key rather than a
    /// c15t-namespaced setting is deliberate: it is the same check Apple performs, so a
    /// host that wrote the string by hand without the plugin is not refused a prompt it
    /// can genuinely show.
    public static let promptStringKey = "NSUserTrackingUsageDescription"

    /// Whether this binary can show the Apple dialog.
    ///
    /// A key present but empty is not a prompt string: Apple's own check is on a usable
    /// string, and the plugin refuses to invent one, so an empty value would suppress the
    /// dialog exactly as a missing one does.
    public static func promptStringPresent(in bundle: Bundle = .main) -> Bool {
        guard let value = bundle.infoDictionary?[promptStringKey] as? String else { return false }
        return !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    /// Apple's current answer, or `nil` where this platform has no ATT to ask.
    public static func platformStatus() -> C15tTrackingPlatformStatus? {
        #if canImport(AppTrackingTransparency) && os(iOS)
        if #available(iOS 14.0, *) {
            return platformStatus(ATTrackingManager.trackingAuthorizationStatus)
        }
        #endif
        return nil
    }

    /// Show Apple's dialog and report the answer.
    ///
    /// Apple presents the prompt from the main thread, and a synchronous module method
    /// runs on the JavaScript thread, so the hop is not a courtesy: without it the
    /// dialog is what triggers the main-thread checker in a debug build.
    ///
    /// Call it only when ``C15tTrackingGate/request(platform:promptStringPresent:)`` said
    /// `.prompt`. The handler enforces that, because calling this on a build without a
    /// prompt string is how an install spends its one dialog on nothing.
    ///
    /// - Parameter completion: runs wherever Apple delivers its answer.
    public static func requestPrompt(
        completion: @escaping (C15tTrackingPlatformStatus?) -> Void
    ) {
        #if canImport(AppTrackingTransparency) && os(iOS)
        if #available(iOS 14.0, *) {
            DispatchQueue.main.async {
                ATTrackingManager.requestTrackingAuthorization { status in
                    completion(platformStatus(status))
                }
            }
            return
        }
        #endif
        completion(nil)
    }

    /// Translate Apple's enum without importing it anywhere else.
    #if canImport(AppTrackingTransparency) && os(iOS)
    @available(iOS 14.0, *)
    private static func platformStatus(
        _ status: ATTrackingManager.AuthorizationStatus
    ) -> C15tTrackingPlatformStatus {
        switch status {
        case .authorized: return .authorized
        case .denied: return .denied
        case .notDetermined: return .notDetermined
        case .restricted: return .restricted
        @unknown default:
            // An arm Apple adds later is not permission. `restricted` is the arm that
            // reads "someone else decides, and it was not you", which is the safe
            // reading of a state this build has never seen.
            return .restricted
        }
    }
    #endif
}
