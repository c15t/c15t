import Foundation
import XCTest

@testable import C15tCore

/// Runs every reference-produced TC String in ``TcFixtureCorpus``.
///
/// These are **local spot-check vectors, not the merge gate**. The merge gate is the
/// `tc-string` fixtures in `native/protocol`, which the vectors lane owns; nothing in
/// this file reads that directory, and nothing here is written to it. Two fixture
/// formats in one repository would be the worst possible outcome, so the day those
/// fixtures land, this corpus is subordinate to them rather than a rival.
///
/// Regenerate with the reference implementation installed:
///
/// ```text
/// node /tmp/tcfprobe/gen.mjs   # oracle: node_modules/.bun/@iabtechlabtcf+core@1.5.21
/// ```
///
/// Each vector records what the reference itself reported: whether it decoded, and
/// whether it reproduced its own bytes. Those two columns are asserted here, so a
/// claim this build makes that the reference cannot make has to be stated out loud
/// rather than quietly assumed.
final class TcOracleVectorTests: XCTestCase {
    private func decoded(_ vector: TcOracleVector) throws -> TcString {
        guard case let .decoded(string) = TcStringWireReader.read(vector.string) else {
            let reason = describe(TcStringWireReader.read(vector.string))
            throw XCTSkip("\(vector.id): refused (\(reason)); this vector is a reject case")
        }
        return string
    }

    private func describe(_ outcome: TcStringOutcome) -> String {
        switch outcome {
        case .decoded:
            "decoded"
        case let .rejected(reason, message):
            "\(reason): \(message)"
        }
    }

    // MARK: - Round trip

    func testRoundTripVectorsReproduceTheirOwnBytes() throws {
        var claimed = 0
        var beyondTheReference: [String] = []
        for vector in TcFixtureCorpus.vectors(.roundtrip) {
            guard case let .decoded(model) = TcStringWireReader.read(vector.string) else {
                XCTFail("\(vector.id): decode refused — \(describe(TcStringWireReader.read(vector.string)))")
                continue
            }
            guard case let .encoded(encoded) = TcStringEncoder.encode(model) else {
                XCTFail("\(vector.id): encode refused — \(vector.string)")
                continue
            }
            // Byte equality, not a decoded-map comparison: a field that decodes the
            // same two ways but re-encodes differently is still a broken codec.
            XCTAssertEqual(encoded, vector.string, "\(vector.id): round trip changed bytes")
            claimed += 1
            if vector.oracleByteExact == nil {
                beyondTheReference.append(vector.id)
            }
        }
        XCTAssertEqual(claimed, 16, "the corpus lost or gained a round-trip vector")
        // The reference cannot re-encode a core segment carrying publisher
        // restrictions: `PurposeRestrictionVectorEncoder.encode` reads
        // `prVector.gvl.vendorIds`, and `TCString.decode` never attaches a GVL.
        // Reproducing those two is a claim this build makes and the reference does not.
        XCTAssertEqual(
            Set(beyondTheReference),
            ["core-restrictions", "restrictions-with-disclosed"],
            "vectors where this build round-trips and the reference cannot"
        )
    }

    // MARK: - Decode-only vectors

    /// Two vectors the reference cannot write back. Encoding is skipped here on
    /// purpose and the reason is named; the stronger claim lives in
    /// ``testDeclaredWidthSurvivesWhereTheReferenceDropsIt``.
    func testDecodeOnlyVectorsDecodeAndStateWhyEncodingIsSkipped() throws {
        var skipped: [String] = []
        let decodeOnly = TcFixtureCorpus.vectors(.decodeOnly)
        XCTAssertEqual(
            Set(decodeOnly.map(\.id)),
            ["lossy-disclosed-maxid", "lossy-disclosed-maxid-range"],
            "the decode-only population changed"
        )
        for vector in decodeOnly {
            guard case let .decoded(model) = TcStringWireReader.read(vector.string) else {
                XCTFail("\(vector.id): decode refused — \(describe(TcStringWireReader.read(vector.string)))")
                continue
            }
            // The bit-field vector sets 3 and 9 outright; the range vector writes one
            // entry covering 3..9, which expands to all seven IDs.
            let expected: Set<Int> = vector.id == "lossy-disclosed-maxid" ? [3, 9] : Set(3...9)
            XCTAssertEqual(model.vendorsDisclosed?.ids, expected, "\(vector.id): disclosed IDs")
            skipped.append(vector.id)
        }
        // One skip for the whole population, so both vectors are checked before the
        // test stops. Naming the field is the point: an unlabelled skip is a hole.
        throw XCTSkip(
            "encode not claimed against the reference for \(skipped.joined(separator: ", ")): "
                + "the reference discards MaxVendorId on decode, so it cannot write these back"
        )
    }

    /// The reference rebuilds a `Vector` from positive IDs alone, so a declared
    /// `MaxVendorId` above the highest positive ID is lost and the string comes back
    /// shorter. This build keeps the declared width, so it reproduces both shapes.
    func testDeclaredWidthSurvivesWhereTheReferenceDropsIt() throws {
        for vector in TcFixtureCorpus.vectors(.decodeOnly) {
            guard case let .decoded(model) = TcStringWireReader.read(vector.string) else {
                return XCTFail("\(vector.id): decode refused")
            }
            XCTAssertEqual(
                model.vendorsDisclosed?.declaredMaxId,
                vector.id == "lossy-disclosed-maxid" ? 700 : 600,
                "\(vector.id): the declared MaxVendorId has to survive the read"
            )
            guard case let .encoded(encoded) = TcStringEncoder.encode(model) else {
                return XCTFail("\(vector.id): encode refused")
            }
            XCTAssertEqual(encoded, vector.string, "\(vector.id): declared width did not survive")
        }
    }

    // MARK: - Refusals

    func testMalformedVectorsAreRefused() throws {
        var reasons: [String: TcStringFailureReason] = [:]
        for vector in TcFixtureCorpus.vectors(.reject) {
            switch TcStringWireReader.read(vector.string) {
            case .decoded:
                XCTFail("\(vector.id): accepted a malformed string — \(vector.note)")
            case let .rejected(reason, message):
                XCTAssertFalse(message.isEmpty, "\(vector.id): a refusal has to say why")
                reasons[vector.id] = reason
            }
        }
        XCTAssertEqual(reasons.count, 13, "the reject population changed")
        XCTAssertEqual(reasons["bad-non-base64url"], .invalidBase64URL)
        XCTAssertEqual(reasons["bad-empty-string"], .invalidBase64URL)
        XCTAssertEqual(reasons["bad-unknown-segment-type"], .unsupportedSegment)
        XCTAssertEqual(reasons["bad-version-3"], .unsupportedVersion)
        XCTAssertEqual(reasons["bad-version-0"], .unsupportedVersion)
        XCTAssertEqual(reasons["bad-truncated-core"], .truncated)
        XCTAssertEqual(reasons["bad-short-bitfield"], .truncated)
        XCTAssertEqual(reasons["bad-reversed-vendor-range"], .malformedRange)
        XCTAssertEqual(reasons["bad-restriction-range"], .malformedRange)
        XCTAssertEqual(reasons["bad-invalid-language"], .invalidCode)
        XCTAssertEqual(reasons["bad-invalid-country-code"], .invalidCode)
        XCTAssertEqual(reasons["bad-duplicate-segment"], .unsupportedSegment)
        XCTAssertEqual(reasons["bad-core-not-first"], .unsupportedSegment)
    }

    // MARK: - What the fixtures pin
    //
    // A vector that pins a policy version no live publisher emits proves nothing about
    // production. The live GVL reports tcfPolicyVersion 5 and vendorListVersion 177,
    // and `TCModel` defaults `policyVersion_` to 5 and overrides it from the GVL, so
    // the production-shaped vectors here pin 5 / 177.

    func testProductionVectorsPinTheLiveGVLCeilings() throws {
        for id in ["core-empty", "core-purposes", "disclosed-bitfield", "publisher-tc"] {
            let vector = TcFixtureCorpus.vector(_id: id)
            let model = try decoded(vector)
            XCTAssertEqual(model.tcfPolicyVersion, 5, "\(id): tcfPolicyVersion")
            XCTAssertEqual(model.vendorListVersion, 177, "\(id): vendorListVersion")
            XCTAssertEqual(model.isServiceSpecific, true, "\(id): c15t defaults service-specific")
            XCTAssertEqual(model.consentLanguage, "EN", "\(id): c15t defaults EN")
            XCTAssertEqual(model.publisherCountryCode, "US", "\(id): c15t defaults US")
        }
        // The one exception is deliberate: it drives every integer field to its
        // ceiling, which a live string never does.
        let ceiling = try decoded(TcFixtureCorpus.vector(_id: "core-max-ints"))
        XCTAssertEqual(ceiling.tcfPolicyVersion, 63, "6 bits at full width")
        XCTAssertEqual(ceiling.vendorListVersion, 4095, "12 bits at full width")
        XCTAssertEqual(ceiling.cmpId, 4095)
        XCTAssertEqual(ceiling.consentScreen, 63)
    }

    // MARK: - Decode completeness
    //
    // c15t never writes these fields, but other CMPs do, and a decoder that drops
    // them reads a real string as a smaller one.

    func testOptionalCoreFieldsDecode() throws {
        let vector = TcFixtureCorpus.vector(_id: "core-restrictions")
        let model = try decoded(vector)
        XCTAssertEqual(model.publisherRestrictions.count, 2, "both restrictions survive the read")
        let first = try XCTUnwrap(model.publisherRestrictions.first)
        XCTAssertEqual(first.purposeId, 4)
        XCTAssertEqual(first.restrictionType, .requireConsent)
        XCTAssertEqual(first.vendorIds, [4, 5, 6, 9], "the gap in the run is preserved")
        XCTAssertEqual(
            first.entries.map { "\($0.start)..\($0.end) range=\($0.isRange)" },
            ["4..6 range=true", "9..9 range=false"],
            "one range entry and one single, exactly as written"
        )
        XCTAssertEqual(model.publisherRestrictions.dropFirst().first?.restrictionType, .requireLegitimateInterest)
        XCTAssertEqual(model.publisherRestrictions.dropFirst().first?.vendorIds, [20, 21, 22])
    }

    func testOneTreatmentAndNonStandardTextsDecode() throws {
        let vector = TcFixtureCorpus.vector(_id: "core-all-flags")
        let model = try decoded(vector)
        XCTAssertEqual(model.purposeOneTreatment, true)
        XCTAssertEqual(model.useNonStandardTexts, true)
        XCTAssertEqual(model.isServiceSpecific, false)
        XCTAssertEqual(model.specialFeatureOptIns.ids, [1, 2])
        XCTAssertEqual(model.purposeConsents.ids, Set(1...11), "every purpose a live GVL declares")
    }

    func testPublisherSectionDecodesWithCustomPurposes() throws {
        let vector = TcFixtureCorpus.vector(_id: "publisher-tc")
        let model = try decoded(vector)
        let section = try XCTUnwrap(model.publisherSection)
        XCTAssertEqual(section.numCustomPurposes, 6)
        XCTAssertEqual(section.publisherConsents.ids, [1, 4])
        XCTAssertEqual(section.publisherLegitimateInterests.ids, [2, 3])
        XCTAssertEqual(section.publisherCustomConsents.ids, [1, 3, 6])
        XCTAssertEqual(section.publisherCustomLegitimateInterests.ids, [2, 5])
    }

    func testVendorSectionsAndAllowedListDecode() throws {
        let vector = TcFixtureCorpus.vector(_id: "allowed-and-disclosed")
        let model = try decoded(vector)
        XCTAssertEqual(model.vendorsDisclosed?.ids, [5, 40, 41, 42, 300])
        XCTAssertEqual(model.vendorsAllowed?.ids, [5, 40, 41, 42, 300])
        XCTAssertEqual(model.segmentOrder, [.core, .vendorsDisclosed, .vendorsAllowed])
    }

    func testDatesDecodeToTheirHundredthOfASecond() throws {
        let vector = TcFixtureCorpus.vector(_id: "core-date-extremes")
        let model = try decoded(vector)
        XCTAssertEqual(
            model.created.timeIntervalSince1970,
            1_767_225_600,
            accuracy: 0.1,
            "2026-01-01T00:00:00Z"
        )
        XCTAssertEqual(model.consentLanguage, "AA")
        XCTAssertEqual(model.publisherCountryCode, "ZZ")
    }

    // MARK: - Guard rails on the corpus itself

    func testEveryVectorIsNamedAndUnambiguous() {
        let ids = TcFixtureCorpus.all.map(\.id)
        XCTAssertEqual(Set(ids).count, ids.count, "two vectors share an id")
        for vector in TcFixtureCorpus.all {
            XCTAssertFalse(vector.note.isEmpty, "\(vector.id): a vector has to say what it covers")
        }
        XCTAssertFalse(TcFixtureCorpus.all.isEmpty, "an empty corpus passes everything")
    }
}


// MARK: - Provisional corpus expiry
//
// The provisional corpus is a stopgap while `native/protocol` has no `tc-string`
// fixtures. This is the tripwire that stops it becoming a second source of truth:
// the moment the shared fixtures land, this test fails and says what to delete.
extension TcOracleVectorTests {
    func testProvisionalCorpusHasNotOutlivedItsWelcome() throws {
        let protocolDirectory = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent() // C15tCoreTests
            .deletingLastPathComponent() // Tests
            .deletingLastPathComponent() // core-swift
            .deletingLastPathComponent() // native
            .appendingPathComponent("protocol")
        let shared = try FileManager.default.contentsOfDirectory(atPath: protocolDirectory.path)
            .filter { $0.hasPrefix("tc-string") && $0.hasSuffix(".json") }
            .sorted()
        guard shared.isEmpty else {
            return XCTFail(
                "native/protocol now ships \(shared.count) tc-string fixtures "
                    + "(\(shared.joined(separator: ", "))). Delete TcFixtureCorpus.provisional and "
                    + "point TcFixtureCorpus at the shared fixtures; leaving both is two fixture "
                    + "formats in one repository."
            )
        }
        print(
            "TC fixtures: provisional corpus only (\(TcFixtureCorpus.all.count) vectors); "
                + "0 shared tc-string fixtures in native/protocol"
        )
    }
}
