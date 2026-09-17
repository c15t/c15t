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

    public init(
        attempted: Int,
        delivered: Int,
        remaining: Int,
        lastError: CoreErrorInfo? = nil
    ) {
        self.attempted = attempted
        self.delivered = delivered
        self.remaining = remaining
        self.lastError = lastError
    }

    public static let empty = ReplayReport(attempted: 0, delivered: 0, remaining: 0)
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

    /// Drop every entry, for a subject reset.
    func clear() {
        lock.withLock { _ = writeEntries([]) }
    }

    /// Send everything waiting, in save order.
    ///
    /// Entries are read once, then delivered one at a time so order is preserved
    /// and a flaky endpoint is not burst-attacked. Each result is applied to a
    /// freshly-read queue, so an action taken during a replay is never clobbered.
    ///
    /// - Parameter onResult: called per entry, so the core can emit an event for
    ///   each replay rather than one for the pass.
    func replay(
        using transport: any C15tTransport,
        onResult: ((PendingSaveEntry, Result<Void, C15tError>) -> Void)? = nil
    ) async -> ReplayReport {
        let pending = entries()
        guard !pending.isEmpty else { return .empty }

        var delivered = 0
        var lastError: CoreErrorInfo?

        for entry in pending {
            let result = await transport.sendSave(entry.body)
            switch result {
            case .success:
                delivered += 1
                remove(id: entry.id)
            case let .failure(error):
                lastError = error.info
                bumpAttempts(id: entry.id)
            }
            onResult?(entry, result)
        }

        return ReplayReport(
            attempted: pending.count,
            delivered: delivered,
            remaining: count(),
            lastError: lastError
        )
    }

    // MARK: - Storage

    private func bumpAttempts(id: String) {
        let cutoff = now() - Self.maxAgeMs
        lock.withLock {
            var entries = readEntries()
            guard let index = entries.firstIndex(where: { $0.id == id }) else { return }
            entries[index].attempts += 1
            // Age and attempt limits are enforced here, at the moment a delivery
            // fails, rather than on read, so a live read never silently drops
            // something the caller is about to send.
            if entries[index].attempts >= Self.maxAttempts || entries[index].queuedAt < cutoff {
                entries.remove(at: index)
            }
            _ = writeEntries(entries)
        }
    }

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
