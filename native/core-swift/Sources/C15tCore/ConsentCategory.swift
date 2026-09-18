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

/// The permission model the policy enforces, as the wire names it.
///
/// `iab` is a rule this core reads and evaluates: the categories it governs stay denied
/// until a valid explicit choice grants them, which is what the evaluator in `@c15t/core`
/// already does for `iab` and for `opt-in` alike. See ``runtimeModel`` for what the
/// snapshot reports while one is in force.
public enum ConsentModel: String, Sendable, Codable, CaseIterable {
    case optIn = "opt-in"
    case optOut = "opt-out"
    case iab
    case none

    /// The model this device reports while a rule of this kind is in force.
    ///
    /// Port of `deriveModel` in `packages/core/src/policy.ts`, with the web's `iabEnabled`
    /// argument answered for good: an IAB rule runs as `iab` on the web only once
    /// `@c15t/iab` is installed, and a device has nothing to install in that place. It has
    /// no registered CMP ID to put in a TC String, no per-vendor vector to assert, and no
    /// `IABTCF_*` bus to publish, so a snapshot reading `iab` would promise the vendor-side
    /// record this build cannot produce. The web's own answer for that situation is the
    /// honest one: the categories behave as `opt-in`, so the snapshot reports `opt-in` and
    /// so does the `jurisdictionModel` of a save built from it. The resolution still names
    /// the matched IAB policy, so nothing about which rule matched is hidden.
    ///
    /// A report, not a permission. Every category decision still reads the real rule on
    /// ``EvaluationPolicy``.
    package var runtimeModel: ConsentModel {
        self == .iab ? .optIn : self
    }
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

/// A `CodingKey` that carries a consent category name verbatim.
///
/// Only needed because `CodingKeyRepresentable` wants a concrete key type; the
/// name is the wire key, with no integer form.
public struct CategoryCodingKey: CodingKey, Hashable {
    public let stringValue: String
    public var intValue: Int? { nil }

    public init?(stringValue: String) {
        self.stringValue = stringValue
    }

    public init?(intValue: Int) {
        nil
    }

    init(_ name: String) {
        stringValue = name
    }
}
