import Foundation

/// Something worth telling the host about.
///
/// `snapshot` carries only the new revision. A binding layer pulls the snapshot
/// itself when a mounted subscriber actually needs it, which keeps a consent
/// change from serializing a 23-field object once per listener.
public enum CoreEvent: Sendable, Equatable {
    /// Bootstrap finished: hydration is done and `snapshot()` is answerable.
    case initialized
    /// State changed.
    case snapshot(revision: Int)
    /// A transport or configuration failure.
    case error(CoreErrorInfo)
    /// A save was written to disk and is waiting to be delivered.
    case saveQueued(subjectId: String)
    /// A save reached the backend and left the queue.
    case saveDelivered(subjectId: String)
    /// A queued save was retried. `ok` is the outcome of this attempt.
    case saveReplayed(subjectId: String, ok: Bool)
}

/// A snapshot observer.
///
/// Held weakly, so a view model can register itself without a matching call to
/// unregister. An observer that is still alive but no longer interested must
/// remove itself using the returned token.
public protocol SnapshotObserver: AnyObject {
    /// Called on an arbitrary queue, off the main thread unless the host arranges
    /// otherwise. UI layers must hop.
    func consentDidChange(_ snapshot: ConsentSnapshot)
}

/// Fan-out for ``CoreEvent``.
///
/// Each subscriber gets its own `AsyncStream`, so a slow consumer backpressures
/// itself and does not stall the core or its peers.
final class EventHub: @unchecked Sendable {
    private let lock = Lock()
    private var continuations: [UUID: AsyncStream<CoreEvent>.Continuation] = [:]

    /// A stream of events from the moment this is called.
    ///
    /// - Parameter onTerminate: called when the consumer stops the stream, so a
    ///   per-category gate can drop its own state.
    func stream(onTerminate: (() -> Void)? = nil) -> AsyncStream<CoreEvent> {
        let id = UUID()
        let stream = AsyncStream<CoreEvent> { continuation in
            self.register(id: id, continuation: continuation)
            continuation.onTermination = { _ in
                self.unregister(id: id)
                onTerminate?()
            }
        }
        return stream
    }

    func emit(_ event: CoreEvent) {
        // Copy the continuations out first: yielding runs consumer code, and a
        // consumer that unsubscribes must not be able to deadlock the core.
        let targets = lock.withLock { Array(continuations.values) }
        for continuation in targets {
            continuation.yield(event)
        }
    }

    /// Number of live consumers. Exposed so a test can prove a terminated stream
    /// actually released its slot.
    var subscriberCount: Int {
        lock.withLock { continuations.count }
    }

    private func register(id: UUID, continuation: AsyncStream<CoreEvent>.Continuation) {
        lock.withLock {
            continuations[id] = continuation
        }
    }

    private func unregister(id: UUID) {
        lock.withLock {
            continuations.removeValue(forKey: id)
            ()
        }
    }
}

/// A live registration.
///
/// Cancelling is idempotent, and a token that is released without being cancelled
/// still unsubscribes: a view model that forgets to tear down should leak its own
/// state, not a permanent subscription on a core that outlives the app's screens.
public final class ConsentSubscription: @unchecked Sendable {
    private let lock = Lock()
    private var handlers: [() -> Void] = []
    private var cancelled = false

    init() {}

    /// Add a teardown step. Every registered step runs on cancel, in order.
    func addHandler(_ handler: @escaping () -> Void) {
        let shouldRun = lock.withLock {
            guard !cancelled else { return true }
            handlers.append(handler)
            return false
        }
        if shouldRun { handler() }
    }

    /// Stop receiving updates. Safe to call more than once.
    public func cancel() {
        let pending: [() -> Void] = lock.withLock {
            guard !cancelled else { return [] }
            cancelled = true
            let pending = handlers
            handlers = []
            return pending
        }
        for handler in pending {
            handler()
        }
    }

    deinit {
        cancel()
    }
}

/// Weak observer set.
///
/// Weak by requirement: a core lives for the whole process, and an observer set
/// that retained its members would keep every screen that ever showed a banner
/// alive after it was dismissed.
final class ObserverSet: @unchecked Sendable {
    private struct Registration {
        let id: UUID
        weak var observer: SnapshotObserver?
    }

    private let lock = Lock()
    private var registrations: [Registration] = []

    /// Register an observer. Re-registering the same instance does not double
    /// fire, which matters for a view model that can be attached twice.
    @discardableResult
    func add(_ observer: SnapshotObserver) -> ConsentSubscription {
        let registration = Registration(id: UUID(), observer: observer)
        let subscription = ConsentSubscription()
        subscription.addHandler { [weak self] in self?.remove(id: registration.id) }
        lock.withLock {
            registrations.removeAll { $0.observer == nil || $0.observer === observer }
            registrations.append(registration)
        }
        return subscription
    }

    func remove(id: UUID) {
        lock.withLock { registrations.removeAll { $0.id == id } }
    }

    /// Deliver to whoever is still alive. Dead observers are collected on the way
    /// through, so the set does not grow with the app's history.
    func notify(_ snapshot: ConsentSnapshot) {
        let observers = lock.withLock {
            registrations.removeAll { $0.observer == nil }
            return registrations.compactMap(\.observer)
        }
        for observer in observers {
            observer.consentDidChange(snapshot)
        }
    }

    var count: Int {
        lock.withLock {
            registrations.removeAll { $0.observer == nil }
            return registrations.count
        }
    }
}
