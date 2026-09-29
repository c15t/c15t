import Foundation
import XCTest

@testable import C15tCore

/// The `x-c15t-vendors` request line: its shape, and the cases where it stays off the request.
///
/// The header is the mobile spelling of the `vendorIds` parameter that `gvlRequestUrl` in
/// `packages/backend/src/http/gvl.ts` puts on the upstream GVL request, so the value contract is
/// copied rather than invented: deduplicated, ascending, comma-separated, and absent wherever a
/// scope would be a lie or a burden. The ordering is not cosmetic -- upstream keys its cache on the
/// sorted id list (`fetch-gvl.ts` sorts before it builds the key), so two publishers who typed the
/// same partners in another order have to arrive as one question.
///
/// Both seams are graded. The value tests read the formatter, which is where the four rules are
/// cheapest to see; the request tests drive a configured ``ConsentCore`` through the real
/// ``HostedTransport``, because a formatter nobody calls is exactly the mistake this change is
/// about -- ``CoreConfig/vendors`` reaching a kernel but not a request.
///
/// What is *not* claimed here, and must stay that way: the header is an optimisation about bytes and
/// never the disclosure guarantee. ``DeclaredVendorScopeTests`` keeps a scoped core narrowing a list
/// that arrived wide, which is the answer a producer that ignores this header gets.
final class VendorScopeHeaderTests: XCTestCase {
    private var clock: TestClock!

    override func setUp() {
        super.setUp()
        clock = TestClock()
    }

    // MARK: - The value

    func testADeclaredScopeTravelsDeduplicatedAndAscending() {
        XCTAssertEqual(
            C15tSDK.vendorScopeHeaderValue([755, 8, 42]),
            "8,42,755",
            "ascending, whatever order the host wrote the list in"
        )
        XCTAssertEqual(
            C15tSDK.vendorScopeHeaderValue([42, 8, 755, 8, 42]),
            "8,42,755",
            "a partner named twice is one partner"
        )
        XCTAssertEqual(C15tSDK.vendorScopeHeaderValue([7]), "7", "one id is still a scope")
    }

    /// No scope declared, no header sent -- in both notations.
    ///
    /// `nil` and `[]` are the same answer everywhere else in this pair of cores, and the request line
    /// may not be where they start meaning different things: `gvlRequestUrl` does not append its
    /// parameter for an empty list either, so a header carrying an empty value would be a third thing
    /// a producer has to keep a rule for.
    func testAnUndeclaredOrEmptyScopeSendsNoHeader() {
        XCTAssertNil(C15tSDK.vendorScopeHeaderValue(nil), "no declaration")
        XCTAssertNil(C15tSDK.vendorScopeHeaderValue([]), "an empty list is the same no-declaration")
    }

    /// Past the request-line ceiling the scope is not named at all, and the cap is the one web uses.
    ///
    /// 500 is `MAX_GVL_QUERY_VENDOR_IDS`, in `packages/iab/src/tcf/fetch-gvl.ts` and in
    /// `packages/backend/src/http/gvl.ts` alike, and both of those keep pruning locally above it: the
    /// web answer for a 609-id publisher is "fetch the list whole, show your own partners".
    /// Truncating a header to what fits would describe a different scope than the one the host
    /// declared -- the worst shape available here -- so the whole header goes and the local prune
    /// carries the promise. The boundary is graded on both sides, because an off-by-one here is a
    /// publisher silently under-scoped on every request.
    func testAScopeAboveTheRequestLineCeilingSendsNoHeader() {
        let atCap = Array(1 ... C15tSDK.maxVendorScopeHeaderIds)
        XCTAssertEqual(
            C15tSDK.vendorScopeHeaderValue(atCap),
            atCap.map(String.init).joined(separator: ","),
            "exactly at the ceiling the scope still travels"
        )
        XCTAssertNil(
            C15tSDK.vendorScopeHeaderValue(atCap + [5_001]),
            "one id past the ceiling and nothing about the scope goes on the request line"
        )
        // The vectors lane's own over-cap publisher: 609 declared ids against a 54-vendor document.
        XCTAssertNil(C15tSDK.vendorScopeHeaderValue(Array(1 ... 609)), "the 609-id vector sends no header")
    }

    // MARK: - The request

    /// A configured core puts the scope on the `/init` it sends, beside the other declarations.
    ///
    /// The header exists so a producer can read it before it builds a response, so the only version
    /// of this worth testing is the one that reaches a socket-shaped seam.
    func testAScopedCoreSendsTheHeaderOnItsInitRequest() async {
        let http = StubHTTP()
        let core = ConsentCore()
        core.bootstrap(Fixture.configured(
            store: InMemoryStore(),
            transport: Fixture.transport(http),
            clock: clock,
            vendors: [755, 8, 42, 8]
        ))
        await core.waitUntilIdle()

        let request = try? XCTUnwrap(http.recordedInitRequests.first)
        XCTAssertEqual(request?.headers[C15tSDK.vendorScopeHeader], "8,42,755")
    }

    /// Nothing on the request when the host declared nothing, and nothing above the ceiling.
    ///
    /// The core's own shape of the two absence rules, on a real request rather than on the formatter:
    /// an empty value would be a claim about a scope the app never named, and a truncated one a claim
    /// about the wrong scope.
    func testAnUnscopedCoreSendsNoVendorHeaderAtAll() async {
        for declared in [nil, [], Array(1 ... 501)] {
            let http = StubHTTP()
            let core = ConsentCore()
            core.bootstrap(Fixture.configured(
                store: InMemoryStore(),
                transport: Fixture.transport(http),
                clock: clock,
                vendors: declared
            ))
            await core.waitUntilIdle()

            let request = try? XCTUnwrap(http.recordedInitRequests.first)
            XCTAssertNil(
                request?.headers[C15tSDK.vendorScopeHeader],
                "a declaration of \(declared.map { "\($0.count)" } ?? "no list") ids must not reach the request line"
            )
        }
    }
}
