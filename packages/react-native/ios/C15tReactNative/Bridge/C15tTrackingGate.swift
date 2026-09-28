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

/// Which of Apple's two request calls to make.
///
/// This names the call this SDK makes, not the sheet Apple renders. Apple keeps the
/// European Union presentation to itself: the expanded sheet needs the device to sit in
/// a specific EU country and the signed-in Apple Account to carry a specific EU region,
/// and outside those rules Apple ignores the preference and shows the plain alert from
/// `NSUserTrackingUsageDescription` even though this SDK asked for the expanded call. So
/// `expanded` on the wire means "the expanded request was made", and nothing more. A host
/// that reads it as proof of an EU presentation is reading a fact this line never
/// supplied, and `docs/frameworks/react-native/native-behaviour.mdx` says so in those
/// words.
public enum C15tTrackingPresentation: String, CaseIterable, Sendable {
    /// The expanded EU request, available from iOS and iPadOS 27.2.
    case expanded
    /// `requestTrackingAuthorization(completionHandler:)`, which every supported system has.
    case standard
}

/// Whether an answer settles the request or only pauses it.
///
/// The pause exists because of how Apple's Additional Information button works: the sheet
/// closes without recording an answer, this SDK's own closure runs, and Apple still calls
/// its completion handler with `notDetermined`. A caller that read that as a final answer
/// would report a refusal nobody made, so the pause is named instead.
public enum C15tTrackingStage: String, CaseIterable, Sendable {
    /// The subject answered, or Apple declined to ask. Nothing further is owed.
    case final
    /// Additional Information was tapped. The subject is mid-decision and has to be asked
    /// again once the app has shown whatever it shows there.
    case additionalInformation = "additional-information"
}

/// What a request hands back: the platform arm, and what to do with it.
public struct C15tTrackingRequestResult: Equatable, Sendable {
    /// Apple's arm, preserved as Apple gave it. Never widened, never invented.
    public let status: C15tTrackingAuthorization
    /// Whether this settles the request.
    public let stage: C15tTrackingStage
    /// Which call was made to get here, or `nil` when none was.
    ///
    /// Optional because a result can arrive without Apple being asked at all, which is what
    /// a restricted device does. Saying `standard` there would report a call this request
    /// never made, and the one thing worth keeping clean on this boundary is the difference
    /// between what Apple was told and what this SDK concluded.
    public let presentation: C15tTrackingPresentation?

    public init(
        status: C15tTrackingAuthorization,
        stage: C15tTrackingStage,
        presentation: C15tTrackingPresentation?
    ) {
        self.status = status
        self.stage = stage
        self.presentation = presentation
    }
}

/// What a request should do, decided before anyone calls Apple.
public enum C15tTrackingDecision: Equatable, Sendable {
    /// Ask Apple, by way of this call.
    case prompt(presentation: C15tTrackingPresentation)
    /// Resolve with this arm without asking. Only a state Apple can never answer from
    /// lands here, which is `restricted`; everything else goes to Apple and lets Apple
    /// decide, because the European Union lets an answered request be asked again after a
    /// year and this SDK is not the thing that gets to say otherwise.
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
    /// which leaves the host reading a refusal nobody made. So the build is checked before
    /// the question is asked, and the answer is a rejection that names the missing key.
    ///
    /// Availability is checked first because it is the more basic fact: a build with no
    /// ATT has no prompt string to look for either.
    ///
    /// An already-answered subject is asked anyway. This function used to answer
    /// `authorized` or `denied` from the device without calling Apple, on the reasoning that
    /// Apple shows its dialog once per install. That is no longer the whole rule: in the
    /// European Union an answered request may be presented again a year after the answer,
    /// whichever way it went. Short-circuiting here would be this SDK enforcing a
    /// one-prompt lifetime Apple no longer holds, and it would do it invisibly, so a host
    /// that wanted the annual re-prompt could not get one. Asking Apple is the only way to
    /// learn whether this install is eligible, and asking costs nothing when it is not:
    /// outside the eligibility window Apple shows nothing and calls the handler straight
    /// back with the stored arm. Nothing here prompts on its own, because nothing in this
    /// package calls it, so a host that never asks never re-prompts.
    ///
    /// `restricted` is the one arm kept out of Apple's way. Apple reports it whether or not
    /// the subject was ever shown the prompt, so the device policy has already answered and
    /// a call would only return the same arm.
    ///
    /// - Parameters:
    ///   - platform: Apple's answer, or `nil` where there is no ATT to read.
    ///   - promptStringPresent: Whether this binary carries `NSUserTrackingUsageDescription`.
    ///   - expandedInterfaceAvailable: Whether this runtime has the expanded EU request.
    ///     ``C15tTracking/expandedInterfaceAvailable()`` answers it by looking for the
    ///     method, which is the only check that works: it arrives with iOS and iPadOS 27.2,
    ///     newer than the SDK this package builds against, so an `#available` check would be
    ///     a guess about a symbol the build never saw.
    /// - Returns: Whether to ask, which call to use, or why the request is refused.
    public static func request(
        platform: C15tTrackingPlatformStatus?,
        promptStringPresent: Bool,
        expandedInterfaceAvailable: Bool
    ) -> C15tTrackingDecision {
        guard let platform else { return .refused(.unavailable) }
        guard promptStringPresent else { return .refused(.noPromptString) }
        guard platform != .restricted else { return .answered(.restricted) }
        return .prompt(presentation: expandedInterfaceAvailable ? .expanded : .standard)
    }

    /// What a caller reads once Apple's handler has run.
    ///
    /// Two mistakes live here, and both are the kind a host cannot debug from outside. The
    /// first is Apple's Additional Information tap: it closes the sheet without recording an
    /// answer and still reports `notDetermined`, so a caller that treats that as settled
    /// reports a refusal the subject never made. The second is any path that turns a
    /// `notDetermined` into a `denied`, which puts a choice in the audit history that the
    /// device never recorded. So the arm Apple reported travels unchanged and the only thing
    /// added here is the stage.
    ///
    /// - Parameters:
    ///   - platform: The arm Apple's handler reported, or `nil` where ATT went away mid-call.
    ///   - presentation: Which call ``request(platform:promptStringPresent:expandedInterfaceAvailable:)``
    ///     chose.
    ///   - additionalInformationSelected: Whether Apple ran the Additional Information
    ///     closure for this request.
    /// - Returns: The result to encode, or `nil` when there is no arm to report. `nil` is
    ///   deliberate: `unsupported` reads as "the platform asks nothing of us", the one arm
    ///   that lets tracking through without a yes, so a vanished ATT has to be a failure
    ///   rather than an answer.
    public static func requestResult(
        platform: C15tTrackingPlatformStatus?,
        presentation: C15tTrackingPresentation?,
        additionalInformationSelected: Bool
    ) -> C15tTrackingRequestResult? {
        guard let platform else { return nil }
        return C15tTrackingRequestResult(
            status: authorization(platform: platform, promptStringPresent: true),
            stage: additionalInformationSelected ? .additionalInformation : .final,
            presentation: presentation
        )
    }
}
