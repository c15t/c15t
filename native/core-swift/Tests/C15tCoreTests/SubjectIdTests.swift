import Foundation
import XCTest

@testable import C15tCore

/// Subject id generation, pinned to the vectors the two native cores and the web SDK
/// share, and to the regex the backend actually applies.
final class SubjectIdTests: XCTestCase {
    /// The backend's own check, `subjectIdSchema` in
    /// `packages/schema/src/api/subject/post.ts`.
    private static let backendPattern = "^sub_[1-9A-HJ-NP-Za-km-z]+$"

    /// One vector: the 12 random bytes, the wall clock in epoch milliseconds, and the
    /// id every SDK must return for that pair. `nowMillis` is the reading the generator
    /// is pinned to, not the offset it encodes: the epoch is subtracted inside, the way
    /// `generateSubjectId` subtracts it from `Date.now()`. Reading it as an offset still
    /// returns a well formed `sub_` id, so only the expected string catches that.
    private struct Vector {
        let randomBytes: String
        let nowMillis: Int64
        let id: String
    }

    private static let vectors: [Vector] = [
        Vector(
            randomBytes: "000000000000000000000000",
            nowMillis: 1,
            id: "sub_4Zrjtb44miwSTU2EYMYtuVWfaAPR"
        ),
        Vector(
            randomBytes: "000000000000000000000001",
            nowMillis: 58_123_456_789,
            id: "sub_4ZrjtiRsJnoW34Px8dAvhPTKJiWc"
        ),
        Vector(
            randomBytes: "ffffffffffffffffffffffff",
            nowMillis: 58_123_456_789,
            id: "sub_4ZrjtiRsJnoasFgQkJmLeDNrs7fC"
        ),
        // A clock set before the epoch: the offset is negative and is encoded as
        // two's complement, not clamped.
        Vector(
            randomBytes: "01096a7b8c9d0e1f20ab11cd",
            nowMillis: -100_000_000_000,
            id: "sub_4ZrjtNN3QTDfdH8RQdZEAE8ohrCk"
        ),
        Vector(
            randomBytes: "a1b2c3d4e5f60718293a4b5c",
            nowMillis: 58_123_456_789,
            id: "sub_4ZrjtiRsJnoZ63G1p3FjTdWdHA6P"
        ),
        // A clock ahead of the epoch, which is every real device. Everything above
        // sits behind it, so without this row an encoder that handled only negative
        // offsets would pass the whole table.
        Vector(
            randomBytes: "9a0f1c2b3d4e5f60718293ab",
            nowMillis: 80_000_000_000,
            id: "sub_4ZrjtmCtGLiMkPniH4rf1naxRKTp"
        ),
        // One millisecond past the epoch: seven zero bytes in front of the offset, so
        // seven `1`s in front of the digits.
        Vector(
            randomBytes: "000000000000000000000000",
            nowMillis: 1_700_000_000_001,
            id: "sub_11111115qCHTcgbQwpvYZQ9d"
        ),
        // The one input where the division loop never runs, so the leading zeros are
        // the whole encoding.
        Vector(
            randomBytes: "000000000000000000000000",
            nowMillis: 1_700_000_000_000,
            id: "sub_11111111111111111111"
        ),
    ]

    // MARK: - Byte-for-byte parity

    func testGeneratedIdsMatchTheCrossLanguageVectors() {
        for vector in Self.vectors {
            XCTAssertEqual(
                SubjectId.generate(now: { vector.nowMillis }, entropy: { hexBytes(vector.randomBytes) }),
                vector.id,
                "clock \(vector.nowMillis) with entropy \(vector.randomBytes)"
            )
        }
    }

    // MARK: - Format

    func testEveryGeneratedIdMatchesTheBackendRegex() throws {
        let regex = try NSRegularExpression(pattern: Self.backendPattern)
        for _ in 0..<500 {
            let id = SubjectId.generate()
            XCTAssertNotNil(
                regex.firstMatch(in: id, range: NSRange(id.startIndex..., in: id)),
                "the backend would reject \(id)"
            )
            XCTAssertTrue(SubjectId.isValid(id))
        }
    }

    func testIdentityMintsABackendAcceptableId() {
        // The regression this whole format exists for: an identity built from a UUID
        // is well-formed Swift and `INPUT_VALIDATION_FAILED` at the backend.
        let id = SubjectIdentity.generate().id
        XCTAssertTrue(SubjectId.isValid(id), "expected a sub_ id, got \(id)")
        XCTAssertTrue(SubjectIdentity.isValid(id))
    }

    func testFormatCheckRejectsWhatTheBackendRejects() {
        for rejected in [
            "sub_",
            "sub_0", // `0` is out of the alphabet
            "sub_OI", // so are `O`, `I`, and `l`
            "sub_9ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyZl",
            "cns_4Zrjtb44miwSTU2EYMYtuVWfaAPR",
            "6f1d2c3a-8b4e-4a7f-9c21-0d5e7a9b1c01",
            "",
        ] {
            XCTAssertFalse(SubjectId.isValid(rejected), "\(rejected) must not pass")
        }
    }

    func testGeneratedIdsAreDistinct() {
        let ids = (0..<1_000).map { _ in SubjectId.generate() }
        XCTAssertEqual(Set(ids).count, ids.count, "two ids came out of the same entropy")
    }

    func testEntropyIsDrawnOnEveryGeneration() {
        // Fresh bytes per id, not one draw reused: the clock here is fixed, so a cached
        // entropy value would repeat the id instead of differing.
        var draws = 0
        let entropy: () -> [UInt8]? = {
            draws += 1
            return hexBytes(String(repeating: "ab", count: SubjectId.randomByteCount))?
                .map { $0 ^ UInt8(draws) }
        }
        let ids = (0..<3).map { _ in SubjectId.generate(now: { 1_758_100_000_000 }, entropy: entropy) }
        XCTAssertEqual(draws, 3)
        XCTAssertEqual(Set(ids).count, 3)
    }

    // MARK: - Reading an id back

    func testStoredIdsAreAdoptedExactlyAsStored() throws {
        // Both formats this SDK writes, plus nothing in between: an install that
        // upgrades keeps the subject its consent is already keyed to.
        let stored = [
            "6f1d2c3a-8b4e-4a7f-9c21-0d5e7a9b1c01", // minted before the `sub_` format
            "sub_4ZrjtiRsJnoW34Px8dAvhPTKJiWc",
        ]
        for id in stored {
            let store = InMemoryStore()
            store.encode(["id": id], for: StorageKey.subject)
            XCTAssertEqual(
                SubjectIdentity.loadOrCreate(from: store).id,
                id,
                "reading back \(id)"
            )
        }
    }

    func testForeignStoredIdIsReplacedWithAFreshSubId() {
        // IDFV-shaped and uppercase: a device identifier, never a subject.
        let store = InMemoryStore()
        store.encode(["id": "6E9A1F2C-3B4D-5E6F-A7B8-C9D0E1F2A3B4"], for: StorageKey.subject)
        let identity = SubjectIdentity.loadOrCreate(from: store)
        XCTAssertNotEqual(identity.id, "6E9A1F2C-3B4D-5E6F-A7B8-C9D0E1F2A3B4")
        XCTAssertTrue(SubjectId.isValid(identity.id))
    }

    func testLegacyUuidShapeCheckStillAcceptsOnlyTheFormThisSdkWrote() {
        XCTAssertTrue(SubjectIdentity.isValid("6f1d2c3a-8b4e-4a7f-9c21-0d5e7a9b1c01"))
        XCTAssertFalse(SubjectIdentity.isValid("6F1D2C3A-8B4E-4A7F-9C21-0D5E7A9B1C01"))
        XCTAssertFalse(SubjectIdentity.isValid("6f1d2c3a-8b4e-5a7f-9c21-0d5e7a9b1c01")) // not v4
        XCTAssertFalse(SubjectIdentity.isValid("6f1d2c3a-8b4e-4a7f-cc21-0d5e7a9b1c01")) // bad variant
        XCTAssertFalse(SubjectIdentity.isValid("not-an-id"))
    }
}

/// Two hex characters per byte, or `nil` for anything that is not whole bytes.
private func hexBytes(_ hex: String) -> [UInt8]? {
    guard hex.count.isMultiple(of: 2) else { return nil }
    var bytes: [UInt8] = []
    var index = hex.startIndex
    while index < hex.endIndex {
        let next = hex.index(index, offsetBy: 2)
        guard let byte = UInt8(hex[index..<next], radix: 16) else { return nil }
        bytes.append(byte)
        index = next
    }
    return bytes
}
