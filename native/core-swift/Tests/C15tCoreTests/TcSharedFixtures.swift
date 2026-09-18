import CryptoKit
import Foundation
import XCTest

@testable import C15tCore

/// One shared `tc-string` fixture, parsed.
///
/// The contract, per `native/protocol`: `input.model` plus `input.encodingOptions`
/// plus `input.vendorList` is the encoder's whole input, `expected.encode.tcString`
/// is the byte target, `expected.decode.fields` is what a decoder must report, and
/// `expects.decode` / `expects.encode` say which halves may be asserted at all.
struct TcFixtureVector {
    let id: String
    let file: String
    let population: String
    let notes: [String]
    let expectsDecode: Bool
    let expectsEncode: Bool
    let expectedTCString: String
    let expectedSegments: [String]
    let expectedSegmentTypes: [Int]
    let expectedFields: JSONValue
    let model: TcConsentModel
    let vendorList: TcVendorList
    let options: TcEncodingOptions
}

/// The only place this test target opens a tc-string fixture.
///
/// `native/protocol` is the corpus and the merge gate; the vectors lane owns it and
/// this target reads it and never writes it. Everything that needs a TC string comes
/// through here, so there is exactly one reader, one hash check and one parser, and no
/// TC string literal anywhere else in this target to drift out of date.
enum TcSharedFixtures {
    /// `native/protocol`, resolved from this file's path because `swift test` makes
    /// no promise about the working directory.
    static let directory: URL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .appendingPathComponent("protocol")

    enum LoadError: Error, CustomStringConvertible {
        case notIndexed(file: String)
        case missing(id: String)
        case hashMismatch(file: String, wanted: String, got: String)
        case malformed(file: String, detail: String)

        var description: String {
            switch self {
            case let .notIndexed(file):
                return "index.json does not list \(file)"
            case let .missing(id):
                return "no tc-string fixture named \(id) is in index.json"
            case let .hashMismatch(file, wanted, got):
                return "\(file) hashes to \(got), index.json says \(wanted): regenerate rather than comparing"
            case let .malformed(file, detail):
                return "\(file): \(detail)"
            }
        }
    }

    private struct IndexEntry: Decodable {
        let file: String
        let id: String
        let kind: String
        let sha256: String
    }

    private struct Index: Decodable {
        let fixtures: [IndexEntry]
    }

    /// Every tc-string fixture the index lists, in a stable order.
    static func all() throws -> [TcFixtureVector] {
        let data = try Data(contentsOf: directory.appendingPathComponent("index.json"))
        let index = try JSONDecoder().decode(Index.self, from: data)
        return try index.fixtures
            .filter { $0.kind == "tc-string" }
            .sorted { $0.file < $1.file }
            .map { try load($0) }
    }

    /// One fixture by the id the index gives it.
    static func vector(id: String) throws -> TcFixtureVector {
        let data = try Data(contentsOf: directory.appendingPathComponent("index.json"))
        let index = try JSONDecoder().decode(Index.self, from: data)
        guard let entry = index.fixtures.first(where: { $0.id == id && $0.kind == "tc-string" }) else {
            throw LoadError.missing(id: id)
        }
        return try load(entry)
    }

    /// Read a fixture and prove the bytes are the ones the generator hashed.
    ///
    /// A stale checkout looks exactly like a conformance failure, and the two deserve
    /// different messages.
    private static func load(_ entry: IndexEntry) throws -> TcFixtureVector {
        let data = try Data(contentsOf: directory.appendingPathComponent(entry.file))
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        guard digest == entry.sha256 else {
            throw LoadError.hashMismatch(file: entry.file, wanted: entry.sha256, got: digest)
        }
        guard let root = C15tJSON.parse(data) else {
            throw LoadError.malformed(file: entry.file, detail: "not JSON")
        }
        return try parse(root, entry: entry)
    }

    private static func parse(_ root: JSONValue, entry: IndexEntry) throws -> TcFixtureVector {
        guard let input = root["input"], let expected = root["expected"] else {
            throw LoadError.malformed(file: entry.file, detail: "no input or expected")
        }
        guard let encodeExpected = expected["encode"], let tcString = encodeExpected["tcString"]?.stringValue else {
            throw LoadError.malformed(file: entry.file, detail: "no expected.encode.tcString")
        }
        guard let fields = expected["decode"]?["fields"] else {
            throw LoadError.malformed(file: entry.file, detail: "no expected.decode.fields")
        }
        guard let rawModel = input["model"], let rawList = input["vendorList"] else {
            throw LoadError.malformed(file: entry.file, detail: "no input.model or input.vendorList")
        }
        guard let created = rawModel["created"]?.intValue, let lastUpdated = rawModel["lastUpdated"]?.intValue else {
            throw LoadError.malformed(file: entry.file, detail: "model carries no created or lastUpdated")
        }
        guard let language = rawList["language"]?.stringValue,
              let vendorListVersion = rawList["vendorListVersion"]?.intValue,
              let tcfPolicyVersion = rawList["tcfPolicyVersion"]?.intValue
        else {
            throw LoadError.malformed(
                file: entry.file,
                detail: "vendorList carries no language, version or policy version to take as scalars"
            )
        }

        var model = TcConsentModel(
            created: Date(timeIntervalSince1970: Double(created) / 1000),
            lastUpdated: Date(timeIntervalSince1970: Double(lastUpdated) / 1000),
            cmpId: Int(rawModel["cmpId"]?.intValue ?? 0),
            cmpVersion: Int(rawModel["cmpVersion"]?.intValue ?? 0),
            consentScreen: Int(rawModel["consentScreen"]?.intValue ?? 0),
            consentLanguage: rawModel["consentLanguage"]?.stringValue ?? "EN",
            publisherCountryCode: rawModel["publisherCountryCode"]?.stringValue ?? "US",
            isServiceSpecific: rawModel["isServiceSpecific"]?.boolValue ?? false,
            useNonStandardTexts: rawModel["useNonStandardTexts"]?.boolValue ?? false,
            purposeOneTreatment: rawModel["purposeOneTreatment"]?.boolValue ?? false,
            supportOOB: rawModel["supportOOB"]?.boolValue ?? false
        )
        model.version = Int(rawModel["version"]?.intValue ?? 2)
        model.specialFeatureOptIns = ids(rawModel["specialFeatureOptins"])
        model.purposeConsents = ids(rawModel["purposeConsents"])
        model.purposeLegitimateInterests = ids(rawModel["purposeLegitimateInterests"])
        model.vendorConsents = ids(rawModel["vendorConsents"])
        model.vendorLegitimateInterests = ids(rawModel["vendorLegitimateInterests"])
        model.vendorsDisclosed = ids(rawModel["vendorsDisclosed"])
        model.vendorsAllowed = ids(rawModel["vendorsAllowed"])
        model.publisherConsents = ids(rawModel["publisherConsents"])
        model.publisherLegitimateInterests = ids(rawModel["publisherLegitimateInterests"])
        model.numCustomPurposes = Int(rawModel["numCustomPurposes"]?.intValue ?? 0)
        model.publisherCustomConsents = ids(rawModel["publisherCustomConsents"])
        model.publisherCustomLegitimateInterests = ids(rawModel["publisherCustomLegitimateInterests"])
        model.publisherRestrictions = try restrictions(rawModel["publisherRestrictions"], entry.file)

        // The recorded list is a stub: language, two versions, and the per-vendor
        // purpose declarations. Nothing else, so nothing here pretends to hold a GVL,
        // and no deletions are recorded because the generator recorded none.
        var vendors: [TcVendorDeclaration] = []
        for vendor in rawList["vendors"]?.arrayValue ?? [] {
            guard let id = vendor["id"]?.intValue else {
                throw LoadError.malformed(file: entry.file, detail: "a vendorList vendor has no id")
            }
            vendors.append(
                TcVendorDeclaration(
                    id: Int(id),
                    purposes: list(vendor["purposes"]),
                    legitimateInterests: list(vendor["legIntPurposes"]),
                    flexiblePurposes: list(vendor["flexiblePurposes"]),
                    specialPurposes: list(vendor["specialPurposes"])
                )
            )
        }

        return TcFixtureVector(
            id: root["id"]?.stringValue ?? entry.id,
            file: entry.file,
            population: root["population"]?.stringValue ?? "",
            notes: (root["notes"]?.arrayValue ?? []).compactMap { $0.stringValue },
            expectsDecode: root["expects"]?["decode"]?.boolValue ?? false,
            expectsEncode: root["expects"]?["encode"]?.boolValue ?? false,
            expectedTCString: tcString,
            expectedSegments: (encodeExpected["segments"]?.arrayValue ?? []).compactMap { $0.stringValue },
            expectedSegmentTypes: (encodeExpected["segmentTypes"]?.arrayValue ?? []).compactMap { $0.intValue.map(Int.init) },
            expectedFields: fields,
            model: model,
            vendorList: TcVendorList(
                language: language,
                vendorListVersion: Int(vendorListVersion),
                tcfPolicyVersion: Int(tcfPolicyVersion),
                vendors: vendors
            ),
            options: TcEncodingOptions(
                version: Int(input["encodingOptions"]?["version"]?.intValue ?? 2),
                isForVendors: input["encodingOptions"]?["isForVendors"]?.boolValue ?? false
            )
        )
    }

    private static func list(_ value: JSONValue?) -> [Int] {
        (value?.arrayValue ?? []).compactMap { $0.intValue.map(Int.init) }
    }

    private static func ids(_ value: JSONValue?) -> Set<Int> {
        Set(list(value))
    }

    private static func restrictions(_ value: JSONValue?, _ file: String) throws -> [TcPublisherRestriction] {
        var parsed: [TcPublisherRestriction] = []
        for item in value?.arrayValue ?? [] {
            guard let purposeID = item["purposeId"]?.intValue else {
                throw LoadError.malformed(file: file, detail: "a restriction carries no purposeId")
            }
            guard let rawType = item["restrictionType"]?.intValue,
                  let type = TcRestrictionType(rawValue: Int(rawType))
            else {
                throw LoadError.malformed(file: file, detail: "restrictionType outside 0-2")
            }
            let vendorIDs = (item["vendorIds"]?.arrayValue ?? []).compactMap { $0.intValue.map(Int.init) }
            parsed.append(
                TcPublisherRestriction(
                    purposeId: Int(purposeID),
                    restrictionType: type,
                    entries: runs(from: vendorIDs)
                )
            )
        }
        return parsed
    }

    /// Flatten a vendor id list back into runs of consecutive ids.
    ///
    /// The fixtures record a restriction's vendors as a flat id list, which is what a
    /// decoder reports and not what the wire held. Encoding needs runs, so this
    /// rebuilds the canonical one: a lone id is a single, anything longer is a range.
    /// No fixture exercises it, because no fixture both carries restrictions and
    /// claims an encode.
    private static func runs(from vendorIDs: [Int]) -> [TcIDRun] {
        let sorted = Set(vendorIDs).sorted()
        var runs: [TcIDRun] = []
        var start = 0
        var previous = 0
        var open = false
        for id in sorted {
            if open {
                if id == previous + 1 {
                    previous = id
                    continue
                }
                runs.append(run(start: start, end: previous))
            }
            start = id
            previous = id
            open = true
        }
        if open {
            runs.append(run(start: start, end: previous))
        }
        return runs
    }

    private static func run(start: Int, end: Int) -> TcIDRun {
        TcIDRun(start: start, end: end, isRange: start != end)
    }
}

/// What a decoded TC String reports, in the vocabulary `expected.decode.fields` uses.
///
/// Three naming differences are the fixture's, not this build's: the fixture says
/// `policyVersion` where the format says `tcfPolicyVersion`, `specialFeatureOptins`
/// with a lowercase i, and `vectorMaxIds` for the declared widths.
enum TcDecodedFieldReport {
    static func fields(of string: TcString) -> JSONValue {
        .object([
            "cmpId": .integer(Int64(string.cmpId)),
            "cmpVersion": .integer(Int64(string.cmpVersion)),
            "consentLanguage": .string(string.consentLanguage),
            "consentScreen": .integer(Int64(string.consentScreen)),
            "created": .integer(millis(string.created)),
            "isServiceSpecific": .bool(string.isServiceSpecific),
            "lastUpdated": .integer(millis(string.lastUpdated)),
            "numCustomPurposes": .integer(Int64(string.publisherSection?.numCustomPurposes ?? 0)),
            "policyVersion": .integer(Int64(string.tcfPolicyVersion)),
            "publisherConsents": ids(string.publisherSection?.publisherConsents),
            "publisherCountryCode": .string(string.publisherCountryCode),
            "publisherCustomConsents": ids(string.publisherSection?.publisherCustomConsents),
            "publisherCustomLegitimateInterests": ids(string.publisherSection?.publisherCustomLegitimateInterests),
            "publisherLegitimateInterests": ids(string.publisherSection?.publisherLegitimateInterests),
            "publisherRestrictions": restrictions(string.publisherRestrictions),
            "purposeConsents": ids(string.purposeConsents),
            "purposeLegitimateInterests": ids(string.purposeLegitimateInterests),
            "purposeOneTreatment": .bool(string.purposeOneTreatment),
            "specialFeatureOptins": ids(string.specialFeatureOptIns),
            // A decoder cannot recover this: it is a model field that decides which
            // segments get written, and the string carries no trace of it. The
            // reference reports false after a decode for the same reason.
            "supportOOB": .bool(false),
            "useNonStandardTexts": .bool(string.useNonStandardTexts),
            "vectorMaxIds": .object([
                "publisherCustomConsents": .integer(Int64(string.publisherSection?.publisherCustomConsents.declaredMaxId ?? 0)),
                "vendorConsents": .integer(Int64(string.vendorConsents.declaredMaxId)),
                "vendorLegitimateInterests": .integer(Int64(string.vendorLegitimateInterests.declaredMaxId)),
                "vendorsAllowed": .integer(Int64(string.vendorsAllowed?.declaredMaxId ?? 0)),
                "vendorsDisclosed": .integer(Int64(string.vendorsDisclosed?.declaredMaxId ?? 0)),
            ]),
            "vendorConsents": ids(string.vendorConsents),
            "vendorLegitimateInterests": ids(string.vendorLegitimateInterests),
            "vendorListVersion": .integer(Int64(string.vendorListVersion)),
            "vendorsAllowed": ids(string.vendorsAllowed),
            "vendorsDisclosed": ids(string.vendorsDisclosed),
            "version": .integer(Int64(string.version)),
        ])
    }

    /// Put a fixture's restriction list into a canonical order, for both sides of the
    /// comparison.
    ///
    /// The format gives `PubRestrictionEntry` blocks no order, and the reference's
    /// `PurposeRestrictionVector` is an insertion-ordered `Map`, so decoding
    /// `tc-string-decode-restrictions-three-types` returns the wire's own order --
    /// purpose 9, then 2, then 7 -- while that fixture lists the same three
    /// restrictions sorted by purpose id: 2, 7, 9. Identical content.
    ///
    /// Sorting both sides compares what the format actually constrains. It is applied
    /// to the fixture and to this build by the same call, so it cannot excuse a
    /// difference in one direction only, and ``TcDecoderTests`` separately proves that
    /// the decoder reports the wire's order rather than losing it.
    static func canonicalRestrictionOrder(_ fields: JSONValue) -> JSONValue {
        guard case var .object(map) = fields, map["publisherRestrictions"]?.arrayValue != nil else {
            return fields
        }
        map["publisherRestrictions"] = .array(
            (map["publisherRestrictions"]?.arrayValue ?? []).sorted(by: restrictionsIncrease)
        )
        return .object(map)
    }

    /// Lexicographic order over purpose id, then restriction type, then the vendor ids.
    private static func restrictionsIncrease(_ lhs: JSONValue, _ rhs: JSONValue) -> Bool {
        let left = restrictionKey(lhs)
        let right = restrictionKey(rhs)
        for (l, r) in zip(left, right) where l != r {
            return l < r
        }
        return left.count < right.count
    }

    private static func restrictionKey(_ restriction: JSONValue) -> [Int] {
        let vendors = (restriction["vendorIds"]?.arrayValue ?? []).compactMap { $0.intValue.map(Int.init) }
        return [
            Int(restriction["purposeId"]?.intValue ?? 0),
            Int(restriction["restrictionType"]?.intValue ?? 0),
        ] + vendors.sorted()
    }

    private static func millis(_ date: Date) -> Int64 {
        Int64((date.timeIntervalSince1970 * 1000).rounded())
    }

    private static func ids(_ vector: TcIDVector?) -> JSONValue {
        .array(vector?.ids.sorted().map { .integer(Int64($0)) } ?? [])
    }

    private static func restrictions(_ restrictions: [TcPublisherRestriction]) -> JSONValue {
        .array(restrictions.map { restriction in
            .object([
                "purposeId": .integer(Int64(restriction.purposeId)),
                "restrictionType": .integer(Int64(restriction.restrictionType.rawValue)),
                "vendorIds": .array(restriction.vendorIds.sorted().map { .integer(Int64($0)) }),
            ])
        })
    }
}
