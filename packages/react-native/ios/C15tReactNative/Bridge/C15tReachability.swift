import Foundation
import Network

/// Replays the pending consent queue when the process gains a network it did not have.
///
/// This is the narrowest of the three lifecycle legs in `native/CONTRACT.md`, and on iOS
/// the unconditional one. The contract's permission-decline clause is Android-only, and
/// the reason is literal: `ACCESS_NETWORK_STATE` belongs to the application, so an SDK
/// that wrote it into every host's manifest would spend the maintainer's privacy surface
/// on one wake-up. `NWPathMonitor` needs no entitlement, no usage-description key and no
/// manifest entry, so there is nothing here for a device to refuse and no branch that
/// carries on without the leg.
///
/// The decision about which updates mean anything lives in ``C15tReachabilityGate``. This
/// type only translates `NWPath` into the two words the gate understands.
///
/// Updates arrive on this monitor's own serial queue rather than the main thread, and
/// what ``C15tReactNativeBootstrap`` hands the callback is ``ConsentCore/flushPending()``,
/// which is itself a handoff to the core's scheduler. Coming back online therefore costs
/// no frame, which is what the contract asks of every lifecycle leg.
public final class C15tReachability: @unchecked Sendable {
    private let lock = NSLock()
    private let monitor: NWPathMonitor
    private var unregistered = false

    private init(monitor: NWPathMonitor) {
        self.monitor = monitor
    }

    /// Start listening for network gains.
    ///
    /// Safe to call from any thread and before the core is running: the monitor reports
    /// the path the process already has as its first update, so registering early seeds
    /// the gate rather than replaying anything.
    ///
    /// - Parameter onGained: called once per newly gained network, never for the one that
    ///   was already up at registration. Runs on the monitor's queue.
    /// - Returns: the handle to keep. Dropping it does not stop the monitor, so the
    ///   caller holds it for as long as the core is running and calls
    ///   ``unregister()`` when it wants the leg off.
    public static func register(onGained: @escaping @Sendable () -> Void) -> C15tReachability {
        let monitor = NWPathMonitor()
        let gate = C15tReachabilityGate(onGained: onGained)
        let queue = DispatchQueue(label: "com.c15t.reachability", qos: .utility)

        // A path that changes interface without ever becoming unsatisfied — Wi-Fi to
        // cellular, or a new address on the same link — is one of these updates with the
        // status unchanged, which is why the gate dedupes on the transition and not on the
        // callback count.
        monitor.pathUpdateHandler = { path in
            if path.status == .satisfied {
                gate.onAvailable()
            } else {
                gate.onLost()
            }
        }
        monitor.start(queue: queue)
        return C15tReachability(monitor: monitor)
    }

    /// Stop listening. Calling this twice, or from two threads, cancels the monitor once.
    public func unregister() {
        lock.lock()
        guard !unregistered else {
            lock.unlock()
            return
        }
        unregistered = true
        lock.unlock()

        monitor.cancel()
    }
}
