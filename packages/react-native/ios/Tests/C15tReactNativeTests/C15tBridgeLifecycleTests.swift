@testable import C15tReactNativeBridge
import C15tCore
import XCTest

/// Event behaviour, and the rule that exactly one core is running.
final class C15tChangePumpTests: XCTestCase {
    func testOneSnapshotEventPerRevisionAndRepeatsAreDropped() {
        let sink = RecordingSink()
        let pump = C15tChangePump(sink: sink)

        pump.onSnapshot(ConsentSnapshot(revision: 1, policyPending: false))
        pump.onSnapshot(ConsentSnapshot(revision: 1, policyPending: false))
        pump.onSnapshot(ConsentSnapshot(revision: 2, policyPending: false))

        XCTAssertEqual(sink.payloads(for: "snapshot").count, 2)
        XCTAssertEqual(jsonObject(sink.payloads(for: "snapshot").last ?? "{}")["revision"] as? Int, 2)
    }

    func testInitializedFiresOnceAndNotWhilePolicyIsPending() {
        let sink = RecordingSink()
        let pump = C15tChangePump(sink: sink)

        // A cold start publishes, but nothing has resolved, so the app must not be
        // told it is initialized.
        pump.onSnapshot(ConsentSnapshot(revision: 1, policyPending: true))
        XCTAssertEqual(sink.events.filter { $0 == "initialized" }.count, 0)

        pump.onSnapshot(ConsentSnapshot(revision: 2, policyPending: false))
        pump.onSnapshot(ConsentSnapshot(revision: 3, policyPending: false))
        XCTAssertEqual(sink.events.filter { $0 == "initialized" }.count, 1, "a one-shot announcement")
    }

    func testErrorEventCarriesCodeAndMessage() {
        let sink = RecordingSink()
        C15tChangePump(sink: sink).onError(code: "unsupported-contract", message: "backend refused the wire")

        let payload = jsonObject(sink.payloads(for: "error").first ?? "{}")
        XCTAssertEqual(payload["code"] as? String, "unsupported-contract")
    }

    func testSubscriberReportsTheCoreCurrentSnapshotOnAttach() {
        let core = ConsentCore()
        core.bootstrap(CoreConfig(store: InMemoryStore()))
        let sink = RecordingSink()
        let subscriber = C15tCoreSubscriber(sink: sink)

        // Attaching after bootstrap must not lose the state the core already
        // published, so it reports the live snapshot once.
        subscriber.attach(to: core)
        XCTAssertEqual(sink.payloads(for: "snapshot").count, 1)
        XCTAssertEqual(
            jsonObject(sink.payloads(for: "snapshot").first ?? "{}")["revision"] as? Int,
            core.snapshot().revision
        )

        // Attaching twice must not double-report or double-subscribe.
        subscriber.attach(to: core)
        XCTAssertEqual(sink.payloads(for: "snapshot").count, 1)

        subscriber.detach()
    }

    func testSubscriberStopsDeliveringAfterDetach() {
        let core = ConsentCore()
        core.bootstrap(CoreConfig(store: InMemoryStore()))
        let sink = RecordingSink()
        let subscriber = C15tCoreSubscriber(sink: sink)
        subscriber.attach(to: core)
        subscriber.detach()
        // Attaching reports the live snapshot once, so compare against what detach
        // left behind rather than against zero.
        let emittedBeforeDetach = sink.events.count
        XCTAssertGreaterThan(emittedBeforeDetach, 0)

        // `dismissNotice` publishes a revision without needing a resolved policy, so
        // it is a cheap way to prove the observer really went away.
        core.dismissNotice()
        XCTAssertEqual(
            sink.events.count, emittedBeforeDetach,
            "a detached subscriber must not emit: \(sink.events)"
        )
    }
}

/// The launch configuration, and the one-core rule the bridge exists to enforce.
final class C15tBootstrapTests: XCTestCase {
    override func setUp() {
        super.setUp()
        C15t.resetForTests()
    }

    override func tearDown() {
        C15t.resetForTests()
        super.tearDown()
    }

    func testEmptyPlistStartsOfflineWithTheKeychainAndADeviceLanguage() {
        let configuration = C15tBridgeConfiguration.from(infoPlist: [:])

        XCTAssertTrue(configuration.autoBootstrap, "automatic startup is the default")
        XCTAssertEqual(configuration.transportMode, .offline, "a made-up host would send consent somewhere nobody chose")
        XCTAssertEqual(configuration.storageMode, .keychain)
        XCTAssertFalse(configuration.overrides.language.isEmpty, "translations need exactly one language")
    }

    func testBackendURLWithoutAModeIsTreatedAsHosted() {
        let configuration = C15tBridgeConfiguration.from(infoPlist: [
            C15tBridgeConfiguration.InfoPlistKey.backendURL: "https://example.eu.c15t.app",
        ])

        XCTAssertEqual(configuration.transportMode, .hosted)
        XCTAssertNotNil(configuration.makeTransport())
    }

    func testUnreadableValuesFallBackToTheSafeOption() {
        let configuration = C15tBridgeConfiguration.from(infoPlist: [
            C15tBridgeConfiguration.InfoPlistKey.transportMode: "teleport",
            C15tBridgeConfiguration.InfoPlistKey.storageMode: "nonsense",
            C15tBridgeConfiguration.InfoPlistKey.categories: ["marketing", "telepathy"],
        ])

        XCTAssertEqual(configuration.storageMode, .keychain, "an unparseable store must not become plaintext")
        XCTAssertEqual(configuration.transportMode, .offline, "no declared mode and no URL cannot mean a network")
        XCTAssertEqual(configuration.consentCategories, [.marketing], "unknown categories are dropped, not trusted")
    }

    func testDeclaredModeWinsOverURLInference() {
        let configuration = C15tBridgeConfiguration.from(infoPlist: [
            C15tBridgeConfiguration.InfoPlistKey.backendURL: "https://consent.example.com",
            C15tBridgeConfiguration.InfoPlistKey.transportMode: "self-hosted",
        ])

        XCTAssertEqual(configuration.transportMode, .selfHosted)
    }

    func testSelfHostedAndNoTransportModesMapToTheirTransports() {
        let selfHosted = C15tBridgeConfiguration(
            autoBootstrap: true,
            transportMode: .selfHosted,
            backendURL: URL(string: "https://consent.example.com"),
            domain: "example.com",
            storageMode: .memory,
            keychainService: C15tBridgeConfiguration.defaultKeychainService,
            overrides: ConsentOverrides(country: nil, region: nil, language: "en", gpc: nil),
            consentCategories: nil,
            gpc: nil
        )

        XCTAssertNotNil(selfHosted.makeTransport())

        var withoutBackend = selfHosted
        withoutBackend.transportMode = .disabled
        XCTAssertNil(withoutBackend.makeTransport(), "mode none means async commands become no-ops")
    }

    func testHostedModeWithAMissingURLDegradesToOffline() {
        var configuration = memoryConfiguration()
        configuration.transportMode = .hosted
        configuration.backendURL = nil

        XCTAssertTrue(configuration.makeTransport() is OfflineTransport)
    }

    func testStartInstallsOneCoreAndLaterCallsAttachToIt() {
        XCTAssertNil(C15t.current)
        XCTAssertTrue(C15tReactNativeBootstrap.start(configuration: memoryConfiguration()))

        guard let first = C15t.current else { return XCTFail("expected a running core") }
        XCTAssertTrue(C15tReactNativeBootstrap.start(configuration: memoryConfiguration()))

        XCTAssertTrue(C15t.current === first, "a second start must attach, not install a second kernel")
        XCTAssertTrue(C15tReactNativeBootstrap.isRunning)
    }

    func testAnAppOwnedCoreIsAdoptedInsteadOfStartingAnother() {
        let appCore = ConsentCore()
        appCore.bootstrap(CoreConfig(store: InMemoryStore()))

        XCTAssertTrue(C15tReactNativeBootstrap.install(appCore))
        XCTAssertTrue(C15tReactNativeBootstrap.start(configuration: memoryConfiguration()))
        XCTAssertTrue(C15t.current === appCore, "the bridge reads the core the app started")
    }

    func testAutoBootstrapOptOutLeavesReadsDenyAll() {
        var configuration = memoryConfiguration()
        configuration.autoBootstrap = false

        XCTAssertFalse(C15tReactNativeBootstrap.start(configuration: configuration))
        XCTAssertNil(C15t.current)
        // Failing closed rather than inventing a store is what the contract asks for.
        let snapshot = C15t.snapshot()
        XCTAssertFalse(snapshot.ready)
        XCTAssertTrue(snapshot.policyPending)
        XCTAssertEqual(snapshot.effectivePermissions.marketing, false)
    }

    func testStartHonoursThePlistOptOutKey() {
        XCTAssertFalse(C15tReactNativeBootstrap.start(infoPlist: [
            C15tBridgeConfiguration.InfoPlistKey.autoBootstrap: false,
        ]))
        XCTAssertNil(C15t.current)
    }

    func testMemoryStoreIsUsedWhenConfigured() {
        let store = memoryConfiguration().makeStore()
        XCTAssertTrue(store is InMemoryStore)
    }
    func testARetiredTestModeKeyRefusesTheLaunch() {
        // `com.c15t.test` set an override that does not exist. Starting anyway would
        // run a core whose configuration is a guess, and the host would keep believing
        // a mode was on. Deny-all plus one readable reason is the honest answer.
        let plist: [String: Any] = [
            C15tBridgeConfiguration.InfoPlistKey.backendURL: "https://example.eu.c15t.app",
            "com.c15t.test": "gpc",
        ]

        let retired = C15tBridgeConfiguration.retiredKeys(in: plist)
        XCTAssertEqual(retired.map(\.key), ["com.c15t.test"])

        guard let issue = C15tBridgeConfiguration.retirementIssue(in: plist) else {
            return XCTFail("a retired key must produce a readable refusal")
        }
        XCTAssertEqual(issue.code, "C15T_CONFIGURATION_RETIRED")
        XCTAssertTrue(issue.message.contains("com.c15t.test"), "name the key: \(issue.message)")
        XCTAssertTrue(issue.message.contains("com.c15t.gpc"), "name the key to use instead: \(issue.message)")
        XCTAssertFalse(
            C15tReactNativeBootstrap.start(infoPlist: plist),
            "the core must not start from a configuration this build cannot read"
        )
        XCTAssertNil(C15t.current, "and nothing may be installed behind the refusal")
    }

    func testAGPCKeyIsADetectedSignalAndNeverAnOverride() {
        // The two collapse into one field if the plist key feeds both, which is the
        // distinction the contract keeps apart and the evaluator depends on.
        let configuration = C15tBridgeConfiguration.from(infoPlist: [
            C15tBridgeConfiguration.InfoPlistKey.gpc: true,
        ])

        XCTAssertEqual(configuration.gpc, true, "the host reported a signal")
        XCTAssertNil(configuration.overrides.gpc, "which is not an override")
    }

    func testAPlistWithoutRetiredKeysIsValid() {
        let plist: [String: Any] = [
            C15tBridgeConfiguration.InfoPlistKey.backendURL: "https://example.eu.c15t.app",
            C15tBridgeConfiguration.InfoPlistKey.gpc: true,
            C15tBridgeConfiguration.InfoPlistKey.language: "de",
        ]

        XCTAssertTrue(C15tBridgeConfiguration.retiredKeys(in: plist).isEmpty)
        XCTAssertNil(C15tBridgeConfiguration.retirementIssue(in: plist))
    }

}
