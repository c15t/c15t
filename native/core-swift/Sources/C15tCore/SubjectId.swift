import Foundation

#if canImport(Security)
import Security
#endif
#if canImport(CryptoKit)
import CryptoKit
#endif

/// Generates c15t subject ids: `sub_` followed by base58 over 20 bytes.
///
/// The output is byte-identical to the web SDK's `generateSubjectId()` in
/// `packages/core/src/libs/generate-subject-id.ts`, and that is the only shape the
/// backend accepts (`packages/schema/src/api/subject/post.ts`:
/// `^sub_[1-9A-HJ-NP-Za-km-z]+$`). A core that mints its own format has every save
/// answered with `INPUT_VALIDATION_FAILED`, so web and both native cores have to
/// produce ids a server cannot tell apart.
///
/// The buffer is the big-endian two's-complement count of milliseconds since
/// ``epochMillis``, then ``randomByteCount`` cryptographic random bytes, which makes
/// ids chronological and unique inside one millisecond.
enum SubjectId {
    /// Custom epoch shared with the web SDK and the server: 2023-11-14T22:13:20Z.
    static let epochMillis: Int64 = 1_700_000_000_000

    /// Random bytes per id. The timestamp takes the other eight.
    static let randomByteCount = 12

    /// The Bitcoin alphabet: no `0`, `O`, `I`, or `l`.
    private static let alphabet =
        Array("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")

    private static let alphabetSet = Set(alphabet)

    /// A fresh id, from the wall clock and the system CSPRNG.
    static func generate() -> String {
        generate(now: Self.currentMillis, entropy: Self.systemRandomBytes)
    }

    /// The same id with both sources pinned, which is the shape the cross-language
    /// vectors are written in: `now` reads epoch milliseconds, and `entropy` supplies
    /// the random tail of the buffer.
    ///
    /// - Precondition: `entropy()` answers with exactly ``randomByteCount`` bytes. A
    ///   CSPRNG that will not answer has no acceptable substitute, because every
    ///   fallback is either guessable or a persistent device identifier, and the point
    ///   of the id is that it is neither.
    static func generate(now: () -> Int64, entropy: () -> [UInt8]?) -> String {
        guard let randomBytes = entropy(), randomBytes.count == Self.randomByteCount else {
            preconditionFailure("a subject id needs \(Self.randomByteCount) CSPRNG bytes")
        }

        // `&-` so a clock set far from the epoch wraps instead of trapping. The
        // offset is negative before the epoch, and `bitPattern` is what writes that
        // as two's complement rather than clamping it to zero.
        let offsetBits = UInt64(bitPattern: now() &- Self.epochMillis)
        var bytes = [UInt8](repeating: 0, count: 8 + Self.randomByteCount)
        for index in 0..<8 {
            bytes[index] = UInt8(truncatingIfNeeded: offsetBits >> (8 * (7 - index)))
        }
        for (index, byte) in randomBytes.enumerated() {
            bytes[8 + index] = byte
        }

        return "sub_" + Self.base58(bytes)
    }

    /// The backend's format check: `^sub_[1-9A-HJ-NP-Za-km-z]+$`.
    static func isValid(_ candidate: String) -> Bool {
        guard candidate.hasPrefix("sub_") else { return false }
        let encoded = candidate.dropFirst(4)
        return !encoded.isEmpty && encoded.allSatisfy(Self.alphabetSet.contains)
    }

    /// Base58 over the whole buffer: read the bytes as one unsigned big integer,
    /// divide it by 58 until nothing is left, and put one `1` in front per leading
    /// zero byte. Dividing on the bytes keeps a big-integer type out of a kernel that
    /// otherwise has no reason to own one.
    private static func base58(_ bytes: [UInt8]) -> String {
        var quotient = bytes
        var digits: [Character] = []
        while quotient.contains(where: { $0 != 0 }) {
            var remainder = 0
            for index in quotient.indices {
                let dividend = remainder * 256 + Int(quotient[index])
                quotient[index] = UInt8(dividend / 58)
                remainder = dividend % 58
            }
            digits.append(Self.alphabet[remainder])
        }

        let leadingZeroBytes = bytes.prefix(while: { $0 == 0 }).count
        guard !digits.isEmpty else {
            // Nothing to divide out, so the leading zeros are the whole value. The web
            // SDK answers the same way for an all-zero buffer.
            return String(repeating: Self.alphabet[0], count: max(leadingZeroBytes, 1))
        }
        return String(repeating: Self.alphabet[0], count: leadingZeroBytes) + String(digits.reversed())
    }

    /// Wall clock in epoch milliseconds, the reading `CoreConfig.now` defaults to.
    private static func currentMillis() -> Int64 {
        Int64(Date().timeIntervalSince1970 * 1_000)
    }

    /// ``randomByteCount`` bytes from the platform CSPRNG, or `nil`. Not
    /// `SystemRandomNumberGenerator`, which Swift documents as making no cryptographic
    /// guarantee; a subject id is the one value here that needs one.
    private static func systemRandomBytes() -> [UInt8]? {
        #if canImport(Security)
        var bytes = [UInt8](repeating: 0, count: Self.randomByteCount)
        let status = bytes.withUnsafeMutableBytes { buffer in
            guard let base = buffer.baseAddress else { return errSecParam }
            return SecRandomCopyBytes(kSecRandomDefault, buffer.count, base)
        }
        return status == errSecSuccess ? bytes : nil
        #elseif canImport(CryptoKit)
        return try? [UInt8](SecureRandom.bytes(count: Self.randomByteCount))
        #else
        return nil
        #endif
    }
}
