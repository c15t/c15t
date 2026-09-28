import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

// MARK: - Version and header contract

/// The values every c15t-bound request carries.
public enum C15tSDK {
    /// Version of this native core.
    ///
    /// Kept as a constant rather than generated: this package is not published by
    /// the monorepo's release tooling, and a stale generated version on a request
    /// is worse than an honest hand-maintained one.
    public static let version = "3.0.0-alpha.1"

    /// The `x-c15t-version` header name. Telemetry only: it lets the backend
    /// attribute traffic, and is never used to guess what a client can represent.
    public static let versionHeader = "x-c15t-version"

    /// The `x-c15t-policy-contract` header name: the capability declaration.
    public static let policyContractHeader = "x-c15t-policy-contract"

    /// The `x-c15t-vendors` header name: the publisher's declared vendor scope.
    ///
    /// A scope declaration, not a filter the client relies on. It is the mobile
    /// spelling of the `vendorIds` parameter that
    /// `gvlRequestUrl` in `packages/backend/src/http/gvl.ts` puts on the upstream
    /// GVL request, which is why it travels as a header: `/init` is a GET the core
    /// builds from the project URL, and a client that invented query parameters on
    /// a route it does not own would break every deployment behind a proxy. It is a
    /// header and not a body field for the same reason as the country and region
    /// overrides beside it: the producer has to read it before it decides what to
    /// build, and `/init` has no body to put it in.
    ///
    /// A hint about bytes, never the answer about disclosure. A producer that
    /// honours it sends a list that needs no pruning; a producer that ignores it
    /// sends the wide one, and ``CoreConfig/vendors`` prunes it on the way into
    /// state. That is why an over-cap declaration sends no header and still gets a
    /// narrow device.
    public static let vendorScopeHeader = "x-c15t-vendors"

    /// How many declared ids this build will still put on one request line.
    ///
    /// The same ceiling as `MAX_GVL_QUERY_VENDOR_IDS` in
    /// `packages/iab/src/tcf/fetch-gvl.ts` and `packages/backend/src/http/gvl.ts`,
    /// for the same reason: past it the scope stops fitting comfortably in a
    /// request line, the producer is expected to fetch the list whole, and every
    /// consumer narrows locally. `packages/backend` and `packages/iab` both keep the
    /// local prune above the cap, so the web answer for a 609-id publisher is "ask
    /// for everything, show your own partners", and this must not be the build that
    /// silently truncates a header into a different scope.
    public static let maxVendorScopeHeaderIds = 500

    /// The `x-c15t-vendors` value for a declared scope, or `nil` for no header.
    ///
    /// Deduplicated and ascending, so two hosts who declared the same partners in a
    /// different order, or twice in the same list, ask the same question of the
    /// backend. That stability is what makes the value cacheable and comparable on
    /// the producer side, which is exactly what the `vendorIds` parameter is keyed
    /// on upstream -- `fetch-gvl.ts` sorts before it builds its cache key.
    ///
    /// Absent for the cases where a scope would be a lie or a burden: `nil` and
    /// `[]` both mean no declaration, and above ``maxVendorScopeHeaderIds`` the
    /// scope cannot travel on the request line. In all of those the served list is
    /// whatever the producer chooses, and the local prune is what answers for it.
    ///
    /// - Parameter vendorIds: The declared ids, in whatever order the host wrote them.
    /// - Returns: The ids as `1,2,3`, or `nil` when no header should be sent.
    public static func vendorScopeHeaderValue(_ vendorIds: [Int]?) -> String? {
        guard let vendorIds, !vendorIds.isEmpty else { return nil }
        guard vendorIds.count <= maxVendorScopeHeaderIds else { return nil }
        let ids = Set(vendorIds).sorted()
        guard !ids.isEmpty else { return nil }
        return ids.map(String.init).joined(separator: ",")
    }

    /// Native SDK traffic is the React Native line, which is what the `rn->`
    /// prefix marks. Bare Swift consumers still report the same line, because the
    /// backend has no separate bucket for them.
    public static let versionHeaderValue = "rn->\(version)"

    /// The native protocol revision the JavaScript boundary handshakes against.
    /// A provider that does not recognize it is talking to an embedded native
    /// build from before its own release, which is the Expo Updates failure mode.
    public static let protocolVersion = 1

    /// Headers for every backend-bound request.
    public static var protocolHeaders: [String: String] {
        [
            versionHeader: versionHeaderValue,
            policyContractHeader: String(c15tPolicyContractVersion),
        ]
    }
}

// MARK: - Errors

/// A transport or configuration failure, with a stable machine code.
public enum C15tError: Error, Sendable, Equatable {
    /// No connectivity, or a transport that never sends.
    case offline
    /// The producer serves a policy contract this build cannot represent. The
    /// contract calls this a hard configuration error: the core reports it and
    /// stays deny-all instead of guessing at the wire.
    case unsupportedContract(declared: String?, expected: Int)
    case httpStatus(status: Int, message: String)
    case invalidPayload(String)
    case transport(String)
    /// No transport is configured, so async commands are no-ops.
    case notConfigured

    /// Stable code surfaced on `snapshot.error` and in the `error` event.
    public var code: String {
        switch self {
        case .offline: return "offline"
        case .unsupportedContract: return "unsupported-contract"
        case .httpStatus: return "http-status"
        case .invalidPayload: return "invalid-payload"
        case .transport: return "transport"
        case .notConfigured: return "not-configured"
        }
    }

    public var message: String {
        switch self {
        case .offline: return "No network transport is available."
        case let .unsupportedContract(declared, expected):
            return "Backend serves policy contract \(declared ?? "unknown"); this build reads version \(expected)."
        case let .httpStatus(status, message):
            return "c15t backend responded \(status): \(message)"
        case let .invalidPayload(detail): return "Invalid response payload: \(detail)"
        case let .transport(detail): return "Transport failed: \(detail)"
        case .notConfigured: return "No c15t transport is configured."
        }
    }

    var info: CoreErrorInfo { CoreErrorInfo(code: code, message: message) }

    /// Whether retrying this exact body can ever change the answer.
    ///
    /// A queued body is frozen bytes: that is the whole point of the queue, so a
    /// replay carries the receipts the subject actually gave. Freezing cuts the
    /// other way too, because it means a rejection that came from reading those
    /// bytes says the same thing on the eleventh try as on the first. `400` with
    /// `INPUT_VALIDATION_FAILED` is that case, and so is a contract this build
    /// cannot speak. A `503`, a timeout, a dropped socket, and a rate limit are
    /// not: they say the same body may be accepted a moment later.
    ///
    /// `401`/`403` count as permanent for a body but not for a device, and the
    /// queue only ever holds bodies, so a credential that comes back later cannot
    /// rescue bytes the producer already refused on its own terms.
    var isPermanentlyRejected: Bool {
        switch self {
        case let .httpStatus(status, _):
            return (400 ..< 500).contains(status) && status != 408 && status != 425 && status != 429
        case .unsupportedContract:
            return true
        case .offline, .invalidPayload, .transport, .notConfigured:
            return false
        }
    }
}

// MARK: - HTTP seam

/// A request the core wants to make, in a form a test can assert on without a
/// socket.
public struct HTTPRequest: Sendable, Equatable {
    public enum Method: String, Sendable, Equatable {
        case get = "GET"
        case post = "POST"
        case patch = "PATCH"
    }

    public let method: Method
    public let url: URL
    public let headers: [String: String]
    public let body: Data?

    public init(method: Method, url: URL, headers: [String: String], body: Data?) {
        self.method = method
        self.url = url
        self.headers = headers
        self.body = body
    }
}

/// A response, reduced to what the core reads.
public struct HTTPResponse: Sendable, Equatable {
    public let status: Int
    public let headers: [String: String]
    public let body: Data

    public init(status: Int, headers: [String: String] = [:], body: Data = Data()) {
        self.status = status
        self.headers = headers
        self.body = body
    }

    /// Case-insensitive header lookup, which is what HTTP promises and what
    /// `URLResponse`'s dictionary is not.
    public func header(_ name: String) -> String? {
        let target = name.lowercased()
        for (key, value) in headers where key.lowercased() == target {
            return value
        }
        return nil
    }
}

/// The one network dependency of the hosted transport.
///
/// `URLSession` conforms. A test substitutes something that returns bytes and
/// records requests, which is how the header contract and the persist-before-send
/// ordering get asserted without a server.
public protocol HTTPTransport: Sendable {
    func send(_ request: HTTPRequest) async throws -> HTTPResponse
}

extension URLSession: HTTPTransport {
    public func send(_ request: HTTPRequest) async throws -> HTTPResponse {
        var urlRequest = URLRequest(url: request.url)
        urlRequest.httpMethod = request.method.rawValue
        urlRequest.httpBody = request.body
        for (name, value) in request.headers {
            urlRequest.setValue(value, forHTTPHeaderField: name)
        }

        let (data, response) = try await data(for: urlRequest)
        guard let http = response as? HTTPURLResponse else {
            throw C15tError.transport("Response was not HTTP")
        }
        var headers: [String: String] = [:]
        for (key, value) in http.allHeaderFields {
            if let name = key as? String, let text = value as? String {
                headers[name] = text
            }
        }
        return HTTPResponse(status: http.statusCode, headers: headers, body: data)
    }
}

// MARK: - Init response

/// Context an init call carries: the overrides and identity the evaluation should
/// be resolved for.
public struct InitContext: Sendable, Equatable {
    public let overrides: KernelOverridesWire
    public let user: KernelUser?
    public let subjectId: String
    /// The vendor scope ``CoreConfig/vendors`` declares, passed through unchanged.
    ///
    /// The core hands its declaration to the transport rather than letting the
    /// transport hold one, because a transport that kept consent configuration
    /// would be a second place that knows what the device may disclose. It also
    /// means a host that replaced the transport, or a test that drives one directly,
    /// still sees the scope answered for on the way out.
    public let vendors: [Int]?

    public init(
        overrides: KernelOverridesWire,
        user: KernelUser?,
        subjectId: String,
        vendors: [Int]? = nil
    ) {
        self.overrides = overrides
        self.user = user
        self.subjectId = subjectId
        self.vendors = vendors
    }
}

/// Signals the transport detected server-side.
public struct ResolvedPrivacySignals: Sendable, Equatable {
    public let gpc: Bool?

    public init(gpc: Bool?) {
        self.gpc = gpc
    }
}

/// Records the backend maps for this subject, applied on top of local state.
///
/// This is how a subject who already chose on the web is not asked again on
/// mobile: the receipts arrive with the policy.
public struct HydrationRecords: Sendable, Equatable {
    public let choice: ExplicitChoice?
    public let noticeDismissal: NoticeDismissal?
    public let optOutDirectives: [PrivacyOptOut]

    public init(
        choice: ExplicitChoice?,
        noticeDismissal: NoticeDismissal?,
        optOutDirectives: [PrivacyOptOut] = []
    ) {
        self.choice = choice
        self.noticeDismissal = noticeDismissal
        self.optOutDirectives = optOutDirectives
    }
}

/// A decoded `/init` response.
///
/// Field-for-field the subset of `@c15t/core`'s `InitResponse` that means
/// something on mobile. `gvl` is read: the backend embeds it whenever the matched
/// policy model is `iab` (`buildInitResponse` in `packages/backend/src/http/init.ts`),
/// and a mobile consent surface needs the purposes and vendor names to render the
/// same dialog the web one does. `gvlReference`, `customVendors`, and `cmpId` stay
/// unread, because this build has no IAB runtime to hand them to and no publisher-side
/// non-IAB list to draw; `branding` drives a web theme there is no native surface for.
/// Anything absent here leaves the current snapshot value alone, which is also what the
/// web transport does with an omitted field.
public struct InitResponse: Sendable, Equatable {
    /// The raw policy wire, unvalidated. It is deliberately `JSONValue` and not a
    /// parsed type: reading it into a struct would make an unreadable policy
    /// look like no policy, and the difference is whether the core denies or asks.
    public let policyResolution: JSONValue?
    public let subjectId: String?
    public let location: LocationContext?
    public let translations: TranslationsBundle?
    public let policySnapshotToken: String?
    public let resolvedOverrides: KernelOverridesWire?
    public let resolvedPrivacySignals: ResolvedPrivacySignals?
    public let records: HydrationRecords?
    /// The vendor list the backend served, already read through the `fetch-gvl.ts`
    /// accept rule.
    ///
    /// `nil` covers three cases that have to stay indistinguishable on the snapshot: no
    /// `gvl` key, because the matched policy is not `iab`; an explicit null, which the
    /// web type documents as the server disabling IAB for the request; and a document
    /// the accept rule threw away.
    ///
    /// That last one is a defect in a config response, not a consent answer, so it is
    /// read as absent and nothing else about the response is treated differently.
    /// Contract rule 5 is the one place this build fails closed on a wire it cannot read,
    /// and it is written about a policy resolution: a vendor list carries no permissions,
    /// so dropping one must never turn a readable policy into `policyPending` or take a
    /// grant the subject gave back.
    public let gvl: GlobalVendorList?

    public init(
        policyResolution: JSONValue? = nil,
        subjectId: String? = nil,
        location: LocationContext? = nil,
        translations: TranslationsBundle? = nil,
        policySnapshotToken: String? = nil,
        resolvedOverrides: KernelOverridesWire? = nil,
        resolvedPrivacySignals: ResolvedPrivacySignals? = nil,
        records: HydrationRecords? = nil,
        gvl: GlobalVendorList? = nil
    ) {
        self.policyResolution = policyResolution
        self.subjectId = subjectId
        self.location = location
        self.translations = translations
        self.policySnapshotToken = policySnapshotToken
        self.resolvedOverrides = resolvedOverrides
        self.resolvedPrivacySignals = resolvedPrivacySignals
        self.records = records
        self.gvl = gvl
    }

    /// Read a response body. Anything that is not a JSON object is
    /// `invalidPayload`, because there is nothing safe to keep from it.
    static func decode(_ response: HTTPResponse) -> Result<InitResponse, C15tError> {
        guard let parsed = C15tJSON.parse(response.body), parsed.objectValue != nil else {
            return .failure(.invalidPayload("response body is not a JSON object"))
        }
        let contractError = producerContractError(in: response)
        if case let .failure(error) = contractError {
            return .failure(error)
        }
        return .success(InitResponse(
            policyResolution: parsed["policyResolution"],
            subjectId: parsed["subjectId"]?.stringValue,
            location: decodeLocation(parsed["location"]),
            translations: decodeTranslations(parsed["translations"]),
            policySnapshotToken: parsed["policySnapshotToken"]?.stringValue,
            resolvedOverrides: decodeOverrides(parsed["resolvedOverrides"]),
            resolvedPrivacySignals: parsed["resolvedPrivacySignals"].map { signals in
                ResolvedPrivacySignals(gpc: signals["gpc"]?.boolValue)
            },
            records: decodeRecords(parsed["records"]),
            gvl: GlobalVendorList.read(from: parsed["gvl"])
        ))
    }

    /// A producer that declares a contract this build does not speak is a
    /// configuration error, checked before anything in the body is read.
    ///
    /// A missing header means the producer predates the declaration, which is not
    /// an error; the body still gets read strictly.
    static func producerContractError(in response: HTTPResponse) -> Result<Void, C15tError>? {
        guard let declared = response.header(C15tSDK.policyContractHeader) else { return nil }
        guard let version = Int(declared.trimmingCharacters(in: .whitespaces)) else {
            return .failure(.unsupportedContract(
                declared: declared,
                expected: c15tPolicyContractVersion
            ))
        }
        guard version == c15tPolicyContractVersion else {
            return .failure(.unsupportedContract(
                declared: declared,
                expected: c15tPolicyContractVersion
            ))
        }
        return nil
    }

    /// Read the init response's `location`.
    ///
    /// `locationSchema` keys these `countryCode`/`regionCode`, and both are
    /// explicitly nullable, so a missing key and a null land in the same place.
    private static func decodeLocation(_ value: JSONValue?) -> LocationContext? {
        guard let fields = value?.objectValue else { return nil }
        return LocationContext(
            countryCode: fields["countryCode"]?.stringValue,
            regionCode: fields["regionCode"]?.stringValue
        )
    }

    private static func decodeOverrides(_ value: JSONValue?) -> KernelOverridesWire? {
        guard let fields = value?.objectValue else { return nil }
        return KernelOverridesWire(
            country: fields["country"]?.stringValue,
            region: fields["region"]?.stringValue,
            language: fields["language"]?.stringValue,
            gpc: fields["gpc"]?.boolValue
        )
    }

    private static func decodeTranslations(_ value: JSONValue?) -> TranslationsBundle? {
        guard let fields = value?.objectValue,
              let language = fields["language"]?.stringValue
        else { return nil }
        // `translations` is the bundle payload itself; carried through untouched.
        guard let payload = fields["translations"] ?? value else { return nil }
        return TranslationsBundle(language: language, translations: payload)
    }

    private static func decodeRecords(_ value: JSONValue?) -> HydrationRecords? {
        guard let fields = value?.objectValue else { return nil }
        var choice: ExplicitChoice?
        if let raw = fields["choice"], let data = C15tJSON.encode(raw) {
            choice = try? C15tJSON.decode(ExplicitChoice.self, from: data)
        }
        var dismissal: NoticeDismissal?
        if let raw = fields["noticeDismissal"], let data = C15tJSON.encode(raw) {
            dismissal = try? C15tJSON.decode(NoticeDismissal.self, from: data)
        }
        var directives: [PrivacyOptOut] = []
        if let raw = fields["optOutDirectives"], let data = C15tJSON.encode(raw) {
            directives = (try? C15tJSON.decode([PrivacyOptOut].self, from: data)) ?? []
        }
        guard choice != nil || dismissal != nil || !directives.isEmpty else { return nil }
        return HydrationRecords(
            choice: choice,
            noticeDismissal: dismissal,
            optOutDirectives: directives
        )
    }
}

// MARK: - Transport

/// Carries the async commands: init, save, and identity.
///
/// Implementations are value types or internally synchronized classes. None of
/// them may hold consent state: the core owns it, and a transport that cached
/// permissions would be a second kernel.
public protocol C15tTransport: Sendable {
    /// The `domain` field sent on `POST /subjects`.
    var domain: String { get }

    func performInit(_ context: InitContext) async -> Result<InitResponse, C15tError>

    /// Deliver a save body that the core already persisted.
    ///
    /// Takes bytes, not a payload, because the bytes are the durable artifact. A
    /// re-encode at replay time would be free to drift from what the subject chose.
    func sendSave(_ body: Data) async -> Result<Void, C15tError>

    /// Attach an external id to the subject.
    func patchIdentity(
        subjectId: String,
        externalId: String,
        identityProvider: String?
    ) async -> Result<Void, C15tError>
}

extension C15tTransport {
    /// The hosted transport for a c15t cloud project URL.
    ///
    /// The URL comes from the caller's project rather than a compiled-in default:
    /// this repository ships no cloud host constant, and inventing one here would
    /// send consent data somewhere the maintainer did not choose.
    public static func hosted(
        projectURL: URL,
        domain: String? = nil,
        headers: [String: String] = [:],
        client: any HTTPTransport = URLSession.shared
    ) -> HostedTransport {
        HostedTransport(
            baseURL: projectURL,
            domain: domain,
            extraHeaders: headers,
            client: client
        )
    }

    /// The hosted transport pointed at a self-hosted `@c15t/backend`. Same wire,
    /// different producer.
    public static func selfHosted(
        baseURL: URL,
        domain: String? = nil,
        headers: [String: String] = [:],
        client: any HTTPTransport = URLSession.shared
    ) -> HostedTransport {
        HostedTransport(
            baseURL: baseURL,
            domain: domain,
            extraHeaders: headers,
            client: client
        )
    }

    /// A transport that never sends. Consent still applies locally, and the queue
    /// keeps anything that cannot be delivered.
    public static func offline() -> OfflineTransport {
        OfflineTransport()
    }
}

/// Talks to a c15t backend's `/init`, `/subjects`, and `/subjects/:id`.
///
/// Hosted and self-hosted are the same protocol against a different base URL, so
/// they are one type with two factories rather than two implementations that can
/// drift.
public struct HostedTransport: C15tTransport {
    public let baseURL: URL
    /// Defaults to `${baseURL}/init`, overridable for a same-origin proxy.
    public let initURL: URL
    public let domain: String
    public let extraHeaders: [String: String]
    public let client: any HTTPTransport

    public init(
        baseURL: URL,
        initURL: URL? = nil,
        domain: String? = nil,
        extraHeaders: [String: String] = [:],
        client: any HTTPTransport = URLSession.shared
    ) {
        let base = baseURL.trimmingTrailingSlash()
        self.baseURL = base
        self.initURL = initURL ?? base.appendingPathComponent("init")
        self.domain = domain ?? base.host ?? base.absoluteString
        self.extraHeaders = extraHeaders
        self.client = client
    }

    public func performInit(_ context: InitContext) async -> Result<InitResponse, C15tError> {
        var headers = jsonHeaders
        for (name, value) in extraHeaders { headers[name] = value }
        if let language = context.overrides.language, !language.isEmpty {
            headers["accept-language"] = language
        }
        if let country = context.overrides.country { headers["x-c15t-country"] = country }
        if let region = context.overrides.region { headers["x-c15t-region"] = region }
        if context.overrides.gpc == true { headers["sec-gpc"] = "1" }
        if let scope = C15tSDK.vendorScopeHeaderValue(context.vendors) {
            headers[C15tSDK.vendorScopeHeader] = scope
        }

        do {
            let response = try await client.send(HTTPRequest(
                method: .get,
                url: initURL(withContext: context),
                headers: headers,
                body: nil
            ))
            guard (200..<300).contains(response.status) else {
                return .failure(.httpStatus(
                    status: response.status,
                    message: String(data: response.body, encoding: .utf8) ?? ""
                ))
            }
            return InitResponse.decode(response)
        } catch let error as C15tError {
            return .failure(error)
        } catch {
            return .failure(.transport(String(describing: error)))
        }
    }

    public func sendSave(_ body: Data) async -> Result<Void, C15tError> {
        do {
            let response = try await client.send(HTTPRequest(
                method: .post,
                url: baseURL.appendingPathComponent("subjects"),
                headers: jsonHeaders,
                body: body
            ))
            if let contractError = InitResponse.producerContractError(in: response) {
                return contractError
            }
            guard (200..<300).contains(response.status) else {
                return .failure(.httpStatus(
                    status: response.status,
                    message: String(data: response.body, encoding: .utf8) ?? ""
                ))
            }
            return .success(())
        } catch let error as C15tError {
            return .failure(error)
        } catch {
            return .failure(.transport(String(describing: error)))
        }
    }

    public func patchIdentity(
        subjectId: String,
        externalId: String,
        identityProvider: String?
    ) async -> Result<Void, C15tError> {
        var fields: [String: JSONValue] = ["externalId": .string(externalId)]
        if let identityProvider {
            fields["identityProvider"] = .string(identityProvider)
        }
        guard let body = C15tJSON.encode(.object(fields)) else {
            return .failure(.invalidPayload("identity body could not be encoded"))
        }
        // Escaped defensively, because the id was read back from storage. The
        // punctuation both id formats use stays literal: `encodeURIComponent` on the
        // web leaves `-` and `_` alone, and encoding them here puts a path on the wire
        // that no other c15t SDK sends.
        let encodedSubjectId = subjectId.addingPercentEncoding(
            withAllowedCharacters: .alphanumerics.union(CharacterSet(charactersIn: "-_"))
        ) ?? subjectId
        do {
            let response = try await client.send(HTTPRequest(
                method: .patch,
                url: baseURL.appendingPathComponent("subjects/\(encodedSubjectId)"),
                headers: jsonHeaders,
                body: body
            ))
            guard (200..<300).contains(response.status) else {
                return .failure(.httpStatus(
                    status: response.status,
                    message: String(data: response.body, encoding: .utf8) ?? ""
                ))
            }
            return .success(())
        } catch let error as C15tError {
            return .failure(error)
        } catch {
            return .failure(.transport(String(describing: error)))
        }
    }

    private var jsonHeaders: [String: String] {
        var headers = [
            "accept": "application/json",
            "content-type": "application/json",
        ]
        for (name, value) in C15tSDK.protocolHeaders { headers[name] = value }
        return headers
    }

    /// Overrides ride as query parameters so a proxy that forwards `/init`
    /// unchanged still resolves the same policy the client expects.
    private func initURL(withContext context: InitContext) -> URL {
        guard var components = URLComponents(url: initURL, resolvingAgainstBaseURL: false)
        else { return initURL }
        var items = components.queryItems ?? []
        if let country = context.overrides.country, !country.isEmpty {
            items.append(URLQueryItem(name: "country", value: country))
        }
        if let region = context.overrides.region, !region.isEmpty {
            items.append(URLQueryItem(name: "region", value: region))
        }
        if let language = context.overrides.language, !language.isEmpty {
            items.append(URLQueryItem(name: "language", value: language))
        }
        if let gpc = context.overrides.gpc {
            items.append(URLQueryItem(name: "gpc", value: gpc ? "1" : "0"))
        }
        if !items.isEmpty { components.queryItems = items }
        return components.url ?? initURL
    }
}

/// A transport for a device with no reachable backend.
///
/// Not the same as "no transport": offline still fails, which keeps
/// `policyPending` true and the UI quiet, while a missing transport is a
/// configuration choice that makes the async commands no-ops.
public struct OfflineTransport: C15tTransport {
    public let domain: String

    public init(domain: String = "offline") {
        self.domain = domain
    }

    public func performInit(_ context: InitContext) async -> Result<InitResponse, C15tError> {
        .failure(.offline)
    }

    public func sendSave(_ body: Data) async -> Result<Void, C15tError> {
        .failure(.offline)
    }

    public func patchIdentity(
        subjectId: String,
        externalId: String,
        identityProvider: String?
    ) async -> Result<Void, C15tError> {
        .failure(.offline)
    }
}

extension URL {
    func trimmingTrailingSlash() -> URL {
        guard absoluteString.hasSuffix("/"), var text = absoluteString as String? else {
            return self
        }
        while text.hasSuffix("/") { text.removeLast() }
        return URL(string: text) ?? self
    }
}
