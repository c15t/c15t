import Foundation
import XCTest

@testable import C15tCore

/// What a save promises, and whether the core keeps that promise.
///
/// `CommitResult` answers before any byte reaches a backend, so its whole value lies
/// in meaning exactly one thing: the decision is on this device and the queue holds
/// the bytes that owe delivery. Every test here attacks that claim from one direction
/// or another, because the failure this suite was written for was a device that
/// reported `committed`, kept the decision in the Keychain, and never once got the
/// body accepted.
///
/// Delivery is reported afterwards, through the event stream, so most of these tests
/// read events rather than return values. See ``EventLog``.
final class SaveDeliveryTests: XCTestCase {
    private var clock: TestClock!
    private var store: InMemoryStore!
    private var http: StubHTTP!

    override func setUp() {
        super.setUp()
        clock = TestClock()
        store = InMemoryStore()
        http = StubHTTP()
    }

    // MARK: - The bridge's read pattern

    /// A save still goes out while the calling thread keeps reading snapshots.
    ///
    /// This is the call pattern the React Native bridge actually uses: `commit:` runs
    /// on the JS thread, resolves as soon as the local commit is durable, and the next
    /// thing the app does is pull `getSnapshot()` again on that same thread, from the
    /// snapshot event, from `useConsent`, and from every gated component on screen. A
    /// synchronous `snapshot()` is a lock and a copy, so it cannot hold a delivery
    /// back, and that gets pinned down here rather than left to reasoning.
    ///
    /// What this does not cover: a host that blocks threads of Swift's cooperative
    /// pool from inside its own async code. ``ConsentCore/schedule(_:)`` sends from a
    /// detached task on that shared pool, so such a host can delay a save, and no test
    /// in this package can see it coming.
    func testSynchronousSnapshotReadsDoNotHoldBackTheSaveSend() async {
        let core = await bootstrappedCore()

        let result = core.save(.all)
        XCTAssertEqual(result.status, .committed)
        for _ in 0..<5_000 {
            _ = core.snapshot()
            _ = core.isAllowed(.marketing)
        }

        await core.waitUntilIdle()
        XCTAssertEqual(http.recordedSaveRequests.count, 1, "reads must not gate the send")
        XCTAssertEqual(core.pendingSaveCount(), 0, "an accepted save leaves the queue")
    }

    /// A committed answer has queue bytes behind it at the instant `save` returns.
    ///
    /// Asserted with no `await` in between, so the claim is about the return value and
    /// not about something that landed a moment later.
    func testCommittedSaveHasQueueBytesOnDiskTheMomentItReturns() async {
        let core = await bootstrappedCore()
        http.holdsSaves = true

        let result = core.save(.all)
        XCTAssertEqual(result.status, .committed)
        XCTAssertEqual(core.pendingSaveCount(), 1, "committed means an obligation exists")
        XCTAssertNotNil(store.data(for: StorageKey.pendingSaves), "and it is on disk")

        http.releaseSaves()
        await core.waitUntilIdle()
    }

    // MARK: - A body the backend refuses

    /// The device state this was filed for, in one test.
    ///
    /// A backend that answers `400 INPUT_VALIDATION_FAILED` has read the bytes and
    /// refused them, and the queue replays those same bytes, so the answer is
    /// permanent. It used to be emitted, dropped, and repeated on every launch for a
    /// week while the caller held `committed`.
    func testRejectedBodyIsDroppedAndSaysWhy() async {
        let core = await bootstrappedCore()
        let events = EventLog(core)
        http.setSavesFail(true)
        http.saveFailureStatus = 400

        let result = core.save(.all)
        XCTAssertEqual(result.status, .committed, "the decision itself was recorded")
        await core.waitUntilIdle()

        let named = await events.didEmit("save-rejected")
        XCTAssertTrue(named, "a refusal that will never change has to be named")
        XCTAssertEqual(core.pendingSaveCount(), 0, "a body nobody will accept is not an obligation")
    }

    /// A relaunch after a refusal must not re-post the refused body.
    ///
    /// This is what turned the failure from one bad request into a device that
    /// silently failed for days: bootstrap replays the queue, so a body the producer
    /// refused came back for another `400` on every launch and never emptied.
    func testRejectedBodyIsNotReplayedOnTheNextLaunch() async {
        let core = await bootstrappedCore()
        http.setSavesFail(true)
        http.saveFailureStatus = 400
        core.save(.all)
        await core.waitUntilIdle()
        XCTAssertEqual(core.pendingSaveCount(), 0)

        http.setSavesFail(false)
        let relaunched = ConsentCore()
        await relaunched.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))

        XCTAssertEqual(
            http.recordedSaveRequests.count,
            1,
            "the refused body is gone, so the relaunch has nothing to replay"
        )
    }

    // MARK: - A backend that cannot be reached

    /// An unreachable backend keeps the obligation and reports what happened.
    ///
    /// `503` says nothing about the body, so the entry stays. It also spends an
    /// attempt, which the pair needs: without it only replays could ever reach the
    /// ceiling, and a permanently failing endpoint held its entries for the full age
    /// window.
    func testUnreachableBackendKeepsTheEntryAndReportsTheStatus() async {
        let core = await bootstrappedCore()
        let events = EventLog(core)
        http.setSavesFail(true)

        let result = core.save(.all)
        XCTAssertEqual(result.status, .committed)
        await core.waitUntilIdle()

        XCTAssertEqual(core.pendingSaveCount(), 1, "a transport failure stays queued")
        let reported = await events.didEmit("http-status")
        XCTAssertTrue(reported, "and it is reported as what happened")
    }

    /// Retries are bounded, and the end of them is announced.
    func testRetriesAreBoundedAndTheDropIsReported() async {
        let core = await bootstrappedCore()
        let events = EventLog(core)
        http.setSavesFail(true)
        core.save(.all)
        await core.waitUntilIdle()

        var dropped = false
        for _ in 0..<(PendingSaveQueue.maxAttempts + 2) where !dropped {
            core.flushPending()
            await core.waitUntilIdle()
            dropped = core.pendingSaveCount() == 0
        }
        XCTAssertTrue(dropped, "the attempt ceiling has to be reachable")
        let announced = await events.didEmit("save-undeliverable")
        XCTAssertTrue(announced, "a dropped obligation is said out loud")
    }

    // MARK: - A queue that cannot be written

    /// With nowhere to record the obligation, `save` refuses and leaves state alone.
    ///
    /// The alternative is the bad one: `committed` for a decision that exists only in
    /// this process's memory and that nothing will ever send, which is a subject's
    /// consent disappearing with no trace left behind.
    func testQueueWriteFailureRefusesTheSaveAndLeavesStateAlone() async {
        let failing = KeyFailStore(wrapping: store, refuses: StorageKey.pendingSaves)
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution())
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: failing,
            transport: Fixture.transport(http),
            clock: clock
        ))
        let revisionBefore = core.snapshot().revision

        let result = core.save(.all)
        XCTAssertEqual(result.status, .rejected)
        XCTAssertEqual(result.error?.code, "queue-write-failed")
        XCTAssertEqual(core.snapshot().revision, revisionBefore, "nothing was applied")

        await core.waitUntilIdle()
        XCTAssertEqual(http.recordedSaveRequests.count, 0, "nothing was sent, then or later")
    }

    // MARK: - A launch with no sender

    /// A launch with no transport is an observable state, not a silence.
    ///
    /// The entry stays queued for whichever launch finally has a transport, which is
    /// right, and invisible from `CommitResult`, which is not. Reached the way a host
    /// actually reaches it: a policy resolved on an earlier launch, then a launch with
    /// `com.c15t.backend.mode` set to `none`.
    func testSaveWithoutATransportReportsTheUndeliveredObligation() async {
        let first = await bootstrappedCore()
        http.setSavesFail(true)
        first.save(.all)
        await first.waitUntilIdle()
        http.setSavesFail(false)
        XCTAssertFalse(first.snapshot().policyPending, "the policy is on disk for the next launch")

        let offline = ConsentCore()
        let events = EventLog(offline)
        await offline.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: nil,
            clock: clock
        ))
        XCTAssertFalse(offline.snapshot().policyPending, "restored, not pending")

        let result = offline.save(.all)
        XCTAssertEqual(result.status, .committed, "the decision is recorded either way")
        await offline.waitUntilIdle()

        XCTAssertEqual(
            offline.pendingSaveCount(),
            2,
            "both obligations wait for a launch that can send"
        )
        let reported = await events.didEmit("transport-unavailable")
        XCTAssertTrue(reported, "and the host is told they are waiting")
    }

    // MARK: - Helpers

    /// A core with a resolved policy, ready to record a choice.
    private func bootstrappedCore() async -> ConsentCore {
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution())
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))
        XCTAssertFalse(core.snapshot().policyPending, "a save needs a scope to be made against")
        return core
    }

}

/// Events a core emitted, buffered until a test asks for them.
///
/// Subscribing is synchronous, so a log opened before the action sees every `emit`
/// that action makes on the calling thread. What arrives from a scheduled task lands
/// in this buffer as soon as a pool thread runs the pump, which is not a moment any
/// test can name, so ``didEmit(_:)`` waits for the code it is looking for rather than
/// assuming a duration. A fixed sleep is the wrong instrument here: on a loaded CI
/// runner it is either a false failure or a test that passes for the wrong reason.
private final class EventLog: @unchecked Sendable {
    private let lock = Lock()
    private var seen: [CoreEvent] = []
    private var pump: Task<Void, Never>?

    init(_ core: ConsentCore) {
        let stream = core.eventStream
        // Assigned after the fact: a closure that captures `self` cannot run while
        // `self` is still under construction.
        let pump = Task { [weak self] in
            for await event in stream {
                self?.append(event)
            }
        }
        self.pump = pump
    }

    deinit {
        pump?.cancel()
    }

    /// Whether an error with this code was reported, waiting up to `seconds`.
    ///
    /// The deadline is a failure ceiling, not a wait: the answer normally arrives on
    /// the first poll after ``ConsentCore/waitUntilIdle()`` returns.
    func didEmit(_ code: String, within seconds: TimeInterval = 5) async -> Bool {
        let deadline = Date().addingTimeInterval(seconds)
        while Date() < deadline {
            if contains(code) { return true }
            try? await Task.sleep(nanoseconds: 2_000_000)
        }
        return contains(code)
    }

    private func append(_ event: CoreEvent) {
        lock.withLock {
            seen.append(event)
            ()
        }
    }

    private func contains(_ code: String) -> Bool {
        lock.withLock {
            seen.contains { event in
                guard case let .error(info) = event else { return false }
                return info.code == code
            }
        }
    }
}

/// A store that refuses writes to one key.
///
/// Stands in for the Keychain answering a write with anything other than `errSuccess`,
/// which is the case the queue's `nil` return exists for and a store that always
/// succeeds cannot reach.
private final class KeyFailStore: ConsentStore, @unchecked Sendable {
    private let inner: any ConsentStore
    private let blockedKey: String

    init(wrapping inner: any ConsentStore, refuses key: String) {
        self.inner = inner
        self.blockedKey = key
    }

    func data(for key: String) -> Data? {
        inner.data(for: key)
    }

    @discardableResult
    func set(_ data: Data?, for key: String) -> Bool {
        guard key != blockedKey else { return false }
        return inner.set(data, for: key)
    }
}
