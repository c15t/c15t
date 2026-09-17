import Foundation

/// Every category the runtime knows about, in the same stable order as
/// `CONSENT_CATEGORIES` in `@c15t/core`. Order is load-bearing: the save body
/// and the choice wire both enumerate categories in this order.
public enum ConsentCategory: String, Sendable, Codable, CaseIterable, Hashable {
    case necessary
    case functionality
    case experience
    case measurement
    case marketing
}

/// Categories a subject can actually decide on. `necessary` is never a choice,
/// so it is absent by construction rather than filtered at runtime.
public enum OptionalConsentCategory: String, Sendable, Codable, CaseIterable, Hashable {
    case functionality
    case experience
    case measurement
    case marketing

    /// Declaration order, matching `OPTIONAL_CONSENT_CATEGORIES`, which is the
    /// order used when hashing or enumerating receipts.
    public static let ordered: [OptionalConsentCategory] = [
        .functionality, .experience, .measurement, .marketing,
    ]

    public var category: ConsentCategory {
        switch self {
        case .functionality: return .functionality
        case .experience: return .experience
        case .measurement: return .measurement
        case .marketing: return .marketing
        }
    }
}

/// Why a category is restricted regardless of what the subject granted.
/// Mirrors `RestrictionReason` in `@c15t/core`.
public enum RestrictionReason: String, Sendable, Codable, Hashable {
    case explicitDenial = "explicit-denial"
    case strictScope = "strict-scope"
    case gpc
    case optOutDirective = "opt-out-directive"
}

/// The boolean map gates consume: one entry per category, `necessary` included.
///
/// A struct rather than a dictionary so ``ConsentSnapshot/effectivePermissions``
/// can be read without allocating, and so a missing category is a type error
/// instead of a `nil` that a gate has to guess about.
public struct ConsentState: Sendable, Codable, Equatable {
    public let necessary: Bool
    public let functionality: Bool
    public let experience: Bool
    public let measurement: Bool
    public let marketing: Bool

    public init(
        necessary: Bool = true,
        functionality: Bool = false,
        experience: Bool = false,
        measurement: Bool = false,
        marketing: Bool = false
    ) {
        self.necessary = necessary
        self.functionality = functionality
        self.experience = experience
        self.measurement = measurement
        self.marketing = marketing
    }

    /// The fail-closed baseline: every optional category off.
    ///
    /// `necessary` stays on because it is a legal basis rather than a choice, and
    /// `@c15t/core` grants it before any evaluation (`DEFAULT_CONSENTS`) and never
    /// lets an evaluator take it away. Restrictions are keyed by optional category
    /// only, so no path in the kernel can switch it off either.
    public static let necessaryOnly = ConsentState()

    public func value(for category: ConsentCategory) -> Bool {
        switch category {
        case .necessary: return necessary
        case .functionality: return functionality
        case .experience: return experience
        case .measurement: return measurement
        case .marketing: return marketing
        }
    }

    public func value(for category: OptionalConsentCategory) -> Bool {
        value(for: category.category)
    }

    /// A copy with one optional category changed. `necessary` is not
    /// addressable: no evaluator path, subject action, or restriction is allowed
    /// to switch it off.
    func setting(_ category: OptionalConsentCategory, to permitted: Bool) -> ConsentState {
        switch category {
        case .functionality:
            return ConsentState(
                necessary: necessary,
                functionality: permitted,
                experience: experience,
                measurement: measurement,
                marketing: marketing
            )
        case .experience:
            return ConsentState(
                necessary: necessary,
                functionality: functionality,
                experience: permitted,
                measurement: measurement,
                marketing: marketing
            )
        case .measurement:
            return ConsentState(
                necessary: necessary,
                functionality: functionality,
                experience: experience,
                measurement: permitted,
                marketing: marketing
            )
        case .marketing:
            return ConsentState(
                necessary: necessary,
                functionality: functionality,
                experience: experience,
                measurement: measurement,
                marketing: permitted
            )
        }
    }

    /// Wire form (`consents` on the save payload): all five categories.
    var dictionaryValue: [String: Bool] {
        [
            "necessary": necessary,
            "functionality": functionality,
            "experience": experience,
            "measurement": measurement,
            "marketing": marketing,
        ]
    }

    /// The explicit-value map a backend reads as `preferences`: `necessary` plus
    /// only the categories that hold a receipt. Never the effective permissions,
    /// because a GPC mask must not rewrite what the subject chose.
    static func preferences(from choice: ExplicitChoice) -> [String: Bool] {
        var preferences: [String: Bool] = ["necessary": true]
        for category in OptionalConsentCategory.ordered {
            if let decision = choice.categories[category] {
                preferences[category.rawValue] = decision.value
            }
        }
        return preferences
    }
}

/// The permission model the runtime enforces. `iab` is deliberately absent: this
/// phase ships no TC string and no GVL, so a rule that requires it is treated as
/// unrepresentable and fails closed rather than being approximated.
public enum ConsentModel: String, Sendable, Codable, CaseIterable {
    case optIn = "opt-in"
    case optOut = "opt-out"
    case none
}

/// Which UI surface the binding layer should render.
public enum ActiveUI: String, Sendable, Codable, CaseIterable {
    case none
    case banner
    case dialog
}

/// First-layer interaction a policy requires.
public enum PolicyPrompt: String, Sendable, Codable {
    case choice
    case notice
    case none
}

/// How categories outside the policy scope behave.
public enum PolicyScopeMode: String, Sendable, Codable {
    case strict
    case permissive
}

/// Why a prompt is still required. The snapshot carries it as
/// `promptRequirement.reason`, beside the `kind` that says what is owed.
public enum PromptReason: String, Sendable, Codable {
    case missing
    case expired
    case policyChanged = "policy-changed"
}
