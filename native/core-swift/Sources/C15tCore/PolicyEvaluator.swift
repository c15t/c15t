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

        for category in OptionalConsentCategory.ordered {
            let inScope = scope.contains(category)
            let decision = choice?.categories[category]
            let authority = authority(of: decision, against: resolved.choiceFingerprint)

            // Reasons are gathered before the permission is decided, in the order the
            // kernel pushes them, because `["explicit-denial", "strict-scope"]` is a
            // wire value and not a set. A recorded `false` comes first and is gathered
            // whatever the authority says: a denial never ages, and it survives a lapsed
            // receipt and a moved fingerprint alike.
            var categoryRestrictions: [RestrictionReason] = []
            if decision?.value == false {
                categoryRestrictions.append(.explicitDenial)
            }
            if !inScope, policy.scopeMode == .strict {
                categoryRestrictions.append(.strictScope)
            }
            if gpcDenied.contains(category) {
                categoryRestrictions.append(.gpc)
            }
            if directiveDenied.contains(category) {
                categoryRestrictions.append(.optOutDirective)
            }

            var categoryPermitted = defaultPermission(
                model: policy.model,
                inScope: inScope,
                scopeMode: policy.scopeMode
            )
            // A grant only ever speaks for a category the policy governs, which is the
            // half the old shape got backwards: out of scope the answer belongs to
            // `scopeMode` alone.
            if inScope, let decision, decision.value, authority == .valid {
                let expiresAt = expiry(
                    of: decision.confirmedAt,
                    maxAgeMs: policy.choiceMaxAgeMs
                )
                if expiresAt > now {
                    categoryPermitted = true
                    // A denial is not tracked as a deadline: refusing cannot quietly
                    // become allowing.
                    deadlines.append(expiresAt)
                }
            }
            if !categoryRestrictions.isEmpty {
                categoryPermitted = false
            }

            permissions = permissions.setting(category, to: categoryPermitted)
            if !categoryRestrictions.isEmpty {
                restrictions[category] = categoryRestrictions
            }
        }

        let promptReason = promptRequirement(
            policy: policy,
            resolved: resolved,
            scope: scope,
            choice: choice,
            restrictions: restrictions,
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
    /// `opt-in` and `iab` deny until the subject says yes. `opt-out` and `none` permit
    /// until the subject says no. That pair is `defaultPermission` in
    /// `packages/core/src/consent-record/evaluate.ts`, which grants an in-scope category
    /// only for `model === 'opt-out' || model === 'none'`: an IAB rule therefore opens
    /// nothing by default here either, because a purpose no one consented to is not a
    /// purpose a TC String could vouch for. There is no unreachable case: an unreadable
    /// policy never reaches the evaluator.
    private static func defaultPermission(
        model: ConsentModel,
        inScope: Bool,
        scopeMode: PolicyScopeMode
    ) -> Bool {
        // Out of scope the answer belongs to `scopeMode` alone and never reads the
        // model, which is divergence 1 in `docs/internal/evaluator-parity.md`: a
        // permissive policy allows an ungoverned category under `opt-in` and under
        // `iab` alike, and a strict one refuses it under all four.
        if !inScope { return scopeMode == .permissive }
        switch model {
        case .optIn, .iab: return false
        case .optOut: return true
        case .none: return true
        }
    }

    /// Why an Accept All is still owed, or `nil` when nothing is.
    ///
    /// `deriveChoiceRequirement` copied, order included. A refusal anywhere in the
    /// scope the prompt aggregates answers first, because an automatic prompt must not
    /// solicit the reversal of a denial and neither elapsed time nor a policy edit
    /// cancels one. Then nothing recorded at all, then a basis the current policy no
    /// longer covers -- which outranks a gap and a lapse alike -- and only after those
    /// does an expired grant get a say.
    private static func choiceReason(
        scope: Set<OptionalConsentCategory>,
        choice: ExplicitChoice?,
        restrictions: [OptionalConsentCategory: [RestrictionReason]],
        choiceFingerprint: String,
        choiceMaxAgeMs: Int64,
        now: Int64
    ) -> PromptReason? {
        let governed = OptionalConsentCategory.ordered.filter { scope.contains($0) }
        guard !governed.isEmpty else { return nil }
        if governed.contains(where: { restrictions[$0]?.isEmpty == false }) { return nil }
        guard let decisions = choice?.categories, !decisions.isEmpty else { return .missing }

        var missing = false
        var expired = false
        for category in governed {
            let decision = decisions[category]
            if authority(of: decision, against: choiceFingerprint) == .policyChanged {
                return .policyChanged
            }
            guard let decision else {
                missing = true
                continue
            }
            if decision.value,
               expiry(of: decision.confirmedAt, maxAgeMs: choiceMaxAgeMs) <= now
            {
                expired = true
            }
        }
        if missing { return .missing }
        if expired { return .expired }
        return nil
    }

    // MARK: - Prompt

    /// Decide what interaction is still owed, and collect the notice deadline.
    private static func promptRequirement(
        policy: EvaluationPolicy,
        resolved: ResolvedPolicy,
        scope: Set<OptionalConsentCategory>,
        choice: ExplicitChoice?,
        restrictions: [OptionalConsentCategory: [RestrictionReason]],
        noticeDismissal: NoticeDismissal?,
        now: Int64,
        deadlines: inout [Int64]
    ) -> PromptReason? {
        switch policy.prompt {
        case .none:
            return nil

        case .choice:
            return choiceReason(
                scope: scope,
                choice: choice,
                restrictions: restrictions,
                choiceFingerprint: resolved.choiceFingerprint,
                choiceMaxAgeMs: policy.choiceMaxAgeMs,
                now: now
            )

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
