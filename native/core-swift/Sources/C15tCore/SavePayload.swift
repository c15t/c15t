import Foundation

/// The action a save records.
public enum ConsentAction: String, Sendable, Codable, Equatable {
    case all
    case necessary
    case custom
}

/// What the subject did, before it becomes a receipt.
public enum CommitIntent: Sendable, Equatable {
    /// Accept everything the policy puts in scope.
    case all
    /// Reject everything optional, keeping `necessary`.
    case necessary
    /// An explicit map from a preference form. Categories absent from the map are
    /// left exactly as they were: a partial save must not renew or clear a
    /// category the subject did not touch.
    case custom([OptionalConsentCategory: Bool])
}

/// The local outcome of ``ConsentCore/save(_:)``.
///
/// A commit is acknowledged locally and delivered asynchronously. That is what
/// lets a consent action complete inside the 50 ms budget with no network: the
/// receipts are durable before this returns, and the backend is told afterwards.
public struct CommitResult: Sendable, Equatable {
    public enum Status: String, Sendable, Equatable {
        /// Receipts applied locally and queued or accepted.
        case committed
        /// Nothing changed, so nothing was recorded or sent.
        case noop
        /// Refused. The snapshot is untouched and still deny-all where it was.
        case rejected
    }

    public let status: Status
    public let revision: Int
    public let permissions: ConsentState
    public let consentAction: ConsentAction
    /// Categories this action confirmed, for the UI to report back.
    public let confirmed: [OptionalConsentCategory: Bool]
    /// Set when `status == .rejected`.
    public let error: CoreErrorInfo?

    public init(
        status: Status,
        revision: Int,
        permissions: ConsentState,
        consentAction: ConsentAction,
        confirmed: [OptionalConsentCategory: Bool] = [:],
        error: CoreErrorInfo? = nil
    ) {
        self.status = status
        self.revision = revision
        self.permissions = permissions
        self.consentAction = consentAction
        self.confirmed = confirmed
        self.error = error
    }
}

/// The single time one action was confirmed.
public struct ConfirmedCoverage: Sendable, Codable, Equatable {
    public let categories: [OptionalConsentCategory: Bool]
    /// Epoch milliseconds, captured once before any yield or network call, and
    /// reused verbatim by every replay so the backend derives the same consent id.
    public let actionAt: Int64

    public init(categories: [OptionalConsentCategory: Bool], actionAt: Int64) {
        self.categories = categories
        self.actionAt = actionAt
    }
}

/// Overrides as the backend expects them. The snapshot carries the same context
/// under `test`; the wire name is `gpc`, and the payload follows the wire.
public struct KernelOverridesWire: Sendable, Codable, Equatable {
    public let country: String?
    public let region: String?
    public let language: String?
    public let gpc: Bool?

    public init(country: String?, region: String?, language: String?, gpc: Bool?) {
        self.country = country
        self.region = region
        self.language = language
        self.gpc = gpc
    }
}

/// The identified user attached to a record. External id only, no PII beyond what
/// the consumer opts into.
public struct KernelUser: Sendable, Codable, Equatable {
    public let externalId: String
    public let externalIdType: String?
    public let identityProvider: String?
    public let properties: [String: String]?

    public init(
        externalId: String,
        externalIdType: String? = nil,
        identityProvider: String? = nil,
        properties: [String: String]? = nil
    ) {
        self.externalId = externalId
        self.externalIdType = externalIdType
        self.identityProvider = identityProvider
        self.properties = properties
    }
}

/// The subject identifiers a record is keyed by.
public struct ConsentSubject: Sendable, Codable, Equatable {
    public let subjectId: String?
    public let externalId: String?
    public let identityProvider: String?

    public init(subjectId: String?, externalId: String?, identityProvider: String?) {
        self.subjectId = subjectId
        self.externalId = externalId
        self.identityProvider = identityProvider
    }
}

/// Resolved policy inputs captured with an action, so the backend can recompute
/// the same decision. A retry keeps the original inputs even after a later init
/// serves a different policy.
public struct DecisionInputs: Sendable, Codable, Equatable {
    public let policyId: String?
    public let fingerprint: String?
    public let country: String?
    public let region: String?
    public let language: String
    public let gpc: Bool

    public init(
        policyId: String?,
        fingerprint: String?,
        country: String?,
        region: String?,
        language: String,
        gpc: Bool
    ) {
        self.policyId = policyId
        self.fingerprint = fingerprint
        self.country = country
        self.region = region
        self.language = language
        self.gpc = gpc
    }
}

/// The payload one explicit action produces.
///
/// Built once, then handed to the transport as serialized bytes. That ordering is
/// the whole durability story: the persisted form *is* the transmitted form, so a
/// replay cannot drift from what the subject chose, and a policy that changes in
/// the meantime has nothing to rewrite.
public struct SavePayload: Sendable, Codable, Equatable {
    public let subjectId: String
    public let subject: ConsentSubject
    public let choice: ExplicitChoice
    public let confirmed: ConfirmedCoverage
    public let consents: ConsentState
    public let overrides: KernelOverridesWire
    public let user: KernelUser?
    public let model: ConsentModel
    public let uiSource: ActiveUI
    public let consentAction: ConsentAction
    public let policySnapshotToken: String?
    public let decisionInputs: DecisionInputs?
    /// Equals `confirmed.actionAt`, for backends that read one time.
    public let givenAt: Int64

    public init(
        subjectId: String,
        subject: ConsentSubject,
        choice: ExplicitChoice,
        confirmed: ConfirmedCoverage,
        consents: ConsentState,
        overrides: KernelOverridesWire,
        user: KernelUser?,
        model: ConsentModel,
        uiSource: ActiveUI,
        consentAction: ConsentAction,
        policySnapshotToken: String?,
        decisionInputs: DecisionInputs?,
        givenAt: Int64
    ) {
        self.subjectId = subjectId
        self.subject = subject
        self.choice = choice
        self.confirmed = confirmed
        self.consents = consents
        self.overrides = overrides
        self.user = user
        self.model = model
        self.uiSource = uiSource
        self.consentAction = consentAction
        self.policySnapshotToken = policySnapshotToken
        self.decisionInputs = decisionInputs
        self.givenAt = givenAt
    }
}

/// Builds the `POST /subjects` body, field for field as `@c15t/core` builds it.
///
/// Two representations of the same act travel together on purpose. `preferences`
/// is the complete explicit map after the act, which is what a backend records;
/// `choice` carries only what this act confirmed, with the confirmation time and
/// policy basis the kernel already captured. The effective permissions are not
/// either of them: a GPC mask can deny a category the subject granted, and sending
/// the masked value would rewrite what they chose.
enum SubjectPostBodyBuilder {
    /// Serialize a payload into request bytes. The result is deterministic, so the
    /// bytes queued before a request are comparable to the bytes sent after it.
    static func body(for payload: SavePayload, domain: String) throws -> Data {
        try C15tJSON.encode(wire(for: payload, domain: domain))
    }

    static func wire(for payload: SavePayload, domain: String) -> JSONValue {
        var fields: [String: JSONValue] = [
            "consentAction": .string(payload.consentAction.rawValue),
            "domain": .string(domain),
            "givenAt": .integer(payload.confirmed.actionAt),
            "preferences": .object(
                ConsentState.preferences(from: payload.choice).mapValues { .bool($0) }
            ),
            "subjectId": .string(payload.subjectId),
            "type": .string("cookie_banner"),
        ]

        // Omitted rather than null throughout: the 2.x reader treats an absent key
        // as "leave it alone" and a null as "clear it".
        if let externalId = payload.user?.externalId {
            fields["externalSubjectId"] = .string(externalId)
        }
        if let identityProvider = payload.user?.identityProvider {
            fields["identityProvider"] = .string(identityProvider)
        }
        fields["jurisdictionModel"] = .string(payload.model.rawValue)
        if let properties = payload.user?.properties, !properties.isEmpty {
            fields["metadata"] = .object([
                "userProperties": .object(properties.mapValues { .string($0) }),
            ])
        }
        if let token = payload.policySnapshotToken {
            fields["policySnapshotToken"] = .string(token)
        }
        fields["uiSource"] = .string(payload.uiSource.rawValue)
        if let choice = choiceWire(for: payload) {
            fields["choice"] = choice
        }
        // No `tcString`: this build has no IAB module to encode one.

        // The decision assertion goes on flat, not nested, and only when nothing
        // else already binds the write to a policy revision. `buildDecisionAssertion`
        // in `@c15t/core` returns nothing whenever a `policySnapshotToken` is
        // present, because the token is the stronger claim.
        if let assertion = decisionAssertion(for: payload) {
            for (field, value) in assertion { fields[field] = value }
        }

        return .object(fields)
    }

    /// The flat `policyId`/`fingerprint`/`country`/`region`/`language`/`gpc` claim a
    /// tokenless write carries, or `nil` when it must not be sent.
    ///
    /// Mirrors `buildDecisionAssertion`: a token already binds the write to a policy
    /// revision, so the claim adds nothing. A null `policyId` says "nothing matched",
    /// which is a complete claim by itself; a non-null one has to bring the
    /// fingerprint it vouches for.
    private static func decisionAssertion(
        for payload: SavePayload
    ) -> [String: JSONValue]? {
        guard payload.policySnapshotToken == nil, let inputs = payload.decisionInputs else {
            return nil
        }
        if let policyId = inputs.policyId,
           policyId.trimmingCharacters(in: .whitespaces).isEmpty || inputs.fingerprint == nil {
            return nil
        }
        return [
            "policyId": inputs.policyId.map(JSONValue.string) ?? .null,
            "fingerprint": inputs.fingerprint.map(JSONValue.string) ?? .null,
            "country": inputs.country.map(JSONValue.string) ?? .null,
            "region": inputs.region.map(JSONValue.string) ?? .null,
            "language": .string(inputs.language),
            "gpc": .bool(inputs.gpc),
        ]
    }

    /// Receipts for exactly the categories this act confirmed, read out of the
    /// complete choice so the time and basis are the kernel's and not restamped
    /// here. `nil` when the action confirmed nothing that has a receipt.
    private static func choiceWire(for payload: SavePayload) -> JSONValue? {
        var categories: [String: JSONValue] = [:]
        for category in OptionalConsentCategory.ordered {
            guard payload.confirmed.categories[category] != nil else { continue }
            guard let decision = payload.choice.categories[category] else { continue }
            let basis: JSONValue
            switch decision.basis {
            case let .choiceV1(fingerprint):
                basis = .object([
                    "fingerprint": .string(fingerprint),
                    "kind": .string("choice-v1"),
                ])
            case let .legacyV2(materialFingerprint):
                var legacy: [String: JSONValue] = ["kind": .string("legacy-v2")]
                if let materialFingerprint {
                    legacy["materialFingerprint"] = .string(materialFingerprint)
                }
                basis = .object(legacy)
            }
            categories[category.rawValue] = .object([
                "basis": basis,
                "confirmedAt": .integer(decision.confirmedAt),
                "value": .bool(decision.value),
            ])
        }
        guard !categories.isEmpty else { return nil }
        return .object(["categories": .object(categories), "version": .integer(3)])
    }
}
