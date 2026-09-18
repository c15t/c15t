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

    /// The `core-purposes` vector: purposes 1, 2 and 10 by consent, 7 and 9 by
    /// legitimate interest, vendor consents 1 and 8, vendor LI 7. Read through the
    /// corpus so no TC string literal lives in this file.
    private var corePurposes: String {
        TcFixtureCorpus.vector(_id: "core-purposes").string
    }

    func testHandComputedCoreOffsets() throws {
        guard let decoded = TcBase64URL.decode(corePurposes) else {
            return XCTFail("vector should be base64url")
        }
        var reader = TcBitReader(bytes: decoded.bytes, bitCount: decoded.bitCount)

        XCTAssertEqual(try? reader.readUnsigned(6), 2, "version sits at 0 and is 2")
        XCTAssertEqual(reader.cursor, 6)
        // created == lastUpdated in this vector, and skipping both lands on 78.
        _ = try? reader.readUnsigned(36)
        _ = try? reader.readUnsigned(36)
        XCTAssertEqual(reader.cursor, 78, "6 + 36 + 36")
        XCTAssertEqual(try? reader.readUnsigned(12), 28, "cmpId at 78")
        XCTAssertEqual(try? reader.readUnsigned(12), 1, "cmpVersion at 90")
        XCTAssertEqual(try? reader.readUnsigned(6), 3, "consentScreen at 102")

        // consentLanguage at 120: two 6-bit letters, EN = 4 and 13.
        XCTAssertEqual(try? reader.readUnsigned(6), 4, "E is 69 - 65")
        XCTAssertEqual(try? reader.readUnsigned(6), 13, "N is 78 - 65")
        XCTAssertEqual(try? reader.readUnsigned(12), 177, "vendorListVersion at 132")
        XCTAssertEqual(try? reader.readUnsigned(6), 5, "tcfPolicyVersion at 144, matching a live GVL")
        XCTAssertEqual(reader.readBool(), true, "isServiceSpecific at 150... at 138")
        XCTAssertEqual(reader.readBool(), false, "useNonStandardTexts at 139")
        XCTAssertEqual(reader.cursor, 140)
        // specialFeatureOptIns at 140, twelve bits, none opted in here.
        XCTAssertEqual(try? reader.readUnsigned(12), 0)
        XCTAssertEqual(reader.cursor, 152, "140 + 12")

        // purposeConsents at 152: bit for purpose p lives at 152 + (p - 1).
        let consentBits = reader.readBits(24)
        XCTAssertEqual(reader.cursor, 176, "152 + 24")
        let consent = Set((0..<24).compactMap { consentBits?[$0] == true ? $0 + 1 : nil })
        XCTAssertEqual(consent, [1, 2, 10], "1 + 2 + 10 are the purposes this vector sets")

        let legitimateInterest = reader.readBits(24)
        XCTAssertEqual(reader.cursor, 200, "176 + 24")
        let li = Set((0..<24).compactMap { legitimateInterest?[$0] == true ? $0 + 1 : nil })
        XCTAssertEqual(li, [7, 9])

        XCTAssertEqual(reader.readBool(), false, "purposeOneTreatment at 200")
        // publisherCountryCode at 201, twelve bits: US = 20 and 18.
        XCTAssertEqual(try? reader.readUnsigned(6), 20, "U is 85 - 65")
        XCTAssertEqual(try? reader.readUnsigned(6), 18, "S is 83 - 65")
        XCTAssertEqual(reader.cursor, 213, "201 + 12")

        // vendorConsents at 213.
        XCTAssertEqual(try? reader.readUnsigned(16), 8, "MaxVendorId at 213")
        XCTAssertEqual(reader.readBool(), false, "IsRangeEncoding 0 means a bit field")
        XCTAssertEqual(reader.cursor, 230, "213 + 16 + 1")
        let vendors = reader.readBits(8)
        XCTAssertEqual(
            Set((0..<8).compactMap { vendors?[$0] == true ? $0 + 1 : nil }),
            [1, 8],
            "the bit field is read in the same 1-based order as purposes"
        )
    }

    private func segment(of id: String) -> String {
        let parts = TcFixtureCorpus.vector(_id: id).string.split(separator: ".")
        return parts.count > 1 ? String(parts[1]) : ""
    }

    func testIsRangeEncodingPolarityIsZeroForBitField() throws {
        // The formats document states IsRangeEncoding as "1 Range 0 BitField", and
        // `encoder/field/VectorEncodingType.js` agrees (FIELD = 0, RANGE = 1).
        //
        // Hand-check the boundary the reference encoder picks: a bit field costs
        // 3 + 16 + 1 + MaxVendorId, a single contiguous range costs
        // 3 + 16 + 1 + 12 + 1 + 16 + 16 = 65. So 45 contiguous vendors costs
        // 20 + 45 = 65 bits and stays a bit field, while 46 costs 20 + 46 = 66 bits
        // and a range at 65 becomes cheaper. That is why the switch lands at 46, and
        // why both segments below render to 65 -> 72 padded bits -> 12 characters.
        let bitField = segment(of: "disclosed-bitfield-45")
        let ranges = segment(of: "disclosed-range-46")
        XCTAssertEqual(bitField.count, 12)
        XCTAssertEqual(ranges.count, 12)

        for (segment, expectedPolarity, expectedMaxId) in [
            (bitField, false, 45), (ranges, true, 46),
        ] {
            guard let decoded = TcBase64URL.decode(segment) else {
                return XCTFail("segment should decode")
            }
            var reader = TcBitReader(bytes: decoded.bytes, bitCount: decoded.bitCount)
            XCTAssertEqual(try? reader.readUnsigned(3), 1, "segment type 1 is vendorsDisclosed")
            XCTAssertEqual(try? reader.readUnsigned(16), UInt64(expectedMaxId), "MaxVendorId")
            XCTAssertEqual(
                reader.readBool(),
                expectedPolarity,
                "IsRangeEncoding for \(segment)"
            )
        }
    }

}
