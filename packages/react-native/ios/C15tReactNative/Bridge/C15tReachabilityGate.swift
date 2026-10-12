import Foundation

/// Decides which connectivity updates are worth a queue replay.
///
/// `native/CONTRACT.md` asks for a replay when the process *gains* a network it did not
/// already have, and that is a transition rather than an event. `NWPathMonitor` reports
/// the path the process started with as soon as it starts, and replaying there races the
/// launch replay ``ConsentCore/bootstrap(_:)`` already performs. So the first delivery
/// only records the state, and a later one counts as a gain only once a loss has
/// separated it from that seed.
///
/// Both directions matter, and both are pinned by `C15tReachabilityGateTests`. A gate
/// that replays the seed duplicates a pass already under way. A gate that replays only
/// the first genuine gain leaves a subject's decision queued for the rest of a session
/// spent online, which is the failure this leg exists to prevent.
///
/// Deliberately free of `Network` types, exactly as `ReachabilityGate` is on Android:
/// the wrong answer here is silent — a queued save that simply never goes out, with
/// nothing in the snapshot to show why — and this is the half of the leg that can be
/// tested without a device and a link to drop.
public final class C15tReachabilityGate: @unchecked Sendable {
    private let lock = NSLock()
    private let onGained: @Sendable () -> Void
    private var seeded = false
    private var connected = false

    /// - Parameter onGained: called for each network the process newly gained, and never
    ///   for the one that was already up when monitoring started. Called outside the
    ///   gate's lock, so it may hand work to the core without holding a monitor queue
    ///   open.
    public init(onGained: @escaping @Sendable () -> Void) {
        self.onGained = onGained
    }

    /// The process has a network. The first such call seeds and replays nothing.
    public func onAvailable() {
        lock.lock()
        guard seeded else {
            seeded = true
            connected = true
            lock.unlock()
            return
        }
        let gained = !connected
        connected = true
        lock.unlock()

        if gained {
            onGained()
        }
    }

    /// The network this process had went away, so the next one is a gain.
    ///
    /// A loss is not itself worth a replay: there is nothing to send to while there is
    /// nowhere to send it. It seeds the gate too, so a monitor that starts offline and
    /// then comes online counts that as the gain it is.
    public func onLost() {
        lock.lock()
        seeded = true
        connected = false
        lock.unlock()
    }
}
