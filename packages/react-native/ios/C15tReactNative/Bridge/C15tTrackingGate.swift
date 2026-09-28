#if canImport(C15tCore)
// SwiftPM builds the consent kernel as its own module. CocoaPods compiles the vendored
// copy into this module instead, where the import would fail, so it is conditional
// rather than assumed.
import C15tCore
#endif
import Foundation

/// What either platform may report about tracking, spelled the way the wire spells it.
///
/// The four Apple states plus `unsupported`. The fifth case is the one that carries the
/// weight, because it is the only arm that lets tracking through without a platform yes:
/// it means "this build has no platform gate to satisfy", which is Android's honest
/// answer always, and iOS's answer for a build with no prompt string. It must never be
/// confused with `not-determined`, which means the subject has not been asked yet and
/// still has to be.
///
/// Raw values are the wire values `src/protocol/tracking.ts` declares, so Swift, Kotlin,
/// and JavaScript name one set of arms.
public enum C15tTrackingAuthorization: String, CaseIterable, Sendable {
    /// Apple said yes, or the platform asks nothing and consent decided alone.
    case authorized
    case denied
    case notDetermined = "not-determined"
    case restricted
    /// No tracking gate exists for this build: Android always, iOS without a prompt string.
    case unsupported
}

/// Apple's four states, spelled without importing `AppTrackingTransparency`.
///
/// The raw values match `ATTrackingManager.AuthorizationStatus` so the reader can hand
/// this enum across instead of a framework type. That import belongs to
/// ``C15tTracking`` alone, for the same reason `C15tReachabilityGate` keeps
/// `Network` out of the decision: the mapping is the part that has to be wrong in a way
/// anyone can see, and a test target on macOS cannot compile a framework that only
/// exists on the device.
public enum C15tTrackingPlatformStatus: Int, CaseIterable, Sendable {
    case notDetermined = 0
    case restricted
    case denied
    case authorized
}

/// Why the platform was not asked, in the two ways that happen.
public enum C15tTrackingRefusal: Equatable, Sendable {
    /// Apple would suppress the dialog and record the answer as denied without a word,
    /// because `Info.plist` carries no `NSUserTrackingUsageDescription`.
    case noPromptString
    /// This platform, or this OS, has no App Tracking Transparency to read.
    case unavailable
}

/// What a request should do, decided before anyone calls Apple.
public enum C15tTrackingDecision: Equatable, Sendable {
    /// Show the dialog: the build can, and the subject has not answered yet.
    case prompt
    /// Resolve with this arm. Apple shows its dialog once per install, and a second call
    /// answers with the state on the device rather than showing anything.
    case answered(C15tTrackingAuthorization)
    /// Reject, and say why. Nothing was asked.
    case refused(C15tTrackingRefusal)
}

/// The mapping and the refusal, with no framework in either.
///
/// `native/CONTRACT.md` gives the rule this file exists to keep testable: platform
/// authorization is a gate and not consent, and no platform answer moves a category from
/// `denied` or `pending` to `granted`. This type never sees a consent value, so it cannot
/// be the place that rule breaks. It takes the two facts it needs as parameters and
/// returns one arm, which is what lets ``C15tTrackingGateTests`` walk every state on a
/// Mac.
public enum C15tTrackingGate {
    /// The arm a caller reads.
    ///
    /// A build with no prompt string reports `unsupported` even though Apple answers
    /// `denied` when asked without one. That is deliberate and it is the whole reason the
    /// plist check comes first: reporting Apple's silent `denied` would hold every
    /// optional category off on a device where the host never asked for Apple tracking
    /// and declared no tracking in its privacy manifest, which is a bug report about
    /// analytics rather than a privacy win.
    ///
    /// - Parameters:
    ///   - platform: Apple's answer, or `nil` where there is no ATT to read.
    ///   - promptStringPresent: Whether this binary carries `NSUserTrackingUsageDescription`.
    public static func authorization(
        platform: C15tTrackingPlatformStatus?,
        promptStringPresent: Bool
    ) -> C15tTrackingAuthorization {
        guard promptStringPresent, let platform else { return .unsupported }
        switch platform {
        case .authorized: return .authorized
        case .denied: return .denied
        case .notDetermined: return .notDetermined
        case .restricted: return .restricted
        }
    }

    /// Whether the platform half of a tracking gate is satisfied.
    ///
    /// Two arms clear it. `authorized` is Apple saying yes. `unsupported` means the
    /// platform asks nothing of this build, which is Android's honest answer and iOS's
    /// answer for a binary with no prompt string. Neither is a statement about what the
    /// subject agreed to, which is why this is never the whole rule and callers want
    /// ``mayTrack(decision:authorization:)`` instead.
    public static func isPlatformSatisfied(
        _ authorization: C15tTrackingAuthorization
    ) -> Bool {
        authorization == .authorized || authorization == .unsupported
    }

    /// Whether tracking behaviour may run, given both answers.
    ///
    /// This is the primitive an analytics or ad SDK gates on, and it is the shape of the
    /// contract's sentence: the c15t decision and the platform authorization are both
    /// required, and the platform never supplies the missing half. A granted category on
    /// a device where Apple says no stays off, and an unresolved one stays off whichever
    /// way the platform went, because a prompt does not resolve a policy.
    ///
    /// Both halves arrive as arguments, so the direction of the combination is auditable
    /// without a device and without a snapshot: nothing here can read consent into the
    /// platform answer.
    ///
    /// - Parameters:
    ///   - decision: The c15t answer for the category being gated.
    ///   - authorization: The arm ``authorization(platform:promptStringPresent:)`` reported.
    /// - Returns: `true` only when consent is granted and the platform is satisfied.
    public static func mayTrack(
        decision: ConsentDecision,
        authorization: C15tTrackingAuthorization
    ) -> Bool {
        decision == .granted && isPlatformSatisfied(authorization)
    }

    /// What to do when a host asks for authorization.
    ///
    /// The refusal is the point of this function. Apple's dialog is suppressed silently
    /// without a prompt string, and the call comes back as `denied` with no explanation,
    /// which spends the one prompt an install ever gets and leaves the host reading a
    /// refusal nobody made. So the build is checked before the question is asked, and
    /// the answer is a rejection that names the missing key.
    ///
    /// Availability is checked first because it is the more basic fact: a build with no
    /// ATT has no prompt string to look for either.
    public static func request(
        platform: C15tTrackingPlatformStatus?,
        promptStringPresent: Bool
    ) -> C15tTrackingDecision {
        guard let platform else { return .refused(.unavailable) }
        guard promptStringPresent else { return .refused(.noPromptString) }
        guard platform == .notDetermined else {
            return .answered(authorization(platform: platform, promptStringPresent: true))
        }
        return .prompt
    }
}
