// The Global Vendor List that c15t's `/init` already serves.
//
// Three consumers want this document and they want different amounts of it. The
// consent dialog reads names, descriptions and retention off it
// (`packages/iab/src/headless/dialog-data.ts`), the TC String encoder reads four
// purpose lists plus the withdrawal date from each vendor
// (`TcStringEncoder.prunedVendorSignals`), and the store has to keep the whole thing
// so a relaunch renders the same dialog with no network. This is the one copy all
// three read, because a field list narrow enough to look tidy is a field list the
// dialog then has to go and re-fetch.
//
// The key names are the wire's, one for one, from `globalVendorListSchema` in
// `packages/schema/src/shared/gvl.ts`, with no mobile-side renaming: the React Native
// layer reads the JSON this model encodes, and a renamed key is invisible to Swift, to
// the fixtures, and to a TypeScript type, so it fails on a device and nowhere else.
//
// Storing a typed document rather than the raw bytes is safe here for one reason worth
// naming: `resolveGvl` in `packages/backend/src/http/gvl.ts` validates the upstream
// document against that schema before it puts it on `/init`, and valibot drops keys it
// does not declare. A served list therefore carries no key this model has never seen,
// which is what lets `StoredEnvelope` still give back every key path it read.

/// A purpose, special purpose, feature or special feature entry.
///
/// The GVL gives all four the same five fields, so one type stands in for all four
/// collections rather than four copies of the same decode.
public struct GVLDefinition: Sendable, Codable, Equatable {
    public let id: Int
    public let name: String
    public let description: String
    /// Long-form legal copy. Absent on most entries.
    public let descriptionLegal: String?
    /// Illustration URLs, newest GVLs aside.
    public let illustrations: [String]

    public init(
        id: Int,
        name: String = "",
        description: String = "",
        descriptionLegal: String? = nil,
        illustrations: [String] = []
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.descriptionLegal = descriptionLegal
        self.illustrations = illustrations
    }
}

/// A stack: a named bundle of purposes the dialog can offer as one row.
public struct GVLStack: Sendable, Codable, Equatable {
    public let id: Int
    public let name: String
    public let description: String
    /// Purpose ids the stack covers.
    public let purposes: [Int]
    public let specialFeatures: [Int]

    public init(
        id: Int,
        name: String = "",
        description: String = "",
        purposes: [Int] = [],
        specialFeatures: [Int] = []
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.purposes = purposes
        self.specialFeatures = specialFeatures
    }
}

/// A data category (`gvl.dataCategories`), which vendors reference by id.
public struct GVLDataCategory: Sendable, Codable, Equatable {
    public let id: Int
    public let name: String
    public let description: String

    public init(id: Int, name: String = "", description: String = "") {
        self.id = id
        self.name = name
        self.description = description
    }
}

/// One vendor's privacy-page links, in the language `langId` names.
public struct GVLVendorUrl: Sendable, Codable, Equatable {
    public let langId: String
    public let privacy: String?
    /// The vendor's claim to a legitimate interest, where it publishes one.
    public let legIntClaim: String?

    public init(langId: String, privacy: String? = nil, legIntClaim: String? = nil) {
        self.langId = langId
        self.privacy = privacy
        self.legIntClaim = legIntClaim
    }
}

/// How long a vendor keeps the data each purpose produces.
public struct GVLVendorDataRetention: Sendable, Codable, Equatable {
    /// Seconds, for purposes the per-purpose map does not name.
    public let stdRetention: Int?
    /// Purpose id to seconds.
    public let purposes: [Int: Int]
    /// Special purpose id to seconds.
    public let specialPurposes: [Int: Int]

    public init(
        stdRetention: Int? = nil,
        purposes: [Int: Int] = [:],
        specialPurposes: [Int: Int] = [:]
    ) {
        self.stdRetention = stdRetention
        self.purposes = purposes
        self.specialPurposes = specialPurposes
    }
}

/// A vendor's disclosure-endpoint budget.
public struct GVLVendorOverflow: Sendable, Codable, Equatable {
    public let httpGetLimit: Int

    public init(httpGetLimit: Int) {
        self.httpGetLimit = httpGetLimit
    }
}

/// One vendor's entry, which is most of what a preference center renders.
public struct GVLVendor: Sendable, Codable, Equatable {
    public let id: Int
    public let name: String
    /// Purposes claimed under a consent basis.
    public let purposes: [Int]
    /// Purposes claimed under a legitimate-interest basis.
    public let legIntPurposes: [Int]
    public let specialPurposes: [Int]
    /// Purposes whose basis a publisher restriction may switch.
    public let flexiblePurposes: [Int]
    public let features: [Int]
    public let specialFeatures: [Int]
    /// Nullable on the wire: the schema gives `cookieMaxAgeSeconds` as
    /// `v.nullable(v.number())`, so an explicit null and an absent key are the same
    /// answer, and neither is a refusal.
    public let cookieMaxAgeSeconds: Int?
    public let cookieRefresh: Bool
    public let usesCookies: Bool
    public let usesNonCookieAccess: Bool
    public let deviceStorageDisclosureUrl: String?
    public let urls: [GVLVendorUrl]
    public let dataCategories: [Int]?
    public let dataRetention: GVLVendorDataRetention?
    /// The date this vendor was withdrawn from the list, or nil while it is active.
    public let deletedDate: String?
    public let overflow: GVLVendorOverflow?

    public init(
        id: Int,
        name: String = "",
        purposes: [Int] = [],
        legIntPurposes: [Int] = [],
        specialPurposes: [Int] = [],
        flexiblePurposes: [Int] = [],
        features: [Int] = [],
        specialFeatures: [Int] = [],
        cookieMaxAgeSeconds: Int? = nil,
        cookieRefresh: Bool = false,
        usesCookies: Bool = false,
        usesNonCookieAccess: Bool = false,
        deviceStorageDisclosureUrl: String? = nil,
        urls: [GVLVendorUrl] = [],
        dataCategories: [Int]? = nil,
        dataRetention: GVLVendorDataRetention? = nil,
        deletedDate: String? = nil,
        overflow: GVLVendorOverflow? = nil
    ) {
        self.id = id
        self.name = name
        self.purposes = purposes
        self.legIntPurposes = legIntPurposes
        self.specialPurposes = specialPurposes
        self.flexiblePurposes = flexiblePurposes
        self.features = features
        self.specialFeatures = specialFeatures
        self.cookieMaxAgeSeconds = cookieMaxAgeSeconds
        self.cookieRefresh = cookieRefresh
        self.usesCookies = usesCookies
        self.usesNonCookieAccess = usesNonCookieAccess
        self.deviceStorageDisclosureUrl = deviceStorageDisclosureUrl
        self.urls = urls
        self.dataCategories = dataCategories
        self.dataRetention = dataRetention
        self.deletedDate = deletedDate
        self.overflow = overflow
    }

    /// Whether this vendor was withdrawn from the list.
    ///
    /// The reference tests the field for truthiness rather than comparing it to a
    /// clock: `GVL.js` drops any vendor whose `deletedDate` is set out of
    /// `gvl.vendors` altogether, and `SemanticPreEncoder.js` checks the same field
    /// again on the way to the encoder. A positive signal for a withdrawn vendor is
    /// not a signal, so an encoder that kept it would disclose a vendor the framework
    /// no longer lists. An empty string is therefore an active vendor, and that reads
    /// as deliberate rather than as a hole: it is what the reference does, and the
    /// Kotlin core's `TcVendor.deletedDate` makes the same call.
    public var isDeleted: Bool {
        guard let deletedDate else { return false }
        return !deletedDate.isEmpty
    }
}

/// The IAB Global Vendor List as `/init` serves it.
///
/// The document is a value: nothing here fetches, caches, or nudges a language file,
/// which is `packages/iab/src/tcf/fetch-gvl.ts`'s job on the web and the backend's
/// job here (`resolveGvl`), and is the reason a mobile core can hold a whole list in
/// a snapshot without owning a network call.
///
/// Every id-keyed collection is keyed by number because that is what callers ask it
/// for (`gvl.vendors[755]`), and the reader accepts both shapes the wire comes in: the
/// sparse object `globalVendorListSchema` declares, and the dense array older GVL
/// publications use. `dialog-data.ts` gets away with the same tolerance by running
/// `Object.entries` over either, so both platforms read the same document.
public struct GlobalVendorList: Sendable, Codable, Equatable {
    /// `gvlSpecificationVersion`: the GVL document format revision.
    public let gvlSpecificationVersion: Int
    /// Which vendor list this is, into the TC String's `VendorListVersion`.
    public let vendorListVersion: Int
    /// The policy revision this list was published under, into `TcfPolicyVersion`.
    /// A live list says 5; a build that hardcoded anything else would advertise a
    /// policy no current publisher generates.
    public let tcfPolicyVersion: Int
    public let lastUpdated: String
    public let purposes: [Int: GVLDefinition]
    public let specialPurposes: [Int: GVLDefinition]
    public let features: [Int: GVLDefinition]
    public let specialFeatures: [Int: GVLDefinition]
    public let stacks: [Int: GVLStack]
    /// Optional on the wire, unlike the four collections above.
    public let dataCategories: [Int: GVLDataCategory]?
    public let vendors: [Int: GVLVendor]

    public init(
        gvlSpecificationVersion: Int = 0,
        vendorListVersion: Int,
        tcfPolicyVersion: Int,
        lastUpdated: String = "",
        purposes: [Int: GVLDefinition] = [:],
        specialPurposes: [Int: GVLDefinition] = [:],
        features: [Int: GVLDefinition] = [:],
        specialFeatures: [Int: GVLDefinition] = [:],
        stacks: [Int: GVLStack] = [:],
        dataCategories: [Int: GVLDataCategory]? = nil,
        vendors: [Int: GVLVendor] = [:]
    ) {
        self.gvlSpecificationVersion = gvlSpecificationVersion
        self.vendorListVersion = vendorListVersion
        self.tcfPolicyVersion = tcfPolicyVersion
        self.lastUpdated = lastUpdated
        self.purposes = purposes
        self.specialPurposes = specialPurposes
        self.features = features
        self.specialFeatures = specialFeatures
        self.stacks = stacks
        self.dataCategories = dataCategories
        self.vendors = vendors
    }

    /// The entry for one vendor, the way every caller on both platforms asks for it:
    /// `gvl.vendors[755]` on the web, `gvl.vendor(755)` here.
    ///
    /// One difference worth knowing before a dialog draws from it. A withdrawn vendor stays
    /// in this dictionary, because it stays in the served document, while the web's `GVL`
    /// class deletes it from `vendors` at construction and keeps it only in `fullVendorList`.
    /// Check ``GVLVendor/isDeleted`` before offering an entry to a subject. The encoder does
    /// not need the warning: ``TcVendorDeclaration/deletedDate`` travels with the entry, so
    /// a signal for a withdrawn vendor is dropped wherever the list reaches the string.
    public func vendor(_ id: Int) -> GVLVendor? {
        vendors[id]
    }
}

// MARK: - Reading a served list

extension GlobalVendorList {
    /// Read `/init`'s `gvl`, or `nil` when the core has to read the field as absent.
    ///
    /// The gate is `packages/iab/src/tcf/fetch-gvl.ts`, which accepts a list only when
    /// `vendorListVersion`, `purposes` and `vendors` are there and `tcfPolicyVersion`
    /// is a safe integer of at least 1, and otherwise throws the document away. Two
    /// deliberate differences from reading that line in JavaScript:
    ///
    /// - A `vendorListVersion` or `tcfPolicyVersion` that is not a whole number is
    ///   refused. JavaScript's `!gvl.vendorListVersion` lets a string or a fraction
    ///   through, and the encoder then has nothing to write into a 12-bit field.
    /// - `purposes` and `vendors` have to be collections. A truthy string passes the
    ///   JavaScript check and reaches a dialog that renders nothing.
    ///
    /// Both differences land on "read the list as absent", which is the safe side: no
    /// permission moves either way, and nothing on the snapshot changes.
    ///
    /// - Parameter value: the `gvl` field of an `/init` body, as parsed.
    /// - Returns: the list, or `nil` for absent, `null`, and anything the gate refuses.
    static func read(from value: JSONValue?) -> GlobalVendorList? {
        guard let fields = value?.objectValue, passesReadGate(fields) else { return nil }
        return read(fields: fields)
    }

    /// The `fetch-gvl.ts` accept rule, on its own, so both the transport read and the
    /// stored-envelope read run the identical gate.
    private static func passesReadGate(_ fields: [String: JSONValue]) -> Bool {
        // `!gvl.vendorListVersion`: a list numbered 0 is not a list.
        guard let vendorListVersion = fields["vendorListVersion"]?.intValue,
              vendorListVersion != 0
        else { return false }
        guard let policyVersion = fields["tcfPolicyVersion"]?.intValue, policyVersion >= 1
        else { return false }
        guard fields["purposes"]?.arrayValue != nil || fields["purposes"]?.objectValue != nil
        else { return false }
        guard fields["vendors"]?.arrayValue != nil || fields["vendors"]?.objectValue != nil
        else { return false }
        return true
    }

    /// Read past the gate.
    ///
    /// Individual fields stay forgiving, because `dialog-data.ts` reads them that way
    /// (`vendor.purposes || []`, `gvl.specialPurposes || {}`): the list is a third-party
    /// document, and one vendor missing a `name` is a renameable detail, not a reason
    /// to leave a device with no vendor list at all. That is the split this reader
    /// keeps: strict about whether there is a list, forgiving about what is in it.
    private static func read(fields: [String: JSONValue]) -> GlobalVendorList {
        GlobalVendorList(
            gvlSpecificationVersion: int(fields["gvlSpecificationVersion"]) ?? 0,
            vendorListVersion: int(fields["vendorListVersion"]) ?? 0,
            tcfPolicyVersion: int(fields["tcfPolicyVersion"]) ?? 0,
            lastUpdated: fields["lastUpdated"]?.stringValue ?? "",
            purposes: definitions(fields["purposes"]),
            specialPurposes: definitions(fields["specialPurposes"]),
            features: definitions(fields["features"]),
            specialFeatures: definitions(fields["specialFeatures"]),
            stacks: keyed(fields["stacks"]) { entry, id in
                GVLStack(
                    id: id,
                    name: entry["name"]?.stringValue ?? "",
                    description: entry["description"]?.stringValue ?? "",
                    purposes: ints(entry["purposes"]),
                    specialFeatures: ints(entry["specialFeatures"])
                )
            },
            dataCategories: dataCategories(fields["dataCategories"]),
            vendors: keyed(fields["vendors"]) { entry, id in
                GVLVendor(
                    id: id,
                    name: entry["name"]?.stringValue ?? "",
                    purposes: ints(entry["purposes"]),
                    legIntPurposes: ints(entry["legIntPurposes"]),
                    specialPurposes: ints(entry["specialPurposes"]),
                    flexiblePurposes: ints(entry["flexiblePurposes"]),
                    features: ints(entry["features"]),
                    specialFeatures: ints(entry["specialFeatures"]),
                    cookieMaxAgeSeconds: int(entry["cookieMaxAgeSeconds"]),
                    cookieRefresh: entry["cookieRefresh"]?.boolValue ?? false,
                    usesCookies: entry["usesCookies"]?.boolValue ?? false,
                    usesNonCookieAccess: entry["usesNonCookieAccess"]?.boolValue ?? false,
                    deviceStorageDisclosureUrl: text(entry["deviceStorageDisclosureUrl"]),
                    urls: urls(entry["urls"]),
                    dataCategories: optionalInts(entry["dataCategories"]),
                    dataRetention: retention(entry["dataRetention"]),
                    deletedDate: text(entry["deletedDate"]),
                    overflow: entry["overflow"]?.objectValue.flatMap {
                        int($0["httpGetLimit"]).map(GVLVendorOverflow.init(httpGetLimit:))
                    }
                )
            }
        )
    }

    /// Data categories, present only when the list publishes them.
    ///
    /// An empty optional reads as absent rather than as an empty object: the schema
    /// declares this one `v.optional` where the four collections above are required,
    /// and the difference decides whether the key is written back at all.
    private static func dataCategories(
        _ value: JSONValue?
    ) -> [Int: GVLDataCategory]? {
        let read = keyed(value) { entry, id in
            GVLDataCategory(
                id: id,
                name: entry["name"]?.stringValue ?? "",
                description: entry["description"]?.stringValue ?? ""
            )
        }
        return read.isEmpty ? nil : read
    }

    private static func definitions(_ value: JSONValue?) -> [Int: GVLDefinition] {
        keyed(value) { entry, id in
            GVLDefinition(
                id: id,
                name: entry["name"]?.stringValue ?? "",
                description: entry["description"]?.stringValue ?? "",
                descriptionLegal: text(entry["descriptionLegal"]),
                illustrations: (entry["illustrations"]?.arrayValue ?? []).compactMap(\.stringValue)
            )
        }
    }

    private static func urls(_ value: JSONValue?) -> [GVLVendorUrl] {
        (value?.arrayValue ?? []).compactMap { item in
            guard let fields = item.objectValue else { return nil }
            return GVLVendorUrl(
                langId: fields["langId"]?.stringValue ?? "",
                privacy: text(fields["privacy"]),
                legIntClaim: text(fields["legIntClaim"])
            )
        }
    }

    private static func retention(
        _ value: JSONValue?
    ) -> GVLVendorDataRetention? {
        guard let fields = value?.objectValue else { return nil }
        return GVLVendorDataRetention(
            stdRetention: int(fields["stdRetention"]),
            purposes: idKeyedInts(fields["purposes"]),
            specialPurposes: idKeyedInts(fields["specialPurposes"])
        )
    }

    /// Walk an id-keyed collection that arrives either as an object with numeric keys
    /// or as a dense array.
    ///
    /// An array entry is keyed by its own `id` when it carries a numeric one, which is
    /// what the array-shaped publications put in each entry, and by its position
    /// otherwise, one-based, because that is where the purposes actually sit. A sparse
    /// object with holes reads as the holes it has. Keys that are not numbers are
    /// dropped rather than guessed at: every caller of these collections asks for a
    /// number, and `dialog-data.ts` would hand a non-numeric id to `Number()` and get
    /// `NaN`.
    private static func keyed<Value>(
        _ value: JSONValue?,
        build: (_ entry: [String: JSONValue], _ id: Int) -> Value?
    ) -> [Int: Value] {
        var result: [Int: Value] = [:]
        switch value {
        case let .object(fields):
            for (name, item) in fields {
                guard let id = Int(name), let entry = item.objectValue,
                      let built = build(entry, id)
                else { continue }
                result[id] = built
            }
        case let .array(items):
            for (offset, item) in items.enumerated() {
                guard let entry = item.objectValue else { continue }
                let id = int(entry["id"]) ?? offset + 1
                guard let built = build(entry, id) else { continue }
                result[id] = built
            }
        default:
            break
        }
        return result
    }

    /// An id list, forgiving about its contents the way the dialog is: a member that is
    /// not a number is dropped rather than turned into a purpose nobody declared.
    private static func ints(_ value: JSONValue?) -> [Int] {
        (value?.arrayValue ?? []).compactMap(int)
    }

    private static func idKeyedInts(_ value: JSONValue?) -> [Int: Int] {
        var result: [Int: Int] = [:]
        switch value {
        case let .object(fields):
            for (name, item) in fields {
                guard let id = Int(name), let number = int(item) else { continue }
                result[id] = number
            }
        case let .array(items):
            for (offset, item) in items.enumerated() {
                guard let number = int(item) else { continue }
                result[offset + 1] = number
            }
        default:
            break
        }
        return result
    }

    /// Integral view of a field, reading an explicit null as "not there".
    private static func int(_ value: JSONValue?) -> Int? {
        value?.intValue.map(Int.init)
    }

    /// A list of ids that may legitimately be absent, as opposed to empty.
    private static func optionalInts(_ value: JSONValue?) -> [Int]? {
        guard value?.arrayValue != nil else { return nil }
        return ints(value)
    }

    /// Text view of a field, reading an explicit null and an empty string both as
    /// "not there", so a stored list does not carry a key that says nothing.
    private static func text(_ value: JSONValue?) -> String? {
        guard let text = value?.stringValue, !text.isEmpty else { return nil }
        return text
    }
}

// MARK: - Persistence

extension GlobalVendorList {
    /// A list carried in stored bytes, or `nil` when it is not one.
    ///
    /// The gate is the transport's gate, unchanged, for the reason `native/CONTRACT.md`
    /// gives about stored bytes: an envelope this build cannot read has to read as
    /// nothing stored, and a half-parsed list would render a dialog with rows nobody
    /// served. A list this build wrote always passes the gate, because the encoder
    /// writes every field the gate asks for, so the only bytes that fail here are bytes
    /// this build did not write.
    ///
    /// - Parameter value: the `gvl` value as it came out of storage.
    /// - Returns: the list, or `nil` when the stored value is no list at all.
    static func stored(_ value: JSONValue) -> GlobalVendorList? {
        guard let fields = value.objectValue, passesReadGate(fields) else { return nil }
        return read(fields: fields)
    }

    public init(from decoder: any Decoder) throws {
        let value = try JSONValue(from: decoder)
        guard let parsed = Self.stored(value) else {
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: decoder.codingPath,
                    debugDescription: "a stored gvl is not a vendor list this build can serve"
                )
            )
        }
        self = parsed
    }
}

// MARK: - As a TC vendor list

extension TcVendorList {
    /// Read a served vendor list as the vendor-list facts the encoder needs.
    ///
    /// This is the seam the encode path wanted: `TcStringEncoder` took a hand-in
    /// ``TcVendorList`` and nothing else, which made a `/init`-served ``GlobalVendorList``
    /// unusable for it even though the served document is a superset of the four lists and
    /// the withdrawal date the pruning pass reads. Both routes now arrive at the same
    /// ``TcVendorList``, so the vendor-validity pruning runs identically over a list the
    /// app handed over and a list the backend served: one pass, not a second opinion.
    ///
    /// `language` is the reference's, not the document's. A GVL JSON file carries no
    /// language: `new GVL(json)` in `@iabtechlabtcf/core` sets `lang_` to `DEFAULT_LANGUAGE`
    /// and only `changeLanguage(_:)` moves it off EN, and `packages/iab/src/tcf/tc-string.ts`
    /// does the former, so a web string written against a French list says `FR` only because
    /// someone called `changeLanguage`. This build has no language-switch step to model, so
    /// it takes the same default, and nothing here invents one from the request's Accept-Language.
    ///
    /// - Parameter gvl: the list `/init` served, already past the accept gate.
    package init(gvl: GlobalVendorList) {
        self.init(
            language: "EN",
            vendorListVersion: gvl.vendorListVersion,
            tcfPolicyVersion: gvl.tcfPolicyVersion,
            vendors: gvl.vendors.values.map { vendor in
                TcVendorDeclaration(
                    id: vendor.id,
                    purposes: vendor.purposes,
                    legitimateInterests: vendor.legIntPurposes,
                    flexiblePurposes: vendor.flexiblePurposes,
                    specialPurposes: vendor.specialPurposes,
                    deletedDate: vendor.deletedDate
                )
            }
        )
    }
}
