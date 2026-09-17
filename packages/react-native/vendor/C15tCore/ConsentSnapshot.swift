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

/// Geographic, language, and GPC overrides that feed policy evaluation.
///
/// `gpc` is the app's override, not a detection. It is load bearing: the kernel
/// compares it against the decision inputs remembered from the last init and
/// rejects a save whose inputs no longer match, so a native save body without it
/// cannot pass the backend's staleness check. Detection is a separate input
/// (``CoreConfig/gpc``) and lands on ``PrivacySignals/gpc``.
///
/// Publisher test mode is a client option rather than an override, and never
/// reaches a save body, so it has no place here. The first draft of
/// `native/CONTRACT.md` invented a `test` field, and ``CodingKeys/test`` exists
/// only to refuse an envelope that still carries one.
public struct ConsentOverrides: Sendable, Codable, Equatable {
    public let country: String?
    public let region: String?
    public let language: String
    public let gpc: Bool?

    public init(country: String?, region: String?, language: String, gpc: Bool? = nil) {
        self.country = country
        self.region = region
        self.language = language
        self.gpc = gpc
    }

    /// `test` is declared only so ``init(from:)`` can see it. A decoder with a
    /// synthesized key set never learns that an unknown key was in the data, so a
    /// retired field would otherwise pass through unseen and be dropped in silence.
    enum CodingKeys: String, CodingKey {
        case country
        case region
        case language
        case gpc
        case test
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        try RetiredEnvelope.reject(.test, ifPresentIn: container)
        country = try container.decodeIfPresent(String.self, forKey: .country)
        region = try container.decodeIfPresent(String.self, forKey: .region)
        language = try container.decodeIfPresent(String.self, forKey: .language) ?? "en"
        gpc = try container.decodeIfPresent(Bool.self, forKey: .gpc)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try RetiredEnvelope.write(country, forKey: .country, in: &container)
        try RetiredEnvelope.write(region, forKey: .region, in: &container)
        try container.encode(language, forKey: .language)
        try RetiredEnvelope.write(gpc, forKey: .gpc, in: &container)
    }

    public static func `default`(language: String = "en") -> ConsentOverrides {
        ConsentOverrides(country: nil, region: nil, language: language, gpc: nil)
    }
}

/// The Global Privacy Control signal, in the three parts the kernel keeps apart.
///
/// Reading ``active`` is the correct thing for an evaluator; ``detected`` and
/// ``override`` exist so a host can tell why a signal is on. `active` is the
/// override when the app set one, otherwise the detection.
public struct GpcSignal: Sendable, Codable, Equatable {
    /// What the device or the backend reported. There is no user-agent GPC flag
    /// to read natively, so this is the host's report or what `/init` resolved.
    public let detected: Bool
    /// ``ConsentOverrides/gpc``, or `nil` when the app set none.
    public let override: Bool?
    /// The signal the evaluator honors.
    public let active: Bool

    public init(detected: Bool, override: Bool?) {
        self.detected = detected
        self.override = override
        self.active = override ?? detected
    }

    public static func derive(override: Bool?, detected: Bool) -> GpcSignal {
        GpcSignal(detected: detected, override: override)
    }

    enum CodingKeys: String, CodingKey {
        case detected
        case override
        case active
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(detected, forKey: .detected)
        try RetiredEnvelope.write(override, forKey: .override, in: &container)
        try container.encode(active, forKey: .active)
    }

    /// Decode the two inputs and recompute the third.
    ///
    /// `active` is an output, never an input: trusting a stored copy would keep a
    /// category denied after the signal that caused it is gone, and would let an
    /// envelope claim an `active` its own override and detection do not support.
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        detected = try container.decodeIfPresent(Bool.self, forKey: .detected) ?? false
        override = try container.decodeIfPresent(Bool.self, forKey: .override)
        active = override ?? detected
    }
}

/// Privacy signals the core honors, mirroring `KernelPrivacySignals`.
///
/// There is no `msa` signal anywhere in v3. The first draft of
/// `native/CONTRACT.md` carried one as a boolean alongside a boolean `gpc`; both
/// are refused on decode rather than guessed at.
public struct PrivacySignals: Sendable, Codable, Equatable {
    /// `msa` is declared only so ``init(from:)`` can refuse it.
    enum CodingKeys: String, CodingKey {
        case gpc
        case msa
    }

    public let gpc: GpcSignal

    public init(gpc: GpcSignal) {
        self.gpc = gpc
    }

    public init(detected: Bool, override: Bool?) {
        self.gpc = GpcSignal.derive(override: override, detected: detected)
    }

    public static let none = PrivacySignals(detected: false, override: nil)

    /// Encode only the live key. `msa` is a coding key that exists to be refused on
    /// the way in, and a synthesized encoder would look for a property behind it.
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(gpc, forKey: .gpc)
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        try RetiredEnvelope.reject(.msa, ifPresentIn: container)
        guard container.contains(.gpc) else {
            throw DecodingError.keyNotFound(
                CodingKeys.gpc,
                DecodingError.Context(
                    codingPath: container.codingPath,
                    debugDescription: "privacySignals must carry gpc as a "
                        + "detected / override / active object: \(RetiredEnvelope.guidance)"
                )
            )
        }
        // A boolean `gpc` is the retired shape. It fails here as the wrong type
        // rather than being read as a detection, because `true` would have meant
        // "active" and said nothing about whether the app or the device caused it.
        gpc = try container.decode(GpcSignal.self, forKey: .gpc)
    }
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
