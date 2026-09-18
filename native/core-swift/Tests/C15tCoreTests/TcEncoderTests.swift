import Foundation
import XCTest

@testable import C15tCore

/// What the encoder does with a model it cannot write.
///
/// No TC string appears in this file: every case starts from a hand-built model and
/// breaks it in one way, so the encoder has to refuse rather than write bytes its own
/// decoder would turn down. Nothing here reads `native/protocol`: the shared corpus
/// only carries strings a reference CMP was willing to write, and these are models
/// this encoder has to refuse instead.
final class TcEncoderTests: XCTestCase {
    private let epoch = Date(timeIntervalSince1970: 1_767_225_600)

    /// A writable core model that every case below copies and then corrupts.
    private func baseline() -> TcString {
        TcString(
            created: epoch,
            lastUpdated: epoch,
            cmpId: 3,
            cmpVersion: 1,
            consentScreen: 1,
            consentLanguage: "EN",
            vendorListVersion: 177,
            tcfPolicyVersion: 5,
            isServiceSpecific: true,
            useNonStandardTexts: false,
            specialFeatureOptIns: .empty(fixedWidth: 12),
            purposeConsents: .empty(fixedWidth: 24),
            purposeLegitimateInterests: .empty(fixedWidth: 24),
            purposeOneTreatment: false,
            publisherCountryCode: "US",
            vendorConsents: TcIDVector(ids: [], encoding: .bitField(maxId: 0)),
            vendorLegitimateInterests: TcIDVector(ids: [], encoding: .bitField(maxId: 0)),
            publisherRestrictions: []
        )
    }

    private func assertRefused(
        _ model: TcString,
        _ reason: TcEncodeFailureReason,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        switch TcStringEncoder.encode(model) {
        case let .encoded(string):
            XCTFail("expected a refusal, got \(string)", file: file, line: line)
        case let .rejected(actual, message):
            XCTAssertEqual(actual, reason, "wrong refusal reason", file: file, line: line)
            XCTAssertFalse(message.isEmpty, "a refusal has to say why", file: file, line: line)
        }
    }

    // MARK: - Identity

    /// Encode then decode has to hand back the same model. Everything the refusals
    /// below claim rests on the writer and the reader agreeing on one shape.
    func testBaselineModelSurvivesAnEncodeThenDecode() throws {
        guard case let .encoded(string) = TcStringEncoder.encode(baseline()) else {
            return XCTFail("the baseline model must be writable")
        }
        guard case let .decoded(readBack) = TcStringWireReader.read(string) else {
            return XCTFail("the encoder wrote a string this build refuses to read: \(string)")
        }
        XCTAssertEqual(readBack, baseline(), "encode then decode lost a field")
    }

    // MARK: - Timestamps

    func testTimestampsAtTheEdgeOfThirtySixBitsStillEncode() throws {
        var model = baseline()
        // 6_871_947_673s is the last whole second whose tenths fit under 2^36.
        model.created = Date(timeIntervalSince1970: 6_871_947_673)
        guard case .encoded = TcStringEncoder.encode(model) else {
            return XCTFail("one second inside the ceiling must encode")
        }
    }

    func testEncoderRefusesTimestampsPastTheFieldWidth() throws {
        var late = baseline()
        // The ceiling is 2187-10-06T10:21:13.6Z. Past it, clamping would write a
        // string that decodes to an unrelated instant.
        late.created = Date(timeIntervalSince1970: 6_871_947_674)
        assertRefused(late, .valueTooWide)

        var early = baseline()
        early.lastUpdated = Date(timeIntervalSince1970: -1)
        assertRefused(early, .valueTooWide)
    }

    // MARK: - Bit fields

    func testEncoderRefusesBitFieldIDsWithNoBitToOccupy() throws {
        var beyondWidth = baseline()
        beyondWidth.purposeConsents = TcIDVector(ids: [25], encoding: .fixedWidth(bitWidth: 24))
        assertRefused(beyondWidth, .malformedVector)

        var zeroID = baseline()
        zeroID.specialFeatureOptIns = TcIDVector(ids: [0], encoding: .fixedWidth(bitWidth: 12))
        assertRefused(zeroID, .malformedVector)
    }

    // MARK: - Range entries

    func testEncoderRefusesRangeEntriesItCouldNotReadBack() throws {
        func vendors(_ run: TcIDRun, maxID: Int, ids: Set<Int>) -> TcString {
            var model = baseline()
            model.vendorConsents = TcIDVector(ids: ids, encoding: .ranges(maxId: maxID, entries: [run]))
            return model
        }

        assertRefused(
            vendors(TcIDRun(start: 0, end: 0, isRange: false), maxID: 1, ids: [1]),
            .malformedVector
        )
        assertRefused(
            vendors(TcIDRun(start: 9, end: 4, isRange: true), maxID: 9, ids: [9]),
            .malformedVector
        )
        // A single carries one id, so a second value on it has nowhere to go: writing
        // it anyway would drop ID 9 without saying so.
        assertRefused(
            vendors(TcIDRun(start: 5, end: 9, isRange: false), maxID: 9, ids: [5, 9]),
            .malformedVector
        )
    }

    /// Restriction entries share the run writer with vendor ranges, so they have to
    /// refuse the same shapes rather than only the vendor path.
    func testRestrictionEntriesRefuseTheSameShapesAsVendorRanges() throws {
        var model = baseline()
        model.publisherRestrictions = [
            TcPublisherRestriction(
                purposeId: 4,
                restrictionType: .requireConsent,
                entries: [TcIDRun(start: 9, end: 4, isRange: true)]
            ),
        ]
        assertRefused(model, .malformedVector)
    }

    // MARK: - Segment order

    func testEncoderRefusesASegmentOrderWithNothingBehindIt() throws {
        var model = baseline()
        // Silently dropping the segment would still decode, which is exactly why this
        // is a refusal instead of a skip.
        model.segmentOrder = [.core, .vendorsDisclosed]
        assertRefused(model, .malformedVector)
    }
}
