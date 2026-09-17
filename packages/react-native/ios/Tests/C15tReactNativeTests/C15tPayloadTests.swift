@testable import C15tReactNativeBridge
import C15tCore
import XCTest

/// The wire boundary is the part of the iOS bridge most likely to drift from the
/// TypeScript protocol, and it is the part that must not. These assert on field
/// names, null vs absent, and fail-closed reads rather than on internals.
final class C15tPayloadTests: XCTestCase {
    func testBootstrapPayloadCarriesHandshakeFields() {
        let snapshot = ConsentSnapshot(subject: SubjectSnapshot(id: "sub-1", externalId: nil))
        let payload = jsonObject(C15tPayload.bootstrap(snapshot: snapshot, hasStoredSnapshot: true))

        XCTAssertEqual(payload["protocolVersion"] as? Int, 1)
        XCTAssertEqual(payload["minSupportedProtocolVersion"] as? Int, 1)
        XCTAssertEqual(payload["maxSupportedProtocolVersion"] as? Int, 1)
        XCTAssertEqual(payload["subjectId"] as? String, "sub-1")
        XCTAssertEqual(payload["hasStoredSnapshot"] as? Bool, true)
        XCTAssertNotNil(payload["nativeSdkVersion"] as? String, "the handshake must name the SDK version")
    }

    func testBootstrapPayloadReportsNullSubjectBeforeFirstWrite() {
        let payload = jsonObject(C15tPayload.bootstrap(snapshot: ConsentSnapshot(), hasStoredSnapshot: false))

        assertJSONNull(payload, "subjectId")
    }

    func testColdStartSnapshotServesDenyAllWithBothFlagsUnset() {
        let payload = jsonObject(C15tPayload.snapshot(.coldStart))

        XCTAssertEqual(payload["policyPending"] as? Bool, true)
        XCTAssertEqual(payload["ready"] as? Bool, false)
        guard let permissions = payload["effectivePermissions"] as? [String: Bool] else {
            return XCTFail("effectivePermissions missing from \(payload)")
        }
        XCTAssertEqual(permissions["necessary"], true, "necessary is never a choice")
        for category in ["functionality", "experience", "measurement", "marketing"] {
            XCTAssertEqual(permissions[category], false, "\(category) must be denied while policy is pending")
        }
    }

    func testSnapshotSendsEveryReservedKeyAsExplicitNull() {
        // The protocol declares these `T | null`, not optional. Omitting them would
        // hand JavaScript `undefined` where its types promise `null`.
        let payload = jsonObject(C15tPayload.snapshot(.coldStart))

        for key in [
            "explicitChoice", "consentCategories", "policySnapshotToken", "subject",
            "location", "translations", "nextDeadline", "error", "iab",
        ] {
            assertJSONNull(payload, key)
        }

        let overrides = payload["overrides"] as? [String: Any]
        XCTAssertNotNil(overrides)
        for key in ["country", "region", "test"] {
            XCTAssertTrue(overrides?.keys.contains(key) == true, "overrides.\(key) must be present")
        }
        let resolution = payload["resolution"] as? [String: Any]
        XCTAssertNotNil(resolution)
        for key in ["policyId", "fingerprint"] {
            XCTAssertTrue(resolution?.keys.contains(key) == true, "resolution.\(key) must be present")
        }
    }

    func testSnapshotNeverEmitsAnEmptyLanguage() {
        // Translations resolve to exactly one bundle, so an empty language on the
        // wire is a bug the bridge covers for.
        let blank = ConsentSnapshot(overrides: ConsentOverrides(country: nil, region: nil, language: "", test: nil))

        let payload = jsonObject(C15tPayload.snapshot(blank, fallbackLanguage: "fr"))
        let overrides = payload["overrides"] as? [String: Any]

        XCTAssertEqual(overrides?["language"] as? String, "fr")
    }

    func testSnapshotKeepsAResolvedLanguageAsIs() {
        let snapshot = ConsentSnapshot(overrides: ConsentOverrides(country: nil, region: nil, language: "de", test: nil))

        let payload = jsonObject(C15tPayload.snapshot(snapshot, fallbackLanguage: "fr"))

        XCTAssertEqual((payload["overrides"] as? [String: Any])?["language"] as? String, "de")
    }

    func testCommitIntentReadsTheThreeActions() {
        XCTAssertEqual(C15tPayload.parseCommitIntent(#"{"action":"all"}"#), .all)
        XCTAssertEqual(C15tPayload.parseCommitIntent(#"{"action":"necessary"}"#), .necessary)
        XCTAssertEqual(
            C15tPayload.parseCommitIntent(#"{"action":"explicit","consents":{"marketing":true,"measurement":false}}"#),
            .custom([.marketing: true, .measurement: false])
        )
    }

    func testCommitIntentFailsClosedOnAnythingElse() {
        // A commit is audit evidence, so a half-readable one is refused outright.
        for raw in [
            "", "not json", "[]", "null",
            #"{"action":"accept-everything"}"#,
            #"{"action":"explicit"}"#,
            #"{"action":"explicit","consents":{"telepathy":true}}"#,
            #"{"action":"explicit","consents":{"necessary":true}}"#,
            #"{"action":"explicit","consents":{"marketing":"yes"}}"#,
        ] {
            XCTAssertNil(C15tPayload.parseCommitIntent(raw), "\(raw) must not become a commit")
        }
    }

    func testOverridesTreatOmittedAsKeptAndNullAsCleared() {
        let current = ConsentOverrides(country: "DE", region: "BE", language: "de", test: "run-7")

        // Omitted keys keep their value.
        XCTAssertEqual(
            C15tPayload.parseOverrides(#"{"language":"en"}"#, current: current),
            ConsentOverrides(country: "DE", region: "BE", language: "en", test: "run-7")
        )
        // An explicit null clears, except language, which has no empty state.
        XCTAssertEqual(
            C15tPayload.parseOverrides(#"{"country":null,"region":null,"language":null,"test":null}"#, current: current),
            ConsentOverrides(country: nil, region: nil, language: "de", test: nil)
        )
        // An unrelated document is refused rather than applied, so a bad call cannot
        // wipe the language the app is relying on.
        XCTAssertNil(C15tPayload.parseOverrides(#"{"policyId":"p-1"}"#, current: current))
        XCTAssertNil(C15tPayload.parseOverrides("garbage", current: current))
    }

    func testCommitResultDistinguishesRejectedFromCommitted() {
        let snapshot = ConsentSnapshot(subject: SubjectSnapshot(id: "sub-1", externalId: nil))
        let committed = CommitResult(
            status: .committed,
            revision: 7,
            permissions: .necessaryOnly,
            consentAction: .all,
            confirmed: [.marketing: true]
        )

        let accepted = jsonObject(C15tPayload.commitResult(committed, snapshot: snapshot))
        XCTAssertEqual(accepted["ok"] as? Bool, true)
        XCTAssertEqual(accepted["revision"] as? Int, 7)
        XCTAssertEqual(accepted["confirmed"] as? [String], ["marketing"])
        XCTAssertEqual(accepted["subjectId"] as? String, "sub-1")
        XCTAssertEqual(accepted["queued"] as? Bool, true, "the payload is durable before the call returns")

        let rejected = CommitResult(
            status: .rejected,
            revision: 7,
            permissions: .necessaryOnly,
            consentAction: .all,
            error: CoreErrorInfo(code: "policy-pending", message: "no policy yet")
        )
        let refused = jsonObject(C15tPayload.commitResult(rejected, snapshot: snapshot))
        XCTAssertEqual(refused["ok"] as? Bool, false)
        XCTAssertEqual(refused["reason"] as? String, "policy-pending")
        XCTAssertEqual(refused["queued"] as? Bool, false)
        // A refused commit changed nothing, so it reports no revision rather than the
        // unchanged one, which JavaScript would read as a new state to pull.
        assertJSONNull(refused, "revision")
    }

    func testEventPayloadsAreSmallOnPurpose() {
        // A snapshot event is a hint to go and read, never a copy of the snapshot.
        let snapshotEvent = jsonObject(C15tPayload.snapshotEvent(revision: 12))
        XCTAssertEqual(snapshotEvent["revision"] as? Int, 12)
        XCTAssertEqual(snapshotEvent["dirty"] as? Bool, true)
        XCTAssertEqual(snapshotEvent.count, 2)

        let initialized = jsonObject(C15tPayload.initializedEvent(revision: 12))
        XCTAssertEqual(initialized["ready"] as? Bool, true)
        XCTAssertEqual(initialized["policyPending"] as? Bool, false)

        let error = jsonObject(C15tPayload.errorEvent(code: "unsupported-contract", message: "nope"))
        XCTAssertEqual(error["code"] as? String, "unsupported-contract")
        XCTAssertEqual(error["message"] as? String, "nope")
    }

    func testInvalidIntentEchoesOnlyATruncatedSample() {
        let payload = jsonObject(C15tPayload.invalidIntent(raw: String(repeating: "x", count: 900)))

        XCTAssertEqual(payload["reason"] as? String, "invalid-intent")
        XCTAssertEqual((payload["detail"] as? String)?.count, 200, "echo a sample, not the whole payload")
    }
}
