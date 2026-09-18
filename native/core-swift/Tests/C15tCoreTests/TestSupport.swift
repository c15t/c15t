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
    private var _holdsSaves = false
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

    /// Status a failing save answers with. `503` is the retry shape, which is what
    /// the replay tests want; a test about a body the backend refuses on its own
    /// terms wants `400`.
    var saveFailureStatus = 503

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
    ///
    /// Reading and writing it goes through the lock the waiters live behind, so the
    /// park decision and ``releaseSaves()`` cannot interleave.
    var holdsSaves: Bool {
        get {
            lock.lock()
            defer { lock.unlock() }
            return _holdsSaves
        }
        set {
            lock.lock()
            _holdsSaves = newValue
            lock.unlock()
        }
    }

    /// Stop parking saves, and resume the ones already parked.
    func releaseSaves() {
        lock.lock()
        _holdsSaves = false
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
                    if _holdsSaves {
                        saveWaiters.append(continuation)
                        lock.unlock()
                    } else {
                        // Released between the check above and this one. Appending it
                        // anyway would park a send whose release already happened,
                        // and the test would wait on a request nobody will finish.
                        lock.unlock()
                        continuation.resume()
                    }
                }
            }
            if failing {
                return HTTPResponse(status: saveFailureStatus, body: Data("unavailable".utf8))
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

    // MARK: - Vendor lists

    /// One purpose, special purpose, feature or special feature entry. The GVL gives all
    /// four the same shape, so one builder covers them.
    static func gvlDefinition(id: Int, name: String = "Purpose") -> JSONValue {
        .object([
            "id": .integer(Int64(id)),
            "name": .string(name),
            "description": .string("\(name) \(id), in the language the list was served in"),
            "illustrations": .array([]),
        ])
    }

    /// One vendor entry the way the GVL wire serves it.
    ///
    /// `deletedDate` is written only when a test wants a withdrawn vendor, because the
    /// field's presence is the whole fact: the reference reads it for truthiness.
    static func gvlVendor(
        _ id: Int,
        name: String = "Vendor",
        purposes: [Int] = [],
        legIntPurposes: [Int] = [],
        flexiblePurposes: [Int] = [],
        specialPurposes: [Int] = [],
        deletedDate: String? = nil
    ) -> JSONValue {
        var fields: [String: JSONValue] = [
            "id": .integer(Int64(id)),
            "name": .string("\(name) \(id)"),
            "purposes": .array(purposes.map { .integer(Int64($0)) }),
            "legIntPurposes": .array(legIntPurposes.map { .integer(Int64($0)) }),
            "flexiblePurposes": .array(flexiblePurposes.map { .integer(Int64($0)) }),
            "specialPurposes": .array(specialPurposes.map { .integer(Int64($0)) }),
            "features": .array([]),
            "specialFeatures": .array([]),
            "cookieMaxAgeSeconds": .null,
            "cookieRefresh": .bool(false),
            "usesCookies": .bool(true),
            "usesNonCookieAccess": .bool(false),
            "urls": .array([
                .object(["langId": .string("EN"), "privacy": .string("https://vendor.test/\(id)")]),
            ]),
        ]
        if let deletedDate {
            fields["deletedDate"] = .string(deletedDate)
        }
        return .object(fields)
    }

    /// A vendor list document, in the sparse-object shape
    /// `globalVendorListSchema` declares unless `denseArrays` asks for the array shape
    /// older GVL publications use. Both have to read, because `dialog-data.ts` runs
    /// `Object.entries` over either.
    static func gvlDocument(
        vendorListVersion: Int = 177,
        tcfPolicyVersion: Int = 5,
        purposes: [Int] = [1, 2, 3],
        vendors: [JSONValue] = [],
        denseArrays: Bool = false
    ) -> JSONValue {
        let purposeValues = purposes.map { gvlDefinition(id: $0) }
        let keyed: ([JSONValue]) -> JSONValue = { items in
            guard !denseArrays else { return .array(items) }
            var fields: [String: JSONValue] = [:]
            for item in items {
                guard let id = item["id"]?.intValue else { continue }
                fields[String(id)] = item
            }
            return .object(fields)
        }
        return .object([
            "gvlSpecificationVersion": .integer(3),
            "vendorListVersion": .integer(Int64(vendorListVersion)),
            "tcfPolicyVersion": .integer(Int64(tcfPolicyVersion)),
            "lastUpdated": .string("2025-11-01T00:00:00Z"),
            "purposes": keyed(purposeValues),
            "specialPurposes": keyed([gvlDefinition(id: 1, name: "Special")]),
            "features": keyed([gvlDefinition(id: 1, name: "Feature")]),
            "specialFeatures": keyed([gvlDefinition(id: 1, name: "Special feature")]),
            "stacks": keyed([
                .object([
                    "id": .integer(40),
                    "name": .string("Stack 40"),
                    "description": .string("Purposes 2 and 3 together"),
                    "purposes": .array([.integer(2), .integer(3)]),
                    "specialFeatures": .array([]),
                ]),
            ]),
            "vendors": keyed(vendors),
        ])
    }

    /// An `/init` response carrying a policy resolution and a vendor list.
    static func initResponse(
        policyResolution: JSONValue?,
        gvl: JSONValue?,
        status: Int = 200
    ) -> HTTPResponse {
        var fields: [String: JSONValue] = [
            "location": .object([
                "countryCode": .string("DE"),
                "regionCode": .string("BE"),
            ]),
            "policySnapshotToken": .string("token-1"),
        ]
        fields["policyResolution"] = policyResolution ?? .null
        if let gvl {
            fields["gvl"] = gvl
        }
        return .json(
            String(decoding: C15tJSON.encode(.object(fields)) ?? Data("{}".utf8), as: UTF8.self),
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
        gpc: Bool? = nil,
        categories: [ConsentCategory]? = nil,
        vendors: [Int]? = nil
    ) -> CoreConfig {
        CoreConfig(
            store: store,
            transport: transport,
            consentCategories: categories,
            vendors: vendors,
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
