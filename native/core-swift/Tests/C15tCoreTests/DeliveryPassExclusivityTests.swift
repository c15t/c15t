import Foundation
import XCTest

@testable import C15tCore

/// The exclusivity rule in `native/CONTRACT.md`, "The pending save queue": only one
/// delivery pass may be in flight per core.
///
/// A pass reads the queue once and then sends entry by entry, so every entry it read
/// stays readable until its own send lands. A second pass that reads during that window
/// resends whatever the first is still sending. The bytes are frozen and carry the same
/// consent id, so the backend dedupes them into one consent row and nothing in stored
/// state moves -- the only symptom is a second `POST /subjects` per entry per wake-up.
/// So these tests watch the transport rather than the snapshot, which cannot see this
/// defect at all.
///
/// The shape the rule exists for is a return to the foreground: the platform observer
/// asks for a flush, and the `refresh()` it then triggers reaches the same queue again
/// from the resolved init. Two callers from one wake-up, so the core answers the second
/// one instead of leaving them to coordinate by convention.
///
/// The Kotlin suite proves the overlap by thread identity, because there `flushPending()`
/// runs the pass inline on whichever thread the wiring used. Here a parked send suspends
/// rather than blocking a thread, and a detached task can be resumed on any of them, so
/// the proof is state instead: a send that has entered a closed gate cannot have answered,
/// so "a pass was asked for while this entry's send was open" is read off the harness at
/// the instant it is true, not inferred from how long something was allowed to take.
final class DeliveryPassExclusivityTests: XCTestCase {
    private var clock: TestClock!
    private var store: InMemoryStore!
    private var http: GatedHTTP!

    override func setUp() {
        super.setUp()
        clock = TestClock()
        store = InMemoryStore()
        http = GatedHTTP()
    }

    /// A foreground-shaped wake-up: a flush asked for while the queue's own first send is
    /// still open must not put that entry on the wire a second time.
    ///
    /// Asserted before the send is released, which is the point. At that instant the
    /// second request has been recorded against a core whose pass had not handed the entry
    /// back, so an implementation without the guard has already read a queue that still
    /// held it and is one step from posting it twice.
    func testFlushAskedForWhileASendIsOpenDoesNotResendThatEntry() async throws {
        let core = await bootstrappedCore()
        http.holdsSends = true

        XCTAssertEqual(core.save(.all).status, .committed, "a parked send says nothing about the commit")
        let entryOne = try XCTUnwrap(core.pendingSaveBodies().first)

        let opened = await http.awaitSend(beyond: 0, for: entryOne)
        XCTAssertTrue(
            opened,
            "the save's own send has to reach the transport for this test to mean anything"
        )

        core.flushPending()
        let declined = await core.awaitWaitingDeliveryPassRequest()
        XCTAssertTrue(
            declined,
            "the flush has to reach the guard while that send is open, or nothing overlapped and this proved nothing"
        )
        XCTAssertEqual(
            http.openSendCount(for: entryOne),
            1,
            "the entry was still inside its send at the moment the second pass was asked for"
        )
        XCTAssertEqual(
            http.sends(for: entryOne),
            1,
            "one queued decision may reach the transport once. The flush read the queue while this "
                + "entry's own send was still open, which is the resend the contract forbids."
        )

        http.releaseSends()
        await core.waitUntilIdle()

        XCTAssertEqual(http.sends(for: entryOne), 1, "still one send after everything settled")
        XCTAssertEqual(core.pendingSaveCount(), 0, "the one send still has to land")
    }

    /// Two flushes racing one another over two queued decisions deliver each of them once.
    ///
    /// This is the wake-up with a queue behind it: twenty entries means twenty duplicate
    /// posts per foreground, so the entry the running pass has not reached yet matters as
    /// much as the one it is sending.
    func testTwoFlushesThatOverlapOneRunningPassDeliverEachEntryOnce() async {
        let core = await bootstrappedCore()
        http.savesFail = true
        XCTAssertEqual(core.save(.all).status, .committed)
        clock.advance(by: 1)
        XCTAssertEqual(core.save(.custom([.measurement: false])).status, .committed)
        await core.waitUntilIdle()
        XCTAssertEqual(core.pendingSaveCount(), 2, "both decisions are owed")

        let bodies = core.pendingSaveBodies()
        XCTAssertEqual(bodies.count, 2)
        let entryOne = bodies[0]
        let entryTwo = bodies[1]
        let beforeOne = http.sends(for: entryOne)
        let beforeTwo = http.sends(for: entryTwo)

        // The backend answers now, and two flushes arrive at once. The first starts a pass
        // that reads both entries and gets held inside the first send; the second asks while
        // that pass is running, so its own read would find the second entry still queued.
        http.savesFail = false
        http.holdsSends = true
        core.flushPending()
        let insideFirst = await http.awaitSend(beyond: beforeOne, for: entryOne)
        XCTAssertTrue(insideFirst, "the running pass has to be inside the first entry's send")
        core.flushPending()
        let secondDeclinedInPass = await core.awaitWaitingDeliveryPassRequest()
        XCTAssertTrue(secondDeclinedInPass, "the second flush has to reach the guard mid-send")

        XCTAssertEqual(http.sends(for: entryOne) - beforeOne, 1, "the entry in flight must not be sent again")
        XCTAssertEqual(
            http.sends(for: entryTwo) - beforeTwo,
            0,
            "the entry the running pass has not reached yet belongs to that pass"
        )

        http.releaseSends()
        await core.waitUntilIdle()

        XCTAssertEqual(http.sends(for: entryOne) - beforeOne, 1)
        XCTAssertEqual(http.sends(for: entryTwo) - beforeTwo, 1)
        XCTAssertEqual(core.pendingSaveCount(), 0, "the one pass still has to land both entries")
        http.assertOldestFirst(entryOne, entryTwo)
    }

    /// An entry queued after a running pass read is delivered by that pass, not by a pass
    /// of its own.
    ///
    /// A declined request must be answered rather than dropped: an obligation that waits
    /// for the next launch, foreground, or network change is a decision the subject made
    /// and the producer has never heard of. The re-read on the way out is what covers it,
    /// and it is the half a guard alone gets wrong.
    func testEntryQueuedAfterARunningPassReadIsDeliveredByThatPass() async throws {
        let core = await bootstrappedCore()
        http.holdsSends = true

        XCTAssertEqual(core.save(.all).status, .committed)
        let entryOne = try XCTUnwrap(core.pendingSaveBodies().first)
        let firstOpen = await http.awaitSend(beyond: 0, for: entryOne)
        XCTAssertTrue(firstOpen, "the first save's send has to be open")

        clock.advance(by: 1)
        XCTAssertEqual(core.save(.custom([.measurement: false])).status, .committed)
        let entryTwo = try XCTUnwrap(core.pendingSaveBodies().last)
        XCTAssertNotEqual(entryOne, entryTwo, "the clock makes each body its own decision")

        let secondDeclined = await core.awaitWaitingDeliveryPassRequest()
        XCTAssertTrue(
            secondDeclined,
            "the second save's own send has to reach the guard while the first send is open"
        )
        XCTAssertEqual(
            http.sends(for: entryTwo),
            0,
            "an entry queued mid-pass must not get a pass of its own"
        )
        XCTAssertEqual(core.pendingSaveCount(), 2)

        http.releaseSends()
        await core.waitUntilIdle()

        XCTAssertEqual(http.sends(for: entryOne), 1)
        XCTAssertEqual(
            http.sends(for: entryTwo),
            1,
            "no further flush was asked for, so the running pass took it"
        )
        XCTAssertEqual(core.pendingSaveCount(), 0, "both bodies land without another flush being asked for")
        http.assertOldestFirst(entryOne, entryTwo)
    }

    /// A wake-up with a queue behind it, run the way the platform runs it.
    ///
    /// One foreground fires a flush, and the `refresh()` it triggers fires another from the
    /// resolved init, while every save's own first send is in the same race. Each of those
    /// callers may legally take the core, so exactly-once has to survive whichever order
    /// they arrive in, and twenty queued decisions is twenty duplicate posts per wake-up if
    /// it does not.
    ///
    /// Unlike the tests above, this one asserts a count over every interleaving rather than
    /// driving one specific overlap. It is here because the save's own send is the one
    /// sender that can arrive at a decision after a pass has already landed it -- it was
    /// scheduled when the entry was queued and takes the core whenever the core happens to
    /// be free -- and that ordering cannot be forced from a test without an executor seam.
    func testAQueueDrainedByManyCallersSendsEachDecisionExactlyOnce() async throws {
        // Depth first: six decisions owed to a backend that is refusing everything, so the
        // race below has a queue to lose. Each spends one attempt here.
        let staging = await bootstrappedCore()
        http.savesFail = true
        var bodies: [Data] = []
        for index in 0..<6 {
            clock.advance(by: 1)
            XCTAssertEqual(staging.save(.custom([.measurement: index.isMultiple(of: 2)])).status, .committed)
        }
        await staging.waitUntilIdle()
        bodies = staging.pendingSaveBodies()
        XCTAssertEqual(bodies.count, 6, "all six are still owed")
        http.savesFail = false

        // A relaunch that nobody serialises: each save asks for its own send and each
        // wake-up asks for a pass, and nothing here tells the core which will arrive first.
        let core = ConsentCore()
        await core.bootstrapAndSettle(CoreConfig(
            store: store,
            transport: gatedTransport(),
            overrides: .default(language: "en"),
            now: clock.reading,
            initRetry: .disabled,
            flushPendingOnBootstrap: false
        ))
        for index in 0..<6 {
            clock.advance(by: 1)
            XCTAssertEqual(core.save(.custom([.measurement: !index.isMultiple(of: 2)])).status, .committed)
            core.flushPending()
        }
        await core.waitUntilIdle()

        http.assertNothingResentAfterItWasAccepted(bodies)
        XCTAssertEqual(core.pendingSaveCount(), 0, "and the queue still drained")
    }

    // MARK: - The queue's own half

    /// The queue is the only record of what is owed, so a pass asks it immediately before
    /// it sends.
    ///
    /// A pass holds a copy of the queue from the moment it read, and the save that queued
    /// a body holds that one body in hand, so either can arrive at a decision the other
    /// already landed. The pass guard keeps that from happening by concurrency; this is
    /// what keeps it from happening by lateness, and it is the difference between one POST
    /// per decision and one per decision per sender.
    func testReplayDoesNotSendAnEntryThatStoppedBeingOwed() async {
        let ids = TestIDs(["one", "two"])
        let queue = PendingSaveQueue(store: store, now: clock.reading, newID: { ids.next() })
        queue.enqueue(body: Data(#"{"decision":"one"}"#.utf8), subjectId: "sub_one", actionAt: clock.now)
        queue.enqueue(body: Data(#"{"decision":"two"}"#.utf8), subjectId: "sub_two", actionAt: clock.now + 1)
        XCTAssertEqual(queue.count(), 2)

        let report = await queue.replay(using: gatedTransport()) { entry, _ in
            // The other sender landing `two` while this pass is in the network.
            if entry.id == "one" {
                queue.remove(id: "two")
            }
        }

        XCTAssertEqual(
            http.sentBodies().map { String(decoding: $0, as: UTF8.self) },
            [#"{"decision":"one"}"#],
            "an entry the queue no longer holds owes the backend nothing. The frozen bytes carry the "
                + "same consent id, so this is invisible anywhere except as a second POST."
        )
        XCTAssertEqual(report.attempted, 1, "a skipped entry is not an attempt")
        XCTAssertEqual(report.delivered, 1)
        XCTAssertEqual(report.remaining, 0)
    }

    // MARK: - Helpers

    /// The hosted transport over the gate, so assertions land on real request bodies.
    private func gatedTransport() -> HostedTransport {
        HostedTransport(
            baseURL: URL(string: "https://consent.example.com")!,
            domain: "app.example.com",
            client: http
        )
    }

    /// A core with a resolved policy, ready to record a choice.
    private func bootstrappedCore() async -> ConsentCore {
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution())
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: gatedTransport(),
            clock: clock
        ))
        XCTAssertFalse(core.snapshot().policyPending, "a save needs a scope to be made against")
        return core
    }
}

/// Wait for `condition`, with a ceiling that is a failure rather than a wait.
///
/// Every call site here has already been driven to the moment it asserts on, so the
/// deadline exists only to turn a broken premise into a named failure instead of a hung
/// suite. On a healthy run this returns on the first poll.
private func pollUntil(
    within seconds: TimeInterval = 10,
    _ condition: @escaping @Sendable () -> Bool
) async -> Bool {
    let deadline = Date().addingTimeInterval(seconds)
    while Date() < deadline {
        if condition() { return true }
        try? await Task.sleep(nanoseconds: 2_000_000)
    }
    return condition()
}

extension ConsentCore {
    /// Wait until a delivery-pass request has been recorded against the pass that holds
    /// this core.
    ///
    /// That recording is the overlap: it only happens when a caller asks for a pass and
    /// finds one running. Without it the only evidence available would be that no duplicate
    /// POST appeared, which a scheduler that never got round to the second caller fakes
    /// perfectly well.
    func awaitWaitingDeliveryPassRequest() async -> Bool {
        await pollUntil { self.hasWaitingDeliveryPassRequest }
    }
}

/// A backend that parks every save inside the request until a test lets it go, and counts
/// sends by body.
///
/// The body is the entry's identity here on purpose. A queue id never reaches the wire --
/// it keys the local row, and the producer dedupes on the receipts frozen inside the
/// bytes -- so the bytes are the only handle a test has on "the same decision arrived
/// twice".
private final class GatedHTTP: HTTPTransport, @unchecked Sendable {
    private let lock = NSLock()
    private var parked: [UUID: CheckedContinuation<Bool, Never>] = [:]
    private var _holdsSends = false
    private var openSends = 0
    private var entered: [Data: Int] = [:]
    private var answered: [Data: Int] = [:]
    private var order: [Data] = []
    private var results: [(body: Data, status: Int)] = []

    var initResponse: HTTPResponse = .json(#"{"policyResolution": null}"#)

    /// Answer every save as an unreachable backend (`503`), which keeps the entry queued
    /// and spends one attempt. A test stages a queue this way before it starts watching
    /// the pass that drains it.
    var savesFail: Bool {
        get {
            lock.lock()
            defer { lock.unlock() }
            return _savesFail
        }
        set {
            lock.lock()
            _savesFail = newValue
            lock.unlock()
        }
    }

    private var _savesFail = false

    /// How long a held send waits for its test: shorter than ``pollUntil``'s ceiling, so a
    /// test that forgets to release fails on a duplicate send rather than on a timeout.
    private static let gateNanos: UInt64 = 3_000_000_000

    /// Park every save response until ``releaseSends()``, which is how a send is kept
    /// in flight for exactly as long as a test needs it.
    ///
    /// Read and written under the lock the waiters live behind, so the parking decision and
    /// the release cannot interleave and park a send whose release already happened.
    var holdsSends: Bool {
        get {
            lock.lock()
            defer { lock.unlock() }
            return _holdsSends
        }
        set {
            lock.lock()
            _holdsSends = newValue
            lock.unlock()
        }
    }

    func releaseSends() {
        lock.lock()
        _holdsSends = false
        let waiting = Array(parked.values)
        parked.removeAll()
        lock.unlock()
        for continuation in waiting {
            continuation.resume(returning: false)
        }
    }

    /// Hand back one parked send whose gate never opened. Removing it under the lock is
    /// what makes the release and the timeout mutually exclusive, so a send is answered
    /// exactly once whichever of them gets there first.
    private func timeOut(_ token: UUID) {
        lock.lock()
        let continuation = parked.removeValue(forKey: token)
        lock.unlock()
        continuation?.resume(returning: true)
    }

    func sends(for body: Data) -> Int {
        lock.lock()
        defer { lock.unlock() }
        return entered[body] ?? 0
    }

    /// How many sends of `body` have entered the backend and not answered. Non-zero means
    /// an open send for that decision, which is what makes an overlap a fact.
    func openSendCount(for body: Data) -> Int {
        lock.lock()
        defer { lock.unlock() }
        return (entered[body] ?? 0) - (answered[body] ?? 0)
    }

    func awaitSend(beyond count: Int, for body: Data) async -> Bool {
        await pollUntil { self.sends(for: body) > count }
    }

    /// Every save body this backend was asked for, in the order it was asked.
    func sentBodies() -> [Data] {
        lock.lock()
        defer { lock.unlock() }
        return order
    }

    /// Every save this backend answered, in the order it answered them, with the status.
    ///
    /// A retried entry is not a defect -- a send that got `503` left the entry owed, and
    /// the next pass is right to try it again. What is a defect is a second request for a
    /// body the backend already accepted, which is the duplicate the contract is about: the
    /// producer dedupes it into one consent row, so nothing looks wrong anywhere except in
    /// the request count.
    func assertNothingResentAfterItWasAccepted(
        _ bodies: [Data],
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        lock.lock()
        let log = results
        lock.unlock()

        for body in bodies {
            let positions = log.indices.filter { log[$0].0 == body }
            let accepted = positions.filter { log[$0].1 == 200 }
            XCTAssertEqual(
                accepted.count,
                1,
                "each decision was owed exactly one accepted POST",
                file: file,
                line: line
            )
            guard let landed = accepted.first else { continue }
            let late = positions.filter { $0 > landed }
            XCTAssertTrue(
                late.isEmpty,
                "a body went out again after the backend had accepted it, at answer "
                    + "\(late) of \(log.count): \(descriptor(for: body))",
                file: file,
                line: line
            )
        }
    }

    /// Enough of a body to identify it in a failure: when the subject made the choice.
    private func descriptor(for body: Data) -> String {
        let givenAt = C15tJSON.parse(body)?["givenAt"]?.intValue ?? -1
        return "givenAt=" + String(givenAt)
    }

    /// The queue's own order, oldest first, on the wire.
    ///
    /// Compared on each body's last send rather than its first, because a test that
    /// staged its queue with failing sends has already put those bodies on the wire once
    /// before the pass under assertion started.
    func assertOldestFirst(_ bodies: Data...) {
        lock.lock()
        let seen = order
        lock.unlock()
        let positions = bodies.map { seen.lastIndex(of: $0) }
        XCTAssertTrue(positions.allSatisfy { $0 != nil }, "every entry has to reach the transport")
        XCTAssertEqual(
            positions.compactMap { $0 },
            positions.compactMap { $0 }.sorted(),
            "a pass replays oldest first"
        )
    }

    func send(_ request: HTTPRequest) async throws -> HTTPResponse {
        guard request.method == .post else { return initResponse }

        let body = request.body ?? Data()
        lock.lock()
        entered[body, default: 0] += 1
        openSends += 1
        order.append(body)
        let mustPark = _holdsSends
        lock.unlock()

        // The park suspends rather than blocking a pool thread, and it is bounded: a send
        // a test lost track of answers as an unreachable backend before that test's own
        // wait gives up, so the failure names the send that never opened instead of a hung
        // suite. Shorter than the assertion deadline on purpose, for the same reason.
        var failed = mustPark
        if mustPark {
            failed = await withCheckedContinuation { (continuation: CheckedContinuation<Bool, Never>) in
                let token = UUID()
                lock.lock()
                if _holdsSends {
                    parked[token] = continuation
                    lock.unlock()
                    Task { [weak self] in
                        try? await Task.sleep(nanoseconds: Self.gateNanos)
                        self?.timeOut(token)
                    }
                } else {
                    // Released between the check above and this one. Parking it anyway
                    // would hold a send whose release already happened.
                    lock.unlock()
                    continuation.resume(returning: false)
                }
            }
        }

        lock.lock()
        openSends -= 1
        answered[body, default: 0] += 1
        failed = failed || _savesFail
        results.append((body, failed ? 503 : 200))
        lock.unlock()
        return failed ? HTTPResponse(status: 503, body: Data("unavailable".utf8)) : .json("{}")
    }
}

/// Deterministic queue row ids, so a test can name the entries it is talking about.
private final class TestIDs: @unchecked Sendable {
    private let lock = NSLock()
    private var remaining: [String]

    init(_ ids: [String]) {
        remaining = ids
    }

    func next() -> String {
        lock.lock()
        defer { lock.unlock() }
        return remaining.isEmpty ? UUID().uuidString : remaining.removeFirst()
    }
}
