@testable import C15tReactNativeBridge
import C15tCore
import XCTest

/// The mapping, the refusal, and the invariant, none of which need a device.
///
/// Three things are pinned here and nowhere else in this target:
///
/// 1. The four Apple states plus the arm for a build that cannot prompt, mapped without
///    importing `AppTrackingTransparency`, which is the same reason `C15tReachabilityGate`
///    keeps `Network` out of the decision it makes.
/// 2. That a request is refused before Apple is called. A prompt shown on a build with no
///    `NSUserTrackingUsageDescription` shows nothing, spends the one dialog an install
///    ever gets, and reports a `denied` no subject chose.
/// 3. That no arm moves a consent decision. `native/CONTRACT.md` states it as a sentence
///    about a device with ATT granted and consent refused, and the case is checked against
///    the core's own `ConsentDecision` rather than against a copy of the rule.
final class C15tTrackingGateTests: XCTestCase {
    /// Counts prompts, so "refused" can mean "and nothing was shown".
    private final class PromptRecorder: @unchecked Sendable {
        private let lock = NSLock()
        private var _calls = 0
        private let answer: C15tTrackingPlatformStatus?

        init(answer: C15tTrackingPlatformStatus?) { self.answer = answer }

        var calls: Int {
            lock.lock()
            defer { lock.unlock() }
            return _calls
        }

        func request(_ completion: @escaping (C15tTrackingPlatformStatus?) -> Void) {
            lock.lock()
            _calls += 1
            lock.unlock()
            completion(answer)
        }
    }

    // MARK: - Mapping

    func testEachAppleStateMapsToTheArmTheWireNames() {
        let expected: [(C15tTrackingPlatformStatus, C15tTrackingAuthorization)] = [
            (.notDetermined, .notDetermined),
            (.restricted, .restricted),
            (.denied, .denied),
            (.authorized, .authorized),
        ]

        for (platform, arm) in expected {
            XCTAssertEqual(
                C15tTrackingGate.authorization(platform: platform, promptStringPresent: true),
                arm
            )
        }
    }

    func testABuildWithNoPromptStringIsUnsupportedEvenWhenAppleSaysAuthorized() {
        // Apple answers `denied` when asked without a prompt string. Reporting that would
        // hold every optional category off on a device whose host never enabled Apple
        // tracking at all, so the build is read instead of the answer.
        for platform in C15tTrackingPlatformStatus.allCases {
            XCTAssertEqual(
                C15tTrackingGate.authorization(platform: platform, promptStringPresent: false),
                .unsupported,
                "no prompt string means no platform gate to report, whatever Apple holds"
            )
        }
    }

    func testAPlatformWithNoTrackingApiIsUnsupportedEvenWithAPromptString() {
        XCTAssertEqual(
            C15tTrackingGate.authorization(platform: nil, promptStringPresent: true),
            .unsupported,
            "a plist key on a platform with nothing to ask is still no gate"
        )
    }

    func testUnsupportedNeverReadsAsNotDetermined() {
        // The two arms are opposite instructions to a caller: one says the platform asks
        // nothing of this build, the other says a subject has still to be asked.
        XCTAssertNotEqual(
            C15tTrackingGate.authorization(platform: nil, promptStringPresent: false),
            C15tTrackingGate.authorization(platform: .notDetermined, promptStringPresent: true)
        )
        XCTAssertEqual(C15tTrackingAuthorization.allCases.count, 5)
    }

    // MARK: - The invariant

    func testNoPlatformArmMovesAConsentDecision() {
        let settled = ConsentState(
            necessary: true,
            functionality: true,
            experience: false,
            measurement: true,
            marketing: true
        )
        let refused = ConsentState(
            necessary: true,
            functionality: true,
            experience: false,
            measurement: true,
            marketing: false
        )
        let granted = ConsentSnapshot(
            policyPending: false,
            ready: true,
            effectivePermissions: settled
        )
        let denied = ConsentSnapshot(
            policyPending: false,
            ready: true,
            effectivePermissions: refused
        )
        let unresolved = ConsentSnapshot(
            policyPending: true,
            ready: true,
            effectivePermissions: settled
        )

        let snapshots: [(ConsentDecision, ConsentSnapshot)] = [
            (.granted, granted),
            (.denied, denied),
            (.pending, unresolved),
        ]

        for (expected, snapshot) in snapshots {
            let baseline = ConsentDecision(snapshot: snapshot, category: .marketing)
            XCTAssertEqual(baseline, expected)

            for platform in C15tTrackingPlatformStatus.allCases + [nil] {
                for promptStringPresent in [true, false] {
                    let arm = C15tTrackingGate.authorization(
                        platform: platform,
                        promptStringPresent: promptStringPresent
                    )

                    // Reading the platform answer is not an input to the decision, and the
                    // decision has to survive every arm unchanged. This is the contract's
                    // sentence: ATT granted and consent refused is denied; pending plus ATT
                    // authorized is pending.
                    XCTAssertEqual(
                        ConsentDecision(snapshot: snapshot, category: .marketing),
                        baseline,
                        "arm \(arm.rawValue) moved a \(baseline.rawValue) decision"
                    )

                    // And the arm alone can never be the reason tracking runs: the pair is
                    // allowed only where consent already said yes.
                    XCTAssertFalse(
                        baseline != .granted && mayTrack(marketing: snapshot, arm: arm),
                        "arm \(arm.rawValue) opened a \(baseline.rawValue) category"
                    )
                }
            }
        }
    }

    /// Read the combination through the bridge's own rule.
    ///
    /// Deliberately a call rather than a restatement. A copy of the rule in this file
    /// would keep passing when the production one is inverted, which is the only failure
    /// worth catching here.
    private func mayTrack(marketing: ConsentSnapshot, arm: C15tTrackingAuthorization) -> Bool {
        C15tTrackingGate.mayTrack(
            decision: ConsentDecision(snapshot: marketing, category: .marketing),
            authorization: arm
        )
    }

    /// The contract's two sentences, said plainly, against the bridge's own combination.
    ///
    /// Written as named arms rather than as a loop so an inverted rule fails with the
    /// sentence it broke.
    func testGrantedConsentAndADeniedPlatformIsDenied() {
        let settled = ConsentState(
            necessary: true,
            functionality: true,
            experience: false,
            measurement: true,
            marketing: true
        )
        let granted = ConsentDecision(
            snapshot: ConsentSnapshot(
                policyPending: false,
                ready: true,
                effectivePermissions: settled
            ),
            category: .marketing
        )
        let unresolved = ConsentDecision(
            snapshot: ConsentSnapshot(
                policyPending: true,
                ready: true,
                effectivePermissions: settled
            ),
            category: .marketing
        )

        XCTAssertEqual(granted, .granted)
        XCTAssertEqual(unresolved, .pending)

        // A device with ATT authorized and consent refused is denied. The reverse pair is
        // the same gate read from the other side: Apple's yes buys nothing on its own.
        XCTAssertFalse(
            C15tTrackingGate.mayTrack(decision: granted, authorization: .denied),
            "a denied platform let a granted category through"
        )
        XCTAssertFalse(
            C15tTrackingGate.mayTrack(decision: granted, authorization: .notDetermined)
        )
        XCTAssertFalse(
            C15tTrackingGate.mayTrack(decision: granted, authorization: .restricted)
        )
        XCTAssertTrue(C15tTrackingGate.mayTrack(decision: granted, authorization: .authorized))
        XCTAssertTrue(
            C15tTrackingGate.mayTrack(decision: granted, authorization: .unsupported)
        )

        // And pending plus ATT authorized is pending: an OS prompt does not end a wait.
        for arm in C15tTrackingAuthorization.allCases {
            XCTAssertFalse(
                C15tTrackingGate.mayTrack(decision: unresolved, authorization: arm),
                "arm \(arm.rawValue) resolved an unresolved policy"
            )
        }
    }

    // MARK: - Asking

    func testOnlyAnUnansweredSubjectEarnsADialog() {
        XCTAssertEqual(
            C15tTrackingGate.request(platform: .notDetermined, promptStringPresent: true),
            .prompt
        )

        for platform in [C15tTrackingPlatformStatus.authorized, .denied, .restricted] {
            XCTAssertEqual(
                C15tTrackingGate.request(platform: platform, promptStringPresent: true),
                .answered(C15tTrackingGate.authorization(platform: platform, promptStringPresent: true)),
                "Apple shows its dialog once, so a later call answers with the state on file"
            )
        }
    }

    func testRequestRefusesWhereThereIsNoTrackingApi() {
        XCTAssertEqual(
            C15tTrackingGate.request(platform: nil, promptStringPresent: true),
            .refused(.unavailable)
        )
    }

    func testRefusedRequestNamesTheMissingKeyAndNeverReachesApple() {
        let prompts = PromptRecorder(answer: .authorized)
        let handler = C15tModuleHandler(
            trackingPlatformStatus: { .notDetermined },
            trackingPromptStringPresent: { false },
            trackingPrompt: prompts.request
        )

        var outcome: Result<C15tTrackingAuthorization, C15tBridgeError>?

        handler.requestTrackingAuthorization { outcome = $0 }

        XCTAssertEqual(prompts.calls, 0, "a build that cannot prompt must not call Apple")
        XCTAssertEqual(
            failureCode(outcome),
            C15tBridgeError.trackingNotConfigured.code,
            "nothing was asked, and the rejection has to name the key that would have made it possible"
        )
    }

    func testPromptedRequestReportsTheAnswerAppleGave() {
        let prompts = PromptRecorder(answer: .authorized)
        let handler = C15tModuleHandler(
            trackingPlatformStatus: { .notDetermined },
            trackingPromptStringPresent: { true },
            trackingPrompt: prompts.request
        )

        var outcome: Result<C15tTrackingAuthorization, C15tBridgeError>?

        handler.requestTrackingAuthorization { outcome = $0 }

        XCTAssertEqual(prompts.calls, 1)
        XCTAssertEqual(try? outcome?.get(), .authorized)
    }

    func testAlreadyAnsweredRequestResolvesWithoutShowingAnything() {
        let prompts = PromptRecorder(answer: .denied)
        let handler = C15tModuleHandler(
            trackingPlatformStatus: { .authorized },
            trackingPromptStringPresent: { true },
            trackingPrompt: prompts.request
        )

        var outcome: Result<C15tTrackingAuthorization, C15tBridgeError>?

        handler.requestTrackingAuthorization { outcome = $0 }

        XCTAssertEqual(prompts.calls, 0, "the dialog is Apple's once per install, already spent")
        XCTAssertEqual(try? outcome?.get(), .authorized)
    }

    func testAPromptThatReportsNothingIsAFailureRatherThanUnsupported() {
        // `unsupported` tells a caller the platform adds no gate. Handing it back after a
        // dialog that produced no state would turn a broken read into permission to track.
        let handler = C15tModuleHandler(
            trackingPlatformStatus: { .notDetermined },
            trackingPromptStringPresent: { true },
            trackingPrompt: PromptRecorder(answer: nil).request
        )

        var outcome: Result<C15tTrackingAuthorization, C15tBridgeError>?

        handler.requestTrackingAuthorization { outcome = $0 }

        XCTAssertNil(try? outcome?.get())
        XCTAssertEqual(failureCode(outcome), C15tBridgeError.trackingUnsupported.code)
    }

    // MARK: - The wire and the read

    func testTrackingPayloadCarriesTheArmAndNothingElse() {
        // The wire spellings are written out here rather than read back off the enum, so a
        // renamed raw value fails against a string. `not-determined` is the one a
        // hand-written reader gets wrong: the JavaScript side compares against the
        // kebab-case spelling `src/protocol/tracking.ts` declares.
        let expected: [(C15tTrackingAuthorization, String)] = [
            (.authorized, "authorized"),
            (.denied, "denied"),
            (.notDetermined, "not-determined"),
            (.restricted, "restricted"),
            (.unsupported, "unsupported"),
        ]

        var seen: [C15tTrackingAuthorization] = []

        for (arm, wire) in expected {
            let payload = jsonObject(C15tPayload.trackingAuthorization(arm))

            XCTAssertEqual(payload.keys.count, 1, "no consent field may ride along")
            XCTAssertEqual(payload["status"] as? String, wire, "\(arm)")
            seen.append(arm)
        }

        XCTAssertEqual(Set(seen), Set(C15tTrackingAuthorization.allCases), "every arm reached the wire")
    }

    func testReadingThePlatformAnswerStartsNoCore() {
        let prompts = PromptRecorder(answer: nil)
        let handler = C15tModuleHandler(
            startCore: {
                XCTFail("a tracking read must not start a consent core")
                return false
            },
            trackingPlatformStatus: { .denied },
            trackingPromptStringPresent: { true },
            trackingPrompt: prompts.request
        )

        let payload = jsonObject(handler.trackingAuthorizationPayload())

        XCTAssertEqual(payload["status"] as? String, "denied")
        XCTAssertEqual(prompts.calls, 0)
    }

    private func failureCode(
        _ outcome: Result<C15tTrackingAuthorization, C15tBridgeError>?
    ) -> String? {
        guard case let .failure(error)? = outcome else { return nil }
        return error.code
    }
}
