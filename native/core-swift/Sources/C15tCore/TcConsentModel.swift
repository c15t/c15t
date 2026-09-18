import Foundation

// What a CMP hands the encoder, before anyone has decided how it goes on the wire.
//
// This is the domain side of the split `PolicyWire.swift` and
// `ConsentSnapshot.swift` already keep: `TcString` is a decoded TC String with the
// shape the wire used, and this is the consent state a build starts from when no
// string exists yet. Encoding a model therefore has two steps: choose a wire shape
// for each ID vector (`TcStringEncoder.shape`), then write it (`TcStringEncoder`).

/// One vendor's declaration, as far as encoding cares.
///
/// These four lists are the whole of what the encoder reads from a vendor list: the
/// reference clears a positive vendor signal for a basis the vendor never declared,
/// and it needs nothing else to decide that.
package struct TcVendorDeclaration: Sendable, Equatable {
    package let id: Int
    /// Purposes the vendor claims consent as a basis for.
    package let purposes: [Int]
    /// Purposes the vendor claims legitimate interest as a basis for.
    package let legitimateInterests: [Int]
    /// Purposes that can flip basis under a publisher restriction.
    package let flexiblePurposes: [Int]
    package let specialPurposes: [Int]
    /// A soft-deleted vendor keeps its entry and loses its signals.
    package let isDeleted: Bool

    package init(
        id: Int,
        purposes: [Int] = [],
        legitimateInterests: [Int] = [],
        flexiblePurposes: [Int] = [],
        specialPurposes: [Int] = [],
        isDeleted: Bool = false
    ) {
        self.id = id
        self.purposes = purposes
        self.legitimateInterests = legitimateInterests
        self.flexiblePurposes = flexiblePurposes
        self.specialPurposes = specialPurposes
        self.isDeleted = isDeleted
    }
}

/// The vendor-list facts an encoder has to agree with the web build about.
///
/// `vendorListVersion`, `tcfPolicyVersion` and `consentLanguage` are not really
/// model fields: with a vendor list attached the reference reads all three off it
/// and ignores whatever the model holds. `tcfPolicyVersion` in particular is a
/// property of the list, so a build that hardcoded one would advertise something no
/// live list carries. This is a value carrying those scalars plus the per-vendor
/// declarations, not a GVL object: nothing here fetches, parses or caches a list.
package struct TcVendorList: Sendable, Equatable {
    package let language: String
    package let vendorListVersion: Int
    package let tcfPolicyVersion: Int
    package let vendors: [TcVendorDeclaration]
    /// The same vendors by id.
    ///
    /// Indexed once at construction because the pruning pass asks one question per
    /// positive signal -- does vendor N exist, and does it declare this basis -- and a
    /// list served by `/init` names over a thousand vendors. Rescanning the array for
    /// each answer puts the cost of one string at quadratic in the size of the list,
    /// which is the reason `TcVendorList` in the Kotlin core keeps the same index.
    /// A repeated id keeps the first entry, which is what the linear scan this replaced
    /// answered with; no real list repeats one.
    private let byId: [Int: TcVendorDeclaration]

    package init(
        language: String,
        vendorListVersion: Int,
        tcfPolicyVersion: Int,
        vendors: [TcVendorDeclaration]
    ) {
        self.language = language
        self.vendorListVersion = vendorListVersion
        self.tcfPolicyVersion = tcfPolicyVersion
        self.vendors = vendors
        var index: [Int: TcVendorDeclaration] = [:]
        for declaration in vendors where index[declaration.id] == nil {
            index[declaration.id] = declaration
        }
        byId = index
    }

    package func vendor(_ id: Int) -> TcVendorDeclaration? {
        byId[id]
    }
}

/// The options the reference calls `EncodeOptions`.
package struct TcEncodingOptions: Sendable, Equatable {
    /// Which field sequence to lay down. Only 2 exists.
    package let version: Int
    /// Whether this string is handed to vendors through the CMP API rather than
    /// stored. It decides which optional segments the string carries.
    package let isForVendors: Bool

    package init(version: Int = 2, isForVendors: Bool = false) {
        self.version = version
        self.isForVendors = isForVendors
    }
}

/// Consent state waiting to be encoded.
///
/// Every ID collection is a plain set: unlike `TcIDVector` it holds no declared
/// width and no range entries, because those are properties of a string, not of a
/// decision. A model that has been decoded carries them and should be re-encoded
/// with `TcStringEncoder.encode(_:)` verbatim instead of coming through here.
package struct TcConsentModel: Sendable, Equatable {
    package var version: Int = 2
    package var created: Date
    package var lastUpdated: Date
    package var cmpId: Int
    package var cmpVersion: Int
    package var consentScreen: Int
    /// Overwritten by the vendor list's language during encoding.
    package var consentLanguage: String
    package var publisherCountryCode: String
    package var isServiceSpecific: Bool
    package var useNonStandardTexts: Bool
    package var purposeOneTreatment: Bool
    /// `IABTCF_SupportOOB` on the bus. Not a string field: it decides whether the
    /// out-of-band segments are written at all.
    package var supportOOB: Bool
    package var specialFeatureOptIns: Set<Int> = []
    package var purposeConsents: Set<Int> = []
    package var purposeLegitimateInterests: Set<Int> = []
    package var vendorConsents: Set<Int> = []
    package var vendorLegitimateInterests: Set<Int> = []
    package var vendorsDisclosed: Set<Int> = []
    package var vendorsAllowed: Set<Int> = []
    package var publisherConsents: Set<Int> = []
    package var publisherLegitimateInterests: Set<Int> = []
    package var numCustomPurposes: Int = 0
    package var publisherCustomConsents: Set<Int> = []
    package var publisherCustomLegitimateInterests: Set<Int> = []
    package var publisherRestrictions: [TcPublisherRestriction] = []

    package init(
        created: Date,
        lastUpdated: Date,
        cmpId: Int,
        cmpVersion: Int,
        consentScreen: Int,
        consentLanguage: String,
        publisherCountryCode: String,
        isServiceSpecific: Bool,
        useNonStandardTexts: Bool = false,
        purposeOneTreatment: Bool = false,
        supportOOB: Bool = false
    ) {
        self.created = created
        self.lastUpdated = lastUpdated
        self.cmpId = cmpId
        self.cmpVersion = cmpVersion
        self.consentScreen = consentScreen
        self.consentLanguage = consentLanguage
        self.publisherCountryCode = publisherCountryCode
        self.isServiceSpecific = isServiceSpecific
        self.useNonStandardTexts = useNonStandardTexts
        self.purposeOneTreatment = purposeOneTreatment
        self.supportOOB = supportOOB
    }
}
