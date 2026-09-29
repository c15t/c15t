import Foundation
#if canImport(UIKit)
    import UIKit
#elseif canImport(AppKit)
    import AppKit
#endif

/// Replays the offline queue and refreshes policy each time the app comes back.
///
/// ``ConsentCore/bootstrap(_:)`` covers the launch leg. This covers the foreground leg,
/// and it exists for the device that spent the night offline: a decision is waiting to be
/// delivered and a notice may have aged out, and an app that is merely sitting in memory
/// has no reason to ask about either until it is opened again.
///
/// The two things it does are ordered, because the contract orders them: replay the
/// pending queue, then re-resolve policy. Both are calls whose body is a handoff to the
/// core's own scheduler, which is the whole reason this observer needs no worker of its
/// own. The Android observer hands the replay to an executor first, and it has to:
/// `HttpURLConnection` refuses a connection made from a lifecycle callback, so a replay
/// run there reports "unreachable" and the queue silently stays queued. Swift's
/// `ConsentCore/flushPending()` and `ConsentCore/refresh()` return as soon as they have
/// put the work on a scheduler that is never the caller's thread, so the callback body
/// here is two returns and costs no frame. A seam to hand these two calls to something
/// else would be a second scheduler over work that already has one.
///
/// ``didBecomeActive`` rather than `willEnterForeground`: an app resumed from the app
/// switcher is the case this leg is for, and it arrives as an activation. The cost of
/// that choice is a transient activation — pulling down Notification Center, dismissing a
/// system alert — which spends one `/init` on a queue that is usually empty. That is the
/// contract's own foreground obligation, paid slightly early, and it is cheaper than the
/// stale notice it prevents.
///
/// No timer belongs anywhere near this. The contract forbids a core that wakes itself on
/// a cadence, because whatever it decides at an arbitrary minute is an answer the policy
/// never gave.
public final class C15tForegroundObserver: @unchecked Sendable {
    private let lock = NSLock()
    private let onForeground: @Sendable () -> Void
    private let notification: Notification.Name
    private var token: (any NSObjectProtocol)?

    /// - Parameters:
    ///   - onForeground: what to do each time the app comes back. ``C15tReactNativeBootstrap``
    ///     passes the queue replay and the policy refresh; a test passes a recorder.
    ///   - notification: the name that means the app came back. Overridable so the
    ///     observer can be driven from ``Foundation/NotificationCenter`` in a test that has
    ///     no app to activate.
    public init(
        onForeground: @escaping @Sendable () -> Void,
        notification: Notification.Name = C15tForegroundObserver.didBecomeActive
    ) {
        self.onForeground = onForeground
        self.notification = notification
    }

    /// Whether this observer is currently registered.
    public var isInstalled: Bool {
        lock.lock()
        defer { lock.unlock() }
        return token != nil
    }

    /// Start watching. Repeated calls register once, which is what lets every entry point
    /// that starts a core call it without an owner.
    public func install() {
        // Capture the closure rather than `self`: `NotificationCenter` keeps the block
        // until it is removed, so a block that reached `self` would keep this observer
        // alive past the point its handle was dropped, and ``uninstall()`` from `deinit`
        // would never run.
        let work = onForeground
        lock.lock()
        guard token == nil else {
            lock.unlock()
            return
        }
        lock.unlock()

        let installed = NotificationCenter.default.addObserver(
            forName: notification,
            object: nil,
            queue: nil
        ) { _ in
            work()
        }

        lock.lock()
        // Two threads can both pass the guard above. The loser un-registers its own
        // registration rather than leaving two replays wired to one activation.
        guard token == nil else {
            lock.unlock()
            NotificationCenter.default.removeObserver(installed)
            return
        }
        token = installed
        lock.unlock()
    }

    /// Stop watching. Calling this twice, or without ever installing, is harmless.
    public func uninstall() {
        lock.lock()
        let registered = token
        token = nil
        lock.unlock()

        guard let registered else { return }
        NotificationCenter.default.removeObserver(registered)
    }

    /// The notification that means the app is in front of the user again.
    ///
    /// The AppKit spelling exists so this type compiles, and its observer can be driven,
    /// under `swift test` on macOS. An iOS build resolves the UIKit branch and never sees
    /// the other one.
    public static var didBecomeActive: Notification.Name {
        #if canImport(UIKit)
            UIApplication.didBecomeActiveNotification
        #elseif canImport(AppKit)
            NSApplication.didBecomeActiveNotification
        #else
            Notification.Name("NSApplicationDidBecomeActiveNotification")
        #endif
    }

    deinit {
        uninstall()
    }
}
