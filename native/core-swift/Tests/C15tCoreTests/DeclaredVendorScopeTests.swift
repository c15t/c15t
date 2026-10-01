import Foundation
import XCTest

@testable import C15tCore

/// A publisher's declared vendor scope, taken from ``CoreConfig/vendors`` through the kernel.
///
/// ``GlobalVendorList/narrowed(toVendorIds:)`` has always been correct and has always been called
/// only from a test, which is the gap this file closes: a device discloses exactly the scope the
/// server chose to embed, and a setting nobody reads is not a setting. Everything here therefore
/// enters through ``ConsentCore/bootstrap(config:)`` with a configured core and leaves through one of
/// the three surfaces a host actually reads -- the published snapshot the bridge draws from, the
/// envelope that reaches the next launch, and the `IABTCF_*` mirror -- because a prune that lives
/// only inside the helper would still leave all three serving the wide list.
///
/// The vectors are the shared `native/protocol/vendor-list-scope-*` fixtures this core already claims
/// in ``VendorListScopeTests``, graded here through the kernel rather than against the helper
/// directly. Their oracle is `narrowGVLToVendors` in `packages/iab/src/tcf/fetch-gvl.ts`, called by
/// the generator, so what a scoped device ends up holding is the browser build's answer and not
/// Swift's opinion about it. Kotlin runs the same axes against the same files in
/// `DeclaredVendorScopeTest`.
///
/// Two claims are deliberately left to the file that grades the prune, where they are made
/// key-by-key: which entry survives a disagreement between a served key and a body `id`, and the
/// field-by-field shape of a survivor. What this file adds on top is the storage half -- a scope
/// declared after the bytes were written -- and the request half, in ``VendorScopeHeaderTests``.
final class DeclaredVendorScopeTests: XCTestCase {
    private var vectors: [VendorListScopeVector] = []
    private var clock: TestClock!

    /// A matched IAB rule, so a fold has a resolution to sit beside the list and the bus's
    /// `gdprApplies` row has a rule to read.
    private var readablePolicy: JSONValue {
        Fixture.matchedResolution(
            policy: Fixture.rule(model: "iab", rights: ["disclosure", "preferences", "opt-out"])
        )
    }

    override func setUpWithError() throws {
        clock = TestClock()
        vectors = try VendorListScopeFixtures.all()
        XCTAssertFalse(
            vectors.isEmpty,
            "index.json lists no \(VendorListScopeFixtures.kind) fixtures, so every loop below is empty rather than green"
        )
    }

    // MARK: - The served list, scoped

    /// A wide served list and a declared scope leave a narrow snapshot, on both keys.
    ///
    /// The list the vector serves carries 54 vendors and the declaration names 32, and the answer has
    /// to be the 32 the web returned on `snapshot.iab.gvl` -- the key
    /// `packages/react-native/src/protocol/snapshot.ts` declares and a dialog draws its partner rows
    /// out of -- and on ``ConsentCore/globalVendorList()``, which is one value read two ways. A prune
    /// that landed only on the accessor would pass one half of that pair and fail the other.
    func testAWideServedListAndADeclaredScopeGiveANarrowSnapshot() async throws {
        let vector = try vector(shape: "scope-32-vendors")
        let core = try await bootstrapped(vector, vendors: try declaredScope(of: vector))

        let served = try servedList(vector)
        XCTAssertEqual(served.vendors.count, 54, "the vector stopped serving a wide list")

        let held = try XCTUnwrap(core.globalVendorList(), "a `/init` that served a list has to leave one held")
        XCTAssertEqual(
            held.vendors.keys.sorted(),
            vector.expectedVendorKeys.sorted(),
            "\(vector.id): the disclosed vendors are not the ones the declaration names"
        )
        XCTAssertEqual(held.vendors.count, 32, "\(vector.id): a survivor count nobody declared")
        XCTAssertEqual(held, core.snapshot().iab?.gvl, "the accessor and the key the bridge reads are one list")

        // And the framework half came along for the ride: a scope is an answer about partners, not
        // about what purpose 2 means or which list revision is in force.
        XCTAssertEqual(held.purposes.keys.sorted(), served.purposes.keys.sorted(), "purposes were pruned")
        XCTAssertEqual(held.stacks.keys.sorted(), served.stacks.keys.sorted(), "stacks were pruned")
        XCTAssertEqual(held.vendorListVersion, served.vendorListVersion)
        XCTAssertEqual(held.tcfPolicyVersion, served.tcfPolicyVersion)
    }

    /// The document a bridge forwards is the narrowed one, not the served one.
    ///
    /// This is the axis with a subject-facing consequence: JavaScript draws its partner rows out of
    /// these bytes, and a device that pruned its own model while forwarding the served document would
    /// render 54 names under a declaration of 32. The claim is the exact key set on the serialized
    /// snapshot, so a payload built from a second copy of the list cannot pass.
    func testTheBridgePayloadAScopedCoreForwardsIsTheNarrowDocument() async throws {
        let vector = try vector(shape: "scope-32-vendors")
        let core = try await bootstrapped(vector, vendors: try declaredScope(of: vector))

        let document = try XCTUnwrap(
            C15tJSON.parse(try C15tJSON.encode(core.snapshot()))?["iab"]?["gvl"],
            "the wire lost the `iab` object holding the list"
        )
        let keys = try XCTUnwrap(document["vendors"]?.objectValue?.keys, "the forwarded list lost its `vendors` record")
        XCTAssertEqual(
            keys.compactMap(Int.init).sorted(),
            vector.expectedVendorKeys.sorted(),
            "\(vector.id): the rows a dialog draws are not the declared scope"
        )
    }

    /// A scope prunes the drawer and moves nothing the storage mirror reports.
    ///
    /// The `IABTCF_*` rows this build writes are the served policy version and the matched rule's
    /// model, and a vendor prune leaves both numbers exactly as served -- which is the claim, not an
    /// aside. The version vector serves policy 4 under list 431 precisely so a core that rebuilt a
    /// narrowed list from its own constants answers 5 here, in the one place an ad SDK reads a version
    /// out of.
    func testADeclaredScopePrunesTheDrawerAndLeavesTheProjectedVersionsAlone() async throws {
        let vector = try vector(shape: "scope-versions-preserved")
        let scope = try declaredScope(of: vector)
        let bus = RecordingBus()
        let core = try await bootstrapped(vector, vendors: scope, bus: bus)

        let held = try XCTUnwrap(core.globalVendorList())
        XCTAssertEqual(
            held.vendors.keys.sorted(),
            vector.expectedVendorKeys.sorted(),
            "\(vector.id): the declared ids, and only those"
        )
        XCTAssertEqual(held.vendors.count, 2, "\(vector.id): two declared ids, two disclosed vendors")
        XCTAssert(
            bus.live[TcStorageBusKeys.policyVersion] == .number(4),
            "\(vector.id): the served tcfPolicyVersion, not this build's default -- \(bus.live)"
        )
        XCTAssert(
            bus.live[TcStorageBusKeys.gdprApplies] == .number(1),
            "\(vector.id): the matched IAB rule still answers the row beside it -- \(bus.live)"
        )
        XCTAssertEqual(held.tcfPolicyVersion, 4)
        XCTAssertEqual(held.vendorListVersion, 431)
    }

    // MARK: - No scope declared

    /// No declared scope -- `nil` or `[]` -- leaves the served list untouched, in state and on disk.
    ///
    /// The fail-open half, and the mistake with the worst shape: a core that reads `[]` as "show
    /// nobody" hands a publisher who never scoped anything a preference centre with no vendors in it,
    /// under a consent the subject can still give. Web reads it that way twice over, and both shapes
    /// have to answer alike here -- on the stored bytes and not only in memory, because a rule that
    /// no-oped in state while rewriting the document on disk would still wake up wide next launch.
    func testNoDeclaredScopeLeavesTheServedListUntouched() async throws {
        for shape in ["scope-absent", "scope-empty"] {
            let vector = try vector(shape: shape)
            XCTAssertTrue(vector.unchanged, "\(vector.id): the vector claims a rebuilt document for a scope nobody declared")
            let store = InMemoryStore()
            let core = try await bootstrapped(vector, vendors: vector.scope, store: store)

            let served = try servedList(vector)
            let held = try XCTUnwrap(core.globalVendorList(), "\(vector.id): a list nobody scoped came back missing")
            XCTAssertEqual(held, served, "\(vector.id): a host that declared no scope came back with a pruned list")
            XCTAssertEqual(
                held.vendors.keys.sorted(),
                vector.servedVendorKeys.sorted(),
                "\(vector.id): every served vendor has to survive"
            )
            XCTAssertEqual(held.vendors.count, 54, "\(vector.id): a scope nobody declared cannot shorten the drawer")

            let stored = try XCTUnwrap(
                store.data(for: StorageKey.snapshot).flatMap(StoredEnvelope.decode),
                "\(vector.id): a resolved init has to have written bytes"
            )
            XCTAssertEqual(
                stored.snapshot.iab?.gvl,
                served,
                "\(vector.id): the stored document moved for a scope nobody declared"
            )
        }
    }

    // MARK: - Bytes stored before the scope existed

    /// A list stored wide comes back narrow once the host declares a scope, and stops being stored wide.
    ///
    /// The part a "we prune what `/init` served us" rule quietly misses. The first core below has no
    /// declaration at all -- which is every installed device one release before a publisher adds a
    /// `vendors` list -- and the second declares one over bytes it did not write. Those bytes have to
    /// be pruned on the way *in*, because the drawer that opens before `/init` answers is drawn from
    /// them, and on a device whose network never comes back that drawer is the answer for the life of
    /// the app. The stored document is re-narrowed on the same launch, so a relaunch is not back to
    /// square one. Pruning a list already inside its scope returns it unchanged, which is what makes
    /// this the whole rule rather than a race against the network.
    func testAListStoredWideComesBackNarrowOnceTheHostDeclaresAScope() async throws {
        let vector = try vector(shape: "scope-32-vendors")
        let scope = try declaredScope(of: vector)
        let store = InMemoryStore()

        // Release N: no declaration, so the envelope on disk is the served document whole.
        let wide = try await bootstrapped(vector, vendors: nil, store: store)
        XCTAssertEqual(try XCTUnwrap(wide.globalVendorList()).vendors.count, 54, "the first release held the whole served list")

        // Release N+1: the host declares a scope, and this launch hears nothing usable from the
        // backend, so no `/init` is on its way to correct what the stored bytes say.
        let cold = try await coldStart(store: store, vendors: scope)

        let held = try XCTUnwrap(cold.core.globalVendorList(), "the stored list still has to be there")
        XCTAssertEqual(Set(held.vendors.keys), Set(scope), "declared ids, and only those")
        XCTAssertEqual(held.vendors.count, 32)
        XCTAssertEqual(held, cold.core.snapshot().iab?.gvl, "the narrow answer is on the key the bridge reads too")
        XCTAssert(
            Set(held.vendors.keys).isSubset(of: Set(scope)),
            "a bridge opened before `/init` answers must not name a vendor the host did not"
        )
        XCTAssertEqual(cold.initRequestCount, 1, "this launch asked, and the stub served no list")

        let storedGvl = try XCTUnwrap(
            store.data(for: StorageKey.snapshot).flatMap(StoredEnvelope.decode)?.snapshot.iab?.gvl,
            "the repair has to be stored, not only remembered"
        )
        XCTAssertEqual(storedGvl.vendors.keys.sorted(), held.vendors.keys.sorted(), "narrow on disk, so narrow on the next launch")
    }

    // MARK: - Helpers

    /// Boot a core configured with `vendors`, served this vector's document on `/init` over `store`.
    ///
    /// The list goes onto the wire exactly as the vector wrote it, so the wide document the core has
    /// to prune is the wide document the vectors lane published rather than a summary of it.
    @discardableResult
    private func bootstrapped(
        _ vector: VendorListScopeVector,
        vendors: [Int]?,
        store: any ConsentStore = InMemoryStore(),
        bus: (any TcStorageBusWriting)? = nil
    ) async throws -> ConsentCore {
        let http = StubHTTP()
        http.initResponse = Fixture.initResponse(policyResolution: readablePolicy, gvl: vector.served)
        return await started(store: store, transport: Fixture.transport(http), vendors: vendors, bus: bus)
    }

    /// A launch over the same store with nothing usable on the backend, which is how a device that
    /// cannot reach its producer reads: hydration is the only thing that knew about the list.
    private func coldStart(store: any ConsentStore, vendors: [Int]?) async throws -> (core: ConsentCore, initRequestCount: Int) {
        let http = StubHTTP()
        let core = await started(store: store, transport: Fixture.transport(http), vendors: vendors)
        return (core, http.recordedInitRequests.count)
    }

    private func started(
        store: any ConsentStore,
        transport: any C15tTransport,
        vendors: [Int]?,
        bus: (any TcStorageBusWriting)? = nil
    ) async -> ConsentCore {
        let core = ConsentCore()
        await core.bootstrapAndSettle(
            CoreConfig(
                store: store,
                transport: transport,
                vendors: vendors,
                overrides: .default(language: "en"),
                now: clock.reading,
                initRetry: .disabled,
                storageBus: bus
            )
        )
        return core
    }

    /// The served document as this core reads it. Fails the run if it cannot, which would otherwise
    /// turn every claim above into a pass on a missing list.
    private func servedList(_ vector: VendorListScopeVector) throws -> GlobalVendorList {
        guard let list = GlobalVendorList.read(from: vector.served) else {
            throw VendorListScopeFixtures.LoadError.malformed(
                file: vector.file,
                detail: "the served document in this vector is not readable by GlobalVendorList.read"
            )
        }
        return list
    }

    private func declaredScope(of vector: VendorListScopeVector) throws -> [Int] {
        guard let scope = vector.scope, !scope.isEmpty else {
            throw VendorListScopeFixtures.LoadError.malformed(
                file: vector.file,
                detail: "a vector graded against a scope declares none"
            )
        }
        return scope
    }

    private func vector(shape: String) throws -> VendorListScopeVector {
        guard let found = vectors.first(where: { $0.shape == shape }) else {
            throw VendorListScopeFixtures.LoadError.malformed(
                file: "index.json",
                detail: "no \(VendorListScopeFixtures.kind) vector has shape \(shape)"
            )
        }
        return found
    }
}
