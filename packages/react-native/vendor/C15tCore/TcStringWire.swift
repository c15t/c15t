import Foundation

/// Why a TC String could not be used.
///
/// The reason is part of the API because the caller's response differs: a version
/// this build does not speak is a capability gap worth reporting, while a truncated
/// segment is a corrupt value that will stay corrupt.
public enum TcStringFailureReason: String, Sendable, Equatable {
    /// A segment holds a character outside the base64url alphabet, or is empty.
    case invalidBase64URL = "invalid-base64-url"
    /// The version field is present but not 2.
    case unsupportedVersion = "unsupported-version"
    /// A segment type is unassigned, a segment repeats, or the core segment is
    /// missing or not first.
    case unsupportedSegment = "unsupported-segment"
    /// Too few bits for the field sequence.
    case truncated = "truncated"
    /// A `RangeEntry` ends below where it starts.
    case malformedRange = "malformed-range"
    /// An ID section declares a width that cannot describe the IDs inside it.
    case malformedIDVector = "malformed-id-vector"
    /// A purpose ID or vendor ID is 0, which the framework never assigns.
    case outOfRange = "out-of-range"
    /// Language or country bits do not spell two letters A through Z.
    case invalidCode = "invalid-code"
    /// `RestrictionType` holds a value the format does not define.
    case unsupportedRestrictionType = "unsupported-restriction-type"
}

/// The result of reading a TC String.
///
/// Never throws, the way a policy wire read never throws: a string some CMP wrote
/// badly has to come back as a refusal the core can fail closed on, not as a crash
/// in the caller. `@iabtechlabtcf/core` disagrees here and lets a missing field
/// sequence surface as a `TypeError`, which is fine for a CMP author and not fine
/// for a store read on a launch path.
enum TcStringOutcome: Sendable, Equatable {
    case decoded(TcString)
    case rejected(reason: TcStringFailureReason, message: String)
}

/// A value the reader refuses, plus what to report.
private struct TcWireProblem: Error {
    let reason: TcStringFailureReason
    let message: String
}

/// Reads TC String v2 segments.
///
/// Strict by intent, in the same way `PolicyWireReader` is. Three places are
/// deliberately stricter than `@iabtechlabtcf/core`, each a case where the reference
/// keeps a value that cannot mean anything instead of rejecting it: language bits
/// outside `A`-`Z` (it returns `[`), a `RangeEntry` whose end ID is below its start
/// (it expands to nothing), and a segment type that repeats (it applies twice). This
/// build refuses all three. A decoder that invents a reading for those strings is a
/// decoder no consent UI can trust.
enum TcStringWireReader {
    /// Read a whole TC String: dot-separated segments, core first.
    static func read(_ input: String) -> TcStringOutcome {
        do {
            return .decoded(try readString(input))
        } catch let problem as TcWireProblem {
            return .rejected(reason: problem.reason, message: problem.message)
        } catch {
            return .rejected(
                reason: .unsupportedSegment,
                message: "TC string could not be read: \(error)"
            )
        }
    }

    private static func problem(
        _ reason: TcStringFailureReason,
        _ message: String
    ) -> TcWireProblem {
        TcWireProblem(reason: reason, message: message)
    }

    // MARK: - Whole string

    private static func readString(_ input: String) throws -> TcString {
        guard !input.isEmpty else {
            throw problem(.invalidBase64URL, "TC string is empty")
        }
        // `omittingEmptySubsequences: false` so `"a..b"` reaches the reader as an
        // empty middle segment and fails base64, rather than reading as `a.b`.
        let parts = input.split(separator: ".", omittingEmptySubsequences: false)

        var result: TcString?
        var order: [TcSegment] = []
        var seen: Set<TcSegment> = []

        for (offset, part) in parts.enumerated() {
            var reader = try bitReader(for: part, label: label(for: offset))
            let kind: TcSegment
            if offset == 0 {
                // Only the core segment omits a type field, and it omits it because
                // the top 3 bits of version 2 (`000010`) are zero.
                var probe = reader
                let peeked = try readUnsigned(reader: &probe, width: TcBitWidth.segmentType, field: "version")
                guard peeked == TcSegment.core.rawValue else {
                    throw problem(
                        .unsupportedSegment,
                        "segment 1 declares type \(peeked); the core segment must come first"
                    )
                }
                kind = .core
            } else {
                let type = try readUnsigned(
                    reader: &reader,
                    width: TcBitWidth.segmentType,
                    field: "\(label(for: offset)).type"
                )
                guard let mapped = TcSegment(rawValue: type), mapped != .core else {
                    throw problem(
                        .unsupportedSegment,
                        "\(label(for: offset)) declares unassigned segment type \(type)"
                    )
                }
                kind = mapped
            }

            guard !seen.contains(kind) else {
                throw problem(
                    .unsupportedSegment,
                    "segment type \(kind.rawValue) appears more than once"
                )
            }
            seen.insert(kind)
            order.append(kind)

            switch kind {
            case .core:
                result = try readCore(&reader)
            case .vendorsDisclosed:
                result?.vendorsDisclosed = try readIDVector(reader: &reader, field: "vendorsDisclosed")
            case .vendorsAllowed:
                result?.vendorsAllowed = try readIDVector(reader: &reader, field: "vendorsAllowed")
            case .publisherTC:
                result?.publisherSection = try readPublisherSection(&reader)
            }
            // A `nil` result here means a vendor or publisher segment arrived before
            // the core, which the loop above already ruled out by requiring segment
            // 0 to read as core. Reading into an absent model would drop it silently.
            guard result != nil else {
                throw problem(.unsupportedSegment, "segment carries data but no model was built")
            }
            try requireNoStrayContent(reader, kind: kind)
        }

        guard var string = result else {
            throw problem(.unsupportedSegment, "TC string carries no core segment")
        }
        string.segmentOrder = order
        return string
    }

    private static func label(for offset: Int) -> String {
        offset == 0 ? "core" : "segment \(offset + 1)"
    }

    private static func bitReader(for text: Substring, label: String) throws -> TcBitReader {
        guard let decoded = TcBase64URL.decode(text) else {
            throw problem(.invalidBase64URL, "\(label) is not base64url")
        }
        return TcBitReader(bytes: decoded.bytes, bitCount: decoded.bitCount)
    }

    /// Reject a segment that leaves a whole field's worth of bits unread.
    ///
    /// A short trailing remainder is normal, not damage: base64url carries six bits
    /// per character and the reference pads each segment to a multiple of 24, so up
    /// to 23 bits can belong to no field. Twenty-four or more means a field was
    /// skipped, which is a layout this reader does not have and must not guess at.
    private static func requireNoStrayContent(
        _ reader: TcBitReader,
        kind: TcSegment
    ) throws {
        let stray = reader.remainingBits
        guard stray < TcBase64URL.padToBits else {
            throw problem(
                .unsupportedSegment,
                "\(kind) leaves \(stray) bits that no field read"
            )
        }
    }

    // MARK: - Field sequences

    /// v2 core, in the order `encoder/sequence/FieldSequence.js` states and the
    /// widths `encoder/BitLength.js` gives.
    private static func readCore(_ reader: inout TcBitReader) throws -> TcString {
        let version = try readUnsigned(reader: &reader, width: TcBitWidth.version, field: "version")
        guard version == 2 else {
            throw problem(
                .unsupportedVersion,
                "TC string version \(version) is not supported; this build reads version 2"
            )
        }
        let created = try readTimestamp(reader: &reader, field: "created")
        let lastUpdated = try readTimestamp(reader: &reader, field: "lastUpdated")
        let cmpId = try readUnsigned(reader: &reader, width: TcBitWidth.cmpId, field: "cmpId")
        let cmpVersion = try readUnsigned(
            reader: &reader,
            width: TcBitWidth.cmpVersion,
            field: "cmpVersion"
        )
        let consentScreen = try readUnsigned(
            reader: &reader,
            width: TcBitWidth.consentScreen,
            field: "consentScreen"
        )
        let consentLanguage = try readCode(reader: &reader, field: "consentLanguage")
        let vendorListVersion = try readUnsigned(
            reader: &reader,
            width: TcBitWidth.vendorListVersion,
            field: "vendorListVersion"
        )
        let tcfPolicyVersion = try readUnsigned(
            reader: &reader,
            width: TcBitWidth.tcfPolicyVersion,
            field: "tcfPolicyVersion"
        )
        let isServiceSpecific = try readFlag(reader: &reader, field: "isServiceSpecific")
        let useNonStandardTexts = try readFlag(reader: &reader, field: "useNonStandardTexts")
        let specialFeatureOptIns = try readFixedVector(
            reader: &reader,
            width: TcBitWidth.specialFeatureOptIns,
            field: "specialFeatureOptIns"
        )
        let purposeConsents = try readFixedVector(
            reader: &reader,
            width: TcBitWidth.purposes,
            field: "purposeConsents"
        )
        let purposeLegitimateInterests = try readFixedVector(
            reader: &reader,
            width: TcBitWidth.purposes,
            field: "purposeLegitimateInterests"
        )
        let purposeOneTreatment = try readFlag(reader: &reader, field: "purposeOneTreatment")
        let publisherCountryCode = try readCode(reader: &reader, field: "publisherCountryCode")
        let vendorConsents = try readIDVector(reader: &reader, field: "vendorConsents")
        let vendorLegitimateInterests = try readIDVector(
            reader: &reader,
            field: "vendorLegitimateInterests"
        )
        let restrictions = try readPublisherRestrictions(reader: &reader)

        return TcString(
            version: version,
            created: created,
            lastUpdated: lastUpdated,
            cmpId: cmpId,
            cmpVersion: cmpVersion,
            consentScreen: consentScreen,
            consentLanguage: consentLanguage,
            vendorListVersion: vendorListVersion,
            tcfPolicyVersion: tcfPolicyVersion,
            isServiceSpecific: isServiceSpecific,
            useNonStandardTexts: useNonStandardTexts,
            specialFeatureOptIns: specialFeatureOptIns,
            purposeConsents: purposeConsents,
            purposeLegitimateInterests: purposeLegitimateInterests,
            purposeOneTreatment: purposeOneTreatment,
            publisherCountryCode: publisherCountryCode,
            vendorConsents: vendorConsents,
            vendorLegitimateInterests: vendorLegitimateInterests,
            publisherRestrictions: restrictions,
            segmentOrder: [.core]
        )
    }

    /// The optional publisher TC segment: fixed publisher purposes, then the two
    /// custom-purpose vectors whose width comes from `NumCustomPurposes`.
    private static func readPublisherSection(
        _ reader: inout TcBitReader
    ) throws -> TcPublisherSection {
        let consents = try readFixedVector(
            reader: &reader,
            width: TcBitWidth.purposes,
            field: "publisherConsents"
        )
        let legitimateInterests = try readFixedVector(
            reader: &reader,
            width: TcBitWidth.purposes,
            field: "publisherLegitimateInterests"
        )
        let numCustomPurposes = try readUnsigned(
            reader: &reader,
            width: TcBitWidth.numCustomPurposes,
            field: "numCustomPurposes"
        )
        let customConsents = try readFixedVector(
            reader: &reader,
            width: numCustomPurposes,
            field: "publisherCustomConsents"
        )
        let customLegitimateInterests = try readFixedVector(
            reader: &reader,
            width: numCustomPurposes,
            field: "publisherCustomLegitimateInterests"
        )
        return TcPublisherSection(
            publisherConsents: consents,
            publisherLegitimateInterests: legitimateInterests,
            numCustomPurposes: numCustomPurposes,
            publisherCustomConsents: customConsents,
            publisherCustomLegitimateInterests: customLegitimateInterests
        )
    }

    // MARK: - ID vectors

    /// An `IDVectorSection`: `MaxVendorId`, `IsRangeEncoding`, then a bit field or a
    /// `RangeEntry` list.
    ///
    /// `IsRangeEncoding` is the bit the formats document defines as "1 Range / 0
    /// BitField", and `encoder/field/VectorEncodingType.js` agrees, so a reader that
    /// inverted it would silently read a bit field as a range list.
    private static func readIDVector(
        reader: inout TcBitReader,
        field: String
    ) throws -> TcIDVector {
        let maxId = try readUnsigned(reader: &reader, width: TcBitWidth.maxId, field: "\(field).MaxVendorId")
        let isRangeEncoding = try readFlag(
            reader: &reader,
            field: "\(field).IsRangeEncoding"
        )
        if isRangeEncoding {
            return try readRanges(reader: &reader, declaredMaxId: maxId, field: field)
        }
        guard let bits = reader.readBits(maxId) else {
            throw problem(
                .truncated,
                "\(field) declares MaxVendorId \(maxId) but only \(reader.remainingBits) bits follow"
            )
        }
        var ids: Set<Int> = []
        for (index, bit) in bits.enumerated() where bit {
            ids.insert(index + 1)
        }
        return TcIDVector(ids: ids, encoding: .bitField(maxId: maxId))
    }

    /// `NumEntries` followed by that many `RangeEntry` sections.
    private static func readRanges(
        reader: inout TcBitReader,
        declaredMaxId: Int,
        field: String
    ) throws -> TcIDVector {
        let numEntries = try readUnsigned(
            reader: &reader,
            width: TcBitWidth.numEntries,
            field: "\(field).NumEntries"
        )
        var entries: [TcIDRun] = []
        var ids: Set<Int> = []
        for index in 0..<numEntries {
            let entryField = "\(field).RangeEntry[\(index)]"
            let entry = try readRun(reader: &reader, field: entryField)
            guard let covered = entry.ids else {
                // `readRun` already refuses an end below a start, so the only way here
                // is an entry that covers nothing at all.
                throw problem(.malformedRange, "\(entryField) covers no ID")
            }
            ids.formUnion(covered)
            entries.append(entry)
        }
        if let highest = ids.max(), highest > declaredMaxId {
            throw problem(
                .malformedIDVector,
                "\(field) declares MaxVendorId \(declaredMaxId) but carries ID \(highest)"
            )
        }
        return TcIDVector(ids: ids, encoding: .ranges(maxId: declaredMaxId, entries: entries))
    }

    /// One `RangeEntry`: `IsARange`, `StartOrOnlyVendorId`, and for a range also
    /// `EndVendorId`.
    private static func readRun(
        reader: inout TcBitReader,
        field: String
    ) throws -> TcIDRun {
        let isRange = try readFlag(reader: &reader, field: "\(field).IsARange")
        let start = try readUnsigned(
            reader: &reader,
            width: TcBitWidth.vendorId,
            field: "\(field).StartOrOnlyVendorId"
        )
        guard start > 0 else {
            throw problem(.outOfRange, "\(field) starts at vendor ID 0, which is never assigned")
        }
        guard isRange else {
            return TcIDRun(start: start, end: start, isRange: false)
        }
        let end = try readUnsigned(reader: &reader, width: TcBitWidth.vendorId, field: "\(field).EndVendorId")
        guard end >= start else {
            throw problem(.malformedRange, "\(field) ends at \(end), below its start \(start)")
        }
        return TcIDRun(start: start, end: end, isRange: true)
    }

    /// `NumPubRestrictions` and the entries after it. The count is mandatory even
    /// when it is zero, so this always consumes at least 12 bits.
    private static func readPublisherRestrictions(
        reader: inout TcBitReader
    ) throws -> [TcPublisherRestriction] {
        let count = try readUnsigned(
            reader: &reader,
            width: TcBitWidth.numPublisherRestrictions,
            field: "NumPubRestrictions"
        )
        var restrictions: [TcPublisherRestriction] = []
        for index in 0..<count {
            let field = "PubRestriction[\(index)]"
            let purposeId = try readUnsigned(
                reader: &reader,
                width: TcBitWidth.purposeId,
                field: "\(field).PurposeId"
            )
            guard purposeId > 0 else {
                throw problem(.outOfRange, "\(field).PurposeId is 0, which is never assigned")
            }
            let rawType = try readUnsigned(
                reader: &reader,
                width: TcBitWidth.restrictionType,
                field: "\(field).RestrictionType"
            )
            guard let restrictionType = TcRestrictionType(rawValue: rawType) else {
                throw problem(
                    .unsupportedRestrictionType,
                    "\(field).RestrictionType is \(rawType), outside 0-2"
                )
            }
            let numEntries = try readUnsigned(
                reader: &reader,
                width: TcBitWidth.numEntries,
                field: "\(field).NumEntries"
            )
            var entries: [TcIDRun] = []
            for entryIndex in 0..<numEntries {
                entries.append(
                    try readRun(
                        reader: &reader,
                        field: "\(field).RangeEntry[\(entryIndex)]"
                    )
                )
            }
            restrictions.append(
                TcPublisherRestriction(
                    purposeId: purposeId,
                    restrictionType: restrictionType,
                    entries: entries
                )
            )
        }
        return restrictions
    }

    // MARK: - Fields

    private static func readUnsigned(
        reader: inout TcBitReader,
        width: Int,
        field: String
    ) throws -> Int {
        guard let value = reader.readUnsigned(width) else {
            throw problem(
                .truncated,
                "\(field) needs \(width) bits but only \(reader.remainingBits) remain"
            )
        }
        return Int(value)
    }

    private static func readFlag(
        reader: inout TcBitReader,
        field: String
    ) throws -> Bool {
        guard let flag = reader.readBool() else {
            throw problem(.truncated, "\(field) needs one bit but the segment is exhausted")
        }
        return flag
    }

    private static func readFixedVector(
        reader: inout TcBitReader,
        width: Int,
        field: String
    ) throws -> TcIDVector {
        guard let bits = reader.readBits(width) else {
            throw problem(
                .truncated,
                "\(field) needs \(width) bits but only \(reader.remainingBits) remain"
            )
        }
        var ids: Set<Int> = []
        for (index, bit) in bits.enumerated() where bit {
            ids.insert(index + 1)
        }
        return TcIDVector(ids: ids, encoding: .fixedWidth(bitWidth: width))
    }

    /// A timestamp: 36 bits of hundred-millisecond intervals since the epoch.
    private static func readTimestamp(
        reader: inout TcBitReader,
        field: String
    ) throws -> Date {
        guard let ticks = reader.readUnsigned(TcBitWidth.timestamp) else {
            throw problem(
                .truncated,
                "\(field) needs \(TcBitWidth.timestamp) bits but only \(reader.remainingBits) remain"
            )
        }
        return Date(timeIntervalSince1970: TimeInterval(ticks) / 10)
    }

    /// A two-letter code: two 6-bit letters where `A` is 0.
    ///
    /// The reference hands back whatever `String.fromCharCode` produces, so bits
    /// spelling 26 arrive as `[`. That is not a code any language or country list
    /// contains, so it is refused rather than carried.
    private static func readCode(
        reader: inout TcBitReader,
        field: String
    ) throws -> String {
        let half = TcBitWidth.letter
        let first = try readUnsigned(reader: &reader, width: half, field: "\(field)[0]")
        let second = try readUnsigned(reader: &reader, width: half, field: "\(field)[1]")
        guard (0...25).contains(first), (0...25).contains(second),
              let letters = String(bytes: [UInt8(65 + first), UInt8(65 + second)], encoding: .ascii)
        else {
            throw problem(
                .invalidCode,
                "\(field) spells \(first)/\(second), outside the 0-25 range that maps to A-Z"
            )
        }
        return letters
    }
}
