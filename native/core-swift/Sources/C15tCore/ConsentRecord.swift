import Foundation

/// The policy contract a decision was confirmed against.
///
/// `legacyV2` exists so a record imported from the 2.x web SDK can be judged
/// against its own hash domain and never against a v3 choice fingerprint.
public enum ChoiceBasis: Sendable, Codable, Equatable {
    case choiceV1(fingerprint: String)
    case legacyV2(materialFingerprint: String?)

    private enum CodingKeys: String, CodingKey {
        case kind
        case fingerprint
        case materialFingerprint
    }

    private enum Kind: String, Codable {
        case choiceV1 = "choice-v1"
        case legacyV2 = "legacy-v2"
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        switch try container.decode(Kind.self, forKey: .kind) {
        case .choiceV1:
            self = .choiceV1(
                fingerprint: try container.decode(String.self, forKey: .fingerprint)
            )
        case .legacyV2:
            self = .legacyV2(
                materialFingerprint: try container
                    .decodeIfPresent(String.self, forKey: .materialFingerprint)
            )
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case let .choiceV1(fingerprint):
            try container.encode(Kind.choiceV1, forKey: .kind)
            try container.encode(fingerprint, forKey: .fingerprint)
        case let .legacyV2(materialFingerprint):
            try container.encode(Kind.legacyV2, forKey: .kind)
            // Omit rather than send null: the wire only ever carries the key
            // when a v2 material fingerprint exists.
            try container.encodeIfPresent(materialFingerprint, forKey: .materialFingerprint)
        }
    }

    /// The choice-v1 fingerprint, when this basis is one. Used to decide whether
    /// a stored decision still matches the live policy.
    var choiceFingerprint: String? {
        if case let .choiceV1(fingerprint) = self { return fingerprint }
        return nil
    }
}

/// One category's latest decision. `false` is a denial and never ages, which is
/// why validity is judged by the caller rather than stored here.
public struct CategoryDecision: Sendable, Codable, Equatable {
    public let value: Bool
    /// Epoch milliseconds.
    public let confirmedAt: Int64
    public let basis: ChoiceBasis

    public init(value: Bool, confirmedAt: Int64, basis: ChoiceBasis) {
        self.value = value
        self.confirmedAt = confirmedAt
        self.basis = basis
    }
}

/// The subject's explicit choices. An absent category is undecided, and the
/// evaluator fills it from the policy default without ever writing it back.
public struct ExplicitChoice: Sendable, Codable, Equatable {
    public static let currentVersion = 3

    public let version: Int
    public let categories: [OptionalConsentCategory: CategoryDecision]

    public init(categories: [OptionalConsentCategory: CategoryDecision], version: Int = 3) {
        self.version = version
        self.categories = categories
    }

    public static let empty = ExplicitChoice(categories: [:])

    /// Receipts merged in as the result of one action, all sharing the single
    /// `actionAt` captured before any I/O.
    init(
        merging receipts: [OptionalConsentCategory: Bool],
        into previous: ExplicitChoice?,
        actionAt: Int64,
        fingerprint: String
    ) {
        var categories = previous?.categories ?? [:]
        for category in OptionalConsentCategory.ordered {
            guard let value = receipts[category] else { continue }
            categories[category] = CategoryDecision(
                value: value,
                confirmedAt: actionAt,
                basis: .choiceV1(fingerprint: fingerprint)
            )
        }
        self.init(categories: categories)
    }

    /// Manual coding so an omitted category stays omitted. Absent means undecided,
    /// which is a different fact from `false`, and a synthesized conformance would
    /// not be able to refuse a key outside the category set.
    public func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(version, forKey: .version)
        var nested = container.nestedContainer(keyedBy: AnyKey.self, forKey: .categories)
        for category in OptionalConsentCategory.ordered {
            guard let decision = categories[category] else { continue }
            try nested.encode(decision, forKey: AnyKey(stringValue: category.rawValue))
        }
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let version = try container.decode(Int.self, forKey: .version)
        guard version == ExplicitChoice.currentVersion else {
            throw DecodingError.dataCorruptedError(
                forKey: .version,
                in: container,
                debugDescription: "Unsupported explicit-choice version \(version)"
            )
        }
        let nested = try container.nestedContainer(
            keyedBy: AnyKey.self,
            forKey: .categories
        )
        var categories: [OptionalConsentCategory: CategoryDecision] = [:]
        for key in nested.allKeys {
            guard let category = OptionalConsentCategory(rawValue: key.stringValue) else {
                throw DecodingError.dataCorruptedError(
                    forKey: key,
                    in: nested,
                    debugDescription: "Unknown consent category \"\(key.stringValue)\""
                )
            }
            categories[category] = try nested.decode(CategoryDecision.self, forKey: key)
        }
        self.init(categories: categories, version: version)
    }

    private enum CodingKeys: String, CodingKey {
        case version
        case categories
    }
}

/// A `CodingKey` that accepts any string, so unknown keys survive far enough to be
/// named in the error rather than vanishing from `allKeys`.
struct AnyKey: CodingKey {
    let stringValue: String
    var intValue: Int?

    init(stringValue: String) {
        self.stringValue = stringValue
        intValue = nil
    }

    init?(intValue: Int) {
        stringValue = String(intValue)
        self.intValue = intValue
    }
}

/// Local record that the current notice was dismissed. A dismissal is not a
/// choice and never grants anything.
public struct NoticeDismissal: Sendable, Codable, Equatable {
    public static let currentVersion = 1

    public let version: Int
    public let dismissedAt: Int64
    /// Notice prompt fingerprint the dismissal was made against.
    public let fingerprint: String

    public init(dismissedAt: Int64, fingerprint: String, version: Int = 1) {
        self.version = version
        self.dismissedAt = dismissedAt
        self.fingerprint = fingerprint
    }
}

/// A standing privacy directive recorded from a user-agent signal. It is a
/// privacy request, not a consent record, and it outlives the live signal.
public struct PrivacyOptOut: Sendable, Codable, Equatable {
    public let source: String
    public let categories: [OptionalConsentCategory]
    public let recordedAt: Int64

    public init(
        source: String = "gpc",
        categories: [OptionalConsentCategory],
        recordedAt: Int64
    ) {
        self.source = source
        self.categories = categories
        self.recordedAt = recordedAt
    }
}
