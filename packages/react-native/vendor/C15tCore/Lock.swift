import Foundation

/// A mutual-exclusion lock whose only job is to make "never held across I/O"
/// checkable by shape.
///
/// ``withLock(_:)`` takes a *synchronous* closure, so it is not expressible to
/// await a network call or read a file while holding it. Every type that owns one
/// of these guards in-memory state only; anything that touches disk goes through
/// ``ConsentStore``, which owns its own.
final class Lock: Sendable {
    private let lock = NSLock()

    func withLock<Result>(_ body: () -> Result) -> Result {
        lock.lock()
        defer { lock.unlock() }
        return body()
    }
}
