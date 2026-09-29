import Foundation

/// One save that has not reached the backend yet.
///
/// `body` is the serialized `POST /subjects` body, not a re-encodable model. That
/// is the point: a queued action is replayed as the exact bytes the subject
/// produced, so a policy that changes while the entry waits has nothing to
/// rewrite, and the backend derives the same consent id from the same `givenAt`.
struct PendingSaveEntry: Sendable, Codable, Equatable {
    /// Stable identity so a successful delivery removes its own entry and nothing
    /// else, even if the queue changed while the request was in flight.
    let id: String
    let subjectId: String
    /// `givenAt` of the action, from the body. Used only for ordering.
    let actionAt: Int64
    let queuedAt: Int64
    var attempts: Int
    let body: Data
}

/// What one replay pass did.
public struct ReplayReport: Sendable, Equatable {
    public let attempted: Int
    public let delivered: Int
    public let remaining: Int
    public let lastError: CoreErrorInfo?
    /// Whether the backend could not be reached for some part of this pass.
    ///
    /// The answer that decides whether reading the queue again is worth anything. A
    /// refusal says these bytes were read and turned away, so another read can find a
    /// different entry waiting and worth trying; an endpoint that never answered says the
    /// same thing about whatever else is queued, so a second read spends an attempt on
    /// every entry behind it to deliver nothing. See
    /// ``ConsentCore/requestDeliveryPass(ownSend:)``.
    public let transportUnreachable: Bool

    public init(
        attempted: Int,
        delivered: Int,
        remaining: Int,
        lastError: CoreErrorInfo? = nil,
        transportUnreachable: Bool = false
    ) {
        self.attempted = attempted
        self.delivered = delivered
        self.remaining = remaining
        self.lastError = lastError
        self.transportUnreachable = transportUnreachable
    }

    public static let empty = ReplayReport(attempted: 0, delivered: 0, remaining: 0)
}

/// What the queue decided to do with an entry after a delivery attempt failed.
///
/// The distinction that matters is between "still owed" and "no longer owed", so
/// every case other than ``retrying`` is one the caller has to announce. A queue
/// that releases a decision quietly is the state where a subject's consent exists
/// in the app's memory of itself and in nobody else's records.
enum FailedAttempt: Sendable, Equatable {
    /// Still queued, with one attempt spent.
    case retrying
    /// Released at the attempt ceiling.
    case droppedAfterAttempts(attempts: Int)
    /// Released because it waited longer than the queue's retention window.
    case droppedAsTooOld(queuedAt: Int64)
    /// Was not in the queue: another path delivered it, or a reset cleared it.
    case alreadyGone

    /// Whether this leaves the queue holding one fewer obligation.
    var dropsEntry: Bool {
        switch self {
        case .retrying, .alreadyGone: return false
        case .droppedAfterAttempts, .droppedAsTooOld: return true
        }
    }
}

/// Persists consent saves before they are sent, and replays them unchanged.
///
/// Order is the entire contract. Write, then send, then delete on success. A
/// process that dies at any point in that sequence either has the entry on disk
/// or has confirmation it arrived, so there is no window where a subject's
/// decision exists only in memory.
///
/// The lock covers the queue's own bookkeeping only. Network delivery happens
/// between locked operations, never inside one, so a hung request cannot block a
/// new consent action.
final class PendingSaveQueue: @unchecked Sendable {
    /// Newest payloads kept. Beyond this the oldest are dropped, which matches the
    /// web queue and keeps a permanently-failing backend from growing storage.
    static let maxEntries = 20

    /// An entry older than this is not worth delivering: the subject's decision is
    /// stale enough that a newer action, or a newer policy, will supersede it.
    static let maxAgeMs: Int64 = 7 * 24 * 60 * 60 * 1_000

    /// Past this many tries the entry is dropped. A backend that has refused a
    /// body ten times will not accept it on the eleventh.
    static let maxAttempts = 10

    private let store: any ConsentStore
    private let now: () -> Int64
    private let newID: () -> String
    private let lock = Lock()

    init(
        store: any ConsentStore,
        now: @escaping () -> Int64,
        newID: @escaping () -> String = { UUID().uuidString }
    ) {
        self.store = store
        self.now = now
        self.newID = newID
    }

    /// Persist a body and return its id. Returns `nil` when the write did not
    /// land, which the caller must treat as "do not send": sending something that
    /// is not durable would break the exactly-once story the queue exists for.
    @discardableResult
    func enqueue(body: Data, subjectId: String, actionAt: Int64) -> String? {
        let id = newID()
        let queuedAt = now()
        let wrote = lock.withLock {
            var entries = readEntries()
            entries.sort { left, right in
                left.actionAt == right.actionAt ? left.queuedAt < right.queuedAt : left.actionAt < right.actionAt
            }
            entries.append(PendingSaveEntry(
                id: id,
                subjectId: subjectId,
                actionAt: actionAt,
                queuedAt: queuedAt,
                attempts: 0,
                body: body
            ))
            // Newest 20 only, oldest dropped first.
            if entries.count > Self.maxEntries {
                entries.removeFirst(entries.count - Self.maxEntries)
            }
            return writeEntries(entries)
        }
        return wrote ? id : nil
    }

    /// Remove one entry after its body was accepted.
    func remove(id: String) {
        lock.withLock {
            let entries = readEntries().filter { $0.id != id }
            _ = writeEntries(entries)
        }
    }

    /// Everything waiting, oldest action first.
    func entries() -> [PendingSaveEntry] {
        lock.withLock { readEntries() }
    }

    func count() -> Int {
        entries().count
    }

    /// Whether this entry is still waiting to be delivered.
    ///
    /// A sender asks immediately before it sends, because its own copy of the entry can
    /// be older than this moment: a pass reads the queue once and delivers entry by
    /// entry, while the save that queued a body carries that one entry in hand, so
    /// either can still be holding a body the other has already landed. Re-sending it
    /// is the resend the contract in `native/CONTRACT.md` describes -- identical frozen
    /// bytes, same consent id, nothing in stored state moved -- and this queue is the
    /// only record of what is owed.
    func isPending(id: String) -> Bool {
        lock.withLock { readEntries().contains { $0.id == id } }
    }

    /// Drop every entry, for a subject reset.
    func clear() {
        lock.withLock { _ = writeEntries([]) }
    }

    /// Account for a delivery attempt that did not land.
    ///
    /// Every failed send spends an attempt, whether it came from the save that queued
    /// the body or from a later replay. Without that, the attempt ceiling is only ever
    /// reached by replays, so a body a transport refuses on the first try stays queued
    /// across launches forever, which is the state where a consent decision looks
    /// delivered to everyone and is remembered by nothing.
    ///
    /// Age and attempt limits are enforced here, at the moment a delivery fails,
    /// rather than on read, so a live read never silently drops something the caller is
    /// about to send.
    ///
    /// - Returns: what the queue did with the entry, including which ceiling released
    ///   it. The reason is part of the answer rather than a detail: an entry that ran
    ///   out of attempts and an entry that went stale are two different things to
    ///   debug, and the caller only gets one line to say it in.
    @discardableResult
    func recordFailedAttempt(id: String) -> FailedAttempt {
        let cutoff = now() - Self.maxAgeMs
        return lock.withLock {
            var entries = readEntries()
            guard let index = entries.firstIndex(where: { $0.id == id }) else { return .alreadyGone }
            entries[index].attempts += 1
            let entry = entries[index]

            if entry.attempts >= Self.maxAttempts {
                entries.remove(at: index)
                _ = writeEntries(entries)
                return .droppedAfterAttempts(attempts: entry.attempts)
            }
            if entry.queuedAt < cutoff {
                entries.remove(at: index)
                _ = writeEntries(entries)
                return .droppedAsTooOld(queuedAt: entry.queuedAt)
            }

            _ = writeEntries(entries)
            return .retrying
        }
    }

    /// Send everything waiting, in save order.
    ///
    /// Entries are read once, then delivered one at a time so order is preserved
    /// and a flaky endpoint is not burst-attacked. Each result is applied to a
    /// freshly-read queue, so an action taken during a replay is never clobbered.
    ///
    /// An entry the queue no longer holds is skipped rather than sent. The caller is
    /// expected to hold the core's delivery pass, which is what makes "gone" mean
    /// "already landed" instead of "someone cleared it" -- see
    /// ``ConsentCore/requestDeliveryPass(ownSend:)``.
    ///
    /// - Parameters:
    ///   - onResult: called per entry, so the core can emit an event for each replay
    ///     rather than one for the pass.
    ///   - onDrop: called when an entry leaves this queue with its body still
    ///     unaccepted, with the error that spent its last allowance. A pass that
    ///     reports only what it delivered leaves the caller to assume the rest is
    ///     still waiting, which is exactly the wrong assumption to make about a
    ///     decision that has just stopped being owed.
    func replay(
        using transport: any C15tTransport,
        onResult: ((PendingSaveEntry, Result<Void, C15tError>) -> Void)? = nil,
        onDrop: ((PendingSaveEntry, C15tError, FailedAttempt) -> Void)? = nil
    ) async -> ReplayReport {
        let pending = entries()
        guard !pending.isEmpty else { return .empty }

        var attempted = 0
        var delivered = 0
        var lastError: CoreErrorInfo?
        var unreachable = false

        for entry in pending {
            // Asked last, immediately before the send, because the read that brought
            // this entry here is older than this moment. A body another sender already
            // landed is not this pass's to send: the frozen bytes carry the same
            // consent id, so the backend would dedupe it and the only evidence that it
            // ever happened is one more POST than the subject's decision called for.
            guard isPending(id: entry.id) else { continue }
            attempted += 1

            let result = await transport.sendSave(entry.body)
            switch result {
            case .success:
                delivered += 1
                remove(id: entry.id)
            case let .failure(error):
                lastError = error.info
                // Anything the producer did not decide by reading the body says the
                // endpoint is the problem rather than these bytes.
                if !error.isPermanentlyRejected {
                    unreachable = true
                }
                let outcome = recordFailedAttempt(id: entry.id)
                if outcome.dropsEntry {
                    onDrop?(entry, error, outcome)
                }
            }
            onResult?(entry, result)
        }

        return ReplayReport(
            attempted: attempted,
            delivered: delivered,
            remaining: count(),
            lastError: lastError,
            transportUnreachable: unreachable
        )
    }

    // MARK: - Storage

    /// Read without validating every field. Callers get entries the queue itself
    /// wrote; a queue file that does not decode is treated as empty and replaced,
    /// which denies a replay rather than guessing at a body.
    private func readEntries() -> [PendingSaveEntry] {
        guard let data = store.data(for: StorageKey.pendingSaves) else { return [] }
        guard let entries = try? C15tJSON.decode([PendingSaveEntry].self, from: data) else {
            return []
        }
        return entries.sorted { left, right in
            left.actionAt == right.actionAt ? left.queuedAt < right.queuedAt : left.actionAt < right.actionAt
        }
    }

    private func writeEntries(_ entries: [PendingSaveEntry]) -> Bool {
        guard !entries.isEmpty else {
            store.set(nil, for: StorageKey.pendingSaves)
            return true
        }
        return store.encode(entries, for: StorageKey.pendingSaves)
    }
}
