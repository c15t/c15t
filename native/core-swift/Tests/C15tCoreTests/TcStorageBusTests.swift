import Foundation
import XCTest
@testable import C15tCore

/// A bus endpoint that remembers what the core told it, in order.
///
/// The projection is asserted through this rather than through a real store:
/// what the kernel owes is *which values it hands over and when*, and the typed
/// storage itself is the `UserDefaultsStorageBus` test's job.
final class RecordingBus: TcStorageBusWriting, @unchecked Sendable {
    enum Operation: Equatable {
        case write([String: TcBusValue])
        case clear

        static func == (lhs: Operation, rhs: Operation) -> Bool {
            switch (lhs, rhs) {
            case let (.write(left), .write(right)): return left == right
            case (.clear, .clear): return true
            default: return false
            }
        }
    }

    private let lock = NSLock()
    private var _ops: [Operation] = []
    private var _live: [String: TcBusValue] = [:]

    var ops: [Operation] {
        lock.lock()
        defer { lock.unlock() }
        return _ops
    }

    /// What the bus would currently hold, from the core's own commands.
    var live: [String: TcBusValue] {
        lock.lock()
        defer { lock.unlock() }
        return _live
    }

    func write(_ values: [String: TcBusValue]) {
        lock.lock()
        _ops.append(.write(values))
        _live = values
        lock.unlock()
    }

    func clear() {
        lock.lock()
        _ops.append(.clear)
        _live = [:]
        lock.unlock()
    }

    /// Somebody outside the core emptied the standard defaults: the core's own
    /// history stays, the held values do not.
    func simulateWipedExternally() {
        lock.lock()
        _live = [:]
        lock.unlock()
    }
}

/// The projection of today's state onto the spec table, and the kernel steps
/// that move it.
final class TcStorageBusTests: XCTestCase {
    private func envelope(
        _ mutate: (inout ConsentSnapshot.Draft) -> Void = { _ in },
        policyResolution: JSONValue? = nil
    ) -> StoredEnvelope {
        var draft = ConsentSnapshot.Draft(current: .coldStart)
        mutate(&draft)
        return StoredEnvelope(
            snapshot: draft.build(revision: 1),
            noticeDismissal: nil,
            policyResolution: policyResolution,
            storedAt: 1_758_100_000_000
        )
    }

    /// A draft whose snapshot says a rule matched, the ordinary state behind a bus write.
    private static func matched(_ draft: inout ConsentSnapshot.Draft) {
        draft.policyPending = false
        draft.resolution = PolicyResolutionInfo(status: .matched, policyId: "de-1", fingerprint: "f")
    }

    private func gvl(tcfPolicyVersion: Int = 5) -> GlobalVendorList {
        GlobalVendorList(vendorListVersion: 177, tcfPolicyVersion: tcfPolicyVersion)
    }

    // MARK: 1. Projection

    func testColdStartEnvelopeProjectsNoRows() {
        XCTAssertEqual(TcStorageBus.values(for: envelope()), [:])
    }

    func testPolicyVersionFollowsTheStoredVendorList() {
        let withList = envelope { draft in
            draft.iab = KernelIABState(gvl: gvl(tcfPolicyVersion: 5))
        }
        XCTAssertEqual(
            TcStorageBus.values(for: withList)[TcStorageBusKeys.policyVersion],
            .number(5)
        )

        // The list's own number, not a constant a build could have kept from an
        // older document.
        let newerList = envelope { draft in
            draft.iab = KernelIABState(gvl: gvl(tcfPolicyVersion: 6))
        }
        XCTAssertEqual(
            TcStorageBus.values(for: newerList)[TcStorageBusKeys.policyVersion],
            .number(6)
        )

        // A wipe drops the list with the policy claim, and the row goes back to
        // absent rather than lying about the version that no longer is served.
        let afterWipe = envelope { draft in
            draft.iab = KernelIABState(gvl: gvl())
        }
        XCTAssertNotNil(TcStorageBus.values(for: afterWipe)[TcStorageBusKeys.policyVersion])
        let noList = envelope()
        XCTAssertNil(TcStorageBus.values(for: noList)[TcStorageBusKeys.policyVersion])
    }

    func testGdprAppliesAnswersOnlyForAResolvedPolicy() {
        // Mirrors the web rule `policyRule.model === "iab"`: a matched policy
        // answers, and every model but `iab` answers `false` there, so a matched
        // envelope that names no IAB rule owes `0` and nothing more.
        let matched = envelope(Self.matched)
        XCTAssertEqual(
            TcStorageBus.values(for: matched)[TcStorageBusKeys.gdprApplies],
            .number(0)
        )

        // Undetermined in every direction the core can actually be in: nothing
        // resolved, nothing matched, resolution failed, or a draft that somehow
        // carries both flags -- the reader's default is the safe answer.
        let pendingButClaimedMatched = envelope { draft in
            draft.policyPending = true
            draft.resolution = PolicyResolutionInfo(status: .matched, policyId: "de-1", fingerprint: "f")
        }
        let cases: [StoredEnvelope] = [
            envelope(),
            envelope { draft in
                draft.policyPending = false
                draft.resolution = PolicyResolutionInfo(status: .noMatch, policyId: nil, fingerprint: nil)
            },
            envelope { draft in
                draft.policyPending = false
                draft.resolution = PolicyResolutionInfo(
                    status: .failed, policyId: nil, fingerprint: nil, reason: "transport"
                )
            },
            pendingButClaimedMatched,
        ]
        for subject in cases {
            XCTAssertNil(
                TcStorageBus.values(for: subject)[TcStorageBusKeys.gdprApplies],
                "an unresolved policy must not claim an answer"
            )
        }
    }

    /// The one row this build's IAB support moves on the bus: an IAB rule reads
    /// `1`, the same question `packages/iab` asks (`policyRule.model === "iab"`).
    ///
    /// The rule's model comes from the envelope's copy of the wire, so the row
    /// survives a bus wipe: what a rebuild recomputes has to be what the commit
    /// published. `snapshot.model` is deliberately not consulted -- a device
    /// reports `opt-in` while an IAB rule runs, and that report is not this row.
    func testGdprAppliesReadsOneUnderAStoredIABRule() {
        let iab = envelope(
            Self.matched,
            policyResolution: Fixture.matchedResolution(
                id: "de-1",
                policy: Fixture.rule(id: "de-1", model: "iab")
            )
        )
        XCTAssertEqual(
            TcStorageBus.values(for: iab)[TcStorageBusKeys.gdprApplies],
            .number(1),
            "an IAB rule applies GDPR, whatever the snapshot reports"
        )
        XCTAssertEqual(iab.snapshot.model, .optIn, "and this core still reports opt-in while it runs")

        let optIn = envelope(
            Self.matched,
            policyResolution: Fixture.matchedResolution(
                id: "us-1",
                policy: Fixture.rule(id: "us-1", model: "opt-in")
            )
        )
        XCTAssertEqual(
            TcStorageBus.values(for: optIn)[TcStorageBusKeys.gdprApplies],
            .number(0),
            "a model that is not IAB keeps the web's own 0"
        )
    }

    func testProjectionNamesOnlySpecTableKeys() {
        let full = envelope { draft in
            draft.iab = KernelIABState(gvl: gvl())
            draft.policyPending = false
            draft.resolution = PolicyResolutionInfo(status: .matched, policyId: "de-1", fingerprint: "f")
        }
        for key in TcStorageBus.values(for: full).keys {
            XCTAssertTrue(
                TcStorageBusKeys.allNames.contains(key),
                "\(key) is not a row of the specification table"
            )
        }
    }

    // MARK: 2. The standard NSUserDefaults conformance

    func testUserDefaultsBusWritesTheTypesTheSpecTableGives() throws {
        let suiteName = "com.c15t.core.bus.tests-\(UUID().uuidString)"
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            return XCTFail("could not open a private defaults suite")
        }
        defer { defaults.removePersistentDomain(forName: suiteName) }
        let bus = UserDefaultsStorageBus(defaults: defaults)

        // A stale row from an older projection, and an out-of-table key that
        // belongs to somebody else's layer.
        defaults.set("old-string", forKey: TcStorageBusKeys.tcString)
        defaults.set("G-1", forKey: "IABTCF_AddtlConsent")

        bus.write([
            TcStorageBusKeys.policyVersion: .number(5),
            TcStorageBusKeys.gdprApplies: .number(0),
            TcStorageBusKeys.publisherCC: .text("DE"),
        ])

        let version = try XCTUnwrap(defaults.object(forKey: TcStorageBusKeys.policyVersion))
        XCTAssert(version is NSString == false, "Number rows are not strings")
        XCTAssertEqual((version as? NSNumber)?.intValue, 5)
        XCTAssertEqual(defaults.integer(forKey: TcStorageBusKeys.policyVersion), 5)
        let gdpr = try XCTUnwrap(defaults.object(forKey: TcStorageBusKeys.gdprApplies))
        XCTAssertEqual((gdpr as? NSNumber)?.intValue, 0)
        XCTAssertEqual(defaults.string(forKey: TcStorageBusKeys.publisherCC), "DE")

        // A whole-table write drops rows the projection stopped filling.
        XCTAssertNil(defaults.object(forKey: TcStorageBusKeys.tcString))

        bus.clear()
        for name in TcStorageBusKeys.allNames {
            XCTAssertNil(defaults.object(forKey: name), "\(name) survived the wipe")
        }
        XCTAssertEqual(
            defaults.string(forKey: "IABTCF_AddtlConsent"),
            "G-1",
            "a bus wipe addresses the spec table, not keys other ecosystems own"
        )
    }

    // MARK: 3. Kernel steps move the bus with them

    private func settledCore(
        bus: RecordingBus,
        store: InMemoryStore = InMemoryStore()
    ) async -> (ConsentCore, StubHTTP, InMemoryStore) {
        let clock = TestClock()
        let http = StubHTTP()
        http.enqueueInit(
            Fixture.initResponse(
                policyResolution: Fixture.matchedResolution(),
                gvl: Fixture.gvlDocument(tcfPolicyVersion: 5)
            )
        )
        let core = ConsentCore()
        await core.bootstrapAndSettle(
            CoreConfig(
                store: store,
                transport: Fixture.transport(http),
                now: clock.reading,
                initRetry: .disabled,
                storageBus: bus
            )
        )
        return (core, http, store)
    }

    func testCommitPublishesTheBusFromTheCommittedEnvelope() async {
        let bus = RecordingBus()
        let (_, _, store) = await settledCore(bus: bus)

        XCTAssert(
            bus.live[TcStorageBusKeys.policyVersion] == .number(5),
            "the served list arrived on the bus: \(bus.live)"
        )
        XCTAssert(
            bus.live[TcStorageBusKeys.gdprApplies] == .number(0),
            "the matched rule arrived on the bus: \(bus.live)"
        )

        // The commit-step rule read back: the live bus equals the projection of
        // the bytes actually in the store, not of whatever the core had in mind.
        let stored = try? XCTUnwrap(
            store.data(for: StorageKey.snapshot).flatMap(StoredEnvelope.decode)
        )
        guard let stored else { return XCTFail("no envelope landed in the store") }
        XCTAssertEqual(bus.live, TcStorageBus.values(for: stored))
    }

    func testResetClearsTheKeysWeWrote() async {
        let bus = RecordingBus()
        let (core, _, _) = await settledCore(bus: bus)
        XCTAssertFalse(bus.live.isEmpty)

        core.reset()
        await core.waitUntilIdle()
        XCTAssertEqual(bus.live, [:], "reset removed every bus value the core knew about")
        XCTAssertTrue(
            bus.ops.contains(.clear),
            "and it did so by an explicit clear, not by a later projection"
        )
    }

    func testRebuildRecreatesTheBusAfterSomebodyWipesIt() async throws {
        let bus = RecordingBus()
        let (core, _, _) = await settledCore(bus: bus)
        let committed = bus.live
        XCTAssertFalse(committed.isEmpty)

        bus.simulateWipedExternally()
        core.rebuildTcStorageBus()
        XCTAssertEqual(
            bus.live,
            committed,
            "the bus is rebuildable from stored state alone"
        )
    }

    func testLaunchAfterAnExternalWipeRepublishesFromTheStoredEnvelope() async {
        // First session: create the envelope.
        let store = InMemoryStore()
        let clock = TestClock()
        let http = StubHTTP()
        http.enqueueInit(
            Fixture.initResponse(
                policyResolution: Fixture.matchedResolution(),
                gvl: Fixture.gvlDocument(tcfPolicyVersion: 5)
            )
        )
        let busA = RecordingBus()
        let first = ConsentCore()
        await first.bootstrapAndSettle(
            CoreConfig(
                store: store,
                transport: Fixture.transport(http),
                now: clock.reading,
                initRetry: .disabled,
                storageBus: busA
            )
        )
        XCTAssertFalse(busA.live.isEmpty)

        // The defaults go away (uninstall on Android, a publisher clear, an
        // iOS backup asymmetry) while the Keychain-shaped store keeps the
        // envelope. Relaunch must republish the mirror from that store.
        let expected = busA.live
        busA.simulateWipedExternally()
        let busB = RecordingBus()
        let second = ConsentCore()
        // No transport on the second launch: hydration is the step under test,
        // and a live init would re-decide `gdprApplies` from its own answer.
        await second.bootstrapAndSettle(
            CoreConfig(
                store: store,
                now: clock.reading,
                initRetry: .disabled,
                storageBus: busB
            )
        )
        XCTAssertFalse(expected.isEmpty)
        XCTAssertEqual(
            busB.live,
            expected,
            "hydration republished the bus from the stored envelope"
        )
    }
}
