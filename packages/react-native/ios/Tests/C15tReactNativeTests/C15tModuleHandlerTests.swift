@testable import C15tReactNativeBridge
import C15tCore
import XCTest

/// The handler is what the TurboModule forwards to, so these cover the answers the
/// JavaScript layer can actually observe: what comes back before a core exists, and
/// what a bad payload does to a durable audit trail.
final class C15tModuleHandlerTests: XCTestCase {
    private final class StartCounter: @unchecked Sendable {
        private let lock = NSLock()
        private var calls = 0
        let shouldStart: Bool

        init(shouldStart: Bool) { self.shouldStart = shouldStart }

        var value: Int {
            lock.lock()
            defer { lock.unlock() }
            return calls
        }

        func call() -> Bool {
            lock.lock()
            calls += 1
            lock.unlock()
            guard shouldStart else { return false }
            return C15tReactNativeBootstrap.start(configuration: memoryConfiguration())
        }
    }

    override func setUp() {
        super.setUp()
        C15t.resetForTests()
    }

    override func tearDown() {
        C15t.resetForTests()
        super.tearDown()
    }

    func testBootstrapStillAnswersTheHandshakeWithNoCore() {
        let counter = StartCounter(shouldStart: false)
        let payload = jsonObject(C15tModuleHandler(startCore: counter.call).bootstrapPayload())

        // Deny-all plus a real protocol version, so the provider can fail with a
        // readable message rather than on a missing field.
        XCTAssertEqual(payload["protocolVersion"] as? Int, 1)
        XCTAssertEqual(payload["hasStoredSnapshot"] as? Bool, false)
        assertJSONNull(payload, "subjectId")
    }

    func testUnreadableIntentIsRefusedBeforeTheCoreIsTouched() {
        let counter = StartCounter(shouldStart: true)

        let payload = jsonObject(C15tModuleHandler(startCore: counter.call).commitPayload(intent: "not json"))

        XCTAssertEqual(payload["ok"] as? Bool, false)
        XCTAssertEqual(payload["reason"] as? String, "invalid-intent")
        XCTAssertEqual(counter.value, 0, "a commit this build cannot read must not reach the core")
    }

    func testCommitReportsNotBootstrappedWhenTheAppOptedOutOfStartup() {
        let counter = StartCounter(shouldStart: false)

        let payload = jsonObject(C15tModuleHandler(startCore: counter.call).commitPayload(intent: #"{"action":"all"}"#))

        XCTAssertEqual(payload["ok"] as? Bool, false)
        XCTAssertEqual(payload["reason"] as? String, "not-bootstrapped")
        XCTAssertEqual(counter.value, 1, "the opt-out is respected, not retried per call")
    }

    func testCommitIsRefusedWhileThePolicyIsPending() {
        let counter = StartCounter(shouldStart: true)
        let handler = C15tModuleHandler(startCore: counter.call)

        // No transport, so no policy can resolve. Recording "accept all" here would
        // have to invent a scope, which the core refuses and the bridge relays.
        let payload = jsonObject(handler.commitPayload(intent: #"{"action":"all"}"#))

        XCTAssertEqual(payload["ok"] as? Bool, false)
        XCTAssertEqual(payload["reason"] as? String, "policy-pending")
        XCTAssertEqual(payload["queued"] as? Bool, false)
        XCTAssertEqual(C15t.snapshot().effectivePermissions.marketing, false, "a refused commit changes nothing")
    }

    func testOverridesAreAppliedAgainstTheLiveSnapshot() {
        let handler = C15tModuleHandler(startCore: { C15tReactNativeBootstrap.start(configuration: memoryConfiguration()) })

        XCTAssertTrue(handler.ensureCore())
        // `language` is required by the protocol and the stored config already has one,
        // so this pins a country the policy will then be evaluated against.
        let result = handler.applyOverrides(#"{"country":"FR","language":"fr"}"#)

        guard case .success = result else {
            return XCTFail("expected the overrides to apply, got \(result)")
        }
        XCTAssertEqual(C15t.current?.currentOverrides.country, "FR")
        XCTAssertEqual(C15t.current?.currentOverrides.language, "fr")
    }

    func testAnUnreadableOverridesDocumentChangesNothing() {
        let handler = C15tModuleHandler(startCore: { C15tReactNativeBootstrap.start(configuration: memoryConfiguration()) })
        XCTAssertTrue(handler.applyOverrides(#"{"country":"DE","language":"de"}"#).isSuccess)

        assertBridgeFailure(handler.applyOverrides("nonsense"), C15tBridgeError.unreadableOverrides)
        XCTAssertEqual(C15t.current?.currentOverrides.country, "DE", "a rejected call must leave the overrides alone")
    }

    func testAsyncCommandsReportAMissingCoreInsteadOfSilentlySucceeding() {
        let handler = C15tModuleHandler(startCore: { false })

        assertBridgeFailure(handler.refreshAll(), C15tBridgeError.notBootstrapped)
        assertBridgeFailure(handler.identify(externalId: "user-1"), C15tBridgeError.notBootstrapped)
        assertBridgeFailure(handler.logout(), C15tBridgeError.notBootstrapped)
    }

    func testIdentifyAndLogoutKeepTheSubjectId() {
        let handler = C15tModuleHandler(startCore: { C15tReactNativeBootstrap.start(configuration: memoryConfiguration()) })
        XCTAssertTrue(handler.ensureCore())
        guard let subjectBefore = C15t.snapshot().subject?.id else {
            return XCTFail("a started core has a subject id")
        }

        XCTAssertTrue(handler.identify(externalId: "user-1").isSuccess)
        XCTAssertEqual(C15t.snapshot().subject?.externalId, "user-1", "the external id attaches to the same subject")

        XCTAssertTrue(handler.logout().isSuccess)
        XCTAssertEqual(C15t.snapshot().subject?.id, subjectBefore, "sign-out must not reset consent")
        XCTAssertNil(C15t.snapshot().subject?.externalId)
    }

    func testDismissNoticeIsAHarmlessNoOpWithoutACore() {
        let counter = StartCounter(shouldStart: false)
        C15tModuleHandler(startCore: counter.call).dismissNotice()

        XCTAssertNil(C15t.current)
    }

    func testEnsureCoreStartsAtMostOnce() {
        let counter = StartCounter(shouldStart: true)
        let handler = C15tModuleHandler(startCore: counter.call)

        XCTAssertTrue(handler.ensureCore())
        XCTAssertTrue(handler.ensureCore())
        XCTAssertTrue(handler.ensureCore())
        XCTAssertEqual(counter.value, 1)
    }
}

private extension Result {
    var isSuccess: Bool {
        if case .success = self { return true }
        return false
    }
}
