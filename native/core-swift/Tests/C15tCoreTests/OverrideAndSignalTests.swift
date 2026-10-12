import Foundation
import XCTest

@testable import C15tCore

/// Pins the corrected overrides and privacy signals: what the core encodes, what
/// it refuses to read back, and what a save body has to carry.
///
/// `native/CONTRACT.md` first described a `test` override and an `msa` signal, and
/// its Corrections section retires both. The expectations here come from
/// `KernelOverrides` and `KernelPrivacySignals` in `@c15t/core`, which is the
/// authority, not from a local opinion about what looked reasonable.
final class OverrideAndSignalTests: XCTestCase {
    /// A stored snapshot as a mutable object, so a test can splice one retired key
    /// back in and change nothing else.
    private func mutableSnapshotFields(
        _ snapshot: ConsentSnapshot = ConsentSnapshot(revision: 4)
    ) throws -> [String: JSONValue] {
        let data = try C15tJSON.encode(snapshot)
        return try XCTUnwrap(C15tJSON.parse(data)?.objectValue)
    }

    private func decodeSnapshot(_ fields: [String: JSONValue]) throws -> ConsentSnapshot {
        try C15tJSON.decode(ConsentSnapshot.self, from: try XCTUnwrap(C15tJSON.encode(.object(fields))))
    }

    // MARK: - Shape

    func testOverridesEncodeTheFourKernelFieldsAndNothingElse() throws {
        let data = try C15tJSON.encode(
            ConsentOverrides(country: "DE", region: nil, language: "de", gpc: true)
        )
        let object = try XCTUnwrap(C15tJSON.parse(data)?.objectValue)
        XCTAssertEqual(Set(object.keys), ["country", "region", "language", "gpc"])
        XCTAssertEqual(object["gpc"]?.boolValue, true)
        XCTAssertNil(object["test"], "publisher test mode is a client option, not an override")
    }

    func testPrivacySignalsEncodeTheDetectedOverrideActiveTriple() throws {
        let data = try C15tJSON.encode(PrivacySignals.none)
        let signals = try XCTUnwrap(C15tJSON.parse(data)?.objectValue)
        XCTAssertNil(signals["msa"], "there is no msa signal anywhere in v3")

        let gpc = try XCTUnwrap(signals["gpc"]?.objectValue)
        XCTAssertEqual(Set(gpc.keys), ["detected", "override", "active"])
        XCTAssertEqual(gpc["detected"]?.boolValue, false)
        XCTAssertEqual(gpc["active"]?.boolValue, false)
        XCTAssertEqual(gpc["override"]?.isNull, true)
    }

    func testOverrideWinsOverDetectionAndDetectionAloneStillActivates() {
        let overridden = GpcSignal.derive(override: false, detected: true)
        XCTAssertFalse(overridden.active, "an override off switches a detected signal off")
        XCTAssertTrue(overridden.detected, "the detection is still reported, just not honored")

        let detected = GpcSignal.derive(override: nil, detected: true)
        XCTAssertTrue(detected.active)
        XCTAssertNil(detected.override)
    }

    // MARK: - Stored envelopes written before the correction

    func testASnapshotCarryingTheRetiredTestOverrideDoesNotDecode() throws {
        var fields = try mutableSnapshotFields()
        var overrides = try XCTUnwrap(fields["overrides"]?.objectValue)
        overrides["test"] = .string("run-7")
        fields["overrides"] = .object(overrides)

        XCTAssertThrowsError(try decodeSnapshot(fields)) { error in
            XCTAssertTrue(
                String(describing: error).contains("test"),
                "the rejection has to name the field it refused, got \(error)"
            )
        }
    }

    func testASnapshotCarryingTheRetiredSignalPairDoesNotDecode() throws {
        var fields = try mutableSnapshotFields()
        // The retired shape: a bare boolean `gpc` alongside an `msa`.
        fields["privacySignals"] = .object([
            "gpc": .bool(true),
            "msa": .bool(false),
        ])
        XCTAssertThrowsError(try decodeSnapshot(fields))
    }

    func testAnUnreadableEnvelopeServesDenyAllAndKeepsTheSubject() throws {
        var fields = try mutableSnapshotFields(
            ConsentSnapshot(
                revision: 9,
                effectivePermissions: ConsentState(marketing: true),
                subject: SubjectSnapshot(id: "sub_4ZrjtNN3QTDfdH8RQdZEAE8ohrCk", externalId: nil)
            )
        )
        var overrides = try XCTUnwrap(fields["overrides"]?.objectValue)
        overrides["test"] = .string("run-7")
        fields["overrides"] = .object(overrides)

        let store = InMemoryStore()
        store.set(
            Data("{\"id\":\"sub_4ZrjtNN3QTDfdH8RQdZEAE8ohrCk\"}".utf8),
            for: StorageKey.subject
        )
        let envelope = try XCTUnwrap(
            C15tJSON.encode(
                .object([
                    "version": .integer(1),
                    "storedAt": .integer(1),
                    "snapshot": .object(fields),
                    "noticeDismissal": .null,
                    "policyResolution": .null,
                ])
            )
        )
        store.set(envelope, for: StorageKey.snapshot)

        let core = ConsentCore()
        core.bootstrap(Fixture.configured(store: store, transport: nil, clock: TestClock()))

        // Reinterpreting `test` as a GPC override, or dropping it and keeping the
        // rest, would both serve a permission derived from a field this build cannot
        // name. The envelope goes instead, which is the same answer as nothing stored.
        let snapshot = core.snapshot()
        XCTAssertFalse(snapshot.ready, "an unreadable envelope is nothing stored")
        XCTAssertTrue(snapshot.policyPending)
        for category in [ConsentCategory.marketing, .measurement, .experience, .functionality] {
            XCTAssertFalse(
                core.isAllowed(category),
                "\(category) must not be allowed from an envelope this build cannot read"
            )
        }
        XCTAssertEqual(
            snapshot.subject?.id,
            "sub_4ZrjtNN3QTDfdH8RQdZEAE8ohrCk",
            "failing closed on a snapshot must not cost the device its identity"
        )
    }

    func testStoredActiveIsRecomputedRatherThanTrusted() throws {
        var fields = try mutableSnapshotFields()
        fields["privacySignals"] = .object([
            "gpc": .object([
                "active": .bool(true),
                "detected": .bool(false),
                "override": .null,
            ]),
        ])

        // `active` is an output. A stored copy that claims a signal is on while
        // saying nothing detected it and nothing overrode it is answered with the
        // value the other two support, not the one it asserts.
        XCTAssertFalse(try decodeSnapshot(fields).privacySignals.gpc.active)
    }

    // MARK: - Decision inputs

    func testInitFoldsTheServedLocationIntoTheOverrides() async {
        let http = StubHTTP()
        http.enqueueInit(Fixture.initResponse(policyResolution: Fixture.matchedResolution()))
        let core = ConsentCore()
        core.bootstrap(
            Fixture.configured(store: InMemoryStore(), transport: Fixture.transport(http), clock: TestClock())
        )
        await core.waitUntilIdle()

        // `mapResolvedOverrides` derives overrides from the location and translation
        // language the same response carries, and the backend recomputes from them
        // before it accepts a save, so a core that reports nil here writes a body the
        // backend reads as a different decision.
        let overrides = core.snapshot().overrides
        XCTAssertEqual(overrides.country, "DE")
        XCTAssertEqual(overrides.region, "BE")
        XCTAssertNil(overrides.gpc, "/init never derives an app override")
    }

    /// An `/init` response with no `policySnapshotToken`, so the write has to assert
    /// its decision inputs flat rather than lean on a token.
    private func tokenlessInit(_ http: StubHTTP) {
        let body = JSONValue.object([
            "location": .object(["countryCode": .string("DE")]),
            "policyResolution": Fixture.matchedResolution(),
        ])
        let data = try? XCTUnwrap(C15tJSON.encode(body))
        http.enqueueInit(
            .json(String(decoding: data ?? Data("{}".utf8), as: UTF8.self))
        )
    }

    func testSaveBodyAssertsGpcWhenNothingSignedTheDecision() async {
        let http = StubHTTP()
        tokenlessInit(http)
        let core = ConsentCore()
        core.bootstrap(
            Fixture.configured(
                store: InMemoryStore(),
                transport: Fixture.transport(http),
                clock: TestClock(),
                overrides: ConsentOverrides(country: nil, region: nil, language: "en", gpc: true)
            )
        )
        await core.waitUntilIdle()

        XCTAssertEqual(core.save(.all).status, .committed)
        await core.waitUntilIdle()

        let request = try? XCTUnwrap(http.recordedSaveRequests.last)
        let body = C15tJSON.parse(request?.body ?? Data())
        XCTAssertNil(body?["policySnapshotToken"], "this init served no token")
        XCTAssertEqual(
            body?["gpc"]?.boolValue,
            true,
            "a tokenless write asserts its decision inputs, and gpc is one of them"
        )
        XCTAssertEqual(body?["policyId"]?.stringValue, "de-1")
        XCTAssertEqual(body?["country"]?.stringValue, "DE")
    }

    func testDecisionInputsCarryGpcThroughEncodingEvenWhenATokenSuppressesThem() throws {
        let inputs = DecisionInputs(
            policyId: "p",
            fingerprint: "f",
            country: "DE",
            region: nil,
            language: "en",
            gpc: true
        )
        let payload = SavePayload(
            subjectId: "sub_4ZrjtNN3QTDfdH8RQdZEAE8ohrCk",
            subject: ConsentSubject(subjectId: "sub_4ZrjtNN3QTDfdH8RQdZEAE8ohrCk", externalId: nil, identityProvider: nil),
            choice: .empty,
            confirmed: ConfirmedCoverage(categories: [:], actionAt: 1),
            consents: ConsentState(),
            overrides: KernelOverridesWire(country: "DE", region: nil, language: "en", gpc: true),
            user: nil,
            model: .optIn,
            uiSource: .banner,
            consentAction: .all,
            policySnapshotToken: "token-1",
            decisionInputs: inputs,
            givenAt: 1
        )
        // A queued payload replays unchanged, so the claim it carries cannot depend on
        // whether the first attempt happened to have a token.
        let encoded = C15tJSON.parse(try C15tJSON.encode(payload))
        XCTAssertEqual(encoded?["decisionInputs"]?["gpc"]?.boolValue, true)
        XCTAssertNil(
            C15tJSON.parse(
                try SubjectPostBodyBuilder.body(for: payload, domain: "app.example.com")
            )?["gpc"],
            "the token is the stronger claim, so the flat assertion stays off the wire"
        )
    }

    // MARK: - Staleness

    /// Mirror of `decisionInputsMatchOverrides` in `@c15t/core`.
    ///
    /// The kernel owns the rule and the native cores do not run it, so the test
    /// feeds it the values this core actually recorded and shows the rule reaches a
    /// different answer once `gpc` flips. The same cases are pinned against the real
    /// function in `packages/react-native/src/protocol/__tests__/protocol.test.ts`
    /// and in the Kotlin suite, so the three cannot drift apart silently.
    private func decisionInputsMatch(
        _ inputs: DecisionInputs,
        _ overrides: ConsentOverrides
    ) -> Bool {
        if let country = overrides.country, country != inputs.country { return false }
        if let region = overrides.region, region != inputs.region { return false }
        if let gpc = overrides.gpc, gpc != inputs.gpc { return false }
        return true
    }

    private func remembered(
        overrides: ConsentOverrides,
        gpcActive: Bool
    ) -> DecisionInputs {
        DecisionInputs(
            policyId: "p",
            fingerprint: "f",
            country: overrides.country,
            region: overrides.region,
            language: overrides.language,
            gpc: gpcActive
        )
    }

    func testFlippingTheGpcOverrideMakesARememberedDecisionStale() {
        let atInit = ConsentOverrides(country: "DE", region: nil, language: "en", gpc: nil)
        XCTAssertTrue(
            decisionInputsMatch(remembered(overrides: atInit, gpcActive: false), atInit),
            "the same context still describes the decision that was made"
        )

        let flipped = ConsentOverrides(country: "DE", region: nil, language: "en", gpc: true)
        XCTAssertFalse(
            decisionInputsMatch(remembered(overrides: atInit, gpcActive: false), flipped),
            "turning GPC on after init changed an input the decision was made against"
        )
    }

    func testAStoredGpcOverrideIsComparedLikeAnyOther() throws {
        let snapshot = ConsentSnapshot(revision: 1).byApplying { draft in
            draft.overrides = ConsentOverrides(country: nil, region: nil, language: "en", gpc: true)
        }
        let decoded = try decodeSnapshot(
            try mutableSnapshotFields(snapshot)
        )
        XCTAssertEqual(decoded.overrides.gpc, true, "the override has to survive storage")

        let recorded = remembered(overrides: decoded.overrides, gpcActive: true)
        XCTAssertFalse(
            decisionInputsMatch(
                recorded,
                ConsentOverrides(country: nil, region: nil, language: "en", gpc: false)
            ),
            "true then false is a changed input, not an unchanged one"
        )
    }

    func testADetectedSignalIsNotAnOverrideSoItCannotDateAWrite() {
        let atInit = ConsentOverrides(country: "DE", region: nil, language: "en", gpc: nil)
        // The device starts reporting GPC. The evaluation changes; the write does not
        // become stale, because nothing the app pinned moved. A boolean gpc/msa pair
        // could not tell these two situations apart at all.
        XCTAssertTrue(decisionInputsMatch(remembered(overrides: atInit, gpcActive: false), atInit))
        XCTAssertNil(atInit.gpc)
    }
}
