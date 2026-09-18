import Foundation
import XCTest

@testable import C15tCore

/// Receiving, validating, storing and serving the vendor list `/init` already sends.
///
/// The web side is the oracle for every expectation here: `buildInitResponse` in
/// `packages/backend/src/http/init.ts` decides when the field is there at all,
/// `packages/iab/src/tcf/fetch-gvl.ts` decides when a document is a list worth keeping,
/// and `packages/iab/src/headless/dialog-data.ts` is what a list has to be readable
/// as once the app has it. Nothing here tests a permission: a vendor list carries
/// metadata, and the interesting failures are a dialog that lost its rows and a stored
/// envelope that came back short.
final class GlobalVendorListTests: XCTestCase {
    private var clock: TestClock!
    private var store: InMemoryStore!
    private var http: StubHTTP!

    /// A matched rule this build reads, so a fold has a resolution to sit beside.
    private var readablePolicy: JSONValue {
        Fixture.matchedResolution(policy: Fixture.rule(model: "opt-out", rights: ["disclosure", "preferences", "opt-out"]))
    }

    private var servedList: JSONValue {
        Fixture.gvlDocument(
            vendors: [
                Fixture.gvlVendor(8, name: "Sky", purposes: [1, 2]),
                Fixture.gvlVendor(755, name: "Exhibitors", legIntPurposes: [2, 4], specialPurposes: [1]),
            ]
        )
    }

    override func setUp() {
        super.setUp()
        clock = TestClock()
        store = InMemoryStore()
        http = StubHTTP()
    }

    /// A bootstrapped core over the stub backend and this test's store.
    private func bootstrapped() async -> ConsentCore {
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))
        return core
    }

    // MARK: - Receiving

    /// `/init` serves a list, the core reads it into a typed value, and both boundaries
    /// hand back the same thing: the Swift host's accessor and the JSON the React Native
    /// bridge reads.
    func testAServedListIsReadTypedAndServedOnTheSnapshot() async {
        http.initResponse = Fixture.initResponse(
            policyResolution: readablePolicy,
            gvl: servedList
        )
        let core = await bootstrapped()
        let snapshot = core.snapshot()

        XCTAssertFalse(snapshot.policyPending, "the policy still resolved beside the list")
        let gvl = try? XCTUnwrap(core.globalVendorList())
        XCTAssertEqual(gvl?.vendorListVersion, 177)
        XCTAssertEqual(gvl?.tcfPolicyVersion, 5)
        XCTAssertEqual(gvl?.purposes[2]?.name, "Purpose")
        XCTAssertEqual(gvl?.vendors[755]?.legIntPurposes, [2, 4])
        XCTAssertEqual(gvl?.vendors[755]?.specialPurposes, [1])
        XCTAssertEqual(gvl?.vendors[8]?.purposes, [1, 2])
        XCTAssertEqual(gvl?.stacks[40]?.purposes, [2, 3])
        // Nullable on the wire, not missing: `cookieMaxAgeSeconds` is `v.nullable`.
        XCTAssertNil(gvl?.vendors[8]?.cookieMaxAgeSeconds)
        XCTAssertEqual(gvl?.vendors[8]?.usesCookies, true)
        XCTAssertEqual(gvl?.vendors[8]?.urls.first?.langId, "EN")
        XCTAssertEqual(
            snapshot.iab?.gvl,
            gvl,
            "the seam the bridge reads and the accessor the host reads are one value"
        )
    }

    /// Older GVL publications use dense arrays where the schema declares an object keyed
    /// by id. `dialog-data.ts` does not care which arrived, and neither can the core.
    func testADenseArrayCollectionReadsByEachEntryOwnId() async {
        http.initResponse = Fixture.initResponse(
            policyResolution: readablePolicy,
            gvl: Fixture.gvlDocument(
                purposes: [1, 2, 3],
                vendors: [
                    Fixture.gvlVendor(8, purposes: [2]),
                    Fixture.gvlVendor(755, legIntPurposes: [4]),
                ],
                denseArrays: true
            )
        )
        let core = await bootstrapped()
        let gvl = try? XCTUnwrap(core.globalVendorList())
        XCTAssertEqual(gvl?.purposes.keys.sorted(), [1, 2, 3])
        XCTAssertEqual(gvl?.vendors.keys.sorted(), [8, 755])
        XCTAssertEqual(gvl?.vendors[755]?.legIntPurposes, [4])
    }

    /// A sparse object with holes stays a sparse object: a kernel may narrow the vendor
    /// half of a list (`narrowGVLToVendors` in `fetch-gvl.ts`), and filling the gaps with
    /// invented vendors is the one thing a list must never do.
    func testASparseVendorObjectKeepsItsHoles() async {
        http.initResponse = Fixture.initResponse(
            policyResolution: readablePolicy,
            gvl: servedList
        )
        let core = await bootstrapped()
        let gvl = try? XCTUnwrap(core.globalVendorList())
        XCTAssertNotNil(gvl?.vendors[8])
        XCTAssertNil(gvl?.vendors[9], "vendor 9 was never served and must not exist")
        XCTAssertNil(gvl?.vendor(756))
    }

    /// The accept rule from `fetch-gvl.ts`: a document that fails it is thrown away, and
    /// the core reads the field as absent. Everything on this table has to land in the
    /// same place as no `gvl` key at all.
    func testAListTheAcceptRuleRefusesReadsAsAbsent() throws {
        let complete = try XCTUnwrap(Fixture.gvlDocument(vendors: [Fixture.gvlVendor(8)]))
        var cases: [(String, JSONValue?)] = [
            ("absent", nil),
            ("explicit null", .null),
            ("not an object", .array([])),
            ("no vendorListVersion", remove("vendorListVersion", from: complete)),
            ("vendorListVersion 0", replace("vendorListVersion", with: .integer(0), in: complete)),
            ("vendorListVersion as text", replace("vendorListVersion", with: .string("177"), in: complete)),
            ("vendorListVersion fractional", replace("vendorListVersion", with: .number(177.5), in: complete)),
            ("no purposes", remove("purposes", from: complete)),
            ("purposes as text", replace("purposes", with: .string("purposes"), in: complete)),
            ("no vendors", remove("vendors", from: complete)),
            ("no tcfPolicyVersion", remove("tcfPolicyVersion", from: complete)),
            ("tcfPolicyVersion 0", replace("tcfPolicyVersion", with: .integer(0), in: complete)),
            ("tcfPolicyVersion negative", replace("tcfPolicyVersion", with: .integer(-2), in: complete)),
            ("tcfPolicyVersion fractional", replace("tcfPolicyVersion", with: .number(5.5), in: complete)),
            // `Number.isSafeInteger` is part of the gate, so a version past 2^53 is not
            // a version: there is no policy to grade the string against.
            ("tcfPolicyVersion past the safe range", replace("tcfPolicyVersion", with: .number(1e30), in: complete)),
        ]
        cases.append(("explicit null vendors", replace("vendors", with: .null, in: complete)))

        for (label, document) in cases {
            let body: [String: JSONValue] = [
                "policyResolution": readablePolicy,
                "gvl": document ?? .null,
            ]
            let response = HTTPResponse.json(
                String(decoding: C15tJSON.encode(.object(body)) ?? Data("{}".utf8), as: UTF8.self)
            )
            switch InitResponse.decode(response) {
            case let .success(parsed):
                XCTAssertNil(parsed.gvl, "\(label): must read as no list at all")
            case let .failure(error):
                XCTFail("\(label): the response is readable, only the list is not: \(error.message)")
            }
        }
    }

    // MARK: - A bad list is not a consent answer

    /// A list this build cannot read is a defect in a config response, not an answer
    /// about the subject. Contract rule 5 fails closed for a policy resolution the core
    /// cannot represent, and that is the whole of its exception: nothing in it says a
    /// broken metadata field gets to revoke a readable policy.
    func testAnUnreadableListDoesNotTouchAResolvablePolicy() async {
        http.initResponse = Fixture.initResponse(
            policyResolution: readablePolicy,
            gvl: replace("tcfPolicyVersion", with: .string("five"), in: servedList)
        )
        let core = await bootstrapped()
        let snapshot = core.snapshot()

        XCTAssertFalse(snapshot.policyPending, "the policy the core read still stands")
        XCTAssertTrue(snapshot.ready)
        XCTAssertNil(snapshot.error, "nothing about the consent answer went wrong")
        XCTAssertNil(snapshot.iab, "the list is gone, and only the list")
        XCTAssertNil(core.globalVendorList())
        XCTAssertTrue(core.isAllowed(.marketing), "the opt-out policy still grants it")
    }

    /// The other half of the same rule, from the other direction: a policy this build
    /// does refuse keeps refusing exactly as it did before any of this existed, with a
    /// valid list sitting right next to it. A list cannot rescue a rule this build has no
    /// evaluation for, and it must not change what the failure reports.
    ///
    /// `iab` is no longer the refused case here: the reader reads it and the evaluator has
    /// a rule for it. A model name this build has never seen is, and it holds the rule for
    /// the same reason -- metadata that arrived beside an answer the core cannot represent
    /// is kept, and still buys that answer nothing.
    ///
    /// The list itself stays. `applyInit` folds the served-metadata fields, and this is
    /// the same rule `translations` already follows: a resolution the core cannot act on
    /// does not un-server the text and the vendor names that came with it, because none
    /// of them is a permission and none of them can be re-derived once the response has
    /// been dropped.
    func testAListChangesNothingAboutAPolicyThisBuildRefuses() async {
        var refusedWithList: ConsentSnapshot?

        for (label, document, expectsList) in [
            ("with a valid list", Optional<JSONValue>.some(servedList), true),
            ("without one", nil, false),
        ] {
            let localStore = InMemoryStore()
            let localHTTP = StubHTTP()
            localHTTP.initResponse = Fixture.initResponse(
                policyResolution: Fixture.matchedResolution(
                    policy: Fixture.rule(model: "quantum-leibler")
                ),
                gvl: document
            )
            let core = ConsentCore()
            await core.bootstrapAndSettle(Fixture.configured(
                store: localStore,
                transport: Fixture.transport(localHTTP),
                clock: clock
            ))

            let snapshot = core.snapshot()
            XCTAssertTrue(snapshot.policyPending, "\(label): an unreadable policy stays pending")
            XCTAssertFalse(snapshot.ready, "\(label): a refused resolution has told the device nothing")
            XCTAssertEqual(
                snapshot.error?.code,
                "unsupported-contract",
                "\(label): the refusal is the one this build already reported"
            )
            XCTAssertEqual(
                snapshot.effectivePermissions,
                .necessaryOnly,
                "\(label): a list is not a permission"
            )
            XCTAssertEqual(
                core.decision(for: .marketing),
                .pending,
                "\(label): a host must keep listening, list or no list"
            )
            XCTAssertEqual(
                core.globalVendorList() != nil,
                expectsList,
                "\(label): the list is metadata, kept when it was served"
            )
            if expectsList { refusedWithList = snapshot }
        }

        let withList = try? XCTUnwrap(refusedWithList)
        XCTAssertEqual(
            withList?.error?.code,
            "unsupported-contract",
            "the failure a refused policy reports is the same one either way"
        )
    }

    // MARK: - Storing

    /// An init that serves no list leaves the list the core already has.
    ///
    /// The field comes and goes with the matched model, so this is the ordinary case
    /// rather than an edge: a dialog that rendered vendor names and then watched a
    /// refresh drop them would empty out under a consent the subject already gave.
    func testAnInitThatServesNoListKeepsTheOneAlreadyServed() async {
        // The stub answers its queue first, so both halves of the script are enqueued:
        // the init bootstrap sends, then the one `refresh()` sends.
        http.enqueueInit(Fixture.initResponse(policyResolution: readablePolicy, gvl: servedList))
        http.enqueueInit(Fixture.initResponse(policyResolution: readablePolicy, gvl: nil))
        let core = await bootstrapped()
        let first = try? XCTUnwrap(core.globalVendorList())
        XCTAssertNotNil(first)
        let revisionBefore = core.snapshot().revision

        core.refresh()
        await core.waitUntilIdle()

        XCTAssertEqual(core.snapshot().revision, revisionBefore + 1, "the second init was still folded")
        XCTAssertEqual(core.globalVendorList()?.vendorListVersion, 177, "and left the list where it was")
    }

    /// A newer document replaces the list whole. Keeping both halves would let one string
    /// name one list while pruning against another, which `TcVendorList` exists to make
    /// unwritable.
    func testANewerListReplacesTheOlderOneWhole() async {
        http.enqueueInit(Fixture.initResponse(
            policyResolution: readablePolicy,
            gvl: Fixture.gvlDocument(vendorListVersion: 176, vendors: [Fixture.gvlVendor(8)])
        ))
        http.enqueueInit(Fixture.initResponse(
            policyResolution: readablePolicy,
            gvl: Fixture.gvlDocument(
                vendorListVersion: 177,
                tcfPolicyVersion: 4,
                vendors: [Fixture.gvlVendor(999)]
            )
        ))
        let core = await bootstrapped()
        core.refresh()
        await core.waitUntilIdle()

        let gvl = try? XCTUnwrap(core.globalVendorList())
        XCTAssertEqual(gvl?.vendorListVersion, 177)
        XCTAssertEqual(gvl?.tcfPolicyVersion, 4)
        XCTAssertNil(gvl?.vendors[8], "the replaced list is gone, not merged")
        XCTAssertNotNil(gvl?.vendors[999])
    }

    /// The list rides the snapshot into the envelope, so a relaunch renders the same
    /// dialog before the network has answered anything. Same write, same read, same
    /// retention as the matched policy beside it.
    func testTheServedListSurvivesARelaunchWithNoTransport() async {
        http.initResponse = Fixture.initResponse(policyResolution: readablePolicy, gvl: servedList)
        let first = await bootstrapped()
        let served = try? XCTUnwrap(first.globalVendorList())

        // A core with no transport at all: hydrate is the only thing that can happen.
        let relaunched = ConsentCore()
        await relaunched.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: nil,
            clock: clock
        ))

        XCTAssertTrue(relaunched.snapshot().ready, "the envelope came back")
        XCTAssertEqual(relaunched.globalVendorList(), served, "and the list came back with it")
    }

    /// Storing a typed document is only honest if the bytes survive the typed round trip.
    /// `native-envelope-*` demands byte equality of decode-then-write, and
    /// `StoredEnvelope` refuses an envelope holding a key path it cannot give back.
    func testTheStoredEnvelopeRoundTripsAStoredListByteForByte() throws {
        let envelope = StoredEnvelope(
            snapshot: ConsentSnapshot(
                revision: 3,
                policyPending: false,
                ready: true,
                evaluatedAt: clock.now,
                iab: KernelIABState(gvl: readList(servedList))
            ),
            noticeDismissal: nil,
            policyResolution: readablePolicy,
            storedAt: clock.now
        )
        let written = try C15tJSON.encode(envelope)
        let decoded = try XCTUnwrap(
            StoredEnvelope.decode(written),
            "the core wrote an envelope its own decoder refuses"
        )
        XCTAssertEqual(decoded.snapshot.iab?.gvl, readList(servedList))
        XCTAssertEqual(
            try C15tJSON.encode(decoded),
            written,
            "decode then write dropped a field, and the next launch would lose it"
        )
    }

    /// IAB state this build cannot reproduce makes the whole envelope unreadable, which
    /// is the direction `native/CONTRACT.md` picks for bytes it cannot honour. A writer
    /// from the TC-string phase would otherwise find its state quietly rewritten away on
    /// the first publish, with a snapshot that still looks healthy.
    func testTheEnvelopeRefusesIABStateItCannotGiveBack() throws {
        let envelope = StoredEnvelope(
            snapshot: ConsentSnapshot(
                revision: 1,
                policyPending: false,
                ready: true,
                evaluatedAt: clock.now,
                iab: KernelIABState(gvl: readList(servedList))
            ),
            noticeDismissal: nil,
            policyResolution: nil,
            storedAt: clock.now
        )
        let written = try C15tJSON.encode(envelope)
        XCTAssertNotNil(StoredEnvelope.decode(written), "the untampered envelope has to read")

        // Add `snapshot.iab.tcString`, a key from the phase that owns TC strings.
        guard var root = C15tJSON.parse(written)?.objectValue,
              var snapshot = root["snapshot"]?.objectValue,
              var iab = snapshot["iab"]?.objectValue
        else { return XCTFail("the envelope this build wrote is not the shape it claims") }
        iab["tcString"] = .string("CQAAAAA")
        snapshot["iab"] = .object(iab)
        root["snapshot"] = .object(snapshot)

        guard let tampered = C15tJSON.encode(.object(root)) else {
            return XCTFail("could not write the tampered envelope")
        }
        XCTAssertNil(
            StoredEnvelope.decode(tampered),
            "a stored iab carrying a field this build cannot give back reads as nothing stored"
        )
    }

    // MARK: - Serving

    /// The names on the wire are the schema's, because the React Native layer reads this
    /// JSON as a string and a mobile-side rename is invisible everywhere but on a device.
    func testTheServedJSONKeepsTheWireKeys() throws {
        let snapshot = ConsentSnapshot(iab: KernelIABState(gvl: readList(servedList)))
        let wire = try XCTUnwrap(
            C15tJSON.parse(try C15tJSON.encode(snapshot)),
            "a snapshot this build cannot write its own JSON for"
        )
        let gvl = try XCTUnwrap(wire["iab"]?["gvl"])
        XCTAssertEqual(gvl["vendorListVersion"]?.intValue, 177)
        XCTAssertEqual(gvl["tcfPolicyVersion"]?.intValue, 5)
        XCTAssertEqual(gvl["gvlSpecificationVersion"]?.intValue, 3)
        XCTAssertEqual(gvl["lastUpdated"]?.stringValue, "2025-11-01T00:00:00Z")
        XCTAssertNotNil(gvl["purposes"]?["2"])
        XCTAssertNotNil(gvl["specialPurposes"]?["1"])
        XCTAssertNotNil(gvl["features"]?["1"])
        XCTAssertNotNil(gvl["specialFeatures"]?["1"])
        XCTAssertNotNil(gvl["stacks"]?["40"])
        XCTAssertNotNil(gvl["vendors"]?["755"]?["legIntPurposes"])
        XCTAssertEqual(gvl["vendors"]?["755"]?["id"]?.intValue, 755)

        let bare = try XCTUnwrap(
            C15tJSON.parse(try C15tJSON.encode(ConsentSnapshot())),
            "the cold-start snapshot has to be writable too"
        )
        XCTAssertTrue(bare["iab"]?.isNull == true, "the reserved key stays present and null")
    }

    /// A wipe leaves no IAB state, the same way it leaves no policy claim: the list came
    /// with a resolution, and a cleared device holds neither.
    func testResetForgetsTheServedList() async {
        http.initResponse = Fixture.initResponse(policyResolution: readablePolicy, gvl: servedList)
        let core = await bootstrapped()
        XCTAssertNotNil(core.globalVendorList())

        // The wipe re-runs init, and a backend that keeps serving the list would put it
        // straight back. Answer without one, so `nil` below can only mean the wipe took it.
        http.initResponse = Fixture.initResponse(policyResolution: readablePolicy, gvl: nil)
        core.reset()
        await core.waitUntilIdle()

        XCTAssertNil(core.globalVendorList())
        XCTAssertTrue(
            core.snapshot().ready,
            "the init the wipe re-ran resolved, so the absence is not an unanswered question"
        )
    }

    // MARK: - Helpers

    /// Read a document the way stored state does, for the cases that need a typed value
    /// rather than a running core.
    private func readList(_ document: JSONValue) -> GlobalVendorList? {
        GlobalVendorList.read(from: document)
    }

    private func remove(_ key: String, from document: JSONValue) -> JSONValue {
        var fields = document.objectValue ?? [:]
        fields[key] = nil
        return .object(fields)
    }

    private func replace(_ key: String, with value: JSONValue, in document: JSONValue) -> JSONValue {
        var fields = document.objectValue ?? [:]
        fields[key] = value
        return .object(fields)
    }
}
