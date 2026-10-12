import XCTest
@testable import C15tCore

/// The envelope guard has to tolerate the way another writer spells "absent".
///
/// `carriesNothingUnknown` refuses an envelope holding a key the typed value cannot give
/// back, which is right for a field from a future build and wrong for a null. Swift leaves
/// an absent optional out of its output, while the TypeScript reference kernel and the
/// Kotlin core spell it as an explicit null. Refusing that reads as a stored choice turning
/// into nothing stored, on every launch, on one platform only.
final class StoredEnvelopeNullTests: XCTestCase {
    func testAnExplicitNullIsNotAnUnknownField() throws {
        let envelope = StoredEnvelope(
            snapshot: ConsentSnapshot(revision: 0),
            noticeDismissal: nil,
            policyResolution: nil,
            storedAt: 1_700_000_000_000
        )
        let clean = try C15tJSON.encode(envelope)
        XCTAssertNotNil(StoredEnvelope.decode(clean), "an envelope this build wrote must read")

        // Add the absent fields the way the other two kernels write them rather than
        // editing Swift's own bytes, so the assertion holds whatever order the encoder
        // uses. The count check is what stops this from passing on a probe that injected
        // nothing, which is how the first version of this test lied.
        guard case let .object(fields)? = C15tJSON.parse(clean) else {
            return XCTFail("the envelope is not a JSON object")
        }
        var fromAnotherWriter = fields
        fromAnotherWriter["noticeDismissal"] = .null
        fromAnotherWriter["policyResolution"] = .null
        XCTAssertEqual(
            fromAnotherWriter.count,
            fields.count + 2,
            "Swift wrote the absent keys itself, so the probe tested nothing"
        )
        guard let probed = C15tJSON.encode(.object(fromAnotherWriter)) else {
            return XCTFail("the probe bytes could not be encoded")
        }
        XCTAssertNotNil(
            StoredEnvelope.decode(probed),
            "a null is how another kernel spells absent, not a field this build cannot honour"
        )
    }
}
