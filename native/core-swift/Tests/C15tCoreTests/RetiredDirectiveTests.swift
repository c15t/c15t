import Foundation
import XCTest

@testable import C15tCore

/// Stored state from an alpha build that still recorded standing privacy directives.
///
/// v3 dropped the directive: GPC is a live signal, and its restriction lifts with the
/// signal. Every alpha snapshot wrote `optOutDirectives`, even as an empty list, and a
/// directive-denied category carried an `opt-out-directive` reason. Both are dropped on
/// read. Refusing them would reset every alpha install to deny-all.
final class RetiredDirectiveTests: XCTestCase {
    private static let subjectId = "sub_4ZrjtNN3QTDfdH8RQdZEAE8ohrCk"

    /// A snapshot in the alpha shape: a directive for marketing and measurement,
    /// marketing restricted by the live signal and the directive, measurement by the
    /// directive alone.
    private func alphaSnapshotFields(
        _ snapshot: ConsentSnapshot = ConsentSnapshot(revision: 4)
    ) throws -> [String: JSONValue] {
        let data = try C15tJSON.encode(snapshot)
        var fields = try XCTUnwrap(C15tJSON.parse(data)?.objectValue)
        fields["optOutDirectives"] = .array([
            .object([
                "source": .string("gpc"),
                "categories": .array([.string("marketing"), .string("measurement")]),
                "recordedAt": .integer(1_758_000_000_000),
            ]),
        ])
        fields["restrictions"] = .object([
            "marketing": .array([.string("gpc"), .string("opt-out-directive")]),
            "measurement": .array([.string("opt-out-directive")]),
        ])
        return fields
    }

    func testASnapshotCarryingDirectivesDecodesWithoutThem() throws {
        let fields = try alphaSnapshotFields()
        let data = try XCTUnwrap(C15tJSON.encode(.object(fields)))
        let snapshot = try C15tJSON.decode(ConsentSnapshot.self, from: data)

        XCTAssertEqual(snapshot.revision, 4)
        XCTAssertEqual(snapshot.restrictions[.marketing], [.gpc])
        XCTAssertNil(
            snapshot.restrictions[.measurement],
            "a category restricted only by a directive has no restriction now"
        )
        let reencoded = try XCTUnwrap(C15tJSON.parse(try C15tJSON.encode(snapshot))?.objectValue)
        XCTAssertNil(reencoded["optOutDirectives"])
    }

    func testAnUnknownRestrictionReasonStillFailsToDecode() throws {
        var fields = try alphaSnapshotFields()
        fields["restrictions"] = .object(["marketing": .array([.string("made-up")])])
        let data = try XCTUnwrap(C15tJSON.encode(.object(fields)))
        XCTAssertThrowsError(try C15tJSON.decode(ConsentSnapshot.self, from: data))
    }

    func testAnAlphaEnvelopeIsReadNotRefused() throws {
        XCTAssertNotNil(
            StoredEnvelope.decode(try alphaEnvelope(policy: Fixture.rule())),
            "every alpha envelope wrote optOutDirectives; refusing it resets consent"
        )
    }

    func testTheDirectiveRestrictionLiftsWhenTheSignalIsGone() throws {
        let core = ConsentCore()
        core.bootstrap(Fixture.configured(
            store: try alphaStore(),
            transport: nil,
            clock: TestClock(),
            gpc: false
        ))

        let snapshot = core.snapshot()
        XCTAssertTrue(snapshot.ready, "the alpha envelope restored")
        XCTAssertTrue(core.isAllowed(.marketing), "opt-out allows marketing with no live signal")
        XCTAssertTrue(core.isAllowed(.measurement))
        XCTAssertNil(snapshot.restrictions[.marketing])
        XCTAssertNil(snapshot.restrictions[.measurement])
    }

    func testALiveSignalStillRestrictsAfterRestoringAnAlphaEnvelope() throws {
        let core = ConsentCore()
        core.bootstrap(Fixture.configured(
            store: try alphaStore(),
            transport: nil,
            clock: TestClock(),
            gpc: true
        ))

        let snapshot = core.snapshot()
        XCTAssertTrue(snapshot.ready)
        XCTAssertFalse(core.isAllowed(.marketing), "the live signal denies marketing")
        XCTAssertEqual(snapshot.restrictions[.marketing], [.gpc])
        XCTAssertTrue(
            core.isAllowed(.measurement),
            "measurement was denied only by the stored directive, which no longer applies"
        )
    }

    // MARK: - Helpers

    private func alphaEnvelope(policy: JSONValue) throws -> Data {
        let snapshot = ConsentSnapshot(
            revision: 4,
            policyPending: false,
            ready: true,
            model: .optOut,
            subject: SubjectSnapshot(id: Self.subjectId, externalId: nil)
        )
        return try XCTUnwrap(
            C15tJSON.encode(
                .object([
                    "version": .integer(1),
                    "storedAt": .integer(1),
                    "snapshot": .object(try alphaSnapshotFields(snapshot)),
                    "noticeDismissal": .null,
                    "policyResolution": Fixture.matchedResolution(policy: policy),
                ])
            )
        )
    }

    /// A store holding an alpha envelope under a CCPA-style opt-out rule whose GPC
    /// denial covers marketing only.
    private func alphaStore() throws -> InMemoryStore {
        let store = InMemoryStore()
        store.set(Data("{\"id\":\"\(Self.subjectId)\"}".utf8), for: StorageKey.subject)
        store.set(
            try alphaEnvelope(
                policy: Fixture.rule(
                    model: "opt-out",
                    gpcDeny: ["marketing"],
                    rights: ["disclosure", "preferences", "opt-out"]
                )
            ),
            for: StorageKey.snapshot
        )
        return store
    }
}
