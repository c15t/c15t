import Foundation

/// The outcome of one pure evaluation: what gates may open, what is restricted
/// and why, what the subject still owes, and when any of that changes.
public struct ConsentEvaluation: Sendable, Equatable {
    public let permissions: ConsentState
    public let restrictions: [OptionalConsentCategory: [RestrictionReason]]
    public let promptRequirement: PromptRequirement
    /// Why the prompt is owed, before flattening. `nil` when nothing is owed.
    public let promptReason: PromptReason?
    public let nextDeadline: Int64?

    public init(
        permissions: ConsentState,
        restrictions: [OptionalConsentCategory: [RestrictionReason]],
        promptRequirement: PromptRequirement,
        promptReason: PromptReason?,
        nextDeadline: Int64?
    ) {
        self.permissions = permissions
        self.restrictions = restrictions
        self.promptRequirement = promptRequirement
        self.promptReason = promptReason
        self.nextDeadline = nextDeadline
    }

    /// The evaluation a core uses before it has ever read a policy: nothing
    /// permitted, nothing claimed about the prompt, no deadline.
    static let denied = ConsentEvaluation(
        permissions: .necessaryOnly,
        restrictions: [:],
        promptRequirement: .none,
        promptReason: nil,
        nextDeadline: nil
    )
}

/// Turns a validated policy plus stored records into effective permissions.
///
/// Stateless and synchronous. It is the only place the opt-in / opt-out default
/// is applied, which is what keeps `isAllowed` a plain read: by the time a gate
/// asks, the answer has already been derived once and stored on the snapshot.
package enum PolicyEvaluator {
    /// Evaluate one policy against stored records at time `now`.
    ///
    /// - Parameter gpcActive: the GPC signal the evaluator honors, i.e. the
    ///   developer override when set, otherwise the detected signal.
    /// - Parameter optOutDirectives: standing directives recorded from a signal.
    ///   They outlive the live signal, so they deny even after the signal is gone.
    package static func evaluate(
        _ resolved: ResolvedPolicy,
        choice: ExplicitChoice?,
        noticeDismissal: NoticeDismissal?,
        optOutDirectives: [PrivacyOptOut],
        gpcActive: Bool,
        now: Int64
    ) -> ConsentEvaluation {
        let policy = resolved.policy
        let scope = Set(policy.scope)
        let gpcDenied = gpcActive ? Set(policy.gpcDenyCategories) : []
        let directiveDenied = directiveCategories(
            from: optOutDirectives,
            notAfter: now
        )

        var permissions = ConsentState.necessaryOnly
        var restrictions: [OptionalConsentCategory: [RestrictionReason]] = [:]
        var deadlines: [Int64] = []
        // Prompt state, gathered while walking the categories so the decision and
        // its expiry are judged from the same receipt.
        var sawValidChoice = false
        var anyPolicyChanged = false
        var anyExpired = false

        for category in OptionalConsentCategory.ordered {
            var categoryPermitted: Bool
            var categoryRestrictions: [RestrictionReason] = []

            let inScope = scope.contains(category)
            let decision = choice?.categories[category]
            let authority = authority(of: decision, against: resolved.choiceFingerprint)

            switch authority {
            case .valid:
                // `authority == .valid` implies a receipt exists.
                let decision = decision!
                if decision.value {
                    // A positive decision that is already stale stops being an
                    // authority. A denial never ages, so it is not tracked as a
                    // deadline: refusing cannot quietly become allowing.
                    let expiresAt = expiry(
                        of: decision.confirmedAt,
                        maxAgeMs: policy.choiceMaxAgeMs
                    )
                    if expiresAt <= now {
                        anyExpired = true
                        categoryPermitted = defaultPermission(for: policy.model)
                    } else {
                        sawValidChoice = true
                        deadlines.append(expiresAt)
                        categoryPermitted = true
                    }
                } else {
                    sawValidChoice = true
                    categoryPermitted = decision.value
                }
                if !decision.value {
                    categoryRestrictions.append(.explicitDenial)
                }

            case .policyChanged:
                anyPolicyChanged = true
                categoryPermitted = defaultPermission(for: policy.model)

            case .absent:
                categoryPermitted = defaultPermission(for: policy.model)
            }

            if !inScope {
                if policy.scopeMode == .strict {
                    categoryPermitted = false
                    categoryRestrictions.append(.strictScope)
                }
            }

            if gpcDenied.contains(category) {
                categoryPermitted = false
                categoryRestrictions.append(.gpc)
            }

            if directiveDenied.contains(category) {
                categoryPermitted = false
                categoryRestrictions.append(.optOutDirective)
            }

            permissions = permissions.setting(category, to: categoryPermitted)
            if !categoryRestrictions.isEmpty {
                restrictions[category] = categoryRestrictions
            }
        }

        let promptReason = promptRequirement(
            policy: policy,
            resolved: resolved,
            sawValidChoice: sawValidChoice,
            anyPolicyChanged: anyPolicyChanged,
            anyExpired: anyExpired,
            noticeDismissal: noticeDismissal,
            now: now,
            deadlines: &deadlines
        )

        return ConsentEvaluation(
            permissions: permissions,
            restrictions: restrictions,
            promptRequirement: PromptRequirement.from(
                prompt: policy.prompt,
                reason: promptReason
            ),
            promptReason: promptReason,
            nextDeadline: deadlines.min()
        )
    }

    // MARK: - Authorities

    enum DecisionAuthority: Sendable, Equatable {
        case absent
        case valid
        case policyChanged
    }

    /// Judge a stored decision against the live policy, without touching time.
    ///
    /// A `legacy-v2` receipt is grandfathered here: comparing it needs the
    /// policy's legacy material fingerprint, which a mobile core does not hold.
    /// `@c15t/core` treats a missing comparator the same way rather than guessing.
    private static func authority(
        of decision: CategoryDecision?,
        against choiceFingerprint: String
    ) -> DecisionAuthority {
        guard let decision else { return .absent }
        guard let basisFingerprint = decision.basis.choiceFingerprint else {
            return .valid
        }
        return basisFingerprint == choiceFingerprint ? .valid : .policyChanged
    }

    /// The moment a positive decision stops being fresh. Saturates instead of
    /// wrapping, so a policy with an absurd validity window reads as "never
    /// expires" rather than "expired in 1970".
    private static func expiry(of confirmedAt: Int64, maxAgeMs: Int64) -> Int64 {
        let (value, overflow) = confirmedAt.addingReportingOverflow(maxAgeMs)
        return overflow ? Int64.max : value
    }

    /// The model default for a category with no usable decision.
    ///
    /// `opt-in` denies until the subject says yes. `opt-out` and `none` permit
    /// until the subject says no. There is no fourth case: an unreadable policy
    /// never reaches the evaluator.
    private static func defaultPermission(for model: ConsentModel) -> Bool {
        switch model {
        case .optIn: return false
        case .optOut: return true
        case .none: return true
        }
    }

    // MARK: - Prompt

    /// Decide what interaction is still owed, and collect the notice deadline.
    private static func promptRequirement(
        policy: EvaluationPolicy,
        resolved: ResolvedPolicy,
        sawValidChoice: Bool,
        anyPolicyChanged: Bool,
        anyExpired: Bool,
        noticeDismissal: NoticeDismissal?,
        now: Int64,
        deadlines: inout [Int64]
    ) -> PromptReason? {
        switch policy.prompt {
        case .none:
            return nil

        case .choice:
            guard sawValidChoice else { return .missing }
            if anyPolicyChanged { return .policyChanged }
            if anyExpired { return .expired }
            return nil

        case .notice:
            guard let noticeDismissal else { return .missing }
            guard noticeDismissal.fingerprint == resolved.noticeFingerprint else {
                return .policyChanged
            }
            let expiresAt = expiry(
                of: noticeDismissal.dismissedAt,
                maxAgeMs: policy.noticeMaxAgeMs
            )
            guard expiresAt > now else { return .expired }
            deadlines.append(expiresAt)
            return nil
        }
    }

    /// Categories a standing directive restricts. A directive dated in the future
    /// is ignored: a record that has not happened yet must not deny anything.
    private static func directiveCategories(
        from directives: [PrivacyOptOut],
        notAfter now: Int64
    ) -> Set<OptionalConsentCategory> {
        var categories: Set<OptionalConsentCategory> = []
        for directive in directives where directive.recordedAt <= now {
            categories.formUnion(directive.categories)
        }
        return categories
    }
}
