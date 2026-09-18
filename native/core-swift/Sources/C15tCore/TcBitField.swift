import Foundation

// Bit packing for TC Strings, in both directions.
//
// A TC String is a base64url rendering of a big-endian bit field. The reference
// implementation (`@iabtechlabtcf/core`) walks that field as a string of `0` and
// `1` characters; this holds the same bits as bytes plus an explicit length, so a
// read past the end is detectable instead of silently returning a short slice.
//
// The explicit length matters more than it looks. base64url carries six bits per
// character, so a segment's real content is usually shorter than the decoded
// buffer: `Base64URL.bitCount` is `6 * characterCount`, and the tail is padding
// that no field owns. Everything here is bounds-checked against `bitCount`.

/// The base64url alphabet used by TC Strings.
///
/// This is the URL-safe alphabet only: `+` and `/` are not in it, and neither the
/// reference nor this build accepts them, so a padded standard-base64 string is
/// refused rather than repaired.
enum TcBase64URL {
    /// log2(64): bits carried by one character.
    static let basis = 6

    /// lcm(6, 6 bits per character, 8 bits per byte) = 24.
    ///
    /// The reference pads each *segment* to a multiple of this before rendering,
    /// which is why a TC String's segment lengths come in multiples of four
    /// characters. Matching it is a byte-equality requirement, not a stylistic
    /// one: padding to a multiple of six instead would emit a different string for
    /// any segment whose content lands between those two boundaries.
    static let padToBits = 24

    private static let alphabet: [Character] = Array(
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    )

    /// Maps one base64url character to its six-bit value.
    private static func value(of character: Character) -> UInt8? {
        guard let index = alphabet.firstIndex(of: character) else {
            return nil
        }
        return UInt8(index)
    }

    /// Reads a base64url segment into bits.
    ///
    /// - Parameter string: one segment, with no `.` separator and no padding
    ///   characters.
    /// - Returns: the packed bits and how many of them are real, or `nil` when the
    ///   input is empty or holds a character outside the alphabet.
    static func decode(_ string: some StringProtocol) -> (bytes: [UInt8], bitCount: Int)? {
        guard !string.isEmpty else {
            return nil
        }
        var bits: [Bool] = []
        bits.reserveCapacity(string.count * basis)
        for character in string {
            guard let six = value(of: character) else {
                return nil
            }
            // Most significant bit first, matching the reference's left-padded
            // six-character binary strings.
            for shift in stride(from: 5, through: 0, by: -1) {
                bits.append(((six >> shift) & 1) == 1)
            }
        }
        return (bytes: pack(bits), bitCount: bits.count)
    }

    /// Renders bits as base64url, zero-padding the tail to a multiple of
    /// ``padToBits`` the way the reference does.
    static func encode(_ bits: [Bool]) -> String {
        let remainder = bits.count % padToBits
        var padded = bits
        if remainder != 0 {
            padded.append(contentsOf: repeatElement(false, count: padToBits - remainder))
        }
        var result = ""
        result.reserveCapacity(padded.count / basis)
        // Each output character takes exactly `basis` bits, most significant bit
        // first, so the group start is fixed and only the offset moves.
        for base in stride(from: 0, to: padded.count, by: basis) {
            var six: UInt8 = 0
            for shift in stride(from: basis - 1, through: 0, by: -1) {
                if padded[base + (basis - 1 - shift)] {
                    six |= 1 << UInt8(shift)
                }
            }
            result.append(alphabet[Int(six)])
        }
        return result
    }

    /// Packs most-significant-bit-first booleans into bytes.
    static func pack(_ bits: [Bool]) -> [UInt8] {
        var bytes: [UInt8] = []
        bytes.reserveCapacity((bits.count + 7) / 8)
        var current: UInt8 = 0
        for (offset, bit) in bits.enumerated() {
            if bit {
                current |= (1 << (7 - (offset % 8)))
            }
            if offset % 8 == 7 {
                bytes.append(current)
                current = 0
            }
        }
        if bits.count % 8 != 0 {
            bytes.append(current)
        }
        return bytes
    }
}

/// A cursor over a bounded bit field.
///
/// Reads are `Optional` rather than throwing so the decoder can decide what a
/// short field means. Nothing here traps, and nothing here guesses: a read that
/// would run past `bitCount` returns `nil` and leaves the cursor where it was.
struct TcBitReader {
    private let bytes: [UInt8]
    private let bitCount: Int
    private(set) var cursor: Int = 0

    init(bytes: [UInt8], bitCount: Int) {
        self.bytes = bytes
        self.bitCount = bitCount
    }

    var remainingBits: Int {
        max(0, bitCount - cursor)
    }

    /// Reads `width` bits as an unsigned integer, most significant bit first.
    ///
    /// - Parameter width: 0 to 62. A width of 0 reads nothing and returns 0, which
    ///   is what an empty publisher-custom-purposes vector needs.
    /// - Returns: `nil` when fewer than `width` bits remain.
    mutating func readUnsigned(_ width: Int) -> UInt64? {
        guard width >= 0, width <= 62 else {
            return nil
        }
        guard width <= remainingBits else {
            return nil
        }
        var value: UInt64 = 0
        for _ in 0..<width {
            value = (value << 1) | (bit(at: cursor) ? 1 : 0)
            cursor += 1
        }
        return value
    }

    /// Reads one bit as a flag.
    mutating func readBool() -> Bool? {
        guard remainingBits >= 1 else {
            return nil
        }
        defer { cursor += 1 }
        return bit(at: cursor)
    }

    /// Reads `count` bits without interpreting them, preserving order.
    mutating func readBits(_ count: Int) -> [Bool]? {
        guard count >= 0, count <= remainingBits else {
            return nil
        }
        var bits: [Bool] = []
        bits.reserveCapacity(count)
        for _ in 0..<count {
            bits.append(bit(at: cursor))
            cursor += 1
        }
        return bits
    }

    private func bit(at index: Int) -> Bool {
        ((bytes[index / 8] >> (7 - (index % 8))) & 1) == 1
    }
}

/// Builds a bit field for encoding.
struct TcBitWriter {
    private(set) var bits: [Bool] = []

    mutating func write(_ value: UInt64, width: Int) {
        precondition(width >= 0 && width <= 62, "segment width out of range")
        for shift in stride(from: width - 1, through: 0, by: -1) {
            bits.append(((value >> UInt64(shift)) & 1) == 1)
        }
    }

    mutating func write(_ flag: Bool) {
        bits.append(flag)
    }

    mutating func write(_ values: [Bool]) {
        bits.append(contentsOf: values)
    }

    /// Renders what was written as one base64url segment.
    func toBase64URL() -> String {
        TcBase64URL.encode(bits)
    }
}
