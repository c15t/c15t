import Foundation
import XCTest

@testable import C15tCore

/// Cutting a served vendor list down to a publisher's declared scope.
///
/// The oracle is `narrowGVLToVendors` in `packages/iab/src/tcf/fetch-gvl.ts` and its
/// server-side twin `narrowToVendorIds` in `packages/backend/src/http/gvl.ts`: both prune
/// the `vendors` map and nothing else, both return the list untouched when no scope was
/// declared, and both carry the surviving entries over rather than rebuild them. What
/// these tests guard is the disclosure half of that rule -- a device that showed four
/// vendors must never end up describing four hundred -- and the half that is easy to break
/// by accident: a prune that reached past `vendors` would take the purpose names a drawer
/// renders and the list version a TC String advertises along with them.
final class VendorListNarrowingTests: XCTestCase {
    /// A list with something to lose in every collection, including the fields a careless
    /// rebuild would drop on the floor: a vendor's retention map, its disclosure links, its
    /// nullable `dataCategories`, and a purpose's legal copy and illustrations.
    private var served: GlobalVendorList {
        GlobalVendorList(
            gvlSpecificationVersion: 3,
            vendorListVersion: 177,
            tcfPolicyVersion: 5,
            lastUpdated: "2025-11-01T00:00:00Z",
            purposes: [
                1: GVLDefinition(
                    id: 1,
                    name: "Access information",
                    description: "Store or access information on a device.",
                    descriptionLegal: "Long-form copy a details row shows.",
                    illustrations: ["https://gvl.test/purpose-1.svg"]
                ),
                2: GVLDefinition(id: 2, name: "Personalise content"),
                3: GVLDefinition(id: 3, name: "Measure performance"),
            ],
            specialPurposes: [1: GVLDefinition(id: 1, name: "Ensure security")],
            features: [1: GVLDefinition(id: 1, name: "Identify devices")],
            specialFeatures: [2: GVLDefinition(id: 2, name: "Use precise geolocation")],
            stacks: [
                40: GVLStack(
                    id: 40,
                    name: "Personalise content, measure performance",
                    description: "Purposes 2 and 3 offered as one row.",
                    purposes: [2, 3],
                    specialFeatures: [2]
                )
            ],
            dataCategories: [
                9: GVLDataCategory(id: 9, name: "Precise location", description: "Coordinates.")
            ],
            vendors: [
                8: GVLVendor(
                    id: 8,
                    name: "Sky",
                    purposes: [1, 2],
                    legIntPurposes: [2, 4],
                    specialPurposes: [1],
                    flexiblePurposes: [2],
                    features: [1],
                    specialFeatures: [2],
                    cookieMaxAgeSeconds: 7_776_000,
                    cookieRefresh: true,
                    usesCookies: true,
                    usesNonCookieAccess: true,
                    deviceStorageDisclosureUrl: "https://sky.test/disclosure.json",
                    urls: [
                        GVLVendorUrl(
                            langId: "EN",
                            privacy: "https://sky.test/privacy",
                            legIntClaim: "https://sky.test/legitimate-interest"
                        )
                    ],
                    dataCategories: [9],
                    dataRetention: GVLVendorDataRetention(
                        stdRetention: 34_128_000,
                        purposes: [1: 13],
                        specialPurposes: [1: 0]
                    ),
                    overflow: GVLVendorOverflow(httpGetLimit: 10)
                ),
                45: GVLVendor(id: 45, name: "Mercury", purposes: [1]),
                // A withdrawn vendor stays in the served document, which makes it a prune
                // target like any other: `GVL.js` is what drops it on the way to a dialog.
                755: GVLVendor(
                    id: 755,
                    name: "Exhibitors",
                    legIntPurposes: [2, 4],
                    deletedDate: "2025-08-01T00:00:00Z"
                ),
            ]
        )
    }

    // MARK: - Pruning

    /// A declared scope keeps exactly the served ids it names, and keeps them as served.
    ///
    /// The comparison against `served.vendors[8]` is the one that matters: the prune may
    /// remove entries and nothing else, so a survivor arrives with its retention map, its
    /// links and its nullable `dataCategories` still attached. The last line pins the scope
    /// being read as a set, which is how `Object.entries` plus `Set.has` reads it on the
    /// web -- a repeat and a scrambled order declare the same vendors.
    func testADeclaredScopeKeepsExactlyTheServedIdsItNames() {
        let narrowed = served.narrowed(toVendorIds: [45, 8])

        XCTAssertEqual(narrowed.vendors.keys.sorted(), [8, 45])
        XCTAssertNil(narrowed.vendor(755), "755 was served and the scope did not name it")
        XCTAssertEqual(
            narrowed.vendors[8],
            served.vendors[8],
            "a surviving entry is the entry that was served, field for field"
        )
        XCTAssertEqual(narrowed.vendors[45]?.purposes, [1])
        XCTAssertEqual(
            served.narrowed(toVendorIds: [8, 45, 8]),
            narrowed,
            "a repeat declares nothing new"
        )
    }

    /// Everything outside `vendors` comes back untouched, version fields included.
    ///
    /// The versions are the expensive ones. ``TcVendorList/init(gvl:)`` reads
    /// ``GlobalVendorList/vendorListVersion`` and ``GlobalVendorList/tcfPolicyVersion``
    /// straight off this value, so narrowing them as a side effect would advertise a policy
    /// revision nobody served. `lastUpdated` and the framework collections are what a drawer
    /// draws its headings and details rows from, and the `dataCategories` optional keeps its
    /// presence: the schema declares that one key optional, so the encoder writes it only
    /// for a list that published it.
    func testEverythingOutsideVendorsComesBackUntouched() {
        let narrowed = served.narrowed(toVendorIds: [8])

        XCTAssertEqual(narrowed.gvlSpecificationVersion, 3)
        XCTAssertEqual(narrowed.vendorListVersion, 177)
        XCTAssertEqual(narrowed.tcfPolicyVersion, 5)
        XCTAssertEqual(narrowed.lastUpdated, "2025-11-01T00:00:00Z")
        XCTAssertEqual(narrowed.purposes.keys.sorted(), [1, 2, 3])
        XCTAssertEqual(
            narrowed.purposes[1],
            served.purposes[1],
            "legal copy and illustrations are a details row, not a vendor's business"
        )
        XCTAssertEqual(narrowed.specialPurposes.keys.sorted(), [1])
        XCTAssertEqual(narrowed.features[1]?.name, "Identify devices")
        XCTAssertEqual(narrowed.specialFeatures.keys.sorted(), [2])
        XCTAssertEqual(narrowed.stacks[40]?.purposes, [2, 3])
        XCTAssertEqual(narrowed.stacks[40]?.specialFeatures, [2])
        XCTAssertEqual(narrowed.dataCategories?.keys.sorted(), [9])
        XCTAssertEqual(narrowed.dataCategories?[9]?.name, "Precise location")

        // A list that never published categories keeps not publishing them, rather than
        // gaining an empty collection on the way through the prune.
        let withoutCategories = GlobalVendorList(
            vendorListVersion: 177,
            tcfPolicyVersion: 5,
            vendors: served.vendors
        )
        XCTAssertNil(withoutCategories.narrowed(toVendorIds: [45]).dataCategories)
    }

    /// No scope declared is not an empty scope: both web functions hand the list back as it
    /// came, so a deployment that never scoped its vendors keeps the whole document. The
    /// alternative is a drawer with no rows under a consent the subject can still give,
    /// which reads as a refusal the publisher never made.
    func testNoScopeDeclaredLeavesTheListAlone() {
        XCTAssertEqual(served.narrowed(toVendorIds: nil), served, "nil is no scope")
        XCTAssertEqual(served.narrowed(toVendorIds: []), served, "empty is no scope either")
    }

    // MARK: - Nothing gets invented

    /// A scope id the served document does not carry stays absent from the result.
    ///
    /// This is the difference between pruning a document and rebuilding one from a scope: a
    /// manufactured entry would carry a name the framework never assigned, making c15t the
    /// source of a vendor no GVL revision stands behind. A scope that matches nothing prunes
    /// to an empty map, which is what a non-empty `allowed` against an unrelated set answers
    /// on the web, and it stays a declared scope rather than no scope, so unlike `[]` it
    /// does take the rows away.
    func testAnIdTheServedListDoesNotCarryIsNeverAdded() {
        let partly = served.narrowed(toVendorIds: [8, 999])
        XCTAssertEqual(partly.vendors.keys.sorted(), [8])
        XCTAssertNil(partly.vendor(999), "999 was never served, so there is nothing to keep")

        let nothingMatched = served.narrowed(toVendorIds: [424_242])
        XCTAssertEqual(nothingMatched.vendors.keys.sorted(), [])
        XCTAssertEqual(nothingMatched.vendorListVersion, 177, "an empty result is a list")
    }

    /// Publisher-custom and out-of-range ids behave like any other absent id.
    ///
    /// Zero and the negatives are ids the framework never assigns, and anything past 65_535
    /// could not reach a TC String vendor field at all, since ``TcBitWidth/vendorId`` is 16
    /// bits. A scope is a filter over what was served rather than a set of ids to
    /// materialise, so none of them earns an entry and none of them is worth refusing: the
    /// `8` sharing a scope with them still survives its neighbours.
    func testACustomOrOutOfRangeIdNeverCreatesAnEntry() {
        let impossible: [Int] = [0, -1, 65_536, 100_000]
        XCTAssertEqual(served.narrowed(toVendorIds: impossible).vendors.keys.sorted(), [])
        XCTAssertEqual(
            served.narrowed(toVendorIds: impossible + [8]).vendors.keys.sorted(),
            [8],
            "an id that cannot exist costs nothing"
        )
    }

    /// Entries are chosen by dictionary key, never by the `id` inside an entry body.
    ///
    /// ``GlobalVendorList/read(from:)`` already resolves a served object by its keys, so the
    /// two disagreeing is producer-side work rather than something `/init` can serve --
    /// which is exactly why it is worth pinning here. The entry whose body claims 755 sits
    /// under key 8, and a prune that read bodies would hand a publisher who scoped 8 the
    /// disclosure copy of a vendor they never named. The survivor is not renamed either.
    func testAnEntryIsSelectedByItsKeyAndNotByItsOwnIdField() {
        let mislabelled = GlobalVendorList(
            vendorListVersion: 177,
            tcfPolicyVersion: 5,
            vendors: [
                8: GVLVendor(id: 755, name: "Claims to be 755", purposes: [1]),
                755: GVLVendor(id: 8, name: "Claims to be 8", purposes: [2]),
            ]
        )

        let scoped = mislabelled.narrowed(toVendorIds: [8])
        XCTAssertEqual(scoped.vendors.keys.sorted(), [8])
        XCTAssertNil(scoped.vendor(755), "the entry keyed 755 is not in the scope")
        XCTAssertEqual(
            scoped.vendors[8],
            mislabelled.vendors[8],
            "the survivor is carried over whole, its own `id` and all"
        )

        let otherSide = mislabelled.narrowed(toVendorIds: [755])
        XCTAssertEqual(otherSide.vendors.keys.sorted(), [755])
        XCTAssertEqual(otherSide.vendors[755]?.name, "Claims to be 8")
    }
}
