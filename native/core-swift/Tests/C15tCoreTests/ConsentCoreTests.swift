import Foundation
import XCTest
@testable import C15tCore

/// The behaviours the mobile contract makes mandatory, plus the edges that make
/// them mandatory under reuse: a relaunch, a dead backend, a policy that changes
/// while a write is still waiting.
final class ConsentCoreTests: XCTestCase {
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

    // MARK: 1. Cold start

    func testColdStartWithEmptyStoreIsNotReadyAndDeniesEverythingOptional() async {
        // The default stub answer carries no `policyResolution`, so init replies with
        // a body the core must refuse to read as a policy.
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))

        let snapshot = core.snapshot()
        XCTAssertFalse(snapshot.ready, "nothing was stored, so nothing is ready")
        XCTAssertTrue(snapshot.policyPending, "init never resolved a policy")
        XCTAssertEqual(
            snapshot.effectivePermissions,
            .necessaryOnly,
            "no optional category may be on before a policy resolves"
        )
        for category in OptionalConsentCategory.allCases {
            XCTAssertFalse(snapshot.effectivePermissions.value(for: category))
            XCTAssertFalse(core.isAllowed(category.category))
        }
        XCTAssertNil(snapshot.explicitChoice)
        XCTAssertEqual(snapshot.activeUI, ActiveUI.none, "nothing is owed yet, so no surface")
    }

    func testColdStartStillCreatesAndPersistsASubjectId() async {
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))

        let subject = try? XCTUnwrap(core.snapshot().subject)
        XCTAssertNotNil(subject)
        XCTAssertTrue(
            SubjectId.isValid(subject?.id ?? ""),
            "subject id must be a sub_ id the backend accepts"
        )
        XCTAssertNotNil(store.data(for: StorageKey.subject))
        XCTAssertNil(subject?.externalId)
    }

    // MARK: 2. Hydration

    func testHydrateRestoresAStoredSnapshotWithoutAnyNetwork() async {
        // First run: resolve a policy, accept everything, let it settle.
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: Fixture.rule(model: "opt-out", rights: optOutRights)
        ))
        let firstCore = ConsentCore()
        await firstCore.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))
        XCTAssertEqual(firstCore.save(.all).status, .committed)
        await firstCore.waitUntilIdle()
        let stored = firstCore.snapshot()
        XCTAssertTrue(stored.effectivePermissions.marketing)

        // Second run: same store, no transport at all. Everything the subject chose
        // has to be answerable from disk, on the first synchronous read.
        let relaunched = ConsentCore()
        XCTAssertTrue(
            relaunched.snapshot().policyPending,
            "before bootstrap, nothing is known"
        )
        await relaunched.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: nil,
            clock: clock
        ))

        let restored = relaunched.snapshot()
        XCTAssertGreaterThan(
            restored.revision,
            stored.revision,
            "hydration is a mutation, and it continues where the store left off"
        )
        XCTAssertTrue(restored.ready)
        XCTAssertFalse(restored.policyPending, "the stored policy is readable offline")
        XCTAssertEqual(restored.explicitChoice?.categories, stored.explicitChoice?.categories)
        XCTAssertEqual(
            restored.effectivePermissions.marketing,
            stored.effectivePermissions.marketing
        )
        XCTAssertTrue(relaunched.isAllowed(.marketing))
        XCTAssertTrue(relaunched.isAllowed(.measurement))
        XCTAssertEqual(restored.subject?.id, stored.subject?.id, "same subject after relaunch")
        XCTAssertEqual(restored.location?.countryCode, "DE")
        XCTAssertEqual(restored.policySnapshotToken, "token-1")
    }

    func testHydrateReAppliesExpiryAgainstTheCurrentClock() async {
        // Opt-in, because that is the model where an expired receipt changes the
        // answer. Under opt-out a category with no valid receipt stays allowed, so
        // the same assertion would pass for the wrong reason.
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: Fixture.rule(model: "opt-in", choiceMs: 1_000)
        ))
        let firstCore = ConsentCore()
        await firstCore.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))
        firstCore.save(.custom([.measurement: true]))
        await firstCore.waitUntilIdle()
        XCTAssertTrue(firstCore.isAllowed(.measurement))

        clock.advance(by: 5_000)

        let relaunched = ConsentCore()
        await relaunched.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: nil,
            clock: clock
        ))
        // The receipt is still stored, and still refused: a cached snapshot must not
        // outlive the policy's own validity window.
        XCTAssertNotNil(relaunched.snapshot().explicitChoice?.categories[.measurement])
        XCTAssertFalse(relaunched.isAllowed(.measurement))
    }

    // MARK: 3. Fail closed

    func testUnparseablePolicyWireFailsClosed() async {
        let contract = Int64(c15tPolicyContractVersion)
        let unsupported = PolicyFailureReason.unsupportedContract.rawValue
        let invalid = PolicyFailureReason.invalidPayload.rawValue
        let cases: [(String, JSONValue, String)] = [
            ("a contract this build does not speak", .object([
                "version": .integer(2),
                "status": .string("matched"),
                "policy": .null,
            ]), unsupported),
            ("a matched outcome with no rule", .object([
                "version": .integer(contract),
                "status": .string("matched"),
                "policyId": .string("de-1"),
                "matchedBy": .string("country"),
                "fingerprints": .object([:]),
            ]), invalid),
            ("an unknown field on the wire", .object([
                "version": .integer(contract),
                "status": .string("no-match"),
                "policy": .null,
                "surprise": .bool(true),
            ]), unsupported),
            ("an IAB rule this build cannot honour", Fixture.matchedResolution(policy: Fixture.rule(
                model: "iab"
            )), unsupported),
            ("a non-matched outcome with no explicit policy", .object([
                "version": .integer(contract),
                "status": .string("no-match"),
            ]), invalid),
            ("no policyResolution at all", .object([:]), invalid),
        ]

        for (label, wire, expectedCode) in cases {
            let localStore = InMemoryStore()
            let localHTTP = StubHTTP()
            localHTTP.initResponse = Fixture.initResponse(policyResolution: wire)
            let core = ConsentCore()
            await core.bootstrapAndSettle(Fixture.configured(
                store: localStore,
                transport: Fixture.transport(localHTTP),
                clock: clock
            ))

            let snapshot = core.snapshot()
            XCTAssertTrue(snapshot.policyPending, "\(label): must stay pending")
            XCTAssertEqual(
                snapshot.effectivePermissions,
                .necessaryOnly,
                "\(label): must deny every optional category rather than guess"
            )
            for category in OptionalConsentCategory.allCases {
                XCTAssertFalse(core.isAllowed(category.category), "\(label): \(category)")
            }
            XCTAssertEqual(
                snapshot.error?.code,
                expectedCode,
                "\(label): reported the wrong failure"
            )
            XCTAssertNil(snapshot.explicitChoice)
        }
    }

    func testIsAllowedStaysDenyAllWhilePolicyPending() async {
        // Pending because init has not answered at all.
        let offline = ConsentCore()
        await offline.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: OfflineTransport(),
            clock: clock
        ))
        XCTAssertTrue(offline.snapshot().policyPending)
        for category in OptionalConsentCategory.allCases {
            XCTAssertFalse(offline.isAllowed(category.category))
        }

        // And pending because the answer was unreadable.
        http.initResponse = Fixture.initResponse(policyResolution: .object([
            "version": .integer(Int64(c15tPolicyContractVersion)),
            "status": .string("matched"),
            "policyId": .string("x"),
            "matchedBy": .string("telepathy"),
        ]))
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))
        XCTAssertTrue(core.snapshot().policyPending)
        for category in OptionalConsentCategory.allCases {
            XCTAssertFalse(core.isAllowed(category.category))
        }
        // A save cannot invent a scope it was never given.
        XCTAssertEqual(core.save(.all).status, .rejected)
        XCTAssertTrue(core.snapshot().policyPending, "a refused save changes nothing")
    }

    func testUnsupportedContractFromTheBackendIsReportedAndStaysDenyAll() async {
        http.initResponse = HTTPResponse(
            status: 200,
            headers: ["x-c15t-policy-contract": "9"],
            body: Fixture.initBody(policyResolution: Fixture.matchedResolution())
        )
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))

        XCTAssertTrue(core.snapshot().policyPending)
        XCTAssertEqual(core.snapshot().effectivePermissions, .necessaryOnly)
        XCTAssertEqual(core.snapshot().error?.code, "unsupported-contract")
        XCTAssertEqual(
            http.recordedInitRequests.count,
            1,
            "an unsupported contract will not be retried"
        )
    }

    func testMissingPolicyResolutionFailsClosedButAServedNoMatchDoesNot() async {
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))
        // `/init` answered without a `policyResolution`: that is a missing mandatory
        // contract, not an absent policy.
        XCTAssertTrue(core.snapshot().policyPending)

        let localStore = InMemoryStore()
        let localHTTP = StubHTTP()
        localHTTP.initResponse = Fixture.initResponse(
            policyResolution: Fixture.unconfiguredResolution()
        )
        let configured = ConsentCore()
        await configured.bootstrapAndSettle(Fixture.configured(
            store: localStore,
            transport: Fixture.transport(localHTTP),
            clock: clock
        ))
        // A served `unconfigured` is a real answer. The safe opt-in fallback applies,
        // which still denies, but the core knows what it is looking at and asks.
        XCTAssertFalse(configured.snapshot().policyPending)
        XCTAssertEqual(configured.snapshot().resolution.status, .unconfigured)
        XCTAssertEqual(configured.snapshot().effectivePermissions, .necessaryOnly)
        XCTAssertEqual(
            configured.snapshot().promptRequirement,
            PromptRequirement(kind: .choice, reason: .missing)
        )
    }

    // MARK: 4. Persist before send, replay unchanged

    func testSavePersistsPayloadBeforeTheNetworkCall() async {
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: Fixture.rule(model: "opt-out", rights: optOutRights)
        ))
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))

        // Observe the store at the instant the transport is handed the body. If the
        // write happened after the call, this reads empty. The response is parked,
        // so the entry cannot be delivered and removed out from under the read.
        let sawQueuedOnDisk = SendableBox(false)
        let observedStore: any ConsentStore = store
        let queueKey = StorageKey.pendingSaves
        http.holdsSaves = true
        http.onSave = { _ in
            sawQueuedOnDisk.value = observedStore.data(for: queueKey) != nil
        }

        let result = core.save(.all)
        XCTAssertEqual(result.status, .committed)
        await http.waitUntilSaveRequests(1)
        XCTAssertTrue(sawQueuedOnDisk.value, "the payload must be durable before the request")
        XCTAssertEqual(core.pendingSaveCount(), 1, "in flight means still queued")
        XCTAssertEqual(result.revision, core.snapshot().revision)

        http.releaseSaves()
        await core.waitUntilIdle()
        XCTAssertEqual(http.recordedSaveRequests.count, 1)
        XCTAssertEqual(core.pendingSaveCount(), 0, "an accepted save leaves the queue")
    }

    func testFailedSaveReplaysTheSameBytesUnchanged() async {
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: Fixture.rule(model: "opt-out", rights: optOutRights)
        ))
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))

        http.setSavesFail(true)
        let actionAt = clock.now
        let result = core.save(.custom([.marketing: true, .measurement: false]))
        XCTAssertEqual(result.status, .committed)
        await core.waitUntilIdle()

        let queued = core.pendingSaveBodies()
        XCTAssertEqual(queued.count, 1, "a refused delivery stays queued")
        XCTAssertEqual(http.recordedSaveRequests.count, 1)
        let firstAttempt = try? XCTUnwrap(http.lastSaveBody)
        XCTAssertEqual(firstAttempt, queued[0], "the queue holds exactly what was sent")

        // Everything the subject did is inside the body, not reconstructed later.
        let body = try? XCTUnwrap(C15tJSON.parse(firstAttempt ?? Data())?.objectValue)
        XCTAssertEqual(body?["givenAt"]?.intValue, actionAt)
        XCTAssertEqual(body?["consentAction"]?.stringValue, "custom")
        XCTAssertEqual(body?["domain"]?.stringValue, "app.example.com")
        XCTAssertEqual(body?["type"]?.stringValue, "cookie_banner")
        XCTAssertEqual(body?["preferences"]?["necessary"]?.boolValue, true)
        XCTAssertEqual(body?["preferences"]?["marketing"]?.boolValue, true)
        XCTAssertEqual(body?["jurisdictionModel"]?.stringValue, "opt-out")
        XCTAssertNil(body?["tcString"], "no IAB module, so no TC string")
        let categories = try? XCTUnwrap(body?["choice"]?["categories"]?.objectValue)
        XCTAssertEqual(categories.map { Set($0.keys) }, ["marketing", "measurement"])

        http.setSavesFail(false)
        core.flushPending()
        await core.waitUntilIdle()

        XCTAssertEqual(http.recordedSaveRequests.count, 2)
        XCTAssertEqual(
            http.recordedSaveRequests.last?.body,
            firstAttempt,
            "a replay resubmits the identical receipts, not a fresh encode"
        )
        XCTAssertEqual(core.pendingSaveCount(), 0)
    }

    // MARK: 5. A later init must not rewrite a queued payload

    func testNewerInitDoesNotRewriteAQueuedPayload() async {
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            id: "policy-one",
            choiceFingerprint: String(repeating: "1", count: 64)
        ))
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))

        http.setSavesFail(true)
        core.save(.all)
        await core.waitUntilIdle()
        let queuedBody = try? XCTUnwrap(core.pendingSaveBodies().first)
        XCTAssertNotNil(queuedBody)
        let queuedJSON = C15tJSON.parse(queuedBody ?? Data())
        let originalToken = queuedJSON?["policySnapshotToken"]?.stringValue
        let originalModel = queuedJSON?["jurisdictionModel"]?.stringValue
        let originalGivenAt = queuedJSON?["givenAt"]?.intValue
        let originalBasis = queuedJSON?["choice"]?["categories"]?["marketing"]?["basis"]?["fingerprint"]?
            .stringValue
        XCTAssertEqual(originalToken, "token-1", "the token binds the write to a policy revision")
        XCTAssertNil(queuedJSON?["policyId"], "a tokenless write is the only one that asserts inputs")
        XCTAssertEqual(originalBasis, String(repeating: "1", count: 64))

        // A new init arrives with a different policy: new model, new scope mode, new
        // token, new fingerprints. The queue is not allowed to notice.
        clock.advance(by: 60_000)
        http.initResponse = Fixture.initResponse(
            policyResolution: Fixture.matchedResolution(
                id: "policy-two",
                policy: Fixture.rule(
                    id: "policy-two",
                    model: "opt-out",
                    prompt: "notice",
                    scopeMode: "permissive",
                    choiceMs: 1_000,
                    noticeMs: 1_000,
                    rights: optOutRights
                ),
                choiceFingerprint: String(repeating: "e", count: 64),
                noticeFingerprint: String(repeating: "f", count: 64),
                policyFingerprint: String(repeating: "d", count: 64)
            ),
            token: "token-2"
        )
        core.refresh()
        await core.waitUntilIdle()

        // The new policy really did land, so this is not a test of a no-op.
        let afterInit = core.snapshot()
        XCTAssertEqual(afterInit.resolution.policyId, "policy-two")
        XCTAssertEqual(afterInit.policySnapshotToken, "token-2")
        XCTAssertEqual(afterInit.model, .optOut)
        XCTAssertEqual(afterInit.promptRequirement.kind, .notice)

        http.setSavesFail(false)
        core.flushPending()
        await core.waitUntilIdle()

        XCTAssertEqual(http.lastSaveBody, queuedBody, "a queued payload is replayed verbatim")
        let replayedJSON = C15tJSON.parse(http.lastSaveBody ?? Data())
        XCTAssertEqual(replayedJSON?["policySnapshotToken"]?.stringValue, originalToken)
        XCTAssertEqual(replayedJSON?["jurisdictionModel"]?.stringValue, originalModel)
        XCTAssertEqual(replayedJSON?["givenAt"]?.intValue, originalGivenAt)
        XCTAssertEqual(
            replayedJSON?["choice"]?["categories"]?["marketing"]?["basis"]?["fingerprint"]?
                .stringValue,
            originalBasis,
            "the receipts still vouch for the policy the choice was made under"
        )
    }

    // MARK: Queue shape

    func testQueueKeepsTheNewestTwentyPayloadsInSaveOrder() async {
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: Fixture.rule(model: "opt-out", rights: optOutRights)
        ))
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))
        http.setSavesFail(true)

        let base = clock.now
        for index in 0..<25 {
            clock.advance(by: 1)
            core.save(.custom([.measurement: index.isMultiple(of: 2)]))
        }
        await core.waitUntilIdle()

        XCTAssertEqual(core.pendingSaveCount(), 20, "oldest dropped first")
        let bodies = core.pendingSaveBodies()
        XCTAssertEqual(bodies.count, 20)
        let givenAt = bodies.map { C15tJSON.parse($0)?["givenAt"]?.intValue ?? -1 }
        XCTAssertEqual(givenAt, Array(6...25).map { base + Int64($0) })
    }

    // MARK: Identity and headers

    func testIdentityIsGeneratedOnceAndNeverTakenFromAHardwareID() async {
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))
        let generated = core.snapshot().subject?.id

        // A stored value is only adopted when it is a c15t subject id. Anything else
        // is replaced, which is the check that keeps a device identifier from
        // becoming a consent key.
        let hardware = InMemoryStore()
        hardware.encode(
            ["id": "6E9A1F2C-3B4D-5E6F-A7B8-C9D0E1F2A3B4"],
            for: StorageKey.subject
        )
        let adopted = ConsentCore()
        await adopted.bootstrapAndSettle(Fixture.configured(
            store: hardware,
            transport: Fixture.transport(http),
            clock: clock
        ))
        let replaced = adopted.snapshot().subject?.id
        XCTAssertNotEqual(replaced, "6E9A1F2C-3B4D-5E6F-A7B8-C9D0E1F2A3B4")
        XCTAssertTrue(SubjectId.isValid(replaced ?? ""))
        XCTAssertNotEqual(generated, replaced)
    }

    func testEveryBackendRequestCarriesTheVersionAndContractHeaders() async {
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: Fixture.rule(model: "opt-out", rights: optOutRights)
        ))
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))
        core.identify(KernelUser(externalId: "user-42", identityProvider: "clerk"))
        core.save(.all)
        await core.waitUntilIdle()

        let subjectID = try? XCTUnwrap(core.snapshot().subject?.id)
        let requests = http.recordedInitRequests + http.recordedSaveRequests
            + http.recordedIdentityRequests
        XCTAssertGreaterThanOrEqual(requests.count, 3)
        for request in requests {
            XCTAssertEqual(request.headers[C15tSDK.versionHeader], "rn->\(C15tSDK.version)")
            XCTAssertEqual(
                request.headers[C15tSDK.policyContractHeader],
                String(c15tPolicyContractVersion)
            )
        }
        XCTAssertEqual(http.recordedInitRequests.first?.url.path, "/init")
        XCTAssertEqual(http.recordedSaveRequests.first?.url.path, "/subjects")
        XCTAssertEqual(http.recordedIdentityRequests.first?.url.path, "/subjects/\(subjectID ?? "")")
    }

    // MARK: Model defaults

    func testOptInDeniesUntilAChoiceAndOptOutAllowsUntilADenial() async {
        let optInStore = InMemoryStore()
        let optInHTTP = StubHTTP()
        optInHTTP.initResponse = Fixture.initResponse(
            policyResolution: Fixture.matchedResolution(policy: Fixture.rule(model: "opt-in"))
        )
        let optIn = ConsentCore()
        await optIn.bootstrapAndSettle(Fixture.configured(
            store: optInStore,
            transport: Fixture.transport(optInHTTP),
            clock: clock
        ))
        XCTAssertFalse(optIn.isAllowed(.marketing))
        XCTAssertTrue(optIn.isAllowed(.necessary))
        XCTAssertEqual(optIn.snapshot().promptRequirement.kind, .choice)
        optIn.save(.custom([.marketing: true]))
        await optIn.waitUntilIdle()
        XCTAssertTrue(optIn.isAllowed(.marketing))
        XCTAssertEqual(optIn.snapshot().promptRequirement, .none)

        let optOutStore = InMemoryStore()
        let optOutHTTP = StubHTTP()
        optOutHTTP.initResponse = Fixture.initResponse(
            policyResolution: Fixture.matchedResolution(
                policy: Fixture.rule(model: "opt-out", rights: optOutRights)
            )
        )
        let optOut = ConsentCore()
        await optOut.bootstrapAndSettle(Fixture.configured(
            store: optOutStore,
            transport: Fixture.transport(optOutHTTP),
            clock: clock
        ))
        // Nothing chosen yet, and opt-out already permits.
        XCTAssertTrue(optOut.isAllowed(.marketing))
        XCTAssertEqual(optOut.snapshot().promptRequirement.kind, .choice)
        optOut.save(.necessary)
        await optOut.waitUntilIdle()
        XCTAssertFalse(optOut.isAllowed(.marketing))
        XCTAssertEqual(optOut.snapshot().restrictions[.marketing], [.explicitDenial])
    }

    func testActiveGPCDeniesEvenAnExplicitGrantAndReportsTheReason() async {
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: Fixture.rule(
                model: "opt-out",
                gpcDeny: ["marketing"],
                rights: optOutRights
            )
        ))
        let core = ConsentCore()
        // The signal arrives with the launch configuration, which is the only place
        // a native core can learn it: there is no user-agent flag to read here.
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock,
            gpc: true
        ))
        core.save(.all)
        await core.waitUntilIdle()

        XCTAssertFalse(core.isAllowed(.marketing), "GPC wins over a grant")
        XCTAssertTrue(core.isAllowed(.measurement))
        XCTAssertEqual(core.snapshot().restrictions[.marketing], [.gpc])
        XCTAssertTrue(core.snapshot().privacySignals.gpc.active)
        XCTAssertTrue(core.snapshot().privacySignals.gpc.detected)
        XCTAssertNil(core.snapshot().privacySignals.gpc.override)
        // The grant itself is untouched: masking a choice must not rewrite it, and
        // the payload the backend stores keeps what the subject said.
        XCTAssertEqual(core.snapshot().explicitChoice?.categories[.marketing]?.value, true)
        let body = http.recordedSaveRequests.last?.body ?? Data()
        XCTAssertEqual(C15tJSON.parse(body)?["preferences"]?["marketing"]?.boolValue, true)
    }

    /// A notice rule belongs to an opt-out policy: `POLICY_MODEL_PROMPTS` in
    /// `@c15t/schema` allows `notice` only for `opt-out`, and a rule that asks for
    /// the pair the schema forbids is a wire to refuse, not a fixture to keep.
    func testDismissNoticeClearsThePromptWithoutGrantingAnything() async {
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: Fixture.rule(
                model: "opt-out",
                prompt: "notice",
                rights: optOutRights
            )
        ))
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))
        XCTAssertEqual(core.snapshot().promptRequirement.kind, .notice)
        XCTAssertEqual(core.snapshot().activeUI, .banner)

        // Deny everything optional first, so "grants nothing" is observable rather
        // than a side effect of the opt-out default.
        core.save(.necessary)
        await core.waitUntilIdle()
        XCTAssertFalse(core.isAllowed(.marketing))
        XCTAssertEqual(
            core.snapshot().promptRequirement.kind,
            .notice,
            "a choice does not answer for the notice"
        )
        XCTAssertEqual(core.snapshot().activeUI, .banner)

        let before = core.snapshot()
        core.dismissNotice()
        let after = core.snapshot()
        XCTAssertGreaterThan(after.revision, before.revision)
        XCTAssertEqual(after.promptRequirement, .none)
        XCTAssertEqual(after.activeUI, ActiveUI.none)
        XCTAssertEqual(after.effectivePermissions, before.effectivePermissions)
        XCTAssertFalse(core.isAllowed(.marketing), "a dismissal grants nothing")

        // The dismissal has to survive a relaunch, or the notice comes back for a
        // subject who already put it away.
        let relaunched = ConsentCore()
        await relaunched.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: nil,
            clock: clock
        ))
        XCTAssertEqual(relaunched.snapshot().promptRequirement, .none)
        XCTAssertFalse(relaunched.isAllowed(.marketing))
    }

    func testGateFiresImmediatelyAndThenOnlyOnChange() async {
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: Fixture.rule(model: "opt-in")
        ))
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))

        let seen = SendableBox([Bool]())
        let subscription = core.gate(.measurement) { value in
            seen.mutate { $0.append(value) }
        }
        XCTAssertEqual(seen.value, [false], "a gate reports the current answer at once")

        core.save(.custom([.measurement: true]))
        await core.waitUntilIdle()
        XCTAssertEqual(seen.value, [false, true])

        // A change in another category must not wake this gate.
        core.save(.custom([.measurement: true, .marketing: true]))
        await core.waitUntilIdle()
        XCTAssertEqual(seen.value, [false, true])

        subscription.cancel()
        core.save(.necessary)
        await core.waitUntilIdle()
        XCTAssertFalse(core.isAllowed(.measurement))
        XCTAssertEqual(seen.value, [false, true], "cancelled means finished")
    }

    func testObserverIsHeldWeakly() async {
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: Fixture.rule(model: "opt-in")
        ))
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))

        var observer: RecordingObserver? = RecordingObserver()
        weak var weakObserver = observer
        _ = core.onChange(observer!)
        XCTAssertNotNil(weakObserver, "registered while it is alive")
        observer = nil
        XCTAssertNil(weakObserver, "the core must not be the only owner")

        core.save(.all)
        await core.waitUntilIdle()
        XCTAssertNil(weakObserver?.lastRevision)
    }

    // MARK: Snapshot shape

    func testSnapshotReservesTheIABKeyAsNull() throws {
        let data = try C15tJSON.encode(ConsentSnapshot.coldStart)
        let wire = try? XCTUnwrap(C15tJSON.parse(data)?.objectValue)
        XCTAssertNotNil(wire)
        XCTAssertTrue(wire?.keys.contains("iab") == true, "the key must exist for older readers")
        XCTAssertTrue(wire?["iab"]?.isNull == true)
    }

    func testSnapshotRoundTripsThroughTheStoreUnchanged() throws {
        let original = ConsentSnapshot(
            revision: 7,
            policyPending: false,
            ready: true,
            model: .optOut,
            activeUI: .dialog,
            promptRequirement: PromptRequirement(
                kind: .notice,
                reason: .policyChanged
            ),
            effectivePermissions: ConsentState(marketing: true),
            restrictions: [.marketing: [.gpc, .strictScope]],
            resolution: PolicyResolutionInfo(
                status: .matched,
                policyId: "p",
                fingerprint: "f"
            ),
            subject: SubjectSnapshot(id: "s", externalId: "e"),
            overrides: ConsentOverrides(country: "DE", region: nil, language: "de", gpc: true),
            nextDeadline: 1_800_000_000_000,
            evaluatedAt: 1_758_100_000_000
        )
        let envelope = StoredEnvelope(
            snapshot: original,
            noticeDismissal: NoticeDismissal(dismissedAt: 1, fingerprint: "n"),
            policyResolution: Fixture.unconfiguredResolution(),
            storedAt: 2
        )
        let decoded = StoredEnvelope.decode(try C15tJSON.encode(envelope))
        XCTAssertEqual(decoded?.snapshot, original)
        XCTAssertEqual(decoded?.noticeDismissal?.fingerprint, "n")

        // An envelope from a newer build is unreadable here, and unreadable means
        // nothing is trusted rather than partially believed.
        let future = """
        {"version":99,"storedAt":2,"snapshot":{},"noticeDismissal":null,"policyResolution":null}
        """
        XCTAssertNil(StoredEnvelope.decode(Data(future.utf8)))
    }

    func testBootstrapIsIdempotent() async {
        http.initResponse = Fixture.initResponse(
            policyResolution: Fixture.matchedResolution()
        )
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))
        let revision = core.snapshot().revision
        let subject = core.snapshot().subject?.id

        // A second launch hook with a different store must not swap the identity out
        // from under the first.
        core.bootstrap(Fixture.configured(
            store: InMemoryStore(),
            transport: Fixture.transport(http),
            clock: clock
        ))
        XCTAssertEqual(core.snapshot().revision, revision)
        XCTAssertEqual(core.snapshot().subject?.id, subject)
        XCTAssertEqual(http.recordedInitRequests.count, 1, "one init per bootstrap")
    }

    func testLogoutKeepsTheSubjectAndTheRecords() async {
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: Fixture.rule(model: "opt-out", rights: optOutRights)
        ))
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))
        core.identify(KernelUser(externalId: "user-42"))
        await core.waitUntilIdle()
        XCTAssertEqual(core.snapshot().subject?.externalId, "user-42")
        let subjectID = core.snapshot().subject?.id
        XCTAssertTrue(core.isAllowed(.marketing))

        core.logout()
        let after = core.snapshot()
        XCTAssertEqual(after.subject?.id, subjectID, "the device subject does not change")
        XCTAssertNil(after.subject?.externalId)
        XCTAssertTrue(core.isAllowed(.marketing), "consent belongs to the subject, not the account")
    }
}

/// A mutable box that satisfies `@Sendable` capture in tests.
final class SendableBox<Value>: @unchecked Sendable {
    private let lock = NSLock()
    private var stored: Value

    init(_ value: Value) {
        stored = value
    }

    var value: Value {
        get {
            lock.lock()
            defer { lock.unlock() }
            return stored
        }
        set {
            lock.lock()
            stored = newValue
            lock.unlock()
        }
    }

    func mutate(_ change: (inout Value) -> Void) {
        lock.lock()
        change(&stored)
        lock.unlock()
    }
}

private final class RecordingObserver: SnapshotObserver, @unchecked Sendable {
    private let lock = NSLock()
    private var revision: Int?

    var lastRevision: Int? {
        lock.lock()
        defer { lock.unlock() }
        return revision
    }

    func consentDidChange(_ snapshot: ConsentSnapshot) {
        lock.lock()
        revision = snapshot.revision
        lock.unlock()
    }
}
