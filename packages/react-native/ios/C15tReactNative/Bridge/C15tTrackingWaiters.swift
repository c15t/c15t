import Foundation

/// The tracking requests waiting on the one Apple call in flight.
///
/// Apple answers a tracking request once per call, and nothing stops two surfaces in a host
/// app from asking at the same moment: a settings screen and an onboarding sheet both
/// reaching for tracking is an ordinary app rather than a corner case. Left to itself each
/// caller makes its own request, and then Apple's own rule about a pending request decides
/// what the subject sees, which is usually one prompt and one answer that lands with only
/// one of the two callers while the other waits for a callback that is never coming. So the
/// first caller asks Apple and the rest attach to that answer.
///
/// The flight is cleared *before* the waiters run, not after, and that ordering is the part
/// worth a paragraph. Apple's Additional Information button answers `notDetermined` with
/// stage `additional-information`, and the caller's correct next move is to ask again once
/// it has shown the subject whatever the button was for. A flight still marked busy at that
/// instant would attach the retry to a call that had already been and gone, so the subject
/// would finish their choices and nothing would ever be asked again.
///
/// `@unchecked Sendable` because the lock is the whole story: every read and write of
/// `waiters` happens under it, and the array never leaves the critical section except as a
/// local copy that this call then owns outright.
public final class C15tTrackingWaiters: @unchecked Sendable {
    private let lock = NSLock()
    private var waiters: [(Result<C15tTrackingRequestResult, C15tBridgeError>) -> Void] = []

    /// Add a request to the flight.
    ///
    /// - Parameter completion: Runs with the same answer as every other request in this
    ///   flight, or immediately if the gate turned the request away before Apple was asked.
    /// - Returns: `true` when this request owns the flight and its caller must ask Apple;
    ///   `false` when it attached to a call already in flight and must ask for nothing.
    public func acquire(
        _ completion: @escaping (Result<C15tTrackingRequestResult, C15tBridgeError>) -> Void
    ) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        let startsFlight = waiters.isEmpty
        waiters.append(completion)
        return startsFlight
    }

    /// Give one answer to everyone waiting, then open the flight for the next request.
    public func deliver(_ result: Result<C15tTrackingRequestResult, C15tBridgeError>) {
        lock.lock()
        let pending = waiters
        waiters = []
        lock.unlock()

        for completion in pending {
            completion(result)
        }
    }
}

/// One boolean that has to outlive the function that set it.
///
/// Apple hands the Additional Information closure to the request and runs it whenever the
/// subject taps the button, which is after the function that made the request has returned.
/// The request needs to remember that the tap happened so it can report the stage honestly
/// when Apple's completion arrives a moment later, and a plain `var` cannot survive that.
///
/// Both writes go through the lock because Apple runs the action closure and the completion
/// handler on threads this package does not choose.
final class C15tTrackingFlag: @unchecked Sendable {
    private let lock = NSLock()
    private var value = false

    /// Record that the event happened. Repeated taps record once, which is all the stage
    /// needs to know.
    func set() {
        lock.lock()
        value = true
        lock.unlock()
    }

    var isSet: Bool {
        lock.lock()
        defer { lock.unlock() }
        return value
    }
}
