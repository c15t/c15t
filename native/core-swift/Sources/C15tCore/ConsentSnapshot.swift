import Foundation

/// Interaction the active policy still owes.
///
/// `{ kind, reason }`, which is what `@c15t/core` puts on its snapshot, what the
/// `native/protocol` fixtures carry, and what `@c15t/react-native` decodes. The
/// contract document sketches a `notice`/`acknowledge`/`purpose` triple instead;
/// the kernel wins, because a native core that flattened it would hand the
/// JavaScript layer a value its own types reject.
///
/// `kind: "none"` carries no `reason` key at all, so `reason` is encoded only when
/// there is one.
public struct PromptRequirement: Sendable, Codable, Equatable {
    /// Which surface the remaining obligation needs.
    public enum Kind: String, Sendable, Codable {
        /// A per-category accept/reject decision is owed.
        case choice
        /// Only acknowledgement of the notice is owed.
        case notice
        /// Nothing is owed.
        case none
    }

    public let kind: Kind
    /// Why it is still owed. `nil` exactly when `kind` is `.none`.
    public let reason: PromptReason?

    public init(kind: Kind, reason: PromptReason? = nil) {
        self.kind = kind
        self.reason = reason
    }

    public static let none = PromptRequirement(kind: .none)

    /// The obligation one evaluation leaves, from the rule's prompt and the reason
    /// the evaluator found. A prompt the rule does not ask for is never invented.
    static func from(prompt: PolicyPrompt, reason: PromptReason?) -> PromptRequirement {
        guard let reason else { return .none }
        switch prompt {
        case .notice: return PromptRequirement(kind: .notice, reason: reason)
        case .choice: return PromptRequirement(kind: .choice, reason: reason)
        case .none: return .none
        }
    }

    enum CodingKeys: String, CodingKey {
        case kind
        case reason
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(kind, forKey: .kind)
        try container.encodeIfPresent(reason, forKey: .reason)
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        kind = try container.decode(Kind.self, forKey: .kind)
        reason = try container.decodeIfPresent(PromptReason.self, forKey: .reason)
        // A reason on a prompt that owes nothing is not a shape the kernel
        // produces, so refuse it rather than carry a contradiction.
        if kind == .none, reason != nil {
            throw DecodingError.dataCorruptedError(
                forKey: .reason,
                in: container,
                debugDescription: "promptRequirement kind \"none\" cannot carry a reason"
            )
        }
    }
}

/// The policy resolution outcome carried on the snapshot.
public struct PolicyResolutionInfo: Sendable, Codable, Equatable {
    public enum Status: String, Sendable, Codable {
        case unconfigured
        case matched
        case noMatch = "no-match"
        case failed
    }

    public let status: Status
    public let policyId: String?
    /// Behaviour fingerprint of the matched rule, when there is one.
    public let fingerprint: String?
    /// Present only for `failed`. This is the resolution's own reason, which is
    /// distinct from the client's `error`: a `failed` resolution is a valid wire
    /// the backend reported, while an unparseable wire never becomes a resolution.
    public let reason: String?

    public init(
        status: Status,
        policyId: String?,
        fingerprint: String?,
        reason: String? = nil
    ) {
        self.status = status
        self.policyId = policyId
        self.fingerprint = fingerprint
        self.reason = reason
    }

    /// The shape a snapshot carries before any policy has been read.
    public static let pending = PolicyResolutionInfo(
        status: .unconfigured,
        policyId: nil,
        fingerprint: nil
    )
}

/// Geographic context reported by the backend.
///
/// Keyed `countryCode`/`regionCode`, because that is `locationSchema` in
/// `@c15t/schema`. There is no `language` here: the language in effect lives on
/// `ConsentOverrides.language`, where a device locale can supply it.
public struct LocationContext: Sendable, Codable, Equatable {
    public let countryCode: String?
    public let regionCode: String?

    public init(countryCode: String?, regionCode: String?) {
        self.countryCode = countryCode
        self.regionCode = regionCode
    }
}

/// Geographic, language, and publisher-test overrides that feed policy
/// evaluation.
///
/// `test` selects a draft policy configuration for a test run. It is a
/// `String?` because that is what the protocol layer and the snapshot carry, and
/// it is deliberately not a privacy-signal switch: GPC comes from
/// ``CoreConfig/gpc``, which is the only place a native core can learn the signal.
public struct ConsentOverrides: Sendable, Codable, Equatable {
    public let country: String?
    public let region: String?
    public let language: String
    public let test: String?

    public init(country: String?, region: String?, language: String, test: String?) {
        self.country = country
        self.region = region
        self.language = language
        self.test = test
    }

    public static func `default`(language: String = "en") -> ConsentOverrides {
        ConsentOverrides(country: nil, region: nil, language: language, test: nil)
    }
}

/// Privacy signals the core knows about. `msa` has no native detector in this
/// phase and is reported false rather than omitted.
public struct PrivacySignals: Sendable, Codable, Equatable {
    public let gpc: Bool
    public let msa: Bool

    public init(gpc: Bool, msa: Bool = false) {
        self.gpc = gpc
        self.msa = msa
    }

    public static let none = PrivacySignals(gpc: false)
}

/// Subject identifiers carried on the snapshot. `id` is the c15t-generated
/// subject id; it is never derived from a hardware identifier.
public struct SubjectSnapshot: Sendable, Codable, Equatable {
    public let id: String
    public let externalId: String?

    public init(id: String, externalId: String?) {
        self.id = id
        self.externalId = externalId
    }

    /// `ConsentSubject.subjectId` on the wire. The Swift property stays `id`
    /// because `subject.subjectId` reads as a stutter at the call site.
    enum CodingKeys: String, CodingKey {
        case id = "subjectId"
        case externalId
    }
}

/// A resolved translation bundle, carried through opaquely.
public struct TranslationsBundle: Sendable, Codable, Equatable {
    public let language: String
    public let translations: JSONValue

    public init(language: String, translations: JSONValue) {
        self.language = language
        self.translations = translations
    }
}

/// A failure the binding layer should surface. `code` is stable for machines.
public struct CoreErrorInfo: Sendable, Codable, Equatable, Error {
    public let code: String
    public let message: String

    public init(code: String, message: String) {
        self.code = code
        self.message = message
    }
}

/// The whole of native consent state, at one revision.
///
/// Frozen by construction: every stored property is a `let`, and a change
/// produces a new value through ``mutating(revising:)`` rather than an in-place
/// edit. That is what makes a synchronous ``ConsentCore/snapshot()`` safe to hand
/// to an ad SDK on the main thread: the caller receives a copy of a value nobody
/// can mutate underneath it, and the nested arrays and dictionaries are
/// copy-on-write, so the copy costs reference-count bumps rather than a rebuild.
public struct ConsentSnapshot: Sendable, Codable, Equatable {
    /// Monotonic, bumps on every mutation. Binding layers compare it to decide
    /// whether a pull is worth doing.
    public let revision: Int
    /// `true` while the policy in this snapshot is a placeholder awaiting a
    /// transport init, or while the last init produced a wire the core could not
    /// read. While set, every optional category reads `false`.
    public let policyPending: Bool
    /// `false` until hydration has completed, so a binding layer can tell "no
    /// consent yet" apart from "consent denied".
    public let ready: Bool
    public let model: ConsentModel
    /// Surface to render. Never absent: `deriveActiveUI` in `@c15t/core` answers
    /// `'none'` while a policy is pending and after a failed resolution, and the
    /// protocol fixtures never carry `null` here. The optional `null` in
    /// `KernelActiveUI` exists for an adapter that has not built a snapshot, which
    /// a native core always has.
    public let activeUI: ActiveUI
    public let promptRequirement: PromptRequirement
    public let effectivePermissions: ConsentState
    public let explicitChoice: ExplicitChoice?
    public let consentCategories: [ConsentCategory]?
    public let restrictions: [OptionalConsentCategory: [RestrictionReason]]
    public let resolution: PolicyResolutionInfo
    public let policySnapshotToken: String?
    public let subject: SubjectSnapshot?
    public let location: LocationContext?
    public let overrides: ConsentOverrides
    public let privacySignals: PrivacySignals
    public let optOutDirectives: [PrivacyOptOut]
    public let translations: TranslationsBundle?
    /// Epoch milliseconds of the earliest future event that can change a
    /// permission or the prompt.
    public let nextDeadline: Int64?
    /// Epoch milliseconds of the last evaluation.
    public let evaluatedAt: Int64
    public let error: CoreErrorInfo?
    /// Reserved IAB slot. Always `null` in this phase, but the key is encoded so
    /// a JavaScript layer that reads it does not have to branch on presence.
    public let iab: JSONValue?

    public init(
        revision: Int = 0,
        policyPending: Bool = true,
        ready: Bool = false,
        model: ConsentModel = .optIn,
        activeUI: ActiveUI = .none,
        promptRequirement: PromptRequirement = .none,
        effectivePermissions: ConsentState = .necessaryOnly,
        explicitChoice: ExplicitChoice? = nil,
        consentCategories: [ConsentCategory]? = nil,
        restrictions: [OptionalConsentCategory: [RestrictionReason]] = [:],
        resolution: PolicyResolutionInfo = .pending,
        policySnapshotToken: String? = nil,
        subject: SubjectSnapshot? = nil,
        location: LocationContext? = nil,
        overrides: ConsentOverrides = .default(),
        privacySignals: PrivacySignals = .none,
        optOutDirectives: [PrivacyOptOut] = [],
        translations: TranslationsBundle? = nil,
        nextDeadline: Int64? = nil,
        evaluatedAt: Int64 = 0,
        error: CoreErrorInfo? = nil,
        iab: JSONValue? = nil
    ) {
        self.revision = revision
        self.policyPending = policyPending
        self.ready = ready
        self.model = model
        self.activeUI = activeUI
        self.promptRequirement = promptRequirement
        self.effectivePermissions = effectivePermissions
        self.explicitChoice = explicitChoice
        self.consentCategories = consentCategories
        self.restrictions = restrictions
        self.resolution = resolution
        self.policySnapshotToken = policySnapshotToken
        self.subject = subject
        self.location = location
        self.overrides = overrides
        self.privacySignals = privacySignals
        self.optOutDirectives = optOutDirectives
        self.translations = translations
        self.nextDeadline = nextDeadline
        self.evaluatedAt = evaluatedAt
        self.error = error
        self.iab = iab
    }

    /// The first-launch snapshot: not ready, policy pending, nothing permitted
    /// beyond `necessary`, and no policy claim at all.
    public static let coldStart = ConsentSnapshot()

    /// The permissions a policy the core could not read produces: every optional
    /// category denied, nothing invented. `necessary` is on for the same reason it
    /// is on in the cold-start snapshot: it is not something a policy grants.
    static let failClosedPermissions = ConsentState.necessaryOnly

    /// Produce the next value with `change` applied and the revision bumped.
    /// Named rather than marked `mutating` because callers never edit a snapshot
    /// in place: the whole point is that the previous value stays intact for
    /// whoever is still holding it.
    func byApplying(_ change: (inout Draft) -> Void) -> ConsentSnapshot {
        var draft = Draft(current: self)
        change(&draft)
        return draft.build(revision: revision + 1)
    }

    /// Buildable view of a snapshot, so a mutation reads as a set of assignments
    /// instead of a 23-argument initializer.
    struct Draft {
        var policyPending: Bool
        var ready: Bool
        var model: ConsentModel
        var activeUI: ActiveUI
        var promptRequirement: PromptRequirement
        var effectivePermissions: ConsentState
        var explicitChoice: ExplicitChoice?
        var consentCategories: [ConsentCategory]?
        var restrictions: [OptionalConsentCategory: [RestrictionReason]]
        var resolution: PolicyResolutionInfo
        var policySnapshotToken: String?
        var subject: SubjectSnapshot?
        var location: LocationContext?
        var overrides: ConsentOverrides
        var privacySignals: PrivacySignals
        var optOutDirectives: [PrivacyOptOut]
        var translations: TranslationsBundle?
        var nextDeadline: Int64?
        var evaluatedAt: Int64
        var error: CoreErrorInfo?

        init(current: ConsentSnapshot) {
            policyPending = current.policyPending
            ready = current.ready
            model = current.model
            activeUI = current.activeUI
            promptRequirement = current.promptRequirement
            effectivePermissions = current.effectivePermissions
            explicitChoice = current.explicitChoice
            consentCategories = current.consentCategories
            restrictions = current.restrictions
            resolution = current.resolution
            policySnapshotToken = current.policySnapshotToken
            subject = current.subject
            location = current.location
            overrides = current.overrides
            privacySignals = current.privacySignals
            optOutDirectives = current.optOutDirectives
            translations = current.translations
            nextDeadline = current.nextDeadline
            evaluatedAt = current.evaluatedAt
            error = current.error
        }

        func build(revision: Int) -> ConsentSnapshot {
            ConsentSnapshot(
                revision: revision,
                policyPending: policyPending,
                ready: ready,
                model: model,
                activeUI: activeUI,
                promptRequirement: promptRequirement,
                effectivePermissions: effectivePermissions,
                explicitChoice: explicitChoice,
                consentCategories: consentCategories,
                restrictions: restrictions,
                resolution: resolution,
                policySnapshotToken: policySnapshotToken,
                subject: subject,
                location: location,
                overrides: overrides,
                privacySignals: privacySignals,
                optOutDirectives: optOutDirectives,
                translations: translations,
                nextDeadline: nextDeadline,
                evaluatedAt: evaluatedAt,
                error: error
            )
        }
    }

    // MARK: - Coding

    private enum CodingKeys: String, CodingKey {
        case revision
        case policyPending
        case ready
        case model
        case activeUI
        case promptRequirement
        case effectivePermissions
        case explicitChoice
        case consentCategories
        case restrictions
        case resolution
        case policySnapshotToken
        case subject
        case location
        case overrides
        case privacySignals
        case optOutDirectives
        case translations
        case nextDeadline
        case evaluatedAt
        case error
        case iab
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(revision, forKey: .revision)
        try container.encode(policyPending, forKey: .policyPending)
        try container.encode(ready, forKey: .ready)
        try container.encode(model, forKey: .model)
        try container.encode(activeUI, forKey: .activeUI)
        try container.encode(promptRequirement, forKey: .promptRequirement)
        try container.encode(effectivePermissions, forKey: .effectivePermissions)
        try container.encodeIfPresent(explicitChoice, forKey: .explicitChoice)
        try container.encodeIfPresent(consentCategories, forKey: .consentCategories)
        // `restrictions` is keyed by an enum, and Swift encodes such a dictionary as
        // one flat array of alternating keys and values. The protocol says an object,
        // so key it by the category name here or JavaScript cannot read the field.
        // Sorted so a stored snapshot does not depend on dictionary order.
        var restrictionsContainer = container.nestedContainer(
            keyedBy: CategoryCodingKey.self,
            forKey: .restrictions
        )
        for category in OptionalConsentCategory.allCases
            .sorted { $0.rawValue < $1.rawValue }
        {
            if let reasons = restrictions[category] {
                try restrictionsContainer.encode(
                    reasons,
                    forKey: CategoryCodingKey(category.rawValue)
                )
            }
        }
        try container.encode(resolution, forKey: .resolution)
        try container.encodeIfPresent(policySnapshotToken, forKey: .policySnapshotToken)
        try container.encodeIfPresent(subject, forKey: .subject)
        try container.encodeIfPresent(location, forKey: .location)
        try container.encode(overrides, forKey: .overrides)
        try container.encode(privacySignals, forKey: .privacySignals)
        try container.encode(optOutDirectives, forKey: .optOutDirectives)
        try container.encodeIfPresent(translations, forKey: .translations)
        try container.encodeIfPresent(nextDeadline, forKey: .nextDeadline)
        try container.encode(evaluatedAt, forKey: .evaluatedAt)
        try container.encodeIfPresent(error, forKey: .error)
        // Always emitted, always null in this phase. See the property comment.
        try container.encodeNil(forKey: .iab)
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        revision = try container.decode(Int.self, forKey: .revision)
        policyPending = try container.decode(Bool.self, forKey: .policyPending)
        ready = try container.decode(Bool.self, forKey: .ready)
        model = try container.decode(ConsentModel.self, forKey: .model)
        // An envelope that predates the non-null surface, or carries the null an
        // adapter would use, reads as "no surface owed".
        activeUI = try container.decodeIfPresent(ActiveUI.self, forKey: .activeUI) ?? .none
        promptRequirement = try container.decode(
            PromptRequirement.self,
            forKey: .promptRequirement
        )
        effectivePermissions = try container.decode(
            ConsentState.self,
            forKey: .effectivePermissions
        )
        explicitChoice = try container.decodeIfPresent(
            ExplicitChoice.self,
            forKey: .explicitChoice
        )
        consentCategories = try container.decodeIfPresent(
            [ConsentCategory].self,
            forKey: .consentCategories
        )
        // Reads the object form `encode(to:)` writes. An older snapshot that still
        // holds the flat array fails here, and the store treats an unreadable
        // envelope as nothing stored, which is the deny-all direction.
        let restrictionKeys = try container.decode(
            [String: [RestrictionReason]].self,
            forKey: .restrictions
        )
        var parsedRestrictions: [OptionalConsentCategory: [RestrictionReason]] = [:]
        for (name, reasons) in restrictionKeys {
            guard let category = OptionalConsentCategory(rawValue: name) else {
                throw DecodingError.dataCorrupted(
                    DecodingError.Context(
                        codingPath: [CategoryCodingKey(name)],
                        debugDescription: "\(name) is not an optional consent category"
                    )
                )
            }
            parsedRestrictions[category] = reasons
        }
        restrictions = parsedRestrictions
        resolution = try container.decode(PolicyResolutionInfo.self, forKey: .resolution)
        policySnapshotToken = try container.decodeIfPresent(
            String.self,
            forKey: .policySnapshotToken
        )
        subject = try container.decodeIfPresent(SubjectSnapshot.self, forKey: .subject)
        location = try container.decodeIfPresent(LocationContext.self, forKey: .location)
        overrides = try container.decode(ConsentOverrides.self, forKey: .overrides)
        privacySignals = try container.decode(PrivacySignals.self, forKey: .privacySignals)
        optOutDirectives = try container.decode(
            [PrivacyOptOut].self,
            forKey: .optOutDirectives
        )
        translations = try container.decodeIfPresent(
            TranslationsBundle.self,
            forKey: .translations
        )
        nextDeadline = try container.decodeIfPresent(Int64.self, forKey: .nextDeadline)
        evaluatedAt = try container.decode(Int64.self, forKey: .evaluatedAt)
        error = try container.decodeIfPresent(CoreErrorInfo.self, forKey: .error)
        // A stored `iab` that is anything but null means a writer from a later
        // phase got here; this one must not carry state it cannot honour.
        if let iab = try container.decodeIfPresent(JSONValue.self, forKey: .iab),
           !iab.isNull
        {
            throw DecodingError.dataCorruptedError(
                forKey: .iab,
                in: container,
                debugDescription: "IAB state is not supported in this build"
            )
        }
        iab = nil
    }
}
