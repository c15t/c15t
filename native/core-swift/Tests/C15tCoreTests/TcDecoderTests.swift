import Foundation
import XCTest

@testable import C15tCore

/// What the decoder refuses, and what it keeps that a projection flattens away.
///
/// None of the strings in this file came from a fixture. Each one is assembled from
/// the bit widths in ``TcBitWidth`` so a case says which field it breaks, and a
/// reader can check the offset arithmetic without running anything. The shared
/// fixtures are all well-formed strings, so this is the only place the refusals
/// live; the vectors lane owns `native/protocol` and has not put malformed cases in
/// it, and inventing a second fixture format here would be worse than the gap.
final class TcDecoderTests: XCTestCase {
    // MARK: - Assembling a core segment

    /// Write a core segment field by field, with one knob per thing worth breaking.
    ///
    /// Offsets, straight from the width table: version 0, created 6, lastUpdated 42,
    /// cmpId 78, cmpVersion 90, consentScreen 102, language 108, vendorListVersion 120,
    /// policyVersion 132, isServiceSpecific 138, useNonStandardTexts 139,
    /// specialFeatures 140, purposeConsents 152, purposeLI 176, purposeOneTreatment 200,
    /// country 201, vendorConsents 213, vendorLegitimateInterests 230,
    /// NumPubRestrictions 247. Two vendor vectors, not one: the sequence carries a
    /// consents section and a legitimate-interest section. With both empty the segment
    /// is 259 bits before any restriction block.
    private struct Core {
        var version = 2
        var language = [4, 13]
        var country = [20, 18]
        var vendorMaxId = 0
        /// How many bits to actually write for a ``vendorMaxId`` declaration. `nil`
        /// writes the declared width, which is the legal case; a smaller number is a
        /// flat field that stops short of the width it promised.
        var vendorBits: Int?
        var isRangeEncoding = false
        var runs: [(isRange: Bool, start: Int, end: Int)] = []
        var restrictions: [(purposeId: Int, type: Int, runs: [(isRange: Bool, start: Int, end: Int)])] = []
        /// Bits with no field behind them, to test how much slack is tolerated.
        var trailingBits = 0
        /// Cut the segment short, to test a field that never arrives.
        var truncateTo: Int?

        func bits() -> [Bool] {
            var w = TcBitWriter()
            w.write(UInt64(version), width: TcBitWidth.version)
            w.write(0, width: TcBitWidth.timestamp)
            w.write(0, width: TcBitWidth.timestamp)
            w.write(28, width: TcBitWidth.cmpId)
            w.write(1, width: TcBitWidth.cmpVersion)
            w.write(1, width: TcBitWidth.consentScreen)
            for letter in language {
                w.write(UInt64(letter), width: TcBitWidth.letter)
            }
            w.write(142, width: TcBitWidth.vendorListVersion)
            w.write(5, width: TcBitWidth.tcfPolicyVersion)
            w.write(true)
            w.write(false)
            w.write([Bool](repeating: false, count: TcBitWidth.specialFeatureOptIns))
            w.write([Bool](repeating: false, count: TcBitWidth.purposes))
            w.write([Bool](repeating: false, count: TcBitWidth.purposes))
            w.write(false)
            for letter in country {
                w.write(UInt64(letter), width: TcBitWidth.letter)
            }
            Self.vendorVector(
                &w,
                maxId: vendorMaxId,
                isRange: isRangeEncoding,
                runs: runs,
                bits: vendorBits
            )
            // The consents section above, and the legitimate-interest section the core
            // sequence reads next. Both empty unless a case asked for runs.
            Self.vendorVector(&w, maxId: 0, isRange: false)
            w.write(UInt64(restrictions.count), width: TcBitWidth.numPublisherRestrictions)
            for restriction in restrictions {
                w.write(UInt64(restriction.purposeId), width: TcBitWidth.purposeId)
                w.write(UInt64(restriction.type), width: TcBitWidth.restrictionType)
                w.write(UInt64(restriction.runs.count), width: TcBitWidth.numEntries)
                for run in restriction.runs {
                    Self.writeRun(&w, run)
                }
            }
            w.write([Bool](repeating: false, count: trailingBits))
            var bits = w.bits
            if let truncateTo {
                bits = Array(bits.prefix(truncateTo))
            }
            return bits
        }

        func segment() -> String {
            TcBase64URL.encode(bits())
        }

        /// `MaxVendorId`, `IsRangeEncoding`, then either a run list or a flat bit field.
        ///
        /// ``bits`` overrides the width a flat field actually gets, so a case can
        /// declare more than it writes.
        static func vendorVector(
            _ w: inout TcBitWriter,
            maxId: Int,
            isRange: Bool,
            runs: [(isRange: Bool, start: Int, end: Int)] = [],
            bits: Int? = nil
        ) {
            w.write(UInt64(maxId), width: TcBitWidth.maxId)
            w.write(isRange)
            if isRange {
                w.write(UInt64(runs.count), width: TcBitWidth.numEntries)
                for run in runs {
                    writeRun(&w, run)
                }
            } else {
                w.write([Bool](repeating: false, count: bits ?? maxId))
            }
        }

        /// One `RangeEntry`: `IsARange`, `StartId`, plus `EndId` when it is a range.
        static func writeRun(
            _ w: inout TcBitWriter,
            _ run: (isRange: Bool, start: Int, end: Int)
        ) {
            w.write(run.isRange)
            w.write(UInt64(run.start), width: TcBitWidth.vendorId)
            if run.isRange {
                w.write(UInt64(run.end), width: TcBitWidth.vendorId)
            }
        }
    }

    /// A second segment: the 3-bit type, then an empty vendor vector.
    private func vendorSegment(type: Int) -> String {
        var w = TcBitWriter()
        w.write(UInt64(type), width: TcBitWidth.segmentType)
        Core.vendorVector(&w, maxId: 0, isRange: false)
        return w.toBase64URL()
    }

    private func refuse(
        _ string: String,
        _ reason: TcStringFailureReason,
        _ note: String,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        switch TcStringWireReader.read(string) {
        case .decoded:
            XCTFail("\(note): expected \(reason.rawValue), the decoder accepted it", file: file, line: line)
        case let .rejected(actual, message):
            XCTAssertEqual(actual, reason, note, file: file, line: line)
            XCTAssertFalse(message.isEmpty, "\(note): a refusal has to say why", file: file, line: line)
        }
    }

    // MARK: - Version

    func testRefusesAnyVersionThisBuildDoesNotSpeak() {
        // The version field is 6 bits at 0; 2 is the only value with a field sequence
        // here. Version 3 is TCF v2.3's own number space and v2.4 changed widths.
        refuse(Core(version: 3).segment(), .unsupportedVersion, "version 3")
        refuse(Core(version: 0).segment(), .unsupportedVersion, "version 0")
    }

    func testRefusesAVersionThatIsNotTheCoreSegment() {
        // Segment one begins 001, which is vendorsDisclosed: the core segment has to be
        // first, because only it omits a type field.
        var w = TcBitWriter()
        w.write(1, width: 3)
        w.write([Bool](repeating: false, count: 61))
        refuse(TcBase64URL.encode(w.bits), .unsupportedSegment, "vendorsDisclosed in segment one")
    }

    // MARK: - Length

    func testRefusesAStringTooShortForTheFieldSequence() {
        // The cut lands at 100 bits, which base64url pads back out to 120: exactly
        // through ConsentLanguage at 108-120, so VendorListVersion is the first field
        // with no bits behind it. The tail is real content rather than slack, and
        // nothing may be invented past the cut.
        refuse(Core(truncateTo: 100).segment(), .truncated, "core cut off at 100 bits")
    }

    func testRefusesABitFieldShorterThanItsDeclaredWidth() {
        // MaxVendorId 700 promises a 700-bit flat field and only 3 bits are written
        // behind it. The segment still reaches 262 bits, 264 once padded, so the read
        // runs out partway through the field rather than at the very end.
        refuse(
            Core(vendorMaxId: 700, vendorBits: 3).segment(),
            .truncated,
            "MaxVendorId 700 with 3 bits behind it"
        )
    }

    func testToleratesBase64SlackButNotAWholeFieldOfIt() {
        // The fields above total 259 bits: version 6, two 36-bit timestamps (78), cmpId
        // 12 (90), cmpVersion 12 (102), consentScreen 6 (108), language 12 (120),
        // vendorListVersion 12 (132), policyVersion 6 (138), two flags (140), special
        // features 12 (152), two 24-bit purpose vectors (200), one flag (201), country
        // 12 (213), two empty vendor vectors of 16 + 1 (230, 247), and
        // NumPubRestrictions 12 (259). Encoding pads to a multiple of 24, so 259
        // renders as 264 and 5 bits belong to no field; five more bits of anything and
        // the content lands exactly on 264, still 5 short. Step one past that bound and
        // the pad jumps to 288, leaving 29 unread bits: more than the widest field in
        // the sequence, which means a layout this reader does not have. The reference
        // ignores leftovers outright, so this refusal is deliberately stricter.
        XCTAssertCaseDecodes(Core(trailingBits: 5).segment(), "5 bits of base64 slack")
        refuse(Core(trailingBits: 6).segment(), .unsupportedSegment, "slack past the pad boundary")
    }

    private func XCTAssertCaseDecodes(
        _ string: String,
        _ note: String,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        if case let .rejected(reason, message) = TcStringWireReader.read(string) {
            XCTFail("\(note): expected a decode, got \(reason.rawValue): \(message)", file: file, line: line)
        }
    }

    // MARK: - Base64 and separators

    func testRefusesCharactersOutsideTheURLSafeAlphabet() {
        refuse("AAAA+", .invalidBase64URL, "standard base64 plus")
        refuse("AA=A", .invalidBase64URL, "a padding character")
        refuse("", .invalidBase64URL, "the empty string")
        // An empty middle segment has to reach the reader as empty, not collapse away.
        refuse("\(Core().segment())..\(Core().segment())", .invalidBase64URL, "an empty middle segment")
    }

    // MARK: - Segments

    func testRefusesUnassignedAndRepeatedSegmentTypes() {
        let core = Core().segment()
        refuse("\(core).\(vendorSegment(type: 7))", .unsupportedSegment, "segment type 7 is unassigned")
        refuse("\(core).\(vendorSegment(type: 0))", .unsupportedSegment, "type 0 is the core, not a payload")
        let disclosed = vendorSegment(type: 1)
        refuse("\(core).\(disclosed).\(disclosed)", .unsupportedSegment, "vendorsDisclosed twice")
    }

    // MARK: - Vendor vectors and ranges

    func testRefusesARangeThatEndsBelowWhereItStarts() {
        // 46..40 covers nothing. The reference expands it to an empty set and carries on;
        // a consent UI would read that as a vendor list that happens to be empty.
        refuse(
            Core(vendorMaxId: 46, isRangeEncoding: true, runs: [(true, 46, 40)]).segment(),
            .malformedRange,
            "a reversed range"
        )
    }

    func testRefusesAVendorIdOfZero() {
        // Framework ids start at 1, so 0 is a corrupted field rather than a vendor.
        refuse(
            Core(vendorMaxId: 1, isRangeEncoding: true, runs: [(false, 0, 0)]).segment(),
            .outOfRange,
            "a range entry starting at vendor 0"
        )
    }

    func testRefusesAVectorWhoseIdsExceedItsDeclaredWidth() {
        // MaxVendorId 5 cannot describe vendor 9. Read as declared, the bit field would
        // be 5 bits and the 9 would be lost without a trace.
        refuse(
            Core(vendorMaxId: 5, isRangeEncoding: true, runs: [(false, 9, 9)]).segment(),
            .malformedIDVector,
            "MaxVendorId 5 carrying vendor 9"
        )
    }

    func testKeepsADeclaredWidthWiderThanItsIds() {
        // The other direction is legal and common: a producer may declare a width above
        // the highest id it happened to set. Dropping it, as the reference does, is what
        // makes a string it decodes impossible to write back.
        let string = Core(vendorMaxId: 700).segment()
        guard case let .decoded(model) = TcStringWireReader.read(string) else {
            return XCTFail("a wide declaration must decode")
        }
        XCTAssertEqual(model.vendorConsents.declaredMaxId, 700, "the declared width survives")
        XCTAssertTrue(model.vendorConsents.ids.isEmpty, "and no ids come with it")
    }

    // MARK: - Codes

    func testRefusesLanguageAndCountryBitsOutsideTheAlphabet() {
        // Six bits reach 0-63 and only 0-25 are letters. The reference hands back
        // String.fromCharCode(65 + 26), which is "[", and that is not a language.
        refuse(Core(language: [26, 13]).segment(), .invalidCode, "language bit 26 spells '['")
        refuse(Core(country: [20, 63]).segment(), .invalidCode, "country bit 63")
    }

    // MARK: - Publisher restrictions

    func testRefusesAnUndefinedRestrictionTypeAndAZeroPurposeId() {
        // RestrictionType is 2 bits and 3 is documented as undefined; purpose 0 does not
        // exist, so both are refused rather than mapped onto something nearby.
        refuse(
            Core(restrictions: [(4, 3, [])]).segment(),
            .unsupportedRestrictionType,
            "RestrictionType 3"
        )
        refuse(
            Core(restrictions: [(0, 1, [])]).segment(),
            .outOfRange,
            "PurposeId 0"
        )
    }

    func testReportsRestrictionsInTheOrderTheWireCarriedThem() throws {
        // `tc-string-decode-restrictions-three-types` writes purpose 9 first, then 2,
        // then 7, while the fixture lists the same three sorted by purpose id. The
        // ledger compares them in canonical order because the format leaves this
        // unordered; this is the proof that the order is not being lost on the way in.
        let vector = try TcSharedFixtures.vector(id: "tc-string-decode-restrictions-three-types")
        guard case let .decoded(model) = TcStringWireReader.read(vector.expectedTCString) else {
            return XCTFail("the fixture's own string must decode")
        }
        XCTAssertEqual(
            model.publisherRestrictions.map { "\($0.purposeId)/\($0.restrictionType)" },
            ["9/requireConsent", "2/notAllowed", "7/requireLegitimateInterest"],
            "wire order, not the fixture's sorted order"
        )
        XCTAssertEqual(model.publisherRestrictions[1].vendorIds, Set(42...47))
    }
}
