import Foundation
import XCTest

@testable import C15tCore

/// Bit-packing checks computed by hand.
///
/// Every expected offset in this file is spelled out as an addition so it can be
/// checked against the formats document with a pencil. The point is that these tests
/// would still fail correctly if the reference implementation were deleted.
final class TcBitFieldTests: XCTestCase {
    // MARK: - base64url

    func testBase64URLAlphabet() {
        // The alphabet is A-Z, a-z, 0-9, then '-' and '_' as 62 and 63.
        let expected: [Character: Int] = [
            "A": 0, "B": 1, "Z": 25, "a": 26, "z": 51, "0": 52, "9": 61, "-": 62, "_": 63,
        ]
        for (character, value) in expected {
            var bits = [Bool]()
            for shift in stride(from: 5, through: 0, by: -1) {
                bits.append(((value >> shift) & 1) == 1)
            }
            // Six bits render to four characters once the segment is padded out to 24,
            // so the character under test is the first one and the tail is zeros.
            XCTAssertEqual(TcBase64URL.encode(bits), String(character) + "AAA", "\(character) is \(value)")
            XCTAssertEqual(TcBase64URL.decode(String(character))?.bitCount, 6)
        }
    }

    func testBase64URLRejectsStandardAlphabetAndEmptyInput() {
        // '+' and '/' belong to standard base64, not the URL-safe set the format uses,
        // and a padded string must not be quietly accepted.
        XCTAssertNil(TcBase64URL.decode("AB+D"))
        XCTAssertNil(TcBase64URL.decode("AB/D"))
        XCTAssertNil(TcBase64URL.decode("="))
        XCTAssertNil(TcBase64URL.decode(""))
        XCTAssertNotNil(TcBase64URL.decode("AB_D-"))
    }

    func testSegmentsPadToTwentyFourBits() {
        // The reference pads every segment to lcm(6, 8) = 24 bits before rendering,
        // so a one-bit segment still occupies 24 / 6 = 4 characters. Padding to six
        // instead would emit one character and break byte equality on any segment
        // whose content lands between those two boundaries.
        XCTAssertEqual(TcBase64URL.encode([true]).count, 4)
        XCTAssertEqual(TcBase64URL.encode(Array(repeating: false, count: 24)).count, 4)
        XCTAssertEqual(TcBase64URL.encode(Array(repeating: false, count: 25)).count, 8)
        // 25 bits -> one more group of six would be 30 bits, still short of 48, so the
        // encoder must reach 48 (8 characters) rather than 30 (5 characters).
        XCTAssertEqual(TcBase64URL.encode(Array(repeating: false, count: 30)).count, 8)
    }

    // MARK: - Reader bounds

    func testReaderRefusesToRunPastTheEnd() {
        // "AAAB" is 4 characters, so 24 real bits; nothing may read bit 25.
        guard let decoded = TcBase64URL.decode("AAAB") else {
            return XCTFail("AAAB should decode")
        }
        XCTAssertEqual(decoded.bitCount, 24, "4 characters x 6 bits")
        var reader = TcBitReader(bytes: decoded.bytes, bitCount: decoded.bitCount)
        XCTAssertEqual(reader.remainingBits, 24)
        XCTAssertNotNil(reader.readUnsigned(24))
        XCTAssertEqual(reader.remainingBits, 0)
        XCTAssertNil(reader.readUnsigned(1))
        XCTAssertNil(reader.readBool())
        XCTAssertNil(reader.readBits(8))
        XCTAssertEqual(reader.readUnsigned(0), 0, "a zero-width read is legal and consumes nothing")
    }

    func testReaderIsMostSignificantBitFirst() {
        // 'B' is alphabet index 1 and 'C' is 2, so "BC" is 0b000001 0b000010.
        // The first eleven bits are 0b00000100001, which is 32 + 1 = 33.
        guard let decoded = TcBase64URL.decode("BC") else {
            return XCTFail("BC should decode")
        }
        XCTAssertEqual(decoded.bitCount, 12, "2 characters x 6 bits")
        var reader = TcBitReader(bytes: decoded.bytes, bitCount: decoded.bitCount)
        XCTAssertEqual(reader.readUnsigned(6), 1, "B is index 1")
        XCTAssertEqual(reader.readUnsigned(6), 2, "C is index 2")
        var restart = TcBitReader(bytes: decoded.bytes, bitCount: decoded.bitCount)
        XCTAssertEqual(restart.readUnsigned(11), 0b000_0010_0001, "32 + 1")
    }

    func testWriterRoundTripsEveryFieldWidth() {
        // Widths the format actually uses, plus the widest one a UInt64 read allows.
        for width in [1, 2, 3, 6, 12, 16, 24, 36, 62] {
            let value: UInt64 = width >= 62 ? (1 << 61) + 7 : UInt64((1 << width) - 1)
            var writer = TcBitWriter()
            writer.write(value, width: width)
            let bytes = TcBase64URL.pack(writer.bits)
            var reader = TcBitReader(bytes: bytes, bitCount: writer.bits.count)
            XCTAssertEqual(reader.readUnsigned(width), value, "width \(width)")
        }
    }

    // MARK: - Hand-computed core layout
    //
    // Cumulative bit offsets through the v2 core field sequence. Each line is the
    // previous total plus the width the formats document gives the field:
    //
    //   version              6  ->   6
    //   created             36  ->  42
    //   lastUpdated         36  ->  78
    //   cmpId               12  ->  90
    //   cmpVersion          12  -> 102
    //   consentScreen        6  -> 108
    //   consentLanguage     12  -> 120
    //   vendorListVersion   12  -> 132
    //   tcfPolicyVersion     6  -> 138
    //   isServiceSpecific    1  -> 139
    //   useNonStandardTexts  1  -> 140
    //   specialFeatureOptIns 12 -> 152
    //   purposeConsents     24  -> 176
    //   purposeLegitimateInterests 24 -> 200
    //   purposeOneTreatment   1 -> 201
    //   publisherCountryCode 12 -> 213
    //   vendorConsents: MaxVendorId 16 -> 229, IsRangeEncoding 1 -> 230

    /// `tc-string-parity-policy-version-5`: cmpId 28 version 1 screen 1, language EN,
    /// purposes 1, 2 and 7 by consent, no legitimate interest, vendor consents 1 and 2
    /// against a declared width of 2. Read through the shared fixtures, so no TC string
    /// literal lives in this file.
    private func coreVector() throws -> String {
        try TcSharedFixtures.vector(id: "tc-string-parity-policy-version-5").expectedTCString
    }

    func testHandComputedCoreOffsets() throws {
        let core = try coreVector().split(separator: ".").first.map(String.init) ?? ""
        guard let decoded = TcBase64URL.decode(core) else {
            return XCTFail("the core segment should decode")
        }
        var reader = TcBitReader(bytes: decoded.bytes, bitCount: decoded.bitCount)

        XCTAssertEqual(try? reader.readUnsigned(6), 2, "version sits at 0 and is 2")
        XCTAssertEqual(reader.cursor, 6)
        // Both dates are the same instant here, and reading both lands on 78.
        // 1_769_990_400_000 ms is 17_699_904_000 units of 100 ms.
        XCTAssertEqual(reader.readUnsigned(36), 17_699_904_000, "Created at 6, in units of 100 ms")
        XCTAssertEqual(reader.readUnsigned(36), 17_699_904_000, "LastUpdated at 42")
        XCTAssertEqual(reader.cursor, 78, "6 + 36 + 36")
        XCTAssertEqual(try? reader.readUnsigned(12), 28, "cmpId at 78")
        XCTAssertEqual(try? reader.readUnsigned(12), 1, "cmpVersion at 90")
        XCTAssertEqual(try? reader.readUnsigned(6), 1, "consentScreen at 102")

        // consentLanguage at 108: two 6-bit letters, EN = 4 and 13.
        XCTAssertEqual(try? reader.readUnsigned(6), 4, "E is 69 - 65")
        XCTAssertEqual(try? reader.readUnsigned(6), 13, "N is 78 - 65")
        XCTAssertEqual(reader.cursor, 120, "108 + 12")
        XCTAssertEqual(try? reader.readUnsigned(12), 142, "vendorListVersion at 120")
        XCTAssertEqual(try? reader.readUnsigned(6), 5, "tcfPolicyVersion at 132, what a live list carries")
        XCTAssertEqual(reader.readBool(), true, "isServiceSpecific at 138")
        XCTAssertEqual(reader.readBool(), false, "useNonStandardTexts at 139")
        XCTAssertEqual(reader.cursor, 140)
        XCTAssertEqual(try? reader.readUnsigned(12), 0, "specialFeatureOptIns at 140, none opted in")
        XCTAssertEqual(reader.cursor, 152, "140 + 12")

        // purposeConsents at 152: the bit for purpose p sits at 152 + (p - 1).
        let consentBits = reader.readBits(24)
        XCTAssertEqual(reader.cursor, 176, "152 + 24")
        let consent = Set((0..<24).compactMap { consentBits?[$0] == true ? $0 + 1 : nil })
        XCTAssertEqual(consent, [1, 2, 7], "purposes 1 + 2 + 7 are what this fixture sets")

        let legitimateInterest = reader.readBits(24)
        XCTAssertEqual(reader.cursor, 200, "176 + 24")
        XCTAssertFalse(legitimateInterest?.contains(true) ?? true, "no purpose legitimate interest here")

        XCTAssertEqual(reader.readBool(), false, "purposeOneTreatment at 200")
        // publisherCountryCode at 201: US = 20 and 18.
        XCTAssertEqual(try? reader.readUnsigned(6), 20, "U is 85 - 65")
        XCTAssertEqual(try? reader.readUnsigned(6), 18, "S is 83 - 65")
        XCTAssertEqual(reader.cursor, 213, "201 + 12")

        // vendorConsents at 213.
        XCTAssertEqual(try? reader.readUnsigned(16), 2, "MaxVendorId at 213")
        XCTAssertEqual(reader.readBool(), false, "IsRangeEncoding 0 means a bit field")
        XCTAssertEqual(reader.cursor, 230, "213 + 16 + 1")
        let vendors = reader.readBits(2)
        XCTAssertEqual(
            Set((0..<2).compactMap { vendors?[$0] == true ? $0 + 1 : nil }),
            [1, 2],
            "the bit field is read in the same 1-based order as purposes"
        )
    }

    /// The core segment of a fixture, which is where the vendor vectors live.
    private func core(of id: String) throws -> String {
        let parts = try TcSharedFixtures.vector(id: id).expectedTCString.split(separator: ".")
        guard let first = parts.first else {
            throw TcSharedFixtures.LoadError.malformed(file: id, detail: "no core segment")
        }
        return String(first)
    }

    private func bitReader(_ segment: String) throws -> TcBitReader {
        guard let decoded = TcBase64URL.decode(segment) else {
            throw TcSharedFixtures.LoadError.malformed(file: segment, detail: "not base64url")
        }
        return TcBitReader(bytes: decoded.bytes, bitCount: decoded.bitCount)
    }

    /// The two fixtures that straddle the point where the reference encoder starts
    /// considering a range: one vendor at id 45, one at id 46.
    ///
    /// `IsRangeEncoding` reads 1 for a range and 0 for a bit field, which
    /// `encoder/field/VectorEncodingType.js` (FIELD = 0, RANGE = 1) and the formats
    /// document agree on. What decides which one goes out is the interesting half, and
    /// it is not the cheaper encoding. A range section costs 16 + 1 + 12 for its header
    /// plus 1 + 16 for a single entry, so one lone vendor is 46 bits wherever it sits,
    /// while a bit field costs 16 + 1 + MaxVendorId: 62 bits at 45 and 63 at 46.
    ///
    /// So at 45 a range is 16 bits cheaper and the reference still writes the bit
    /// field, because its walk only entertains a range once MaxVendorId exceeds 45 --
    /// 45 being the cost of the cheapest conceivable range section. At 46 the gate
    /// opens and the range wins on its merits. A port that measured both and wrote the
    /// shorter would reproduce the 46 fixture and fail the 45 one, which is why both
    /// sides of the line are pinned.
    func testIsRangeEncodingPolarityIsZeroForBitField() throws {
        for (id, expectedPolarity, expectedMaxId) in [
            ("tc-string-parity-single-vendor-id-45", false, 45),
            ("tc-string-parity-single-vendor-id-46", true, 46),
        ] {
            var reader = try bitReader(core(of: id))
            _ = reader.readBits(213)
            XCTAssertEqual(reader.cursor, 213, "\(id): vendorConsents starts at 213")
            XCTAssertEqual(
                try? reader.readUnsigned(16),
                UInt64(expectedMaxId),
                "\(id): MaxVendorId at 213"
            )
            XCTAssertEqual(reader.readBool(), expectedPolarity, "\(id): IsRangeEncoding")
            XCTAssertEqual(reader.cursor, 230, "\(id): 213 + 16 + 1")
        }
    }

    /// A range entry carries an end id only when it is a range, so a single costs 17
    /// bits and a range 33. A reader that assumed either width would find
    /// NumPubRestrictions in the wrong place.
    func testRangeEntriesCarryTheirEndIdOnlyWhenTheyAreRanges() throws {
        var reader = try bitReader(core(of: "tc-string-parity-single-vendor-id-46"))
        _ = reader.readBits(213)
        XCTAssertEqual(reader.readUnsigned(16), 46, "MaxVendorId")
        XCTAssertEqual(reader.readBool(), true, "IsRangeEncoding")
        XCTAssertEqual(reader.readUnsigned(12), 1, "NumEntries at 230")
        XCTAssertEqual(reader.readBool(), false, "IsARange 0 is a single")
        XCTAssertEqual(reader.readUnsigned(16), 46, "StartOrOnlyVendorId at 243")
        // No EndVendorId follows a single, so NumPubRestrictions begins at
        // 213 + 16 + 1 + 12 + 1 + 16 = 259.
        XCTAssertEqual(reader.cursor, 259, "a single ends the vector at 259")
        XCTAssertEqual(reader.readUnsigned(12), 0, "NumPubRestrictions at 259, none in this fixture")
    }
}
