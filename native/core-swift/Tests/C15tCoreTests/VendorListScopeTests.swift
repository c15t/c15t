import XCTest

@testable import C15tCore

/// The publisher's vendor scope, applied to a served list, graded against the shared vectors.
///
/// The oracle is `narrowGVLToVendors` in `packages/iab/src/tcf/fetch-gvl.ts`: the generator calls
/// that function and writes down what came back, so a difference here is Swift and the browser
/// build reading the same document differently, and `native/CONTRACT.md` settles that argument in
/// the web's favour. The claims are the ones the disclosure promise rests on: a publisher that
/// declared 32 partners has to end up with 32 vendors on the device, an absent or empty scope has
/// to leave the whole drawer alone, and an id with no entry in the served list has to buy nothing.
///
/// What this target can see, and what it cannot. Swift holds vendors in a dictionary and reads a
/// served `gvl` into one, so it has no order to report: the ordering of the surviving keys is
/// graded in the Kotlin core, where `narrowToVendorIds` returns a collection that keeps insertion
/// order. Here the surviving keys are compared as sets, and the substance of each vector is
/// carried by ``GlobalVendorList`` equality against the fixture's own narrowed document -- keys,
/// surviving entries field for field, and every record beside `vendors` -- which is a stronger
/// claim than a count and is the same claim the web filter makes about its own return value.
final class VendorListScopeTests: XCTestCase {
    private var vectors: [VendorListScopeVector] = []

    /// The vectors load before any assertion runs, so a fixture that cannot be read reports
    /// itself as a setup failure carrying the loader's reason rather than taking the whole run
    /// down, or worse, being graded as an empty list that happens to match nothing.
    override func setUpWithError() throws {
        vectors = try VendorListScopeFixtures.all()
        XCTAssertFalse(vectors.isEmpty, "index.json lists no \(VendorListScopeFixtures.kind) fixtures, so every loop below is empty rather than green")
    }

    // MARK: - Accounting

    /// Every `vendor-list-scope` entry `index.json` lists is graded by this file.
    ///
    /// Counted from the index rather than from a list of ids written here, so a tenth vector
    /// published by the vectors lane is claimed automatically or reported -- it cannot go unrun.
    func testEveryFixtureIsClaimed() throws {
        let claimed = vectors.map(\.id)
        let indexed = try VendorListScopeFixtures.ids()
        XCTAssertEqual(claimed.count, indexed.count, "index.json lists \(indexed.count) and this file loaded \(claimed.count)")
        XCTAssertEqual(Set(claimed).count, claimed.count, "a fixture was loaded twice")
        let shapes = vectors.map(\.shape).sorted().joined(separator: ", ")
        print("VENDOR LIST SCOPE CLAIMS: ios claimed=\(claimed.count)/\(indexed.count) unclaimed=0  (shapes: \(shapes))")
    }

    // MARK: - The surviving keys

    /// The surviving `vendors` keys are exactly what the web returned, on every vector.
    ///
    /// Compared as sets, for the reason in the type documentation. The count is pinned alongside the
    /// keys because two empty key sets compare equal, and a run that failed to read a document at
    /// all would look like nine thin vectors rather than nine failures. The narrowest vector in the
    /// set keeps one vendor, and the two vectors that declare no scope keep all 54.
    func testTheSurvivingVendorKeysMatchTheFixture() throws {
        for vector in vectors {
            let narrowed = try narrow(vector)
            XCTAssertEqual(
                narrowed.vendors.keys.sorted(),
                vector.expectedVendorKeys.sorted(),
                "\(vector.id): the surviving vendor keys are not the ones the web returned"
            )
            XCTAssertEqual(
                narrowed.vendors.count,
                vector.expectedVendorKeys.count,
                "\(vector.id): the surviving vendor count is wrong"
            )
        }
    }

    /// A scope wider than the served list keeps exactly the served list, and adds nothing.
    ///
    /// The 947-id vector names every id the framework has handed out, and the 609-id vector is past
    /// the request-line cap the web is willing to send a scope as -- the case where the document
    /// arrives whole and every caller narrows it locally. Neither buys a core a vendor the served
    /// document does not carry, which is the general form of "nothing is invented".
    func testAScopeWiderThanTheListAddsNothing() throws {
        let wider = vectors.filter { ["scope-wider-than-list", "scope-above-query-cap"].contains($0.shape) }
        XCTAssertFalse(wider.isEmpty, "the vectors lane published neither wide-scope vector")
        for vector in wider {
            guard let scope = vector.scope else {
                throw VendorListScopeFixtures.LoadError.malformed(file: vector.file, detail: "a wide-scope vector declares no scope")
            }
            let narrowed = try narrow(vector)
            let served = try servedList(vector)
            XCTAssertEqual(
                narrowed.vendors.keys.sorted(),
                vector.servedVendorKeys.filter { scope.contains($0) }.sorted(),
                "\(vector.id): survivors are the served ids the scope names, and nothing else"
            )
            XCTAssertLessThan(narrowed.vendors.count, vector.scopeSize, "\(vector.id): the scope names more vendors than the document carries")
            XCTAssertLessThanOrEqual(narrowed.vendors.count, served.vendors.count, "\(vector.id): a scope cannot disclose more than was served")
        }
    }

    // MARK: - Nothing is invented, nothing is renamed

    /// An id the served document does not carry contributes no entry.
    ///
    /// The unknown-id vector declares three ids, one of which is served, and the answer is one
    /// vendor rather than three. A fabricated entry would name a company no GVL revision stands
    /// behind -- contract rule 5, wearing a friendlier face -- and the two numbers that go
    /// unanswered here are ones no publisher could legitimately hold: six figures on purpose.
    func testAnIdTheListDoesNotCarryIsNeverAdded() throws {
        let vector = try vector(shape: "scope-unknown-id")
        let narrowed = try narrow(vector)
        XCTAssertEqual(narrowed.vendors.keys.sorted(), [11], "\(vector.id): only the served id survives")
        XCTAssertNil(narrowed.vendors[1_000_483], "\(vector.id): 1000483 was never served, so there is no name to disclose")
        XCTAssertNil(narrowed.vendors[66_001], "\(vector.id): an id past the 16-bit vendor field has no entry either")
    }

    /// Entry selection follows the dictionary key, and an entry that states another id in its own
    /// body earns nothing by it.
    ///
    /// The vectors plant a pair -- the record keyed 7 states 11, the record keyed 11 states 7 -- so
    /// a prune that consulted bodies would keep the opposite pair for the very same scope, and
    /// every key count in this file would still pass. Two claims therefore have to be made: which
    /// key survived, and which name arrived with it. ``GlobalVendorList/read(from:)`` keys a served
    /// record by its key and takes the entry's `id` from that same key, so a survivor keeps the
    /// entry that was served under it and cannot rename itself into somebody else's disclosure.
    ///
    /// Where the two cores apply that differs, and the difference is worth naming before somebody
    /// reads it as a disagreement: this reader takes the identity from the key while it reads, the
    /// way `@iabtechlabtcf/core`'s `GVL` overwrites `vendor.id`, while the Kotlin core keeps the
    /// served `id` field on its entry and applies key authority later, in `toTcVendorList`. Served
    /// bytes are pinned either way by the transcript below, and both routes hand the encoder vendor
    /// 7 for a scope of 7.
    func testAVendorIsChosenByItsKeyAndNotByItsBodyId() throws {
        let vector = try vector(shape: "scope-key-not-body-id")
        XCTAssertEqual(vector.disagreeingKeys, [7, 11], "\(vector.id): the served document no longer carries the planted pair this vector exists to test")
        let narrowed = try narrow(vector)
        XCTAssertEqual(narrowed.vendors.keys.sorted(), [7], "\(vector.id): the record keyed 11 is not in the scope, whatever its body claims")
        XCTAssertEqual(narrowed.vendors[7]?.name, "Vendor 7", "\(vector.id): the survivor is the entry served under key 7, not the one claiming to be 7")
        XCTAssertEqual(narrowed.vendors[7]?.id, 7, "\(vector.id): the entry's identity is the key it was served under")

        // The mirror: a scope naming the other half of the pair keeps that record and its name.
        guard let served = GlobalVendorList.read(from: vector.served) else {
            return XCTFail("\(vector.id): the served document in the fixture is not readable by this core")
        }
        let mirrored = served.narrowed(toVendorIds: [11])
        XCTAssertEqual(mirrored.vendors.keys.sorted(), [11], "\(vector.id): the pair is symmetric -- scoping 11 keeps the record keyed 11")
        XCTAssertEqual(mirrored.vendors[11]?.name, "Vendor 11", "\(vector.id): scoping 11 discloses the vendor served as 11, not the one claiming its number")

        // And across every vector: the transcript records what each survivor states in its own
        // `id` field, so a prune that swaps a survivor for the entry that merely claims its
        // number changes the transcript rather than passing unnoticed. The disagreement is
        // checked against the served bytes, not against a comment.
        for other in vectors {
            let kept = try narrow(other)
            let servedVendors = other.served["vendors"]
            for claim in other.surviving {
                XCTAssertEqual(kept.vendors[claim.key]?.name, claim.name, "\(other.id): \(claim.key) survived with somebody else's name")
                let stated = servedVendors?[String(claim.key)]?["id"]?.intValue
                XCTAssertEqual(stated.map(Int.init), claim.bodyId, "\(other.id): \(claim.key) does not state \(claim.bodyId) in its own body, so the transcript the vector was graded against is not this document's")
                XCTAssertEqual(claim.bodyIdDiffersFromKey, claim.bodyId != claim.key, "\(other.id): \(claim.key) is reported as \(claim.bodyId == claim.key ? "agreeing" : "disagreeing") with its key when the served bytes say otherwise")
            }
        }
    }

    // MARK: - What comes back

    /// The narrowed list is the document the web filter returned: keys, entries, siblings.
    ///
    /// ``GlobalVendorList`` is `Equatable`, so one comparison carries three claims. The surviving
    /// entries arrive with their own `purposesLegInt`-equivalent lists, their retention maps and
    /// their disclosure links -- the prune may remove records and nothing else. And every record
    /// beside `vendors` comes back exactly as served, because those records describe the framework
    /// rather than the audience.
    func testTheNarrowedListIsTheDocumentTheWebReturned() throws {
        for vector in vectors {
            let narrowed = try narrow(vector)
            guard let expectedList = GlobalVendorList.read(from: vector.expectedDocument) else {
                return XCTFail("\(vector.id): expected.document is not readable by this core")
            }
            XCTAssertEqual(narrowed, expectedList, "\(vector.id): the pruned list is not the document the web filter returned")
        }
    }

    /// A survivor keeps the optional fields it was served with.
    ///
    /// `dataRetention`, `overflow`, `deletedDate`, `deviceStorageDisclosureUrl` and a vendor's own
    /// `dataCategories` are absent from a real list as often as they are present, and
    /// `carriesOptionalFields` is the fixture's own statement about which survivors lean on them.
    /// Rebuilding an entry instead of carrying it over loses exactly these, which is the failure a
    /// count cannot see.
    func testASurvivorKeepsTheFieldsItWasServedWith() throws {
        for vector in vectors {
            let narrowed = try narrow(vector)
            for claim in vector.surviving where claim.carriesOptionalFields {
                guard let vendor = narrowed.vendors[claim.key] else {
                    return XCTFail("\(vector.id): \(claim.key) disappeared from the pruned list")
                }
                XCTAssertTrue(
                    vendor.hasOptionalDisclosureFields,
                    "\(vector.id): \(claim.key) arrived at the drawer without the fields that describe its storage"
                )
            }
        }
    }

    /// Everything beside `vendors` is served data, and a scope does not move the version numbers.
    ///
    /// `purposes`, `specialPurposes`, `features`, `specialFeatures`, `stacks`, `dataCategories` and
    /// `lastUpdated` name what a consent row says: `processPurposes` in
    /// `packages/iab/src/headless/dialog-data.ts` walks the served `purposes` record and never asks
    /// a vendor scope's permission. The two versions are the expensive pair -- a TC String writes
    /// both -- so the versions vector numbers the list 431 under policy 4 and expects to still read
    /// 431 and 4 back after a scope of two ids.
    func testTheFrameworkHalfOfTheDocumentIsUntouched() throws {
        for vector in vectors {
            let narrowed = try narrow(vector)
            let served = try servedList(vector)
            XCTAssertEqual(narrowed.purposes.keys.sorted(), served.purposes.keys.sorted(), "\(vector.id): purposes were pruned")
            XCTAssertEqual(narrowed.specialPurposes.keys.sorted(), served.specialPurposes.keys.sorted(), "\(vector.id): specialPurposes were pruned")
            XCTAssertEqual(narrowed.features.keys.sorted(), served.features.keys.sorted(), "\(vector.id): features were pruned")
            XCTAssertEqual(narrowed.specialFeatures.keys.sorted(), served.specialFeatures.keys.sorted(), "\(vector.id): specialFeatures were pruned")
            XCTAssertEqual(narrowed.stacks.keys.sorted(), served.stacks.keys.sorted(), "\(vector.id): stacks were pruned")
            XCTAssertEqual(narrowed.dataCategories?.keys.sorted(), served.dataCategories?.keys.sorted(), "\(vector.id): dataCategories were pruned")
            XCTAssertEqual(narrowed.lastUpdated, served.lastUpdated, "\(vector.id): lastUpdated moved")
            XCTAssertEqual(narrowed.gvlSpecificationVersion, served.gvlSpecificationVersion, "\(vector.id): gvlSpecificationVersion moved")
            XCTAssertEqual(
                narrowed.vendorListVersion,
                GlobalVendorList.read(from: vector.expectedDocument)?.vendorListVersion,
                "\(vector.id): the list version the web returned is not the one this core kept"
            )
            XCTAssertEqual(
                narrowed.tcfPolicyVersion,
                GlobalVendorList.read(from: vector.expectedDocument)?.tcfPolicyVersion,
                "\(vector.id): the policy version the web returned is not the one this core kept"
            )
        }
    }

    /// The versions vector keeps numbers that are nobody's defaults.
    ///
    /// A core that rebuilt a narrowed list from its own constants would answer with the industry's
    /// current pair, and the TC String it then encoded would advertise a list revision and a policy
    /// revision that nothing on the wire ever served.
    func testANarrowScopeDoesNotMoveTheTwoVersionNumbers() throws {
        let vector = try vector(shape: "scope-versions-preserved")
        let narrowed = try narrow(vector)
        XCTAssertEqual(narrowed.vendorListVersion, 431, "\(vector.id): vendorListVersion is the served document's, not a constant")
        XCTAssertEqual(narrowed.tcfPolicyVersion, 4, "\(vector.id): tcfPolicyVersion is the served document's, not a constant")
        XCTAssertEqual(narrowed.vendors.count, 2, "\(vector.id): two declared ids, two survivors")
    }

    // MARK: - No scope declared

    /// An empty scope and an absent scope both mean no scope, and neither empties the drawer.
    ///
    /// This is the fail-open half of the pair and the mistake with the worst shape: a core that
    /// reads `[]` as "show nobody" leaves a publisher who never scoped anything with a preference
    /// centre that has no vendors in it, under a consent the subject can still give. Web reads it
    /// that way twice over -- `narrowGVLToVendors` hands the list back for an empty array, and
    /// `gvlRequestUrl` does not append the parameter at all -- and a decoded list has to answer the
    /// same way, whether the host passed `nil` or `[]`.
    func testNoScopeDeclaredLeavesTheWholeListAlone() throws {
        for shape in ["scope-empty", "scope-absent"] {
            let vector = try vector(shape: shape)
            XCTAssertTrue(vector.unchanged, "\(vector.id): the fixture claims a rebuilt document for a vector that declared no scope")
            let served = try servedList(vector)
            let narrowed = served.narrowed(toVendorIds: vector.scope)
            XCTAssertEqual(narrowed, served, "\(vector.id): a list that declared no scope came back changed")
            XCTAssertEqual(narrowed.vendors.keys.sorted(), vector.servedVendorKeys.sorted(), "\(vector.id): every served vendor has to survive")
            XCTAssertEqual(vector.expectedVendorKeys.sorted(), vector.servedVendorKeys.sorted(), "\(vector.id): the web returned a pruned document for a scope nobody declared");
            XCTAssertEqual(narrowed.vendors.count, served.vendors.count, "\(vector.id): a scope nobody declared cannot shorten the drawer")
        }
    }

    // MARK: - Helpers

    /// The served document as this core reads it. Fails the run if it cannot, which would make
    /// every other claim in this file a pass on an empty list.
    private func servedList(_ vector: VendorListScopeVector) throws -> GlobalVendorList {
        guard let list = GlobalVendorList.read(from: vector.served) else {
            throw VendorListScopeFixtures.LoadError.malformed(
                file: vector.file,
                detail: "the served document in this fixture is not readable by GlobalVendorList.read"
            )
        }
        XCTAssertGreaterThanOrEqual(list.vendors.count, 7, "\(vector.id): the fixture serves fewer vendors than the smallest scope in it")
        return list
    }

    /// The scope applied, on the same path a stored or server-resolved list takes.
    private func narrow(_ vector: VendorListScopeVector) throws -> GlobalVendorList {
        try servedList(vector).narrowed(toVendorIds: vector.scope)
    }

    private func vector(shape: String) throws -> VendorListScopeVector {
        guard let found = vectors.first(where: { $0.shape == shape }) else {
            throw VendorListScopeFixtures.LoadError.malformed(file: "index.json", detail: "no \(VendorListScopeFixtures.kind) vector has shape \(shape)")
        }
        return found
    }
}

extension GVLVendor {
    /// Whether this entry carries any of the optional fields that describe its own storage.
    ///
    /// `gvlVendorSchema` makes each of these optional, and the web carries a survivor over whole
    /// rather than rebuilding it, so the answer is what the served document said.
    var hasOptionalDisclosureFields: Bool {
        dataCategories?.isEmpty == false
            || dataRetention != nil
            || deletedDate != nil
            || deviceStorageDisclosureUrl != nil
            || overflow != nil
    }
}
