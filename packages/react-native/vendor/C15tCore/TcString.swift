import Foundation

// The TC String domain model.
//
// This is the value a decode produces and an encode consumes; nothing here reads a
// bit stream. The separation is the same one `PolicyWire.swift` keeps from
// `ConsentSnapshot.swift`: this file states what a TC String means,
// `TcStringWire.swift` is the only thing that knows how it is spelled.
//
// Every field is named after the Consent String Formats v2 document. Where the
// reference implementation spells a field differently, the two are called out:
// `tcfPolicyVersion` is the spec name, `Fields.policyVersion` is the reference's.

/// Widths taken from the format document, kept in one place so a segment reader
/// cannot drift from the table it is implementing.
///
/// These match `encoder/BitLength.js` in `@iabtechlabtcf/core` field for field.
enum TcBitWidth {
    static let segmentType = 3
    static let version = 6
    /// `Created` and `LastUpdated` share one width: 36 bits counting in units of
    /// 100 ms, so a tenth of a second. One constant, because a reader that reached for `Created` while
    /// reading `LastUpdated` would be right by luck and wrong the moment the table
    /// was corrected.
    static let timestamp = 36
    static let cmpId = 12
    static let cmpVersion = 12
    static let consentScreen = 6
    /// `ConsentLanguage` and `PublisherCountryCode` share one shape: two letters,
    /// six bits each, `A` is 0.
    static let twoLetterCode = 12
    /// One letter of a ``twoLetterCode``.
    static let letter = 6
    static let vendorListVersion = 12
    static let tcfPolicyVersion = 6
    static let specialFeatureOptIns = 12
    /// The format reserves 24 purpose bits rather than sizing to the GVL, so the
    /// core segment has a stable length across GVL revisions.
    static let purposes = 24
    static let maxId = 16
    static let numEntries = 12
    static let vendorId = 16
    static let numPublisherRestrictions = 12
    static let purposeId = 6
    static let restrictionType = 2
    static let numCustomPurposes = 6
    // The single-bit fields (`IsServiceSpecific`, `UseNonStandardTexts`,
    // `PurposeOneTreatment`, `IsRangeEncoding`, `IsARange`) go through `readFlag`
    // and `write(_:)`, which are one bit by definition and need no width here.
}

/// Which part of a TC String a segment carries.
///
/// The raw 3-bit value is the segment type on the wire. The core segment carries no
/// type field of its own, so `.core` never appears after a segment header.
package enum TcSegment: Int, Sendable, CaseIterable {
    case core = 0
    case vendorsDisclosed = 1
    case vendorsAllowed = 2
    case publisherTC = 3
}

/// One single-ID or range entry of a `RangeEntry` list.
///
/// `isRange` is stored rather than derived from `start == end`. A producer is
/// allowed to write `IsARange = 1` with both ids equal, and an encoder that
/// re-derived the flag from the values would emit a different, shorter entry for
/// that string.
package struct TcIDRun: Sendable, Equatable {
    package let start: Int
    package let end: Int
    package let isRange: Bool

    package init(start: Int, end: Int, isRange: Bool) {
        self.start = start
        self.end = end
        self.isRange = isRange
    }

    /// Every ID the entry covers, inclusive.
    package var ids: ClosedRange<Int>? {
        guard start <= end else {
            return nil
        }
        return start...end
    }
}

/// How an ID list section spells its IDs.
package enum TcIDVectorEncoding: Sendable, Equatable {
    /// No header at all: the section's width is fixed by the format, which is how
    /// purposes, features, and publisher custom purposes are carried.
    case fixedWidth(bitWidth: Int)
    /// `IsRangeEncoding = 0`: `MaxVendorId`, then one bit per ID up to it.
    case bitField(maxId: Int)
    /// `IsRangeEncoding = 1`: `MaxVendorId`, `NumEntries`, then that many entries.
    case ranges(maxId: Int, entries: [TcIDRun])
}

/// A section of per-ID signals.
///
/// `encoding` keeps the shape the wire used, including the declared `MaxVendorId`.
/// The reference implementation throws the declared width away and recomputes it
/// from the highest positive ID, which is why it cannot re-encode some real strings.
/// Keeping it costs one integer and makes the round trip exact for those strings.
package struct TcIDVector: Sendable, Equatable {
    package let ids: Set<Int>
    package let encoding: TcIDVectorEncoding

    package init(ids: Set<Int>, encoding: TcIDVectorEncoding) {
        self.ids = ids
        self.encoding = encoding
    }

    /// `MaxVendorId` as declared, or the fixed width for a headerless section.
    package var declaredMaxId: Int {
        switch encoding {
        case let .fixedWidth(bitWidth):
            bitWidth
        case let .bitField(maxId):
            maxId
        case let .ranges(maxId, _):
            maxId
        }
    }

    package func contains(_ id: Int) -> Bool {
        ids.contains(id)
    }

    package var isEmpty: Bool {
        ids.isEmpty
    }

    /// An all-denied section, which is what an encode starts from.
    package static func empty(fixedWidth bitWidth: Int) -> TcIDVector {
        TcIDVector(ids: [], encoding: .fixedWidth(bitWidth: bitWidth))
    }
}

/// `RestrictionType`, the 2-bit discriminator of a publisher restriction.
package enum TcRestrictionType: Int, Sendable, CaseIterable {
    /// The purpose is flatly not allowed, whatever the vendor declared.
    case notAllowed = 0
    /// Flip the vendor's legitimate-interest basis to consent.
    case requireConsent = 1
    /// Flip the vendor's consent basis to legitimate interest.
    case requireLegitimateInterest = 2
}

/// One `PubRestrictionEntry`: a purpose, how the publisher overrides it, and the
/// vendors the override applies to.
package struct TcPublisherRestriction: Sendable, Equatable {
    package let purposeId: Int
    package let restrictionType: TcRestrictionType
    /// Preserved as written, so a re-encode is byte-identical.
    package let entries: [TcIDRun]

    package init(purposeId: Int, restrictionType: TcRestrictionType, entries: [TcIDRun]) {
        self.purposeId = purposeId
        self.restrictionType = restrictionType
        self.entries = entries
    }

    /// Every vendor ID the restriction covers, flattened across entries.
    package var vendorIds: Set<Int> {
        var result: Set<Int> = []
        for entry in entries {
            if let range = entry.ids {
                result.formUnion(range)
            }
        }
        return result
    }
}

/// The optional publisher TC segment.
package struct TcPublisherSection: Sendable, Equatable {
    package var publisherConsents: TcIDVector
    package var publisherLegitimateInterests: TcIDVector
    package var numCustomPurposes: Int
    package var publisherCustomConsents: TcIDVector
    package var publisherCustomLegitimateInterests: TcIDVector

    package init(
        publisherConsents: TcIDVector,
        publisherLegitimateInterests: TcIDVector,
        numCustomPurposes: Int,
        publisherCustomConsents: TcIDVector,
        publisherCustomLegitimateInterests: TcIDVector
    ) {
        self.publisherConsents = publisherConsents
        self.publisherLegitimateInterests = publisherLegitimateInterests
        self.numCustomPurposes = numCustomPurposes
        self.publisherCustomConsents = publisherCustomConsents
        self.publisherCustomLegitimateInterests = publisherCustomLegitimateInterests
    }
}

/// A decoded TC String, held as the fields the format defines.
package struct TcString: Sendable, Equatable {
    package var version: Int
    package var created: Date
    package var lastUpdated: Date
    package var cmpId: Int
    package var cmpVersion: Int
    package var consentScreen: Int
    /// Two letters, `A` through `Z`.
    package var consentLanguage: String
    package var vendorListVersion: Int
    /// The GVL's `tcfPolicyVersion`. A live GVL carries 5; a build that hardcodes
    /// anything else will not match what a publisher emits.
    package var tcfPolicyVersion: Int
    package var isServiceSpecific: Bool
    /// `UseNonStandardTexts` on the wire. The CMP API bus name for the same fact is
    /// `IABTCF_UseNonStandardTexts`; the two IAB layers are what they are.
    package var useNonStandardTexts: Bool
    package var specialFeatureOptIns: TcIDVector
    package var purposeConsents: TcIDVector
    package var purposeLegitimateInterests: TcIDVector
    package var purposeOneTreatment: Bool
    package var publisherCountryCode: String
    package var vendorConsents: TcIDVector
    package var vendorLegitimateInterests: TcIDVector
    /// `NumPubRestrictions` and the entries after it. Always decoded, even when
    /// empty, because the count is mandatory in the core segment.
    package var publisherRestrictions: [TcPublisherRestriction]
    package var vendorsDisclosed: TcIDVector?
    package var vendorsAllowed: TcIDVector?
    package var publisherSection: TcPublisherSection?
    /// The segments present, in the order the string carried them, so an encode can
    /// reproduce the same layout instead of imposing its own.
    package var segmentOrder: [TcSegment]

    package init(
        version: Int = 2,
        created: Date,
        lastUpdated: Date,
        cmpId: Int,
        cmpVersion: Int,
        consentScreen: Int,
        consentLanguage: String,
        vendorListVersion: Int,
        tcfPolicyVersion: Int,
        isServiceSpecific: Bool,
        useNonStandardTexts: Bool,
        specialFeatureOptIns: TcIDVector,
        purposeConsents: TcIDVector,
        purposeLegitimateInterests: TcIDVector,
        purposeOneTreatment: Bool,
        publisherCountryCode: String,
        vendorConsents: TcIDVector,
        vendorLegitimateInterests: TcIDVector,
        publisherRestrictions: [TcPublisherRestriction],
        vendorsDisclosed: TcIDVector? = nil,
        vendorsAllowed: TcIDVector? = nil,
        publisherSection: TcPublisherSection? = nil,
        segmentOrder: [TcSegment] = [.core]
    ) {
        self.version = version
        self.created = created
        self.lastUpdated = lastUpdated
        self.cmpId = cmpId
        self.cmpVersion = cmpVersion
        self.consentScreen = consentScreen
        self.consentLanguage = consentLanguage
        self.vendorListVersion = vendorListVersion
        self.tcfPolicyVersion = tcfPolicyVersion
        self.isServiceSpecific = isServiceSpecific
        self.useNonStandardTexts = useNonStandardTexts
        self.specialFeatureOptIns = specialFeatureOptIns
        self.purposeConsents = purposeConsents
        self.purposeLegitimateInterests = purposeLegitimateInterests
        self.purposeOneTreatment = purposeOneTreatment
        self.publisherCountryCode = publisherCountryCode
        self.vendorConsents = vendorConsents
        self.vendorLegitimateInterests = vendorLegitimateInterests
        self.publisherRestrictions = publisherRestrictions
        self.vendorsDisclosed = vendorsDisclosed
        self.vendorsAllowed = vendorsAllowed
        self.publisherSection = publisherSection
        self.segmentOrder = segmentOrder
    }
}
