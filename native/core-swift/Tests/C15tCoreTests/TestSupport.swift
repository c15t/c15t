import Foundation
import XCTest
@testable import C15tCore

/// A controllable clock, so expiry and `actionAt` are set rather than waited for.
final class TestClock: @unchecked Sendable {
    private let lock = NSLock()
    private var value: Int64

    init(_ milliseconds: Int64 = 1_758_100_000_000) {
        value = milliseconds
    }

    var now: Int64 {
        lock.lock()
        defer { lock.unlock() }
        return value
    }

    func advance(by milliseconds: Int64) {
        lock.lock()
        value += milliseconds
        lock.unlock()
    }

    var reading: @Sendable () -> Int64 {
        { self.now }
    }
}

/// A backend that answers from a script and remembers what it was asked.
///
/// Sits at the HTTP seam rather than the transport seam, so the assertions land on
/// real request bodies and real headers.
final class StubHTTP: HTTPTransport, @unchecked Sendable {
    private let lock = NSLock()
    private var pendingInit: [HTTPResponse] = []
    private var pendingSave: [HTTPResponse] = []
    private var initRequests: [HTTPRequest] = []
    private var saveRequests: [HTTPRequest] = []
    private var identityRequests: [HTTPRequest] = []
    private var _savesFail = false
    private var saveWaiters: [CheckedContinuation<Void, Never>] = []
    private var arrivalWaiters: [CheckedContinuation<Void, Never>] = []

    /// Called with the body the transport is about to hand over. The test that has
    /// to prove the queue write came first reads its store from here.
    var onSave: (@Sendable (Data) -> Void)?
    var initResponse: HTTPResponse = .json(#"{"policyResolution": null}"#)
    var saveResponse: HTTPResponse = .json("{}")

    func enqueueInit(_ response: HTTPResponse) {
        lock.lock()
        pendingInit.append(response)
        lock.unlock()
    }

    func enqueueSave(_ response: HTTPResponse) {
        lock.lock()
        pendingSave.append(response)
        lock.unlock()
    }

    /// Make every save fail until switched back off.
    func setSavesFail(_ failing: Bool) {
        lock.lock()
        _savesFail = failing
        lock.unlock()
    }

    /// Park every save response until ``releaseSaves()`` is called.
    ///
    /// A stub that answers instantly from memory can finish the delivery, and empty
    /// the queue, before the test's next statement runs. Holding the response keeps
    /// the entry observable while the request is really in flight.
    var holdsSaves = false

    /// Resume the saves parked by ``holdsSaves``.
    func releaseSaves() {
        lock.lock()
        let parked = saveWaiters
        saveWaiters = []
        lock.unlock()
        for waiter in parked {
            waiter.resume()
        }
    }

    /// Wait until `count` save requests have arrived and ``onSave`` has seen them,
    /// which is the only moment a "persisted before the request" check means
    /// something.
    func waitUntilSaveRequests(_ count: Int) async {
        while true {
            await withCheckedContinuation {
                (continuation: CheckedContinuation<Void, Never>) in
                lock.lock()
                if saveRequests.count >= count {
                    lock.unlock()
                    continuation.resume()
                } else {
                    arrivalWaiters.append(continuation)
                    lock.unlock()
                }
            }
            lock.lock()
            let arrived = saveRequests.count >= count
            lock.unlock()
            if arrived { return }
        }
    }

    var recordedInitRequests: [HTTPRequest] {
        lock.lock()
        defer { lock.unlock() }
        return initRequests
    }

    var recordedSaveRequests: [HTTPRequest] {
        lock.lock()
        defer { lock.unlock() }
        return saveRequests
    }

    var recordedIdentityRequests: [HTTPRequest] {
        lock.lock()
        defer { lock.unlock() }
        return identityRequests
    }

    var lastSaveBody: Data? {
        recordedSaveRequests.last?.body
    }

    func send(_ request: HTTPRequest) async throws -> HTTPResponse {
        switch request.method {
        case .get:
            lock.lock()
            initRequests.append(request)
            let canned = pendingInit.isEmpty ? nil : pendingInit.removeFirst()
            lock.unlock()
            return canned ?? initResponse

        case .post:
            lock.lock()
            saveRequests.append(request)
            let canned = pendingSave.isEmpty ? nil : pendingSave.removeFirst()
            let failing = _savesFail
            lock.unlock()
            onSave?(request.body ?? Data())
            lock.lock()
            let arrivals = arrivalWaiters
            arrivalWaiters = []
            lock.unlock()
            for waiter in arrivals {
                waiter.resume()
            }
            if holdsSaves {
                await withCheckedContinuation {
                    (continuation: CheckedContinuation<Void, Never>) in
                    lock.lock()
                    saveWaiters.append(continuation)
                    lock.unlock()
                }
            }
            if failing {
                return HTTPResponse(status: 503, body: Data("unavailable".utf8))
            }
            return canned ?? saveResponse

        case .patch:
            lock.lock()
            identityRequests.append(request)
            lock.unlock()
            return HTTPResponse(status: 200)
        }
    }
}

extension HTTPResponse {
    static func json(_ body: String, status: Int = 200) -> HTTPResponse {
        HTTPResponse(
            status: status,
            headers: ["x-c15t-policy-contract": String(c15tPolicyContractVersion)],
            body: Data(body.utf8)
        )
    }
}

/// Wires and bodies used across the suite.
enum Fixture {
    /// A `ResolvedPolicyRule` as the wire serves it.
    static func rule(
        id: String = "de-1",
        model: String = "opt-in",
        prompt: String = "choice",
        scope: [String] = ["experience", "functionality", "marketing", "measurement"],
        scopeMode: String = "strict",
        gpcDeny: [String] = [],
        choiceMs: Int64 = 31_536_000_000,
        noticeMs: Int64 = 31_536_000_000,
        rights: [String] = ["disclosure", "preferences"]
    ) -> JSONValue {
        // Actions have to match the prompt or the reader refuses the whole rule, so
        // build them from the prompt instead of hand-copying one shape.
        let actions: JSONValue
        switch prompt {
        case "choice":
            actions = .object([
                "allowed": .array([.string("accept"), .string("customize"), .string("reject")]),
                "equivalent": .array([.array([.string("accept"), .string("reject")])]),
                "required": .array([.string("accept"), .string("reject")]),
            ])
        case "notice":
            actions = .object([
                "allowed": .array([.string("dismiss")]),
                "equivalent": .array([]),
                "required": .array([.string("dismiss")]),
            ])
        default:
            actions = .object([
                "allowed": .array([]),
                "equivalent": .array([]),
                "required": .array([]),
            ])
        }
        return .object([
            "id": .string(id),
            "model": .string(model),
            "prompt": .string(prompt),
            "scope": .array(scope.map { .string($0) }),
            "scopeMode": .string(scopeMode),
            "preselectedCategories": .array([]),
            "actions": actions,
            "rights": .array(rights.map { .string($0) }),
            "validity": .object([
                "choiceMs": .integer(choiceMs),
                "noticeMs": .integer(noticeMs),
            ]),
            "privacySignals": .object([
                "gpc": .object([
                    "denyCategories": .array(gpcDeny.map { .string($0) }),
                ]),
            ]),
            "proof": .object([
                "storeIp": .bool(false),
                "storeUserAgent": .bool(false),
                "storeLanguage": .bool(true),
            ]),
            "copyRevision": .null,
        ])
    }

    static func matchedResolution(
        id: String = "de-1",
        policy: JSONValue? = nil,
        choiceFingerprint: String = String(repeating: "a", count: 64),
        noticeFingerprint: String = String(repeating: "b", count: 64),
        policyFingerprint: String = String(repeating: "c", count: 64)
    ) -> JSONValue {
        .object([
            "version": .integer(Int64(c15tPolicyContractVersion)),
            "status": .string("matched"),
            "policyId": .string(id),
            "matchedBy": .string("country"),
            "fingerprints": .object([
                "policy": .string(policyFingerprint),
                "choice": .string(choiceFingerprint),
                "notice": .string(noticeFingerprint),
            ]),
            "policy": policy ?? Fixture.rule(id: id),
        ])
    }

    static func unconfiguredResolution() -> JSONValue {
        .object([
            "version": .integer(Int64(c15tPolicyContractVersion)),
            "status": .string("unconfigured"),
            "policy": .null,
        ])
    }

    static func initBody(policyResolution: JSONValue?) -> Data {
        initBody(policyResolution: policyResolution, token: "token-1")
    }

    static func initBody(policyResolution: JSONValue?, token: String) -> Data {
        var fields: [String: JSONValue] = [
            "location": .object([
                "countryCode": .string("DE"),
                "regionCode": .string("BE"),
            ]),
            "policySnapshotToken": .string(token),
        ]
        if let policyResolution {
            fields["policyResolution"] = policyResolution
        }
        return C15tJSON.encode(.object(fields)) ?? Data("{}".utf8)
    }

    static func initResponse(
        policyResolution: JSONValue?,
        token: String = "token-1",
        status: Int = 200
    ) -> HTTPResponse {
        .json(
            String(
                decoding: initBody(policyResolution: policyResolution, token: token),
                as: UTF8.self
            ),
            status: status
        )
    }

    static func transport(_ http: StubHTTP) -> HostedTransport {
        HostedTransport(
            baseURL: URL(string: "https://consent.example.com")!,
            domain: "app.example.com",
            client: http
        )
    }

    static func configured(
        store: any ConsentStore,
        transport: (any C15tTransport)?,
        clock: TestClock,
        overrides: ConsentOverrides = .default(language: "en"),
        gpc: Bool? = nil
    ) -> CoreConfig {
        CoreConfig(
            store: store,
            transport: transport,
            overrides: overrides,
            gpc: gpc,
            now: clock.reading,
            initRetry: .disabled
        )
    }
}

extension ConsentCore {
    /// Bootstrap and wait for everything bootstrap scheduled, so a test reads a
    /// settled snapshot instead of sleeping.
    func bootstrapAndSettle(_ config: CoreConfig) async {
        bootstrap(config)
        await waitUntilIdle()
    }
}

extension HTTPRequest {
    var bodyText: String {
        String(decoding: body ?? Data(), as: UTF8.self)
    }
}
