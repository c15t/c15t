import Foundation
import XCTest
@testable import C15tCore

/// The native SDK gate: what ``ConsentDecision`` means, and the two rules it is derived
/// from. Half of these tests are the pure derivation over hand-built snapshots, because
/// the interesting cases are flag combinations a running core takes a launch to reach.
///
/// See "Native SDK gating" and "Platform privacy" in `native/CONTRACT.md`.
final class ConsentDecisionTests: XCTestCase {
    private var clock: TestClock!
    private var store: InMemoryStore!
    private var http: StubHTTP!

    private let optOutRights = ["disclosure", "preferences", "opt-out"]

    override func setUp() {
        super.setUp()
        clock = TestClock()
        store = InMemoryStore()
        http = StubHTTP()
    }

    // MARK: 1. Derivation

    func testNecessaryIsGrantedInEveryLifecycleState() {
        for snapshot in Self.lifecyclePermutations() {
            XCTAssertEqual(
                ConsentDecision(snapshot: snapshot, category: .necessary),
                .granted,
                "ready=\(snapshot.ready) policyPending=\(snapshot.policyPending): "
                    + "nothing gets to take necessary away, not even an unresolved policy"
            )
            XCTAssertEqual(
                ConsentDecision(snapshot: snapshot, category: .marketing),
                ConsentDecision(snapshot: snapshot, category: .measurement),
                "every optional category answers from the same two flags"
            )
        }
    }

    func testOptionalCategoriesArePendingUntilBothFlagsSettle() {
        for snapshot in Self.lifecyclePermutations()
        where !snapshot.ready || snapshot.policyPending {
            for category in ConsentCategory.allCases where category != .necessary {
                XCTAssertEqual(
                    ConsentDecision(snapshot: snapshot, category: category),
                    .pending,
                    "ready=\(snapshot.ready) policyPending=\(snapshot.policyPending): "
                        + "a stored permission is not an answer while the device has "
                        + "been told nothing"
                )
            }
        }
    }

    func testResolvedSnapshotAnswersFromThePermissionAndNeverGoesPending() {
        // Every extra field a snapshot can carry, applied on top of a settled state,
        // must move granted to denied or leave it alone. None of them is a reason to go
        // back to "we do not know yet": that answer belongs to the two flags.
        let settled = ConsentSnapshot(
            policyPending: false,
            ready: true,
            effectivePermissions: ConsentState(
                necessary: true,
                functionality: true,
                experience: false,
                measurement: true,
                marketing: false
            )
        )
        let withError = settled.byApplying {
            $0.error = CoreErrorInfo(code: "policy-unreadable", message: "stub")
        }
        let withPrompt = settled.byApplying {
            $0.promptRequirement = PromptRequirement(kind: .choice, reason: .missing)
        }
        let withGpc = settled.byApplying {
            $0.privacySignals = PrivacySignals(detected: true, override: true)
        }
        let variations: [(String, ConsentSnapshot)] = [
            ("settled", settled),
            ("with an error", withError),
            ("restricted", settled.byApplying { $0.restrictions = [.marketing: [.gpc]] }),
            ("with a prompt", withPrompt),
            ("expired", settled.byApplying { $0.nextDeadline = 1 }),
            ("no subject", settled.byApplying { $0.subject = nil }),
            ("gpc active", withGpc),
        ]

        for (label, snapshot) in variations {
            XCTAssertFalse(snapshot.ready == false || snapshot.policyPending, "\(label): setup")
            for category in ConsentCategory.allCases where category != .necessary {
                let decision = ConsentDecision(snapshot: snapshot, category: category)
                let permitted = snapshot.effectivePermissions.value(for: category)
                XCTAssertEqual(
                    decision,
                    permitted ? .granted : .denied,
                    "\(label): \(category) must follow the effective permission"
                )
                XCTAssertNotEqual(decision, .pending, "\(label): \(category)")
            }
        }
    }

    // MARK: 2. The core's reads

    func testColdStartAnswersPendingAndStillGrantsNecessary() async {
        // No network: the contract's own example of a device that stays pending for the
        // life of the process, which is the safe answer rather than a refusal.
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: OfflineTransport(),
            clock: clock
        ))

        XCTAssertFalse(core.isReady(), "nothing resolved")
        XCTAssertEqual(core.decision(for: .necessary), .granted)
        for category in OptionalConsentCategory.allCases {
            XCTAssertEqual(
                core.decision(for: category.category),
                .pending,
                "\(category): pending, not denied, because nothing was ever served"
            )
        }
        // The boolean read is unchanged by any of this: it still has to answer false.
        XCTAssertFalse(core.isAllowed(.marketing))
    }

    func testFirstLaunchReachesARealAnswerOnceInitResolves() async {
        // Nothing is on disk, so hydration cannot report a snapshot as restored. Every
        // protocol fixture starts from `hydrated: true`, which is why none of them
        // covered this: a fresh install with a working backend has to reach an answer
        // inside the launch it happened, or `granted` is unreachable on the one launch a
        // consent manager is most required to work.
        let core = ConsentCore()
        XCTAssertEqual(
            core.decision(for: .marketing),
            .pending,
            "before bootstrap nothing is known"
        )
        XCTAssertFalse(core.isReady())

        let seen = SendableBox([ConsentDecision]())
        let subscription = core.gate(ConsentCategory.marketing) { (decision: ConsentDecision) in
            seen.mutate { $0.append(decision) }
        }
        XCTAssertEqual(seen.value, [.pending])

        // A backend that is down has told the core nothing, so it stays not-ready and
        // the gate stays quiet rather than reporting a change that did not happen.
        http.enqueueInit(HTTPResponse(status: 503, body: Data("unavailable".utf8)))
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))
        XCTAssertFalse(core.snapshot().ready, "a failed init leaves the flag low")
        XCTAssertFalse(core.isReady())
        XCTAssertEqual(core.decision(for: .marketing), .pending)
        XCTAssertEqual(seen.value, [.pending])

        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: Fixture.rule(model: "opt-out", rights: optOutRights)
        ))
        core.refresh()
        await core.waitUntilIdle()

        XCTAssertTrue(core.snapshot().ready, "being told is what ready means")
        XCTAssertTrue(core.isReady())
        XCTAssertEqual(core.decision(for: .marketing), .granted)
        XCTAssertEqual(
            seen.value,
            [.pending, .granted],
            "a launch that started pending ends it answered"
        )
        subscription.cancel()
    }

    func testReadsWithNoInstalledCoreFailClosed() {
        C15t.resetForTests()
        defer { C15t.resetForTests() }

        XCTAssertFalse(C15t.isReady())
        XCTAssertEqual(C15t.decision(for: .necessary), .granted)
        XCTAssertEqual(
            C15t.decision(for: .marketing),
            .pending,
            "a missing core is not a refusal, and stays switched off either way"
        )
    }

    func testResolvedSnapshotGrantsAndReportsReady() async {
        let settled = await restoringStore(model: "opt-out", acceptAll: true)

        let relaunched = ConsentCore()
        await relaunched.bootstrapAndSettle(Fixture.configured(
            store: settled,
            transport: nil,
            clock: clock
        ))

        XCTAssertTrue(relaunched.isReady())
        XCTAssertEqual(relaunched.decision(for: .necessary), .granted)
        XCTAssertEqual(relaunched.decision(for: .marketing), .granted)
        XCTAssertEqual(relaunched.decision(for: .measurement), .granted)
        XCTAssertTrue(relaunched.isAllowed(.marketing))
    }

    func testResolvedSnapshotDeniesAndReportsReady() async {
        // Opt-in with a reject-all receipt: a real answer of `false`, which is what
        // `pending` must never be confused with.
        let settled = await restoringStore(model: "opt-in", acceptAll: false)

        let relaunched = ConsentCore()
        await relaunched.bootstrapAndSettle(Fixture.configured(
            store: settled,
            transport: nil,
            clock: clock
        ))

        XCTAssertTrue(relaunched.isReady())
        XCTAssertEqual(relaunched.decision(for: .necessary), .granted)
        for category in OptionalConsentCategory.allCases {
            XCTAssertEqual(
                relaunched.decision(for: category.category),
                .denied,
                "\(category): a refusal is denied, not pending"
            )
        }
    }

    // MARK: 3. The decision gate

    func testGateFiresWithTheCurrentDecisionAndAgainOnEachChange() async {
        let settled = await restoringStore(model: "opt-in", acceptAll: false)
        let relaunched = ConsentCore()
        await relaunched.bootstrapAndSettle(Fixture.configured(
            store: settled,
            transport: nil,
            clock: clock
        ))

        let seen = SendableBox([ConsentDecision]())
        let subscription = relaunched.gate(ConsentCategory.marketing) { decision in
            seen.mutate { $0.append(decision) }
        }
        XCTAssertEqual(
            seen.value,
            [.denied],
            "a listener registered after the decision was reached still receives it"
        )

        relaunched.save(.custom([.marketing: true]))
        await relaunched.waitUntilIdle()
        XCTAssertEqual(seen.value, [.denied, .granted])

        // A revision that moves another category must not wake this gate.
        relaunched.save(.custom([.marketing: true, .measurement: true]))
        await relaunched.waitUntilIdle()
        XCTAssertEqual(seen.value, [.denied, .granted])

        subscription.cancel()
        relaunched.save(.necessary)
        await relaunched.waitUntilIdle()
        XCTAssertEqual(relaunched.decision(for: .marketing), .denied)
        XCTAssertEqual(seen.value, [.denied, .granted], "cancelled means finished")
    }

    func testPendingGateResolvesToGranted() async {
        let core = await pendingButHydratedCore(model: "opt-out", acceptAll: true)
        let seen = SendableBox([ConsentDecision]())
        let subscription = core.gate(ConsentCategory.marketing) { (decision: ConsentDecision) in
            seen.mutate { $0.append(decision) }
        }
        XCTAssertEqual(seen.value, [.pending])
        XCTAssertFalse(core.isReady())

        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: Fixture.rule(model: "opt-out", rights: optOutRights)
        ))
        core.refresh()
        await core.waitUntilIdle()

        XCTAssertTrue(core.isReady())
        XCTAssertEqual(seen.value, [.pending, .granted], "the same handle carries the answer")
        subscription.cancel()
    }

    func testPendingGateResolvesToDeniedAndThenToGranted() async {
        let core = await pendingButHydratedCore(model: "opt-in", acceptAll: false)
        let seen = SendableBox([ConsentDecision]())
        let subscription = core.gate(ConsentCategory.marketing) { (decision: ConsentDecision) in
            seen.mutate { $0.append(decision) }
        }
        XCTAssertEqual(seen.value, [.pending])

        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: Fixture.rule(model: "opt-in")
        ))
        core.refresh()
        await core.waitUntilIdle()
        XCTAssertEqual(seen.value, [.pending, .denied], "opt-in with a reject-all receipt")

        core.save(.custom([.marketing: true]))
        await core.waitUntilIdle()
        XCTAssertEqual(seen.value, [.pending, .denied, .granted])
        subscription.cancel()
    }

    func testNecessaryGateNeverWaitsForAPolicy() async {
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: OfflineTransport(),
            clock: clock
        ))

        let seen = SendableBox([ConsentDecision]())
        let subscription = core.gate(ConsentCategory.necessary) { (decision: ConsentDecision) in
            seen.mutate { $0.append(decision) }
        }
        XCTAssertEqual(seen.value, [.granted], "a gate over every category needs no special case")
        subscription.cancel()
    }

    func testDeniedDecisionDoesNotSlideBackToPending() async {
        let settled = await restoringStore(model: "opt-in", acceptAll: false)
        let relaunched = ConsentCore()
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: Fixture.rule(model: "opt-in")
        ))
        await relaunched.bootstrapAndSettle(Fixture.configured(
            store: settled,
            transport: Fixture.transport(http),
            clock: clock
        ))
        let seen = SendableBox([ConsentDecision]())
        let subscription = relaunched.gate(ConsentCategory.marketing) { decision in
            seen.mutate { $0.append(decision) }
        }
        XCTAssertEqual(seen.value, [.denied])

        // The same policy re-served, an identity that changes the snapshot, and a
        // backend that is down: each is a publication or an error write, and none of
        // them is a reason to say "we do not know" about a category already refused.
        relaunched.refresh()
        await relaunched.waitUntilIdle()
        relaunched.identify(KernelUser(externalId: "user-2"))
        relaunched.logout()
        http.enqueueInit(HTTPResponse(status: 503, body: Data("unavailable".utf8)))
        relaunched.refresh()
        await relaunched.waitUntilIdle()

        XCTAssertEqual(relaunched.decision(for: .marketing), .denied)
        XCTAssertTrue(relaunched.isReady())
        XCTAssertEqual(seen.value, [.denied], "a refusal does not become a question again")
        subscription.cancel()
    }

    func testBothGateFlavoursCompileFromACategoryLiteral() async {
        // The bridge keeps the boolean gate; a host app's SDK wants the decision one.
        // Both are spelled `gate(.measurement) { ... }`, so the closure's parameter type
        // is what picks the overload, and this is the test that it still does.
        let settled = await restoringStore(model: "opt-out", acceptAll: true)
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: settled,
            transport: nil,
            clock: clock
        ))

        let bools = SendableBox([Bool]())
        let decisions = SendableBox([ConsentDecision]())
        let booleanGate = core.gate(.measurement) { allowed in
            if allowed { bools.mutate { $0.append(true) } }
        }
        let decisionGate = core.gate(.measurement) { decision in
            if decision == .granted { decisions.mutate { $0.append(.granted) } }
        }
        XCTAssertEqual(bools.value, [true])
        XCTAssertEqual(decisions.value, [.granted])
        booleanGate.cancel()
        decisionGate.cancel()
    }

    // MARK: Helpers

    /// One launch that resolves `model` and records either accept-all or reject-all,
    /// leaving the result on disk. The returned store is what a second core bootstraps
    /// against, which is how `ready` becomes true: hydration only reports a snapshot as
    /// restored when there was an envelope to restore.
    private func restoringStore(model: String, acceptAll: Bool) async -> InMemoryStore {
        let saved = InMemoryStore()
        let stub = StubHTTP()
        stub.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: model == "opt-out"
                ? Fixture.rule(model: model, rights: optOutRights)
                : Fixture.rule(model: model)
        ))
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: saved,
            transport: Fixture.transport(stub),
            clock: TestClock()
        ))
        XCTAssertEqual(core.save(acceptAll ? .all : .necessary).status, .committed)
        await core.waitUntilIdle()
        XCTAssertTrue(
            core.hasStoredSnapshot,
            "setup: the choice has to be on disk, because that is what makes the next "
                + "launch hydrated rather than merely answered"
        )
        return saved
    }

    /// A core that has a stored snapshot (`ready`) but no readable policy
    /// (`policyPending`), which is the row of the state table a late-starting SDK hits
    /// most often: a returning user whose policy has not resolved yet. The first init it
    /// is served refuses to resolve; the test then serves one that does.
    ///
    /// The stored receipt is kept because it survives the unresolved policy, so it is
    /// what the resolution lands on: accept-all resolves granted, reject-all under an
    /// opt-in model resolves denied.
    private func pendingButHydratedCore(model: String, acceptAll: Bool) async -> ConsentCore {
        let settled = await restoringStore(model: model, acceptAll: acceptAll)
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: settled,
            transport: Fixture.transport(http),
            clock: clock
        ))
        XCTAssertTrue(core.snapshot().ready, "setup: the envelope restored")
        XCTAssertTrue(
            core.snapshot().policyPending,
            "setup: the default stub answers nothing usable"
        )
        XCTAssertFalse(core.isReady())
        return core
    }

    /// The two lifecycle flags in all four combinations, with every category already
    /// permitted, plus the cold-start baseline. The permissions are deliberately all on:
    /// a stored `true` is the value a gate must not read as an answer on its own.
    private static func lifecyclePermutations() -> [ConsentSnapshot] {
        [
            flags(ready: false, policyPending: true),
            flags(ready: true, policyPending: true),
            flags(ready: false, policyPending: false),
            flags(ready: true, policyPending: false),
            .coldStart,
        ]
    }

    private static func flags(ready: Bool, policyPending: Bool) -> ConsentSnapshot {
        ConsentSnapshot(
            policyPending: policyPending,
            ready: ready,
            effectivePermissions: ConsentState(
                necessary: true,
                functionality: true,
                experience: true,
                measurement: true,
                marketing: true
            )
        )
    }
}
