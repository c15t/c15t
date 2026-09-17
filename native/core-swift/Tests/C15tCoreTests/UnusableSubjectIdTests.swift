import Foundation
import XCTest

@testable import C15tCore

/// The stored-id half of the subject identity rule, on this core's own bytes.
///
/// The shape under test is an install written by a build that minted the legacy UUID
/// subject id. Every save it made was refused by the producer, so the device holds a
/// decision attributed to an id no query returns while answering `committed` and the
/// backend holds nothing. `native/CONTRACT.md` prices that identity at nothing, which
/// means the whole stored envelope goes with it, and this is the one fixture per core
/// that holds the line: a well-formed grant under a refused id has to read exactly like
/// a first launch, records and all, and must not put the old bytes back on the wire.
///
/// This is a core test rather than a shared `native/protocol` fixture on purpose. The
/// JavaScript kernel accepts a UUID subject id without looking at it, so it cannot
/// produce an expectation for a refusal, and a stored envelope is device output no kernel
/// writes.
final class UnusableSubjectIdTests: XCTestCase {
    /// The shape a prerelease build wrote, and the reason this population exists.
    private static let legacyId = "6f1d2c3a-8b4e-4a7f-9c21-0d5e7a9b1c01"

    /// A usable id, taken from the vector table the three SDKs share.
    private static let healthyId = "sub_4ZrjtiRsJnoW34Px8dAvhPTKJiWc"

    private static let now: Int64 = 1_770_000_000_000

    // MARK: - The rule

    func testStoredGrantUnderARefusedIdReadsAsAFirstLaunch() async throws {
        let install = try await poisonedInstall()
        let backend = StubHTTP()
        let log = EventLog()
        let core = ConsentCore()
        log.start(core)
        await core.bootstrapAndSettle(Fixture.configured(
            store: install.store,
            transport: Fixture.transport(backend),
            clock: TestClock(Self.now)
        ))

        // Reads like a first launch, records and all.
        let snapshot = core.snapshot()
        XCTAssertFalse(snapshot.ready, "a launch that restored nothing cannot claim an answer")
        XCTAssertTrue(snapshot.policyPending)
        XCTAssertNil(snapshot.explicitChoice, "the choice written under the refused id is gone")
        for category in OptionalConsentCategory.allCases {
            XCTAssertFalse(core.isAllowed(category.category), "\(category) outlived its own subject id")
        }

        // A fresh identity, and one the producer will actually take.
        let adopted = try XCTUnwrap(snapshot.subject?.id)
        XCTAssertNotEqual(adopted, Self.legacyId)
        XCTAssertTrue(SubjectId.isValid(adopted), "the replacement must be acceptable: \(adopted)")

        // What is on disk now is this launch's own state, not the grant that was there.
        XCTAssertNil(install.store.data(for: StorageKey.pendingSaves), "the frozen bodies went with it")
        let persisted = String(
            decoding: try XCTUnwrap(
                install.store.data(for: StorageKey.snapshot),
                "hydration persists what it settled on, the same way a first launch does"
            ),
            as: UTF8.self
        )
        XCTAssertFalse(
            persisted.contains(Self.healthyId),
            "the envelope still on disk is the one written under the refused id"
        )
        XCTAssertTrue(persisted.contains(adopted), "what is stored belongs to the new subject")
        XCTAssertFalse(persisted.contains("explicitChoice"), "the grant must not be what comes back")

        // The old bytes do not go out the door.
        XCTAssertTrue(
            backend.recordedSaveRequests.isEmpty,
            "a refused id must not replay the body queued under it"
        )

        // The host is told once, in terms it can repeat to a user.
        let reported = await log.didEmit("subject-id-unusable")
        XCTAssertTrue(reported, "a dropped identity has to be announced, not just felt")
        XCTAssertEqual(log.count("subject-id-unusable"), 1, "once per launch, not once per read")
        let message = try XCTUnwrap(log.error(withCode: "subject-id-unusable")?.message)
        XCTAssertTrue(message.contains(Self.legacyId), "the message must name the id it refused: \(message)")
        for fragment in ["^sub_", "asks for", "consent again", "no decision for it"] {
            XCTAssertTrue(message.contains(fragment), "the message must carry \"\(fragment)\": \(message)")
        }

        // A second hydrate on the same core cannot repeat the announcement, and cannot
        // resurrect anything: the id it reads back is the one the first read minted.
        core.hydrate()
        await core.waitUntilIdle()
        XCTAssertEqual(log.count("subject-id-unusable"), 1, "one launch, one announcement")
        XCTAssertEqual(core.snapshot().subject?.id, adopted, "the replacement id is now the stored one")
    }

    func testDiscardingTheEnvelopeLeavesTheStorageOfAFirstLaunch() async throws {
        // "Records and all" said about storage rather than about a snapshot, because the
        // discarded launch mints a new id and that is the one field the contract keeps in
        // its own slot: after the discard, the slots left are exactly the slots a first
        // launch leaves, which is what stops the old decision coming back tomorrow.
        let install = try await poisonedInstall()
        let poisonedBackend = StubHTTP()
        let launch = ConsentCore()
        await launch.bootstrapAndSettle(Fixture.configured(
            store: install.store,
            transport: Fixture.transport(poisonedBackend),
            clock: TestClock(Self.now)
        ))
        let adopted = try XCTUnwrap(launch.snapshot().subject?.id)

        let firstLaunch = InMemoryStore()
        firstLaunch.set(Data("{\"id\":\"\(adopted)\"}".utf8), for: StorageKey.subject)

        // Same slots, same clock, nobody answering: the two snapshots agree on every field
        // except the identity, and the identity is identical by construction.
        let offline = StubHTTP()
        let comparison = ConsentCore()
        await comparison.bootstrapAndSettle(Fixture.configured(
            store: firstLaunch,
            transport: Fixture.transport(offline),
            clock: TestClock(Self.now)
        ))
        XCTAssertEqual(
            firstLaunch.snapshotOfContents.keys.sorted(),
            install.store.snapshotOfContents.keys.sorted(),
            "the launch that dropped its identity left slots a first launch would not leave"
        )
        XCTAssertNil(install.store.data(for: StorageKey.pendingSaves))
        XCTAssertEqual(
            try fields(of: launch),
            try fields(of: comparison),
            "the refused-id launch answers something a first launch does not"
        )
    }

    // MARK: - Harness

    /// A device holding a real grant and an undelivered queued save, then read back under
    /// the legacy id an older build wrote into the same slot.
    private func poisonedInstall() async throws -> (store: InMemoryStore, queued: Data) {
        let store = InMemoryStore()
        store.set(Data("{\"id\":\"\(Self.healthyId)\"}".utf8), for: StorageKey.subject)

        let backend = StubHTTP()
        // A policy has to resolve or the commit is refused and there is no grant to lose.
        backend.initResponse = Fixture.initResponse(
            policyResolution: Fixture.matchedResolution()
        )
        // 503, not 400: the entry has to still be waiting when the id is swapped, so the
        // "must not replay" half of the rule has something real to refuse.
        backend.setSavesFail(true)
        let first = ConsentCore()
        await first.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(backend),
            clock: TestClock(Self.now)
        ))
        XCTAssertEqual(
            first.save(.all).status,
            .committed,
            "the grant has to owe delivery before the id is poisoned"
        )
        await first.waitUntilIdle()

        XCTAssertNotNil(store.data(for: StorageKey.snapshot), "the install has to hold a real envelope")
        let queued = try XCTUnwrap(
            store.data(for: StorageKey.pendingSaves),
            "the save never reached the queue, so there is nothing here to refuse to replay"
        )
        XCTAssertTrue(
            String(decoding: queued, as: UTF8.self).contains(Self.healthyId),
            "the queued body is attributed to the healthy id"
        )

        store.set(Data("{\"id\":\"\(Self.legacyId)\"}".utf8), for: StorageKey.subject)
        return (store, queued)
    }

    private func fields(of core: ConsentCore) throws -> [String: JSONValue] {
        let data = try C15tJSON.encode(core.snapshot())
        return try XCTUnwrap(C15tJSON.parse(data)?.objectValue)
    }
}

/// Errors the core emitted, buffered for a test that cannot name the moment a scheduled
/// pump runs.
private final class EventLog: @unchecked Sendable {
    private let lock = Lock()
    private var seen: [CoreEvent] = []
    private var pump: Task<Void, Never>?

    /// Begin recording. The stream is opened before the action, so a `hydrate()` that
    /// emits on the calling thread cannot land in a subscription that starts after it.
    func start(_ core: ConsentCore) {
        let stream = core.eventStream
        pump = Task { [weak self] in
            for await event in stream {
                self?.lock.withLock {
                    self?.seen.append(event)
                    ()
                }
            }
        }
    }

    deinit {
        pump?.cancel()
    }

    /// Whether an error with this code arrived, waiting up to `seconds`.
    ///
    /// The deadline is a failure ceiling, not a wait: the announcement is made on the
    /// bootstrap thread, so it is usually there as soon as the pump gets a slice.
    func didEmit(_ code: String, within seconds: TimeInterval = 5) async -> Bool {
        let deadline = Date().addingTimeInterval(seconds)
        while Date() < deadline {
            if error(withCode: code) != nil { return true }
            try? await Task.sleep(nanoseconds: 2_000_000)
        }
        return error(withCode: code) != nil
    }

    func error(withCode code: String) -> CoreErrorInfo? {
        lock.withLock {
            for case .error(let info) in seen where info.code == code {
                return info
            }
            return nil
        }
    }

    /// How many times this code was reported.
    func count(_ code: String) -> Int {
        lock.withLock {
            seen.reduce(0) { total, event in
                guard case .error(let info) = event, info.code == code else { return total }
                return total + 1
            }
        }
    }
}
