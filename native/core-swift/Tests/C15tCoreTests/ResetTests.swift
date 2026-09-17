import Foundation
import XCTest
@testable import C15tCore

/// `reset()` as `native/CONTRACT.md` states it under "Wiping consent (reset)": a device
/// that answered comes back looking like a device that never did.
///
/// The tests that matter here tell the first-launch state apart from a recorded denial.
/// Both deny every optional category, so a test that stops at "everything reads false
/// again" also passes on a core that wiped consent by saving a rejection, which is the one
/// state a subject cannot get out of. The prompt is the tell: a cleared device owes a
/// choice, a device holding a recorded denial does not.
final class ResetTests: XCTestCase {
    private var clock: TestClock!

    override func setUp() {
        super.setUp()
        clock = TestClock()
    }

    // MARK: The semantic the method exists for

    func testAWipeLeavesTheChoicePromptOwedAgainWhichARecordedDenialWouldNot() async {
        let core = await decidedCore(intent: .all)
        let accepted = core.snapshot()
        XCTAssertNotNil(accepted.explicitChoice, "the accept-all has to be a recorded receipt first")
        XCTAssertEqual(
            accepted.promptRequirement.kind,
            PromptRequirement.none.kind,
            "a subject who accepted owes nothing, and that is the state the wipe has to end"
        )

        core.reset()
        await core.waitUntilIdle()

        let after = core.snapshot()
        XCTAssertNil(
            after.explicitChoice,
            "a wipe that recorded a denial instead of clearing one leaves a choice on file"
        )
        XCTAssertFalse(after.effectivePermissions.marketing)
        XCTAssertEqual(
            after.promptRequirement.kind,
            .choice,
            "the banner has to come back. A denial the subject never gave would keep it away for the choice window"
        )
        XCTAssertEqual(after.promptRequirement.reason, PromptReason.missing)
        XCTAssertEqual(after.activeUI, ActiveUI.banner)
        XCTAssertFalse(after.policyPending, "the wipe re-ran init, and the stub policy resolved")
        XCTAssertTrue(after.ready)
    }

    func testAGrantAndARecordedDenialWipeToTheSameAnswer() async {
        let fromGrant = await decidedCore(intent: .all)
        let fromDenial = await decidedCore(intent: .necessary)
        XCTAssertTrue(fromGrant.isAllowed(.marketing))
        XCTAssertFalse(fromDenial.isAllowed(.marketing))

        fromGrant.reset()
        fromDenial.reset()
        await fromGrant.waitUntilIdle()
        await fromDenial.waitUntilIdle()

        // One device accepted everything, the other refused it, and both then wiped. After
        // the wipe no field either answers with may say which was which, because the whole
        // claim is that nobody can tell a returning subject from a new one. Revision and the
        // subject id are the two fields left out of the comparison: the first counts every
        // mutation the session made, including a save one of these two never sent, and the
        // second is minted per device, so two cores in one process cannot share one. That
        // the wipe keeps it at all is `testTheWipeKeepsTheSubjectId...`.
        XCTAssertEqual(
            try comparable(fromDenial.snapshot()),
            try comparable(fromGrant.snapshot()),
            "a wipe that meant recorded-a-denial would leave these two a field apart"
        )
    }

    // MARK: Publication

    func testTheWipeIsOneCommittedMutationPublishedRatherThanInstalled() async {
        let core = await decidedCore(intent: .all)
        let before = core.snapshot().revision

        let witness = PublicationWitness()
        let subscription = core.onChange(witness)
        let seen = SendableBox([ConsentDecision]())
        let gate = core.gate(ConsentCategory.marketing) { (decision: ConsentDecision) in
            seen.mutate { $0.append(decision) }
        }

        core.reset()
        await core.waitUntilIdle()
        subscription.cancel()
        gate.cancel()

        let publications = witness.publications
        XCTAssertFalse(
            publications.isEmpty,
            "a wipe that published nothing leaves every gate in the process holding a decision the device no longer remembers"
        )
        XCTAssertEqual(
            before + 1,
            publications.first,
            "reset moves the revision by exactly one. Restarting the numbering would hand a subscriber a "
                + "snapshot older than the one it holds, and persistence refuses a write that is not ahead"
        )
        XCTAssertGreaterThan(
            publications.count,
            1,
            "the init the wipe re-ran has to publish as well, or the prompt that comes back never reaches a host"
        )
        XCTAssertEqual(seen.value.first, ConsentDecision.granted, "registering a gate is never silence")
        XCTAssertNotEqual(seen.value.last, ConsentDecision.granted)
    }

    // MARK: What survives

    func testTheWipeKeepsTheSubjectIdTheOverridesAndTheConfiguredScope() async {
        let store = InMemoryStore()
        let http = StubHTTP()
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution())
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock,
            overrides: ConsentOverrides(country: "DE", region: nil, language: "de"),
            categories: [.marketing]
        ))
        XCTAssertEqual(core.save(.all).status, .committed)
        await core.waitUntilIdle()
        let subjectId = core.snapshot().subject?.id
        XCTAssertNotNil(subjectId, "a device with no identity would prove nothing about keeping one")

        core.reset()
        await core.waitUntilIdle()

        let after = core.snapshot()
        XCTAssertEqual(after.subject?.id, subjectId, "the backend holds an audit history keyed to this id")
        XCTAssertEqual(storedSubjectId(in: store), subjectId)
        XCTAssertEqual(after.overrides.country, "DE", "a pinned country is configuration, not consent")
        XCTAssertEqual(after.overrides.language, "de")
        XCTAssertEqual(
            after.consentCategories,
            [ConsentCategory.marketing],
            "the host's category scope survives the wipe"
        )
    }

    // MARK: Storage

    func testTheWipeDeletesTheEnvelopeAndTheQueueAndLeavesTheIdentity() async {
        let store = InMemoryStore()
        let http = StubHTTP()
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution())
        http.setSavesFail(true)
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))
        XCTAssertEqual(core.save(.all).status, .committed)
        await http.waitUntilSaveRequests(1)
        XCTAssertNotNil(store.data(for: StorageKey.snapshot))
        XCTAssertNotNil(store.data(for: StorageKey.pendingSaves), "the write has to still be owed to prove anything")
        let subjectBytes = store.data(for: StorageKey.subject)
        XCTAssertNotNil(subjectBytes)

        // The wipe's own durable effect is a deletion, and the init it re-runs then writes
        // the envelope a first launch writes too. The baseline publication is the only
        // moment that is observable: it happens after the deletes and before the init is
        // scheduled, so reading the disk from it cannot race the network.
        let witness = DiskWitness(store: store)
        let subscription = core.onChange(witness)
        core.reset()
        subscription.cancel()

        let atWipe = try? XCTUnwrap(witness.atBaseline)
        XCTAssertFalse(
            atWipe?.snapshotPresent ?? true,
            "an envelope that survives the wipe is consent the next launch serves"
        )
        XCTAssertFalse(
            atWipe?.pendingPresent ?? true,
            "an empty queue written as bytes is not the same answer as no queue, which is what a first launch has"
        )
        XCTAssertEqual(atWipe?.subjectPresent, true)

        await core.waitUntilIdle()
        let stored = try? XCTUnwrap(StoredEnvelope.decode(store.data(for: StorageKey.snapshot)!))
        XCTAssertNil(stored?.snapshot.explicitChoice, "what came back under the wipe is policy, not consent")
        XCTAssertEqual(stored?.snapshot.effectivePermissions.marketing, false)
        XCTAssertEqual(core.pendingSaveCount(), 0, "a save owed before the wipe is not owed after it")
        XCTAssertNil(store.data(for: StorageKey.pendingSaves))
        XCTAssertEqual(store.data(for: StorageKey.subject), subjectBytes)
    }

    // MARK: The next launch

    func testAWipedDeviceAndADeviceThatNeverDecidedRelaunchIdentically() async {
        // A reviewer's device: decided everything, then wiped, then re-resolved its policy.
        let wipedStore = InMemoryStore()
        let wiped = await decidedCore(intent: .all, store: wipedStore)
        let subjectId = wiped.snapshot().subject?.id
        wiped.reset()
        await wiped.waitUntilIdle()

        // A new install that got as far as its first init and decided nothing.
        let freshStore = InMemoryStore()
        let fresh = ConsentCore()
        fresh.bootstrap(settledConfig(store: freshStore))
        await fresh.waitUntilIdle()

        // Both relaunch over their own bytes. Revision and the minted subject id are out of
        // the comparison for the reason `testAGrantAndARecordedDenialWipeToTheSameAnswer`
        // gives; that the wiped device kept the identity it had is asserted underneath.
        let relaunchedWiped = ConsentCore()
        relaunchedWiped.bootstrap(settledConfig(store: wipedStore))
        let relaunchedFresh = ConsentCore()
        relaunchedFresh.bootstrap(settledConfig(store: freshStore))
        await relaunchedWiped.waitUntilIdle()
        await relaunchedFresh.waitUntilIdle()

        let after = relaunchedWiped.snapshot()
        XCTAssertEqual(
            try comparable(relaunchedFresh.snapshot()),
            try comparable(after),
            "a reviewer who wiped the app has to be looking at what a new install looks like"
        )
        XCTAssertNil(after.explicitChoice)
        XCTAssertFalse(after.effectivePermissions.marketing)
        XCTAssertEqual(after.subject?.id, subjectId, "a wipe costs the decision and not the identity")
    }

    func testAWipeWithNoPolicyToReResolveStillAnswersTheColdStartState() async {
        // The stub's default init body carries no `policyResolution`, so nothing resolves.
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: InMemoryStore(),
            transport: Fixture.transport(StubHTTP()),
            clock: clock
        ))
        let revision = core.snapshot().revision

        let witness = PublicationWitness()
        let subscription = core.onChange(witness)
        core.reset()
        subscription.cancel()
        await core.waitUntilIdle()

        XCTAssertEqual(
            revision + 1,
            witness.publications.first,
            "the wipe itself is one mutation. The init it re-ran counts separately, and here it failed."
        )
        let after = core.snapshot()
        XCTAssertTrue(after.policyPending, "the re-run init failed, and a failed init leaves the device fail-closed")
        XCTAssertFalse(after.effectivePermissions.marketing)
        XCTAssertEqual(
            after.promptRequirement.kind,
            PromptRequirement.none.kind,
            "no policy resolved, so no surface is claimed"
        )
        XCTAssertEqual(after.activeUI, ActiveUI.none)
    }

    func testAWipeInstallsTheStateAFirstLaunchBootsWith() async throws {
        // The publication is the only place either baseline can be read. Both cores publish
        // the cold start synchronously and then let init run on its own, so reading the
        // snapshot afterwards would race the network instead of comparing two devices.
        let freshWitness = PublicationWitness()
        let fresh = ConsentCore()
        let freshSubscription = fresh.onChange(freshWitness)
        fresh.bootstrap(settledConfig(store: InMemoryStore()))
        freshSubscription.cancel()

        let wipeWitness = PublicationWitness()
        let decided = await decidedCore(intent: .all)
        let revisionBefore = decided.snapshot().revision
        let wipeSubscription = decided.onChange(wipeWitness)
        decided.reset()
        wipeSubscription.cancel()

        // The requirement in one line: the state a wipe leaves behind is the state a device
        // that has never been used boots into, one revision further along. The other tests
        // here check a field of that claim; this one is the claim.
        let wiped = try XCTUnwrap(wipeWitness.baseline)
        XCTAssertEqual(
            try comparable(try XCTUnwrap(freshWitness.baseline)),
            try comparable(wiped),
            "a device that answered and then wiped has to answer what a new install answers"
        )
        XCTAssertEqual(revisionBefore + 1, wiped.revision, "the wipe is one mutation from the state it was handed")
    }

    // MARK: Helpers

    /// A core that bootstrapped against a resolved opt-in rule and then decided `intent`.
    private func decidedCore(
        intent: CommitIntent,
        store: InMemoryStore = InMemoryStore()
    ) async -> ConsentCore {
        let core = ConsentCore()
        await core.bootstrapAndSettle(settledConfig(store: store))
        XCTAssertEqual(core.save(intent).status, .committed)
        await core.waitUntilIdle()
        return core
    }

    /// The id the identity key holds, read as JSON because the type the core writes it
    /// with is private to the identity reader on purpose.
    private func storedSubjectId(in store: any ConsentStore) -> String? {
        guard let raw = store.data(for: StorageKey.subject),
              case let .object(stored)? = C15tJSON.parse(raw),
              case let .string(id)? = stored["id"]
        else { return nil }
        return id
    }

    private func settledConfig(store: any ConsentStore) -> CoreConfig {
        let http = StubHTTP()
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution())
        return Fixture.configured(store: store, transport: Fixture.transport(http), clock: clock)
    }

    /// The snapshot as encoded bytes, minus the two fields a second core cannot share.
    ///
    /// Compared as JSON rather than with `==` so the check covers every field the encoder
    /// writes, including any a later release adds. A hand-written field list would keep
    /// passing the day someone widens the snapshot, which is exactly when the two devices
    /// need to be told apart.
    private func comparable(_ snapshot: ConsentSnapshot) throws -> String {
        let encoded = try C15tJSON.encode(snapshot)
        guard case var .object(fields)? = C15tJSON.parse(encoded) else {
            throw WipeTestFailure("the snapshot is not a JSON object")
        }
        fields["revision"] = nil
        // `evaluatedAt` comes out of the comparison because the two cores already disagree
        // about it on a cold start, before consent is involved: hydrate leaves it at 0 when
        // nothing resolved, and a wipe stamps the moment it evaluated. A reset must not be
        // judged on a difference it did not introduce.
        fields["evaluatedAt"] = nil
        if case var .object(subject)? = fields["subject"] {
            subject["subjectId"] = nil
            fields["subject"] = .object(subject)
        }
        guard let bytes = C15tJSON.encode(JSONValue.object(fields)) else {
            throw WipeTestFailure("the comparable snapshot could not be encoded")
        }
        return String(decoding: bytes, as: UTF8.self)
    }
}

private struct WipeTestFailure: Error {
    let message: String

    init(_ message: String) {
        self.message = message
    }
}

/// Records the revision of every publication, in the order the core announced them.
///
/// Held strongly by the caller: the core's observer set is weak.
private final class PublicationWitness: SnapshotObserver, @unchecked Sendable {
    private let lock = NSLock()
    private var revisions: [Int] = []
    private var first: ConsentSnapshot?

    var publications: [Int] {
        lock.lock()
        defer { lock.unlock() }
        return revisions
    }

    /// The first thing the core announced, which is the baseline when the observer was
    /// attached just before a mutation.
    var baseline: ConsentSnapshot? {
        lock.lock()
        defer { lock.unlock() }
        return first
    }

    func consentDidChange(_ snapshot: ConsentSnapshot) {
        lock.lock()
        revisions.append(snapshot.revision)
        if first == nil { first = snapshot }
        lock.unlock()
    }
}

/// Reads what is on disk from inside a publication, which is the only moment a wipe's own
/// deletion is observable before the init it re-ran gets to write again.
private final class DiskWitness: SnapshotObserver, @unchecked Sendable {
    struct OnDisk {
        let snapshotPresent: Bool
        let pendingPresent: Bool
        let subjectPresent: Bool
    }

    private let store: any ConsentStore
    private let lock = NSLock()
    private var first: OnDisk?

    init(store: any ConsentStore) {
        self.store = store
    }

    var atBaseline: OnDisk? {
        lock.lock()
        defer { lock.unlock() }
        return first
    }

    func consentDidChange(_ snapshot: ConsentSnapshot) {
        let observed = OnDisk(
            snapshotPresent: store.data(for: StorageKey.snapshot) != nil,
            pendingPresent: store.data(for: StorageKey.pendingSaves) != nil,
            subjectPresent: store.data(for: StorageKey.subject) != nil
        )
        lock.lock()
        if first == nil { first = observed }
        lock.unlock()
    }
}
