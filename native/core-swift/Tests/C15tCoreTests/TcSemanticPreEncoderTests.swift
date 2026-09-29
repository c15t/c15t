import Foundation
import XCTest

@testable import C15tCore

/// The vendor-validity pass the encoder runs before a bit is written, graded one rule at
/// a time.
///
/// `encoder/SemanticPreEncoder.js` in `@iabtechlabtcf/core` is the oracle, and the rule
/// it enforces is the framework's rather than a preference: a vendor may not hold a
/// signal for a basis it never declared, so a string that claims one is not a record of
/// what the subject agreed to. Each case below clears exactly one signal and names the
/// reason, which is the shape of that pass: a table of reasons, not a formula.
///
/// This build keeps that pass inside `TcStringEncoder`, in `shape(_:vendorList:options:)`
/// and `prunedVendorSignals`; the Kotlin core names the same pass `TcSemanticPreEncoder`.
///
/// Every case runs twice, once with a hand-in ``TcVendorList`` and once with a
/// ``GlobalVendorList`` that `/init` served, and the two must produce the same bytes.
/// Supporting both sources is only honest if there is one pass over either, so the
/// parity assertion is the point of the file and the graded reasons are what it means.
final class TcSemanticPreEncoderTests: XCTestCase {
    private let epoch = Date(timeIntervalSince1970: 1_767_225_600)

    /// Vendor 8 is deliberately nowhere in the list.
    ///
    /// - 10 declares purposes, 11 declares legitimate interests, and neither is flexible.
    /// - 20 declares nothing for either basis.
    /// - 21 declares only a special purpose, which is the June 2021 carve-out.
    /// - 30 is withdrawn with a date that has passed but still declares its lists.
    /// - 31 carries an empty `deletedDate`, which the reference reads as an active vendor.
    /// - 40 declares no consent basis and one flexible purpose, 41 the same for LI.
    private var servedList: GlobalVendorList {
        GlobalVendorList(
            vendorListVersion: 177,
            tcfPolicyVersion: 5,
            vendors: [
                10: GVLVendor(id: 10, purposes: [1, 2, 7]),
                11: GVLVendor(id: 11, legIntPurposes: [9, 10]),
                20: GVLVendor(id: 20),
                21: GVLVendor(id: 21, specialPurposes: [1]),
                30: GVLVendor(id: 30, purposes: [1, 2], deletedDate: "2025-01-15T00:00:00Z"),
                31: GVLVendor(id: 31, legIntPurposes: [9], deletedDate: ""),
                40: GVLVendor(id: 40, flexiblePurposes: [2]),
                41: GVLVendor(id: 41, flexiblePurposes: [9]),
            ]
        )
    }

    /// The same facts as a hand-in list, spelled out rather than derived from the served
    /// one, so the parity test compares two independent readings of the same document.
    private var handInTheSameList: TcVendorList {
        TcVendorList(
            language: "EN",
            vendorListVersion: 177,
            tcfPolicyVersion: 5,
            vendors: [
                TcVendorDeclaration(id: 10, purposes: [1, 2, 7]),
                TcVendorDeclaration(id: 11, legitimateInterests: [9, 10]),
                TcVendorDeclaration(id: 20),
                TcVendorDeclaration(id: 21, specialPurposes: [1]),
                TcVendorDeclaration(
                    id: 30,
                    purposes: [1, 2],
                    deletedDate: "2025-01-15T00:00:00Z"
                ),
                TcVendorDeclaration(id: 31, legitimateInterests: [9], deletedDate: ""),
                TcVendorDeclaration(id: 40, flexiblePurposes: [2]),
                TcVendorDeclaration(id: 41, flexiblePurposes: [9]),
            ]
        )
    }

    private func model(
        consents: [Int] = [],
        legitimateInterests: [Int] = [],
        serviceSpecific: Bool = true,
        restrictions: [TcPublisherRestriction] = []
    ) -> TcConsentModel {
        var drafted = TcConsentModel(
            created: epoch,
            lastUpdated: epoch,
            cmpId: 3,
            cmpVersion: 1,
            consentScreen: 1,
            consentLanguage: "DE",
            publisherCountryCode: "DE",
            isServiceSpecific: serviceSpecific,
            useNonStandardTexts: false,
            purposeOneTreatment: false,
            supportOOB: false
        )
        drafted.purposeConsents = [1, 2]
        drafted.purposeLegitimateInterests = [1, 2, 3, 4, 5, 6, 9, 10]
        drafted.vendorConsents = Set(consents)
        drafted.vendorLegitimateInterests = Set(legitimateInterests)
        drafted.publisherRestrictions = restrictions
        return drafted
    }

    /// A restriction over a vendor, on the purpose the publisher narrowed.
    private func restriction(
        _ type: TcRestrictionType,
        purpose: Int = 2,
        vendors: [Int]
    ) -> TcPublisherRestriction {
        TcPublisherRestriction(
            purposeId: purpose,
            restrictionType: type,
            entries: vendors.map { TcIDRun(start: $0, end: $0, isRange: false) }
        )
    }

    // MARK: - Assertion helpers

    private func shape(
        _ drafted: TcConsentModel,
        gvl: GlobalVendorList? = nil
    ) throws -> TcString {
        let list = gvl ?? servedList
        return try TcStringEncoder.shape(drafted, gvl: list)
    }

    /// Assert what survived the pass, and prove the hand-in route agrees byte for byte.
    ///
    /// The parity half is not decoration: `TcStringEncoder.shape(_:vendorList:options:)`
    /// is the pass, and if the served-list route grew its own rule the vectors below
    /// would still match while the strings quietly stopped being the ones web writes.
    private func assertPruned(
        _ drafted: TcConsentModel,
        consents: [Int],
        legitimateInterests: [Int],
        file: StaticString = #filePath,
        line: UInt = #line
    ) throws {
        let shaped = try shape(drafted)
        XCTAssertEqual(
            shaped.vendorConsents.ids.sorted(),
            consents,
            "wrong consent vector after pruning",
            file: file,
            line: line
        )
        XCTAssertEqual(
            shaped.vendorLegitimateInterests.ids.sorted(),
            legitimateInterests,
            "wrong legitimate-interest vector after pruning",
            file: file,
            line: line
        )

        let viaHandIn = try TcStringEncoder.shape(drafted, vendorList: handInTheSameList)
        XCTAssertEqual(shaped, viaHandIn, "the served list and the hand-in list pruned apart", file: file, line: line)
        guard case let .encoded(servedString) = TcStringEncoder.encode(drafted, gvl: servedList),
              case let .encoded(handString) = TcStringEncoder.encode(drafted, vendorList: handInTheSameList)
        else {
            XCTFail("neither route may refuse these models", file: file, line: line)
            return
        }
        XCTAssertEqual(
            servedString,
            handString,
            "the two routes wrote different strings for one consent",
            file: file,
            line: line
        )
    }

    // MARK: - (a) A vendor the list does not name

    /// If the vendor doesn't exist, it gets no signal. Nothing else about the model can
    /// rescue it: an app may hold a id the list has never heard of, and `gvl.vendors[id]`
    /// answering undefined is the reference's whole test.
    func testASignalForAVendorTheListDoesNotNameIsDropped() throws {
        try assertPruned(
            model(consents: [8, 10], legitimateInterests: [8, 11]),
            consents: [10],
            legitimateInterests: [11]
        )
    }

    /// The same rule over a `deletedDate` that has not come due: the field exists, so the
    /// vendor is withdrawn, and the date is not compared to a clock anywhere.
    func testAVendorWithdrewOnADateThatHasPassed() throws {
        try assertPruned(
            model(consents: [30], legitimateInterests: [30]),
            consents: [],
            legitimateInterests: []
        )
    }

    /// The odd half of the same field. `GVL.js` tests `deletedDate` for truthiness, so an
    /// empty string reads as an active vendor and the signal stays. A date comparison
    /// here would clear a signal the reference keeps, which is a different string than
    /// web writes from the same consent.
    func testAnEmptyDeletionDateLeavesTheVendorActive() throws {
        try assertPruned(
            model(legitimateInterests: [31]),
            consents: [],
            legitimateInterests: [31]
        )
    }

    /// The other half of the withdrawal vector, and the half an over-eager fix loses. On the
    /// web the hit is bigger than the prune, because `GVL.mapVendors` deletes a withdrawn
    /// vendor from `gvl.vendors` at construction and leaves the id in `vendorIds`, so
    /// `gvl.vendors[700]` answers undefined and the pre-encoder clears the signal on that
    /// alone. This core keeps the entry and reads the date, landing on the same two vectors,
    /// which the draft of this file got wrong in the other direction. Either way
    /// `vendorsDisclosed` is copied through the pass untouched: the disclosure fact is that
    /// the subject saw the vendor, and a withdrawal does not take that back. Both vectors are
    /// pinned at once by `tc-string-parity-deleted-vendor-consent`.
    func testAWidrawnVendorIsPrunedFromItsSignalsButNotFromTheDisclosure() throws {
        var drafted = model(consents: [30], legitimateInterests: [31])
        drafted.vendorsDisclosed = [30, 31]
        let shaped = try shape(drafted)
        XCTAssertEqual(
            shaped.vendorConsents.ids.sorted(),
            [],
            "the withdrawn vendor loses its consent signal"
        )
        XCTAssertEqual(
            shaped.vendorsDisclosed?.ids.sorted(),
            [30, 31],
            "the disclosed vector keeps it, because the pass does not rewrite that one"
        )
    }

    // MARK: - (c) A basis the vendor never declared

    /// A positive signal for a purpose the vendor never claimed is a mistake somewhere
    /// upstream, and the encoder corrects it rather than encoding it.
    func testASignalOnABasisTheVendorNeverDeclaredIsDropped() throws {
        try assertPruned(
            model(consents: [20], legitimateInterests: [20]),
            consents: [],
            legitimateInterests: []
        )
    }

    /// A vendor that declares only special purposes keeps a legitimate-interest signal once
    /// it has been disclosed, because that is how the framework represents special
    /// purposes at all. Consent for the same vendor still goes: the carve-out is about the
    /// basis that carries them, not a licence for any signal.
    func testASpecialPurposesOnlyVendorKeepsItsLegitimateInterestSignal() throws {
        try assertPruned(
            model(consents: [21], legitimateInterests: [21]),
            consents: [],
            legitimateInterests: [21]
        )
    }

    /// Declaring one basis does not license the other.
    func testDeclaringOneBasisDoesNotLicenseTheOther() throws {
        try assertPruned(
            model(consents: [11], legitimateInterests: [10]),
            consents: [],
            legitimateInterests: []
        )
    }

    // MARK: - (d) Flexible purposes, gated

    /// Outside a service-specific string there is no publisher restriction to lean on,
    /// `purposeRestrictions` only apply to service-specific strings, so a flexible purpose
    /// changes nothing and the signal goes even with a restriction that would have saved
    /// it. This is the case a globally scoped string gets wrong most easily: the
    /// restriction is real, and it still does not count.
    func testAFlexiblePurposeSavesNothingInAGloballyScopedString() throws {
        try assertPruned(
            model(
                consents: [40],
                legitimateInterests: [41],
                serviceSpecific: false,
                restrictions: [
                    restriction(.requireConsent, vendors: [40]),
                    restriction(.requireLegitimateInterest, vendors: [41]),
                ]
            ),
            consents: [],
            legitimateInterests: []
        )
    }

    /// In a service-specific string, a flexible purpose plus a restriction that flips the
    /// basis to the one the signal claims is what makes the signal legitimate, and the
    /// pass keeps it.
    func testAFlexiblePurposeWithAMatchingRestrictionKeepsTheSignal() throws {
        try assertPruned(
            model(
                consents: [40],
                legitimateInterests: [41],
                restrictions: [
                    restriction(.requireConsent, vendors: [40]),
                    restriction(.requireLegitimateInterest, vendors: [41]),
                ]
            ),
            consents: [40],
            legitimateInterests: [41]
        )
    }

    /// Flexible purposes plus no restriction: the publisher never said anything, so there
    /// is nothing to license the basis.
    func testAFlexiblePurposeWithoutARestrictionDropsTheSignal() throws {
        try assertPruned(
            model(consents: [40], legitimateInterests: [41]),
            consents: [],
            legitimateInterests: []
        )
    }

    /// The restriction has to flip the right way. A publisher that required legitimate
    /// interest for a vendor does not thereby give the publisher consent to record, and
    /// the reference checks the type against the vector it is walking rather than guessing.
    func testARestrictionForTheOtherBasisDoesNotSaveTheSignal() throws {
        try assertPruned(
            model(
                consents: [40],
                legitimateInterests: [41],
                restrictions: [
                    restriction(.requireLegitimateInterest, vendors: [40]),
                    restriction(.requireConsent, vendors: [41]),
                ]
            ),
            consents: [],
            legitimateInterests: []
        )
    }

    /// A `NOT_ALLOWED` restriction is a denial, not a change of basis, and opens no gate.
    func testANotAllowedRestrictionDoesNotSaveTheSignal() throws {
        try assertPruned(
            model(
                consents: [40],
                restrictions: [restriction(.notAllowed, vendors: [40])]
            ),
            consents: [],
            legitimateInterests: []
        )
    }

    /// The reference asks whether any restriction covering the vendor flips the basis. It
    /// does not tie the restriction's purpose to the vendor's flexible purpose, so a
    /// restriction on purpose 2 is what clears a signal here even though the flexible
    /// purpose is 7. Transcribed rather than corrected: a fixed version of this loop would
    /// write a different string than the encoder the fixtures came from.
    func testARestrictionOnAnyPurposeOfThatVendorOpensTheGate() throws {
        let flexibleOnSeven = GlobalVendorList(
            vendorListVersion: 177,
            tcfPolicyVersion: 5,
            vendors: [40: GVLVendor(id: 40, flexiblePurposes: [7])]
        )
        let shaped = try shape(
            model(
                consents: [40],
                restrictions: [restriction(.requireConsent, purpose: 2, vendors: [40])]
            ),
            gvl: flexibleOnSeven
        )
        XCTAssertEqual(shaped.vendorConsents.ids.sorted(), [40])
    }

    // MARK: - The rest of the pass

    /// The other thing the pass does on the way: purposes 1, 3, 4, 5 and 6 may not carry a
    /// publisher legitimate interest, so they are cleared before every version 2 encode.
    /// These are the model's own vectors, not the vendor ones, and they clear over a
    /// served list exactly as they do over a hand-in one.
    func testThePurposesWithoutALegitimateInterestBasisAreCleared() throws {
        let shaped = try shape(model(legitimateInterests: [11]))
        XCTAssertEqual(
            shaped.purposeLegitimateInterests.ids.sorted(),
            [2, 9, 10],
            "purpose 2 keeps its LI basis; 1, 3, 4, 5 and 6 do not"
        )
    }

    /// The list answers for the two versions and the language, and the model's own values
    /// are overwritten. `consentLanguage` says EN rather than the model's DE because that
    /// is what `new GVL(json)` holds until someone calls `changeLanguage`, which
    /// `packages/iab/src/tcf/tc-string.ts` never does.
    func testTheServedListSuppliesTheVersionsAndTheLanguage() throws {
        let shaped = try shape(model(consents: [10]))
        XCTAssertEqual(shaped.vendorListVersion, 177)
        XCTAssertEqual(shaped.tcfPolicyVersion, 5)
        XCTAssertEqual(shaped.consentLanguage, "EN")
    }

    /// The hand-in route is not going anywhere either: the shared fixtures feed the encoder
    /// a stub list rather than a document, and `tc-string-parity-deleted-vendor-consent`
    /// arrives through it, so a declaration carrying a withdrawal date has to prune exactly
    /// as a served list's does.
    func testAHandInDeclarationOfADeletedVendorPrunesLikeAServedDate() throws {
        let drafted = model(consents: [10, 30], legitimateInterests: [11, 30])
        let list = TcVendorList(
            language: "EN",
            vendorListVersion: 177,
            tcfPolicyVersion: 5,
            vendors: [
                TcVendorDeclaration(id: 10, purposes: [1]),
                TcVendorDeclaration(id: 11, legitimateInterests: [9]),
                TcVendorDeclaration(id: 30, purposes: [1], deletedDate: "2026-01-01T00:00:00Z"),
            ]
        )
        let shaped = try TcStringEncoder.shape(drafted, vendorList: list)
        XCTAssertEqual(shaped.vendorConsents.ids.sorted(), [10])
        XCTAssertEqual(shaped.vendorLegitimateInterests.ids.sorted(), [11])
    }
}
