import Foundation
import XCTest

@testable import C15tReactNativeBridge

/// Which connectivity updates earn a queue replay.
///
/// Both directions matter, and neither is reachable from a snapshot, so this is the only
/// place the rule is checked without a device and a cable to unplug. The four cases below
/// are the same four `ReachabilityGateTest` pins on Android.
final class C15tReachabilityGateTests: XCTestCase {
    /// Counts the replays the gate decided to start.
    private final class Recorder: @unchecked Sendable {
        private let lock = NSLock()
        private var _gains = 0

        var gains: Int {
            lock.lock()
            defer { lock.unlock() }
            return _gains
        }

        var onGained: @Sendable () -> Void {
            { [weak self] in
                self?.record()
            }
        }

        private func record() {
            lock.lock()
            _gains += 1
            lock.unlock()
        }
    }

    func testTheNetworkAlreadyUpAtRegistrationIsNotAGain() {
        let seen = Recorder()
        let gate = C15tReachabilityGate(onGained: seen.onGained)

        // `NWPathMonitor` delivers the current path as its first update, and the launch
        // replay inside `bootstrap` is already running or already ran.
        gate.onAvailable()

        XCTAssertEqual(seen.gains, 0, "seeding is not gaining")
    }

    /// The same seed rule one layer up, through a real `NWPathMonitor`.
    ///
    /// This is the half of the leg that turns an `NWPath` into a gate call, and it holds
    /// whichever way the host's link points: a connected machine seeds with a satisfied
    /// path, an offline one seeds with a loss, and neither is a gain. Which one a given
    /// machine delivers is not the assertion, so this does not need a link to unplug.
    func testAMonitorNeverReplaysForThePathTheProcessStartedWith() {
        let seen = Recorder()
        let monitor = C15tReachability.register(onGained: seen.onGained)

        // Long enough for the initial delivery, which `NWPathMonitor` makes on its own
        // queue rather than inline with `start(queue:)`.
        Thread.sleep(forTimeInterval: 0.5)
        monitor.unregister()
        monitor.unregister()

        XCTAssertEqual(seen.gains, 0, "the state this process started in is not something it gained")
    }

    func testANetworkThatArrivesAfterALossIsAGain() {
        let seen = Recorder()
        let gate = C15tReachabilityGate(onGained: seen.onGained)

        gate.onAvailable()
        gate.onLost()
        gate.onAvailable()

        XCTAssertEqual(seen.gains, 1)
    }

    func testALinkThatFlapsWithoutDroppingDoesNotReplayTwice() {
        let seen = Recorder()
        let gate = C15tReachabilityGate(onGained: seen.onGained)

        // Wi-Fi to cellular, or a new address on the same link: repeated satisfied
        // updates with no loss between them, which is one event and not three.
        gate.onAvailable()
        gate.onAvailable()
        gate.onAvailable()

        XCTAssertEqual(seen.gains, 0)
    }

    func testEveryRealGainReplaysAndNotJustTheFirst() {
        let seen = Recorder()
        let gate = C15tReachabilityGate(onGained: seen.onGained)

        for _ in 0..<3 {
            gate.onLost()
            gate.onAvailable()
        }

        XCTAssertEqual(
            seen.gains, 3,
            "a gate that fires once and then goes quiet leaves a decision queued for the "
                + "rest of a session spent online"
        )
    }

    func testLosingANetworkReplaysNothing() {
        let seen = Recorder()
        let gate = C15tReachabilityGate(onGained: seen.onGained)

        gate.onLost()

        XCTAssertEqual(seen.gains, 0, "there is nowhere to send it while it is down")
    }

    func testAMonitorThatStartsOfflineCountsTheFirstConnectionAsAGain() {
        let seen = Recorder()
        let gate = C15tReachabilityGate(onGained: seen.onGained)

        // The app launched with the link already down, so the first update is a loss and
        // there is nothing to race. Coming online here is a real gain and has to be
        // treated as one, even though no seed update ever arrived.
        gate.onLost()
        gate.onAvailable()

        XCTAssertEqual(seen.gains, 1)
    }
}
