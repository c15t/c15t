import Foundation

/// Why a policy wire could not be used.
///
/// These are the two client-side wire problems from `@c15t/schema`. They are not
/// interchangeable: `unsupportedContract` means the producer claims a contract
/// this build cannot represent, which the contract calls a hard configuration
/// error, while `invalidPayload` means the bytes are simply not a wire.
public enum PolicyFailureReason: String, Sendable, Equatable {
    case unsupportedContract = "unsupported-contract"
    case invalidPayload = "invalid-payload"
}

/// A wire problem: a value the reader refuses, plus the reason it reports.
private struct WireProblem: Error {
    let reason: PolicyFailureReason
    let message: String
}

/// The policy contract version this build reads. Mirrors
/// `POLICY_CONTRACT_VERSION` in `@c15t/schema`.
public let c15tPolicyContractVersion = 1

/// The validated policy projection the evaluator consumes.
///
/// Wildcards are already expanded and the fingerprints are computed once, at
/// resolution. The evaluator is never allowed to look at a raw wire.
///
/// `package` rather than internal so the benchmark target can time evaluation on its
/// own. `public` would put policy internals on the shipped API surface.
package struct EvaluationPolicy: Sendable, Equatable {
    let model: ConsentModel
    let prompt: PolicyPrompt
    /// Optional categories the policy governs, sorted and deduplicated.
    let scope: [OptionalConsentCategory]
    let scopeMode: PolicyScopeMode
    /// Categories an active GPC signal denies. Empty means the signal is not
    /// honored by this rule.
    let gpcDenyCategories: [OptionalConsentCategory]
    /// Milliseconds a positive choice stays valid.
    let choiceMaxAgeMs: Int64
    /// Milliseconds a notice dismissal stays valid.
    let noticeMaxAgeMs: Int64

    package init(
        model: ConsentModel,
        prompt: PolicyPrompt,
        scope: [OptionalConsentCategory],
        scopeMode: PolicyScopeMode,
        gpcDenyCategories: [OptionalConsentCategory],
        choiceMaxAgeMs: Int64,
        noticeMaxAgeMs: Int64
    ) {
        self.model = model
        self.prompt = prompt
        self.scope = scope
        self.scopeMode = scopeMode
        self.gpcDenyCategories = gpcDenyCategories
        self.choiceMaxAgeMs = choiceMaxAgeMs
        self.noticeMaxAgeMs = noticeMaxAgeMs
    }
}

/// A policy resolution the core can act on: the outcome to report, plus the rule
/// and fingerprints to evaluate against.
package struct ResolvedPolicy: Sendable, Equatable {
    let resolution: PolicyResolutionInfo
    let policy: EvaluationPolicy
    /// Choice prompt currency. Stored decisions are compared to this.
    let choiceFingerprint: String
    /// Notice prompt currency.
    let noticeFingerprint: String

    package init(
        resolution: PolicyResolutionInfo,
        policy: EvaluationPolicy,
        choiceFingerprint: String,
        noticeFingerprint: String
    ) {
        self.resolution = resolution
        self.policy = policy
        self.choiceFingerprint = choiceFingerprint
        self.noticeFingerprint = noticeFingerprint
    }
}

extension ResolvedPolicy {
    /// `SAFE_FALLBACK_POLICY_ID` in `@c15t/schema`. Never reported as a matched
    /// policy, but it is what every non-matched outcome evaluates against.
    static let safeFallbackPolicyId = "c15t_safe_fallback"

    /// Constants, not runtime hashes: the same values `@c15t/schema` ships, so a
    /// subject who chose on the web is not asked again on mobile under the same
    /// fallback.
    static let safeFallbackChoiceFingerprint =
        "145fd951c0967e210d905acf5859a93cd03095c0291816b9c424d740048b7a47"

    static let safeFallbackNoticeFingerprint =
        "4b563e76133c49a5e14cffd9c0a0cc16885b811d9ff77548165cc01ee94996d7"

    static let safeFallbackPolicyFingerprint =
        "caadd5bcf45bf76cbc279b3dfe765f2dcd165c510f489c38994e4c9264d9314f"

    /// The safe opt-in choice fallback: strict scope over every optional
    /// category, so permissions stay denied until a valid explicit choice
    /// exists. Every non-matched outcome uses it while the resolution status
    /// stays observable.
    static let safeFallback = ResolvedPolicy(
        resolution: PolicyResolutionInfo(
            status: .unconfigured,
            policyId: nil,
            fingerprint: nil
        ),
        policy: EvaluationPolicy(
            model: .optIn,
            prompt: .choice,
            scope: OptionalConsentCategory.ordered,
            scopeMode: .strict,
            gpcDenyCategories: [],
            choiceMaxAgeMs: 31_536_000_000,
            noticeMaxAgeMs: 31_536_000_000
        ),
        choiceFingerprint: safeFallbackChoiceFingerprint,
        noticeFingerprint: safeFallbackNoticeFingerprint
    )

    /// The fallback carrying a non-matched outcome's own status, so the snapshot
    /// reports what actually happened rather than flattening four outcomes into
    /// one `null`.
    static func fallback(status: PolicyResolutionInfo.Status, reason: String?) -> ResolvedPolicy {
        ResolvedPolicy(
            resolution: PolicyResolutionInfo(
                status: status,
                policyId: nil,
                fingerprint: nil,
                reason: reason
            ),
            policy: safeFallback.policy,
            choiceFingerprint: safeFallback.choiceFingerprint,
            noticeFingerprint: safeFallback.noticeFingerprint
        )
    }
}

/// Result of reading a raw `policyResolution` value.
enum PolicyWireOutcome: Sendable, Equatable {
    /// Readable: either a matched rule or the safe fallback for a non-matched
    /// outcome.
    case resolved(ResolvedPolicy)
    /// Not readable. The caller must fail closed: `policyPending` true and every
    /// optional category denied.
    case rejected(reason: PolicyFailureReason, message: String)
}

/// Reads the versioned policy resolution wire.
///
/// Strict by design, for the same reason `readPolicyResolutionWire` is: every
/// field this build does not recognise is a reason to refuse the whole wire, not
/// a reason to guess. A core that defaults unknown values would silently invent
/// permissions.
enum PolicyWireReader {
    /// Read `policyResolution` from an init response. Never throws; a wire that
    /// cannot be parsed comes back as ``PolicyWireOutcome/rejected(reason:message:)``.
    static func read(_ input: JSONValue?) -> PolicyWireOutcome {
        do {
            return .resolved(try readWire(input))
        } catch let problem as WireProblem {
            return .rejected(reason: problem.reason, message: problem.message)
        } catch {
            return .rejected(
                reason: .invalidPayload,
                message: "policyResolution could not be read: \(error)"
            )
        }
    }

    // MARK: - Key allow-lists

    /// An unlisted own field is a producer speaking a contract this reader does
    /// not have, so each object type lists exactly what it understands.
    private static let wireKeys: Set<String> = [
        "version", "status", "policy", "reason", "policyId", "matchedBy", "fingerprints",
    ]

    private static let ruleKeys: Set<String> = [
        "id", "model", "prompt", "scope", "scopeMode", "preselectedCategories",
        "actions", "rights", "validity", "privacySignals", "copyRevision", "i18n",
        "proof",
    ]

    private static let actionKeys: Set<String> = ["allowed", "required", "equivalent"]
    private static let validityKeys: Set<String> = ["choiceMs", "noticeMs"]
    private static let privacySignalKeys: Set<String> = ["gpc"]
    private static let gpcKeys: Set<String> = ["denyCategories"]
    private static let proofKeys: Set<String> = [
        "storeIp", "storeUserAgent", "storeLanguage",
    ]

    private static let i18nKeys: Set<String> = ["language", "messageProfile"]
    private static let fingerprintKeys: Set<String> = [
        "policy", "choice", "notice", "legacyMaterial",
    ]

    private static let statuses: Set<String> = [
        "unconfigured", "no-match", "failed", "matched",
    ]

    private static let matchedByValues: Set<String> = [
        "region", "country", "default", "fallback",
    ]

    private static let failureReasons: Set<String> = [
        "invalid-configuration", "insufficient-inputs", "transport",
        "unsupported-contract", "invalid-payload",
    ]

    /// `dismiss` is a valid prompt action on the wire but only `notice` prompts
    /// use it, and this build never acts on actions, so it parses and is dropped.
    private static let promptActions: Set<String> = [
        "accept", "reject", "customize", "dismiss",
    ]

    private static let choiceActions: Set<String> = ["accept", "reject", "customize"]
    private static let rights: Set<String> = ["disclosure", "preferences", "opt-out"]

    // MARK: - Wire

    private static func readWire(_ input: JSONValue?) throws -> ResolvedPolicy {
        guard let input else {
            throw problem(.invalidPayload, "policyResolution is missing")
        }
        let raw = try object(input, field: "policyResolution", allowed: wireKeys)

        guard raw.keys.contains("version") else {
            throw problem(.invalidPayload, "policyResolution.version is required")
        }
        guard case let .integer(version)? = raw["version"],
              version == Int64(c15tPolicyContractVersion)
        else {
            throw problem(
                .unsupportedContract,
                "policy contract version \(describe(raw["version"])) is not supported"
            )
        }

        guard case let .string(status)? = raw["status"], statuses.contains(status) else {
            throw problem(
                .unsupportedContract,
                "status \"\(describe(raw["status"]))\" is not supported"
            )
        }

        switch status {
        case "unconfigured", "no-match":
            guard let rawStatus = PolicyResolutionInfo.Status(rawValue: status) else {
                throw problem(.unsupportedContract, "status \"\(status)\" is not supported")
            }
            guard raw["policy"]?.isNull == true else {
                throw problem(.invalidPayload, "policy must be null when status is \"\(status)\"")
            }
            // The key must be present and null, not merely absent: absence means
            // the producer skipped a field the contract makes mandatory.
            guard raw.keys.contains("policy") else {
                throw problem(.invalidPayload, "policy is required when status is \"\(status)\"")
            }
            return .fallback(status: rawStatus, reason: nil)

        case "failed":
            guard raw["policy"]?.isNull == true, raw.keys.contains("policy") else {
                throw problem(.invalidPayload, "policy must be null when status is \"failed\"")
            }
            guard case let .string(reason)? = raw["reason"], failureReasons.contains(reason) else {
                throw problem(
                    .unsupportedContract,
                    "failure reason \"\(describe(raw["reason"]))\" is not supported"
                )
            }
            return .fallback(status: .failed, reason: reason)

        case "matched":
            return try readMatched(raw)

        default:
            throw problem(.unsupportedContract, "status \"\(status)\" is not supported")
        }
    }

    private static func readMatched(
        _ input: [String: JSONValue]
    ) throws -> ResolvedPolicy {
        guard case let .string(policyId)? = input["policyId"], !policyId.isEmpty else {
            throw problem(.invalidPayload, "policyId must be a non-empty string")
        }
        guard case let .string(matchedBy)? = input["matchedBy"],
              matchedByValues.contains(matchedBy)
        else {
            throw problem(
                .unsupportedContract,
                "matchedBy \"\(describe(input["matchedBy"]))\" is not supported"
            )
        }

        let rule = try readRule(input["policy"])
        guard rule.id == policyId else {
            throw problem(.invalidPayload, "policyId must equal policy.id")
        }
        let fingerprints = try readFingerprints(input["fingerprints"])
        return ResolvedPolicy(
            resolution: PolicyResolutionInfo(
                status: .matched,
                policyId: policyId,
                fingerprint: fingerprints.policy
            ),
            policy: rule.policy,
            choiceFingerprint: fingerprints.choice,
            noticeFingerprint: fingerprints.notice
        )
    }

    private struct RuleDigest {
        let id: String
        let policy: EvaluationPolicy
    }

    private struct FingerprintDigest {
        let policy: String
        let choice: String
        let notice: String
        let legacyMaterial: String?
    }

    private static func readFingerprints(
        _ value: JSONValue?
    ) throws -> FingerprintDigest {
        let raw = try object(value, field: "fingerprints", allowed: fingerprintKeys)
        func required(_ field: String) throws -> String {
            guard case let .string(digest)? = raw[field], !digest.isEmpty else {
                throw problem(.invalidPayload, "fingerprints.\(field) must be a non-empty string")
            }
            return digest
        }
        var legacyMaterial: String?
        if let candidate = raw["legacyMaterial"] {
            guard case let .string(text) = candidate else {
                throw problem(.invalidPayload, "fingerprints.legacyMaterial must be a string")
            }
            legacyMaterial = text
        }
        return FingerprintDigest(
            policy: try required("policy"),
            choice: try required("choice"),
            notice: try required("notice"),
            legacyMaterial: legacyMaterial
        )
    }

    private static func readRule(_ value: JSONValue?) throws -> RuleDigest {
        let raw = try object(value, field: "policy", allowed: ruleKeys)

        guard case let .string(id)? = raw["id"], !id.trimmingCharacters(in: .whitespaces).isEmpty
        else {
            throw problem(.invalidPayload, "policy.id must be a non-empty string")
        }

        // `ResolvedPolicyRule.copyRevision` is `string | null`, so an explicit
        // null is the normal case rather than a malformed rule. Absent is also
        // fine; only a value that is neither null nor real text is refused.
        if let copyRevision = raw["copyRevision"], !copyRevision.isNull {
            guard case let .string(text) = copyRevision,
                  !text.trimmingCharacters(in: .whitespaces).isEmpty
            else {
                throw problem(.invalidPayload, "policy.copyRevision must be null or a non-empty string")
            }
        }

        guard case let .string(modelValue)? = raw["model"] else {
            throw problem(.invalidPayload, "policy.model must be a string")
        }
        // `iab` is a real wire value this build cannot honour: there is no TC
        // string and no GVL here, so reading it as opt-in would invent
        // permissions. Report it as a contract this client does not speak.
        guard modelValue != "iab" else {
            throw problem(
                .unsupportedContract,
                "policy model \"iab\" requires IAB support, which this build does not have"
            )
        }
        guard let model = ConsentModel(rawValue: modelValue) else {
            throw problem(
                .unsupportedContract,
                "policy model \"\(modelValue)\" is not supported"
            )
        }

        guard case let .string(promptValue)? = raw["prompt"],
              let prompt = PolicyPrompt(rawValue: promptValue)
        else {
            throw problem(
                .unsupportedContract,
                "policy prompt \"\(describe(raw["prompt"]))\" is not supported"
            )
        }
        guard validPrompt(for: model, prompt) else {
            throw problem(
                .invalidPayload,
                "model \"\(model.rawValue)\" does not allow prompt \"\(promptValue)\""
            )
        }

        guard case let .string(scopeModeValue)? = raw["scopeMode"],
              let scopeMode = PolicyScopeMode(rawValue: scopeModeValue)
        else {
            throw problem(
                .unsupportedContract,
                "policy scopeMode \"\(describe(raw["scopeMode"]))\" is not supported"
            )
        }

        let scope = try optionalCategorySet(
            raw["scope"],
            field: "policy.scope"
        ).sorted { $0.rawValue < $1.rawValue }
        guard !scope.isEmpty else {
            throw problem(.invalidPayload, "policy.scope must not be empty")
        }

        let preselected = try optionalCategorySet(
            raw["preselectedCategories"],
            field: "policy.preselectedCategories"
        )
        guard Set(preselected).isSubset(of: Set(scope)) else {
            throw problem(.invalidPayload, "preselectedCategories must be inside scope")
        }
        guard model != .none || preselected.isEmpty else {
            throw problem(.invalidPayload, "none rules cannot preselect categories")
        }

        try readActions(raw["actions"], prompt: prompt)

        let rightValues = try stringSet(
            raw["rights"],
            field: "policy.rights",
            members: rights,
            unsupportedField: "policy.rights has unknown value"
        )
        let requiredRights = requiredRights(for: model)
        guard requiredRights.isSubset(of: Set(rightValues)) else {
            throw problem(
                .invalidPayload,
                "model \"\(model.rawValue)\" requires rights [\(requiredRights.sorted().joined(separator: ", "))]"
            )
        }

        let validity = try object(raw["validity"], field: "policy.validity", allowed: validityKeys)
        let choiceMs = try safeMilliseconds(
            validity["choiceMs"],
            field: "policy.validity.choiceMs"
        )
        let noticeMs = try safeMilliseconds(
            validity["noticeMs"],
            field: "policy.validity.noticeMs"
        )

        let signals = try object(
            raw["privacySignals"],
            field: "policy.privacySignals",
            allowed: privacySignalKeys
        )
        let gpc = try object(signals["gpc"], field: "policy.privacySignals.gpc", allowed: gpcKeys)
        let denyCategories = try optionalCategorySet(
            gpc["denyCategories"],
            field: "policy.privacySignals.gpc.denyCategories"
        )
        guard Set(denyCategories).isSubset(of: Set(scope)) else {
            throw problem(
                .invalidPayload,
                "privacySignals.gpc.denyCategories must be inside scope"
            )
        }

        let proof = try object(raw["proof"], field: "policy.proof", allowed: proofKeys)
        for key in proofKeys {
            guard proof[key]?.boolValue != nil else {
                throw problem(.invalidPayload, "policy.proof.\(key) must be a boolean")
            }
        }

        if let i18n = raw["i18n"] {
            let fields = try object(i18n, field: "policy.i18n", allowed: i18nKeys)
            for key in i18nKeys {
                if let value = fields[key], value.stringValue == nil {
                    throw problem(.invalidPayload, "policy.i18n.\(key) must be a string")
                }
            }
        }

        return RuleDigest(
            id: id,
            policy: EvaluationPolicy(
                model: model,
                prompt: prompt,
                scope: scope,
                scopeMode: scopeMode,
                gpcDenyCategories: denyCategories.sorted { $0.rawValue < $1.rawValue },
                choiceMaxAgeMs: choiceMs,
                noticeMaxAgeMs: noticeMs
            )
        )
    }

    private static func readActions(_ value: JSONValue?, prompt: PolicyPrompt) throws {
        let actions = try object(value, field: "policy.actions", allowed: actionKeys)
        let allowed = try stringSet(
            actions["allowed"],
            field: "policy.actions.allowed",
            members: promptActions,
            unsupportedField: "policy.actions.allowed has unknown value"
        )
        let required = try stringSet(
            actions["required"],
            field: "policy.actions.required",
            members: promptActions,
            unsupportedField: "policy.actions.required has unknown value"
        )
        guard let groups = actions["equivalent"]?.arrayValue else {
            throw problem(.invalidPayload, "policy.actions.equivalent must be an array")
        }
        for group in groups {
            _ = try stringSet(
                group,
                field: "policy.actions.equivalent",
                members: promptActions,
                unsupportedField: "policy.actions.equivalent has unknown value"
            )
        }

        switch prompt {
        case .choice:
            guard Set(["accept", "reject"]).isSubset(of: Set(required)) else {
                throw problem(
                    .invalidPayload,
                    "prompt \"choice\" requires actions [accept, reject]"
                )
            }
            guard Set(required).isSubset(of: Set(allowed)) else {
                throw problem(.invalidPayload, "actions.allowed must include every required action")
            }
            guard Set(allowed).isSubset(of: choiceActions) else {
                throw problem(
                    .invalidPayload,
                    "choice prompts allow only accept, reject and customize"
                )
            }
            let hasEquivalenceGroup: Bool = groups.contains { group in
                guard let items = group.arrayValue?.compactMap({ $0.stringValue }) else {
                    return false
                }
                return Set(items) == Set(["accept", "reject"])
            }
            guard groups.count == 1, hasEquivalenceGroup else {
                throw problem(
                    .invalidPayload,
                    "choice prompts require the accept/reject equivalence group"
                )
            }
        case .notice:
            guard Set(allowed) == Set(["dismiss"]) else {
                throw problem(.invalidPayload, "prompt \"notice\" allows actions [dismiss]")
            }
            guard groups.isEmpty else {
                throw problem(.invalidPayload, "prompt \"notice\" has no equivalence groups")
            }
        case .none:
            guard allowed.isEmpty, required.isEmpty, groups.isEmpty else {
                throw problem(.invalidPayload, "prompt \"none\" allows actions []")
            }
        }
    }

    // MARK: - Valid tables

    /// `POLICY_MODEL_PROMPTS` in `@c15t/schema`, minus `iab`.
    private static func validPrompt(for model: ConsentModel, _ prompt: PolicyPrompt) -> Bool {
        switch model {
        case .optIn: return prompt == .choice
        case .optOut: return prompt == .choice || prompt == .notice || prompt == .none
        case .none: return prompt == .none
        }
    }

    /// `requiredPolicyRights` in `@c15t/schema`.
    private static func requiredRights(for model: ConsentModel) -> Set<String> {
        switch model {
        case .optIn: return ["disclosure", "preferences"]
        case .optOut: return ["disclosure", "preferences", "opt-out"]
        case .none: return []
        }
    }

    // MARK: - Primitives

    private static func problem(
        _ reason: PolicyFailureReason,
        _ message: String
    ) -> WireProblem {
        WireProblem(reason: reason, message: message)
    }

    private static func describe(_ value: JSONValue?) -> String {
        guard let value else { return "undefined" }
        switch value {
        case .null: return "null"
        case let .bool(value): return value ? "true" : "false"
        case let .integer(value): return String(value)
        case let .number(value): return String(value)
        case let .string(value): return value
        case .array, .object: return "object"
        }
    }

    private static func object(
        _ value: JSONValue?,
        field: String,
        allowed: Set<String>
    ) throws -> [String: JSONValue] {
        guard let fields = value?.objectValue else {
            throw problem(.invalidPayload, "\(field) must be a plain object")
        }
        for key in fields.keys where !allowed.contains(key) {
            throw problem(.unsupportedContract, "\(field) has unknown field \"\(key)\"")
        }
        return fields
    }

    /// An array of distinct member strings, or a refusal. `@c15t/schema` sorts
    /// the result, so callers sort too.
    private static func stringSet(
        _ value: JSONValue?,
        field: String,
        members: Set<String>,
        unsupportedField: String
    ) throws -> [String] {
        guard let items = value?.strictStringArray else {
            throw problem(.invalidPayload, "\(field) must be an array of unique strings")
        }
        for item in items where !members.contains(item) {
            throw problem(.unsupportedContract, "\(unsupportedField) \"\(item)\"")
        }
        return items
    }

    private static func optionalCategorySet(
        _ value: JSONValue?,
        field: String
    ) throws -> [OptionalConsentCategory] {
        let items = try stringSet(
            value,
            field: field,
            members: Set(OptionalConsentCategory.allCases.map(\.rawValue)),
            unsupportedField: "\(field) has unknown value"
        )
        return items.compactMap { OptionalConsentCategory(rawValue: $0) }
    }

    /// Positive, finite, integral milliseconds, matching `readSafeMs`.
    private static func safeMilliseconds(_ value: JSONValue?, field: String) throws -> Int64 {
        guard let milliseconds = value?.intValue, milliseconds > 0 else {
            throw problem(
                .invalidPayload,
                "\(field) must be a positive number within the safe range"
            )
        }
        return milliseconds
    }
}
