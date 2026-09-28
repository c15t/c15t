import C15tCore
import Foundation
import XCTest

@testable import C15tReactNativeBridge

/// The foreground leg, from the cheapest distance to each way it can be wrong.
///
/// The first group is the observer alone: registered once, un-registered on demand, and
/// nothing running before it is asked to. The second group is the leg wired to a real
/// ``ConsentCore`` through the bridge's own startup path, which is the half that catches a
/// bridge that arms nothing at all — the exact gap this leg was written to close.
final class C15tForegroundObserverTests: XCTestCase {
    /// A name of our own, so the observer-only tests do not depend on a Mac deciding to
    /// activate an application.
    private let activation = Notification.Name("c15t.tests.foreground")

    override func setUp() {
        super.setUp()
        // These observers are process-wide, so a handle left behind by another test file
        // would answer this one's notifications.
        C15tReactNativeBootstrap.shutdown()
        C15t.resetForTests()
    }

    override func tearDown() {
        C15tReactNativeBootstrap.shutdown()
        C15t.resetForTests()
        super.tearDown()
    }

    // MARK: - The observer

    func testOneActivationRunsTheForegroundWorkOnce() {
        let seen = Recorder()
        let observer = C15tForegroundObserver(onForeground: seen.onForeground, notification: activation)
        observer.install()

        NotificationCenter.default.post(name: activation, object: nil)

        XCTAssertEqual(seen.calls, 1)
        observer.uninstall()
    }

    func testInstallingTwiceStillRunsTheWorkOncePerActivation() {
        let seen = Recorder()
        let observer = C15tForegroundObserver(onForeground: seen.onForeground, notification: activation)

        // Every entry point that starts a core calls `install()`, and the launch hook plus
        // a host that starts the core itself means that can be several times.
        observer.install()
        observer.install()
        observer.install()

        NotificationCenter.default.post(name: activation, object: nil)

        XCTAssertEqual(seen.calls, 1, "repeated installs must not stack replays per activation")
        observer.uninstall()
    }

    func testNothingRunsBeforeInstallAndNothingAfterUninstall() {
        let seen = Recorder()
        let observer = C15tForegroundObserver(onForeground: seen.onForeground, notification: activation)

        NotificationCenter.default.post(name: activation, object: nil)
        XCTAssertEqual(seen.calls, 0)

        observer.install()
        XCTAssertTrue(observer.isInstalled)
        NotificationCenter.default.post(name: activation, object: nil)
        XCTAssertEqual(seen.calls, 1)

        observer.uninstall()
        observer.uninstall()
        XCTAssertFalse(observer.isInstalled)
        NotificationCenter.default.post(name: activation, object: nil)
        XCTAssertEqual(seen.calls, 1, "an uninstalled observer must go quiet")
    }

    func testADroppedObserverStopsListening() {
        let seen = Recorder()
        var observer: C15tForegroundObserver? = C15tForegroundObserver(
            onForeground: seen.onForeground,
            notification: activation
        )
        observer?.install()

        // `NotificationCenter` holds the registration block for as long as it exists, so a
        // block that reached `self` would keep the observer alive, keep the registration
        // alive with it, and leave a wake-up nobody owns.
        observer = nil

        NotificationCenter.default.post(name: activation, object: nil)
        XCTAssertEqual(seen.calls, 0, "installing must not retain the observer")
    }

    // MARK: - The leg the bridge arms

    func testActivationReplaysAQueuedSaveAndRefreshesPolicy() async {
        let (core, http) = await armedCore()
        http.savesFail = true

        XCTAssertEqual(core.save(.all).status, .committed)
        await core.waitUntilIdle()
        XCTAssertEqual(core.pendingSaveCount(), 1, "the device owes a decision it could not deliver")

        http.savesFail = false
        let savesBefore = http.saveCount
        let initsBefore = http.initCount

        // The production name, not the test one: this is the registration the launch hook
        // installs, so posting anything else would prove nothing about it.
        NotificationCenter.default.post(name: C15tForegroundObserver.didBecomeActive, object: nil)
        await core.waitUntilIdle()

        XCTAssertEqual(core.pendingSaveCount(), 0, "coming back delivered what launch could not")
        XCTAssertGreaterThan(http.saveCount, savesBefore, "and it went out on this activation")
        XCTAssertEqual(http.initCount, initsBefore + 1, "policy was asked about once, not twice")
    }

    func testASecondStartDoesNotDoubleTheForegroundLeg() async {
        let (core, http) = await armedCore()

        // The launch hook and the module's `ensureCore()` both reach startup, and they are
        // allowed to.
        XCTAssertTrue(C15tReactNativeBootstrap.start(configuration: memoryConfiguration()))
        let initsBefore = http.initCount

        NotificationCenter.default.post(name: C15tForegroundObserver.didBecomeActive, object: nil)
        await core.waitUntilIdle()

        XCTAssertEqual(http.initCount, initsBefore + 1, "one registration asks once")
    }

    func testShutdownTakesTheLegOffAndAStartPutsItBack() async {
        let (core, http) = await armedCore()
        http.savesFail = true
        XCTAssertEqual(core.save(.all).status, .committed)
        await core.waitUntilIdle()

        C15tReactNativeBootstrap.shutdown()
        let initsBefore = http.initCount

        NotificationCenter.default.post(name: C15tForegroundObserver.didBecomeActive, object: nil)
        await core.waitUntilIdle()

        XCTAssertEqual(http.initCount, initsBefore, "a host that opted out is not woken")
        XCTAssertEqual(core.pendingSaveCount(), 1, "and nothing was replayed behind its back")

        http.savesFail = false
        XCTAssertTrue(C15tReactNativeBootstrap.install(core))
        NotificationCenter.default.post(name: C15tForegroundObserver.didBecomeActive, object: nil)
        await core.waitUntilIdle()

        XCTAssertEqual(core.pendingSaveCount(), 0, "starting again re-arms both legs")
    }

    // MARK: - Helpers

    /// A core that started, answered one init, and was adopted through the bridge's own
    /// install path, which is the call that arms the lifecycle legs.
    private func armedCore() async -> (ConsentCore, RecordingTransport) {
        let http = RecordingTransport()
        let core = ConsentCore()
        core.bootstrap(CoreConfig(
            store: InMemoryStore(),
            transport: http,
            // One init per `refresh`, so an init count says how often the core was asked
            // rather than how often it retried.
            initRetry: .disabled
        ))
        await core.waitUntilIdle()
        XCTAssertFalse(core.snapshot().policyPending, "a save needs a scope to be made against")
        XCTAssertTrue(C15tReactNativeBootstrap.install(core))
        return (core, http)
    }

    /// Counts the activations that reached the observer.
    private final class Recorder: @unchecked Sendable {
        private let lock = NSLock()
        private var _calls = 0

        var calls: Int {
            lock.lock()
            defer { lock.unlock() }
            return _calls
        }

        var onForeground: @Sendable () -> Void {
            { self.record() }
        }

        private func record() {
            lock.lock()
            _calls += 1
            lock.unlock()
        }
    }
}
