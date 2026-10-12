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
///    `NSUserTrackingUsageDescription` shows nothing and reports a `denied` no subject
///    chose, which is the one mistake here that a host cannot undo.
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

    /// A prompt that stays open until the test closes it.
    ///
    /// `PromptRecorder` answers on the spot, which is right for everything except a request
    /// made while another one is still outstanding: by the time the second caller arrives,
    /// the first flight is already history and the thing under test has already gone by.
    /// Holding the completion here is what lets a test look at the state between asking and
    /// answering.
    private final class PromptGate: @unchecked Sendable {
        private let lock = NSLock()
        private var _calls = 0
        private var pending: [(C15tTrackingPlatformStatus?) -> Void] = []

        var calls: Int {
            lock.lock()
            defer { lock.unlock() }
            return _calls
        }

        func request(_ completion: @escaping (C15tTrackingPlatformStatus?) -> Void) {
            lock.lock()
            _calls += 1
            pending.append(completion)
            lock.unlock()
        }

        /// Answer every request the app is currently holding, in the order it asked.
        func answer(_ status: C15tTrackingPlatformStatus?) {
            lock.lock()
            let waiting = pending
            pending = []
            lock.unlock()

            for completion in waiting {
                completion(status)
            }
        }
    }

    /// Stands in for the expanded European Union request.
    ///
    /// Mirrors the three things Apple's version of that call can do: make the call, decline
    /// to make it, and run the Additional Information closure before answering. `canAsk`
    /// covers the runtime that reported the capability a moment earlier and will not honour
    /// it now, and `triggerAdditionalInformation` covers the subject who tapped the button.
    private final class ExpandedPromptRecorder: @unchecked Sendable {
        private let lock = NSLock()
        private var _calls = 0
        private var _preferExpanded: [Bool] = []
        private let answer: C15tTrackingPlatformStatus?
        private let canAsk: Bool
        private let triggerAdditionalInformation: Bool

        init(
            answer: C15tTrackingPlatformStatus?,
            canAsk: Bool = true,
            triggerAdditionalInformation: Bool = false
        ) {
            self.answer = answer
            self.canAsk = canAsk
            self.triggerAdditionalInformation = triggerAdditionalInformation
        }

        var calls: Int {
            lock.lock()
            defer { lock.unlock() }
            return _calls
        }

        /// What the app asked Apple to prefer, one entry per call.
        var preferExpanded: [Bool] {
            lock.lock()
            defer { lock.unlock() }
            return _preferExpanded
        }

        func request(
            preferExpanded: Bool,
            additionalInformationSelected: @escaping () -> Void,
            completion: @escaping (C15tTrackingPlatformStatus?) -> Void
        ) -> Bool {
            lock.lock()
            _calls += 1
            _preferExpanded.append(preferExpanded)
            lock.unlock()

            guard canAsk else { return false }
            if triggerAdditionalInformation { additionalInformationSelected() }
            completion(answer)
            return true
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

    func testAnUnansweredSubjectIsAskedThroughTheStandardCallWhenExpandedIsAbsent() {
        XCTAssertEqual(
            C15tTrackingGate.request(
                platform: .notDetermined,
                promptStringPresent: true,
                expandedInterfaceAvailable: false
            ),
            .prompt(presentation: .standard)
        )
    }

    func testAnUnansweredSubjectIsAskedThroughTheExpandedCallWhenTheRuntimeHasIt() {
        XCTAssertEqual(
            C15tTrackingGate.request(
                platform: .notDetermined,
                promptStringPresent: true,
                expandedInterfaceAvailable: true
            ),
            .prompt(presentation: .expanded)
        )
    }

    func testAnAlreadyAnsweredSubjectIsAskedAgainRatherThanAnsweredFromTheDevice() {
        // The European Union lets an answered request be presented again a year after the
        // answer, whichever way it went, and Apple is the only thing that knows whether this
        // install is inside that window. Answering from the device here would be this SDK
        // enforcing a one-prompt lifetime Apple no longer holds, and it would fail silently:
        // a host that wanted the annual re-prompt would find nothing to ask.
        for platform in [C15tTrackingPlatformStatus.authorized, .denied] {
            XCTAssertEqual(
                C15tTrackingGate.request(
                    platform: platform,
                    promptStringPresent: true,
                    expandedInterfaceAvailable: false
                ),
                .prompt(presentation: .standard),
                "\(platform) must still reach Apple, which is the only party that can rule on eligibility"
            )
        }
    }

    func testARestrictedDeviceIsAnsweredWithoutAskingApple() {
        // Apple reports `restricted` whether or not the subject was ever shown the prompt, so
        // the device policy has answered already and a call buys nothing.
        XCTAssertEqual(
            C15tTrackingGate.request(
                platform: .restricted,
                promptStringPresent: true,
                expandedInterfaceAvailable: true
            ),
            .answered(.restricted)
        )
    }

    func testRequestRefusesWhereThereIsNoTrackingApi() {
        XCTAssertEqual(
            C15tTrackingGate.request(
                platform: nil,
                promptStringPresent: true,
                expandedInterfaceAvailable: true
            ),
            .refused(.unavailable)
        )
    }

    func testRefusedRequestNamesTheMissingKeyAndNeverReachesApple() {
        let prompts = PromptRecorder(answer: .authorized)
        let expanded = ExpandedPromptRecorder(answer: .authorized)
        let handler = C15tModuleHandler(
            trackingPlatformStatus: { .notDetermined },
            trackingPromptStringPresent: { false },
            trackingPrompt: prompts.request,
            trackingExpandedInterfaceAvailable: { true },
            trackingExpandedPrompt: expanded.request
        )

        var outcome: Result<C15tTrackingRequestResult, C15tBridgeError>?

        handler.requestTrackingAuthorization { outcome = $0 }

        XCTAssertEqual(prompts.calls, 0, "a build that cannot prompt must not call Apple")
        XCTAssertEqual(expanded.calls, 0, "and the expanded call is no more allowed than the plain one")
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

        var outcome: Result<C15tTrackingRequestResult, C15tBridgeError>?

        handler.requestTrackingAuthorization { outcome = $0 }

        XCTAssertEqual(prompts.calls, 1)
        let result = try? outcome?.get()
        XCTAssertEqual(result?.status, .authorized)
        XCTAssertEqual(result?.stage, .final)
        XCTAssertEqual(result?.presentation, .standard)
    }

    func testAnAlreadyAnsweredSubjectIsAskedRatherThanAnsweredFromTheDeviceEndToEnd() {
        // Apple returns the arm on file when it declines to show anything, so the fake that
        // stands in for the call has to agree with the fake that stands in for the device.
        let prompts = PromptRecorder(answer: .authorized)
        let handler = C15tModuleHandler(
            trackingPlatformStatus: { .authorized },
            trackingPromptStringPresent: { true },
            trackingPrompt: prompts.request
        )

        var outcome: Result<C15tTrackingRequestResult, C15tBridgeError>?

        handler.requestTrackingAuthorization { outcome = $0 }

        XCTAssertEqual(prompts.calls, 1, "Apple decides whether this install may be shown the prompt again")
        // Apple answers with the arm on file when it declines to show anything, and that arm
        // is what travels. A prompt that did not appear must not be read as a fresh refusal.
        XCTAssertEqual(try? outcome?.get().status, .authorized)
    }

    func testAdditionalInformationIsAPauseAndNotADenial() {
        // Apple closes the expanded sheet without recording an answer, runs this SDK's own
        // closure, and still completes with `notDetermined`. The arm has to stay
        // `not-determined` and the stage has to say why, or a subject who stopped to read
        // more is recorded as having refused.
        let expanded = ExpandedPromptRecorder(
            answer: .notDetermined,
            triggerAdditionalInformation: true
        )
        let prompts = PromptRecorder(answer: .authorized)
        let handler = C15tModuleHandler(
            trackingPlatformStatus: { .notDetermined },
            trackingPromptStringPresent: { true },
            trackingPrompt: prompts.request,
            trackingExpandedInterfaceAvailable: { true },
            trackingExpandedPrompt: expanded.request
        )

        var outcome: Result<C15tTrackingRequestResult, C15tBridgeError>?

        handler.requestTrackingAuthorization { outcome = $0 }

        XCTAssertEqual(expanded.calls, 1)
        XCTAssertEqual(prompts.calls, 0, "the expanded call was made, so the plain one must not also fire")
        let result = try? outcome?.get()
        XCTAssertEqual(result?.status, .notDetermined, "Apple's arm is preserved, never widened into a refusal")
        XCTAssertEqual(result?.stage, .additionalInformation)
        XCTAssertEqual(result?.presentation, .expanded)
    }

    func testARequestFromBeforeTheExpandedCallArrivedStillGetsAnAnswer() {
        // The capability probe and the call are two looks at the runtime, and a binary that
        // linked App Tracking Transparency lazily can answer the first one and not the
        // second. Falling back is the difference between a subject asked slightly less
        // richly and a request nobody ever comes back to finish.
        let expanded = ExpandedPromptRecorder(answer: .authorized, canAsk: false)
        let prompts = PromptRecorder(answer: .authorized)
        let handler = C15tModuleHandler(
            trackingPlatformStatus: { .notDetermined },
            trackingPromptStringPresent: { true },
            trackingPrompt: prompts.request,
            trackingExpandedInterfaceAvailable: { true },
            trackingExpandedPrompt: expanded.request
        )

        var outcome: Result<C15tTrackingRequestResult, C15tBridgeError>?

        handler.requestTrackingAuthorization { outcome = $0 }

        XCTAssertEqual(expanded.calls, 1)
        XCTAssertEqual(prompts.calls, 1, "a call that could not be made falls back to the one every system has")
        let result = try? outcome?.get()
        XCTAssertEqual(result?.status, .authorized)
        XCTAssertEqual(
            result?.presentation,
            .standard,
            "the payload names the call that actually ran, not the one that was attempted"
        )
    }

    func testTwoRequestsAtOnceProduceOneAppleCallAndOneAnswerForEach() {
        // A settings screen and an onboarding sheet reaching for tracking together is an
        // ordinary app. Two Apple calls would mean Apple's own pending-request rule decides
        // what the subject sees, and one of the two callers would wait forever.
        let prompts = PromptGate()
        let handler = C15tModuleHandler(
            trackingPlatformStatus: { .notDetermined },
            trackingPromptStringPresent: { true },
            trackingPrompt: prompts.request
        )

        var first: Result<C15tTrackingRequestResult, C15tBridgeError>?
        var second: Result<C15tTrackingRequestResult, C15tBridgeError>?

        handler.requestTrackingAuthorization { first = $0 }
        handler.requestTrackingAuthorization { second = $0 }

        XCTAssertEqual(prompts.calls, 1, "one prompt for two callers")
        XCTAssertNil(first)
        XCTAssertNil(second)

        prompts.answer(.authorized)

        XCTAssertEqual(try? first?.get().status, .authorized)
        XCTAssertEqual(try? second?.get().status, .authorized, "neither caller may be left holding nothing")
    }

    func testARequestMadeFromInsideAnAnswerAsksAppleAgain() {
        // This is the Additional Information journey in one line: the answer arrives, and the
        // caller's next move is to ask again from inside that callback. A flight still marked
        // busy at that instant would attach the retry to a call that had already been and
        // gone, and the subject would finish their choices with nothing ever asked again.
        let prompts = PromptGate()
        let handler = C15tModuleHandler(
            trackingPlatformStatus: { .notDetermined },
            trackingPromptStringPresent: { true },
            trackingPrompt: prompts.request
        )

        var answered = 0
        handler.requestTrackingAuthorization { _ in answered += 1 }
        prompts.answer(.authorized)
        XCTAssertEqual(answered, 1)

        handler.requestTrackingAuthorization { _ in answered += 1 }
        XCTAssertEqual(prompts.calls, 2, "the next request owns a fresh flight")
        prompts.answer(.denied)
        XCTAssertEqual(answered, 2)
    }

    func testAPromptThatReportsNothingIsAFailureRatherThanUnsupported() {
        // `unsupported` tells a caller the platform adds no gate. Handing it back after a
        // dialog that produced no state would turn a broken read into permission to track.
        let handler = C15tModuleHandler(
            trackingPlatformStatus: { .notDetermined },
            trackingPromptStringPresent: { true },
            trackingPrompt: PromptRecorder(answer: nil).request
        )

        var outcome: Result<C15tTrackingRequestResult, C15tBridgeError>?

        handler.requestTrackingAuthorization { outcome = $0 }

        XCTAssertNil(try? outcome?.get())
        XCTAssertEqual(failureCode(outcome), C15tBridgeError.trackingUnsupported.code)
    }

    func testTheExpandedSelectorIsTheOneAppleShips() {
        // Spelled by hand in `C15tTracking` because the declaration is newer than the SDK this
        // package builds against, which means nothing else can catch it if Apple renames the
        // method before it leaves beta. A renamed selector fails here as a string mismatch;
        // nowhere else would it fail at all, because a missed `responds(to:)` just means the
        // expanded prompt quietly stops appearing on the devices that could have shown it.
        XCTAssertEqual(
            C15tTracking.expandedRequestSelectorName,
            "requestTrackingAuthorizationUsingExpandedInterface:additionalInformationAction:completionHandler:"
        )
    }

    func testTheExpandedCallIsNotClaimedOnASystemThatDoesNotHaveIt() {
        // The test machine has no App Tracking Transparency at all, which is the honest
        // negative case: a build that never linked the framework must report the capability
        // as absent rather than try the call and find out later.
        XCTAssertFalse(C15tTracking.expandedInterfaceAvailable())
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

    func testRequestPayloadNamesTheStageAndTheCallThatRan() {
        let payload = jsonObject(
            C15tPayload.trackingRequestResult(
                C15tTrackingRequestResult(
                    status: .notDetermined,
                    stage: .additionalInformation,
                    presentation: .expanded
                )
            )
        )

        XCTAssertEqual(payload["status"] as? String, "not-determined")
        XCTAssertEqual(payload["stage"] as? String, "additional-information")
        XCTAssertEqual(payload["presentation"] as? String, "expanded")
        XCTAssertEqual(
            payload.keys.count,
            3,
            "the two new fields describe the request; no consent field may ride along"
        )
    }

    func testRequestPayloadStaysSilentAboutACallThatWasNeverMade() {
        let payload = jsonObject(
            C15tPayload.trackingRequestResult(
                C15tTrackingRequestResult(status: .restricted, stage: .final, presentation: nil)
            )
        )

        XCTAssertNil(
            payload["presentation"],
            "absent beats `standard` here: reporting a call would report a sheet Apple was never asked for"
        )
        XCTAssertEqual(payload["stage"] as? String, "final")
        XCTAssertEqual(payload["status"] as? String, "restricted")
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

    // MARK: - Helpers

    private func failureCode<Success>(
        _ outcome: Result<Success, C15tBridgeError>?
    ) -> String? {
        guard case let .failure(error)? = outcome else { return nil }
        return error.code
    }
}
