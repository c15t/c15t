import Foundation

/// Why a model could not be written as a TC String.
public enum TcEncodeFailureReason: String, Sendable, Equatable {
    /// A value does not fit the width the format gives its field.
    case valueTooWide = "value-too-wide"
    /// A two-letter code is not two letters A through Z.
    case invalidCode = "invalid-code"
    /// A vector's shape and its contents disagree.
    case malformedVector = "malformed-vector"
}

/// The result of encoding. Like the decoder, it reports a refusal instead of
/// trapping, so a caller can decide whether a string is worth retrying.
enum TcStringEncodeOutcome: Sendable, Equatable {
    case encoded(String)
    case rejected(reason: TcEncodeFailureReason, message: String)
}

/// A value an encoder refuses.
private struct TcEncodeProblem: Error {
    let reason: TcEncodeFailureReason
    let message: String
}

/// Writes a `TcString` back out as base64url segments.
///
/// This is a wire encoder, not a policy encoder: it lays down the fields the model
/// already holds and derives nothing. That distinction is the whole reason the
/// round-trip tests can require byte equality. Three consequences are worth stating
/// plainly:
///
/// - An ID vector is re-written with the shape and the declared `MaxVendorId` it was
///   read with, not with a freshly chosen one. The reference implementation picks the
///   shorter of the two encodings on every call and recomputes `MaxVendorId` from the
///   highest positive ID, so it can rewrite a string it was given. This one does not.
/// - `RangeEntry` lists are re-written entry for entry, preserving each
///   `IsARange` flag. Grouping adjacent IDs instead would merge two singles written
///   next to each other into one range and change the bytes.
/// - `publisherRestrictions` and `purposeOneTreatment` reach the wire only because a
///   decode put them in the model. Nothing here can synthesize them from c15t
///   consent state, and it should not try: c15t does not populate either field
///   (`packages/iab/src/tcf/tc-string.ts` sets neither), and `@iabtechlabtcf/core`
///   cannot encode restrictions at all without a GVL attached. A layer that wanted
///   to emit them needs the GVL's opinion, which this build deliberately does not
///   carry.
enum TcStringEncoder {
    static func encode(_ string: TcString) -> TcStringEncodeOutcome {
        do {
            return .encoded(try encodeString(string))
        } catch let problem as TcEncodeProblem {
            return .rejected(reason: problem.reason, message: problem.message)
        } catch {
            return .rejected(
                reason: .malformedVector,
                message: "TC string could not be encoded: \(error)"
            )
        }
    }

    private static func problem(
        _ reason: TcEncodeFailureReason,
        _ message: String
    ) -> TcEncodeProblem {
        TcEncodeProblem(reason: reason, message: message)
    }

    private static func encodeString(_ string: TcString) throws -> String {
        var segments: [String] = []
        for kind in string.segmentOrder {
            var writer = TcBitWriter()
            if kind != .core {
                writer.write(UInt64(kind.rawValue), width: TcBitWidth.segmentType)
            }
            switch kind {
            case .core:
                try writeCore(string, to: &writer)
            case .vendorsDisclosed:
                try writeIDVector(
                    required(string.vendorsDisclosed, field: "vendorsDisclosed", kind: kind),
                    to: &writer
                )
            case .vendorsAllowed:
                try writeIDVector(
                    required(string.vendorsAllowed, field: "vendorsAllowed", kind: kind),
                    to: &writer
                )
            case .publisherTC:
                try writePublisherSection(
                    required(string.publisherSection, field: "publisherTC", kind: kind),
                    to: &writer
                )
            }
            segments.append(writer.toBase64URL())
        }
        return segments.joined(separator: ".")
    }

    /// A segment the model does not carry.
    ///
    /// `segmentOrder` claiming a segment with no value behind it is a programming
    /// error rather than wire input, so it is reported rather than silently skipped:
    /// a dropped segment would produce a shorter string that still decodes.
    private static func required<Value>(
        _ value: Value?,
        field: String,
        kind: TcSegment
    ) throws -> Value {
        guard let value else {
            throw problem(.malformedVector, "segment order lists \(kind) but the model has no \(field)")
        }
        return value
    }

    // MARK: - Segments

    private static func writeCore(
        _ string: TcString,
        to writer: inout TcBitWriter
    ) throws {
        try writeUnsigned(
            string.version,
            width: TcBitWidth.version,
            field: "version",
            to: &writer
        )
        try writeTimestamp(string.created, field: "created", to: &writer)
        try writeTimestamp(string.lastUpdated, field: "lastUpdated", to: &writer)
        try writeUnsigned(string.cmpId, width: TcBitWidth.cmpId, field: "cmpId", to: &writer)
        try writeUnsigned(
            string.cmpVersion,
            width: TcBitWidth.cmpVersion,
            field: "cmpVersion",
            to: &writer
        )
        try writeUnsigned(
            string.consentScreen,
            width: TcBitWidth.consentScreen,
            field: "consentScreen",
            to: &writer
        )
        try writeCode(string.consentLanguage, field: "consentLanguage", to: &writer)
        try writeUnsigned(
            string.vendorListVersion,
            width: TcBitWidth.vendorListVersion,
            field: "vendorListVersion",
            to: &writer
        )
        try writeUnsigned(
            string.tcfPolicyVersion,
            width: TcBitWidth.tcfPolicyVersion,
            field: "tcfPolicyVersion",
            to: &writer
        )
        writer.write(string.isServiceSpecific)
        writer.write(string.useNonStandardTexts)
        try writeIDVector(string.specialFeatureOptIns, to: &writer)
        try writeIDVector(string.purposeConsents, to: &writer)
        try writeIDVector(string.purposeLegitimateInterests, to: &writer)
        writer.write(string.purposeOneTreatment)
        try writeCode(string.publisherCountryCode, field: "publisherCountryCode", to: &writer)
        try writeIDVector(string.vendorConsents, to: &writer)
        try writeIDVector(string.vendorLegitimateInterests, to: &writer)
        try writePublisherRestrictions(string.publisherRestrictions, to: &writer)
    }

    private static func writePublisherSection(
        _ section: TcPublisherSection,
        to writer: inout TcBitWriter
    ) throws {
        try writeIDVector(section.publisherConsents, to: &writer)
        try writeIDVector(section.publisherLegitimateInterests, to: &writer)
        try writeUnsigned(
            section.numCustomPurposes,
            width: TcBitWidth.numCustomPurposes,
            field: "numCustomPurposes",
            to: &writer
        )
        try writeIDVector(section.publisherCustomConsents, to: &writer)
        try writeIDVector(section.publisherCustomLegitimateInterests, to: &writer)
    }

    // MARK: - ID vectors

    /// Write an ID vector in exactly the shape it carries.
    private static func writeIDVector(
        _ vector: TcIDVector,
        to writer: inout TcBitWriter
    ) throws {
        switch vector.encoding {
        case let .fixedWidth(bitWidth):
            try writeBitField(ids: vector.ids, width: bitWidth, to: &writer)
        case let .bitField(maxId):
            try writeUnsigned(maxId, width: TcBitWidth.maxId, field: "MaxVendorId", to: &writer)
            writer.write(false)
            try writeBitField(ids: vector.ids, width: maxId, to: &writer)
        case let .ranges(maxId, entries):
            try writeUnsigned(maxId, width: TcBitWidth.maxId, field: "MaxVendorId", to: &writer)
            writer.write(true)
            try writeUnsigned(
                entries.count,
                width: TcBitWidth.numEntries,
                field: "NumEntries",
                to: &writer
            )
            for (index, entry) in entries.enumerated() {
                try writeRun(entry, field: "RangeEntry[\(index)]", to: &writer)
            }
        }
    }

    /// One `RangeEntry`, refusing exactly the shapes `readRun` refuses. Without that
    /// symmetry an encode could emit a string its own decoder turns down: an ID-0
    /// start, a range that ends below where it starts, or a single carrying a second
    /// id that the wire has nowhere to put.
    private static func writeRun(
        _ entry: TcIDRun,
        field: String,
        to writer: inout TcBitWriter
    ) throws {
        guard entry.start > 0 else {
            throw problem(.malformedVector, "\(field) starts at ID 0, which is never assigned")
        }
        guard entry.isRange ? entry.end >= entry.start : entry.end == entry.start else {
            throw problem(
                .malformedVector,
                "\(field) is marked \(entry.isRange ? "a range" : "a single") running "
                    + "\(entry.start) to \(entry.end)"
            )
        }
        writer.write(entry.isRange)
        try writeUnsigned(
            entry.start,
            width: TcBitWidth.vendorId,
            field: "\(field).StartOrOnlyVendorId",
            to: &writer
        )
        if entry.isRange {
            try writeUnsigned(
                entry.end,
                width: TcBitWidth.vendorId,
                field: "\(field).EndVendorId",
                to: &writer
            )
        }
    }

    private static func writeBitField(
        ids: Set<Int>,
        width: Int,
        to writer: inout TcBitWriter
    ) throws {
        guard width >= 0 else {
            throw problem(.malformedVector, "a bit field cannot be \(width) bits wide")
        }
        if let lowest = ids.min(), lowest < 1 {
            throw problem(
                .malformedVector,
                "ID \(lowest) has no bit to occupy in a field numbered from 1"
            )
        }
        if let highest = ids.max(), highest > width {
            throw problem(
                .malformedVector,
                "a \(width)-bit field cannot hold ID \(highest)"
            )
        }
        if width > 0 {
            for id in 1...width {
                writer.write(ids.contains(id))
            }
        }
    }

    // MARK: - Publisher restrictions

    /// Write `NumPubRestrictions` and the entries, exactly as read.
    private static func writePublisherRestrictions(
        _ restrictions: [TcPublisherRestriction],
        to writer: inout TcBitWriter
    ) throws {
        try writeUnsigned(
            restrictions.count,
            width: TcBitWidth.numPublisherRestrictions,
            field: "NumPubRestrictions",
            to: &writer
        )
        for restriction in restrictions {
            try writeUnsigned(
                restriction.purposeId,
                width: TcBitWidth.purposeId,
                field: "PurposeId",
                to: &writer
            )
            try writeUnsigned(
                restriction.restrictionType.rawValue,
                width: TcBitWidth.restrictionType,
                field: "RestrictionType",
                to: &writer
            )
            try writeUnsigned(
                restriction.entries.count,
                width: TcBitWidth.numEntries,
                field: "NumEntries",
                to: &writer
            )
            for (index, entry) in restriction.entries.enumerated() {
                try writeRun(
                    entry,
                    field: "PubRestriction[\(restriction.purposeId)].RangeEntry[\(index)]",
                    to: &writer
                )
            }
        }
    }

    // MARK: - Fields

    private static func writeUnsigned(
        _ value: Int,
        width: Int,
        field: String,
        to writer: inout TcBitWriter
    ) throws {
        guard value >= 0 else {
            throw problem(.valueTooWide, "\(field) cannot be negative (\(value))")
        }
        guard width >= 0, width < 63, value < (1 << width) else {
            throw problem(.valueTooWide, "\(field) value \(value) does not fit \(width) bits")
        }
        writer.write(UInt64(value), width: width)
    }

    /// A timestamp as 36 bits of hundred-millisecond intervals, matching
    /// `DateEncoder`, which rounds to the nearest tenth of a second.
    ///
    /// Refuses rather than clamping a pre-epoch date to zero or truncating a late
    /// one: 36 bits of tenths run out on 2187-10-06, and a date past that would
    /// otherwise write a string that decodes to an unrelated instant. A decode can
    /// never produce one, so this only ever fires on a model built by hand.
    private static func writeTimestamp(
        _ date: Date,
        field: String,
        to writer: inout TcBitWriter
    ) throws {
        let seconds = date.timeIntervalSince1970
        let ticks = (seconds * 10).rounded()
        guard ticks >= 0, ticks < Double(1 << TcBitWidth.timestamp) else {
            throw problem(
                .valueTooWide,
                "\(field) is \(seconds)s from the epoch, outside the range 36 bits of "
                    + "tenths covers"
            )
        }
        writer.write(UInt64(ticks), width: TcBitWidth.timestamp)
    }

    private static func writeCode(
        _ code: String,
        field: String,
        to writer: inout TcBitWriter
    ) throws {
        let scalars = Array(code.unicodeScalars)
        guard scalars.count == 2 else {
            throw problem(.invalidCode, "\(field) must be exactly two letters, got \"\(code)\"")
        }
        for scalar in scalars {
            let letter = Int(scalar.value)
            guard (65...90).contains(letter) else {
                throw problem(
                    .invalidCode,
                    "\(field) contains \"\(Character(scalar))\", outside A-Z"
                )
            }
            writer.write(UInt64(letter - 65), width: TcBitWidth.letter)
        }
    }
}
