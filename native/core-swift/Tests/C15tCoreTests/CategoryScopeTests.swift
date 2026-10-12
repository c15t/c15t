import Foundation
import XCTest
@testable import C15tCore

/// The subject-facing category list the snapshot carries: the rows a consent
/// surface lists.
///
/// The web dialog derives that list from the resolved policy crossed with the
/// categories the app registered -- `choiceScope ?? scope` in `use-manager.ts`,
/// projected in `packages/core/src/policy.ts` -- and never from the category
/// vocabulary. A native core that listed the vocabulary instead would show a
/// subject categories the resolved rule does not govern, and the same backend
/// would answer two different dialogs by platform. These tests pin the core's
/// half of the rule; the protocol fixtures pin the half both cores share, and
/// `CategoryScopeTest` in the Kotlin module keeps the mirror pair honest.
final class CategoryScopeTests: XCTestCase {
    private var clock: TestClock!
    private var store: InMemoryStore!
    private var http: StubHTTP!

    override func setUp() {
        super.setUp()
        clock = TestClock()
        store = InMemoryStore()
        http = StubHTTP()
    }

    func testAResolvedScopeNarrowerThanTheVocabularyListsOnlyTheScope() async {
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: Fixture.rule(scope: ["measurement"])
        ))
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock
        ))

        XCTAssertEqual(
            core.snapshot().consentCategories,
            [.necessary, .measurement],
            "a host that declares nothing is asked about the whole scope, and about nothing the scope does not name"
        )
    }

    func testADeclaredScopeNarrowsTheListTheSubjectIsShown() async {
        // The policy governs experience too, but the host declares no experience
        // integration, so the subject is not asked -- the same web dialog shows
        // four rows against this rule and this declaration.
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: Fixture.rule()
        ))
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock,
            categories: [.necessary, .functionality, .measurement, .marketing]
        ))

        XCTAssertEqual(
            core.snapshot().consentCategories,
            [.necessary, .functionality, .marketing, .measurement],
            "names in canonical sorted order after necessary, so both cores serialize the same list"
        )
    }

    func testADeclaredNameThePolicyDoesNotGovernNeverReachesTheList() async {
        http.initResponse = Fixture.initResponse(policyResolution: Fixture.matchedResolution(
            policy: Fixture.rule(scope: ["measurement"])
        ))
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock,
            categories: [.necessary, .experience, .measurement]
        ))

        XCTAssertEqual(
            core.snapshot().consentCategories,
            [.necessary, .measurement],
            "a row the evaluator will not honour is a row that cannot be honoured"
        )
    }

    func testBeforeAnyPolicyResolvesTheFallbackScopeDecidesTheList() async {
        // The stub answers with no `policyResolution`: the core stays pending,
        // where the evaluator runs the safe fallback rule over every optional
        // category. The list follows that rule, narrowed by the declaration,
        // instead of inventing a scope.
        let core = ConsentCore()
        await core.bootstrapAndSettle(Fixture.configured(
            store: store,
            transport: Fixture.transport(http),
            clock: clock,
            categories: [.functionality]
        ))

        XCTAssertEqual(
            core.snapshot().consentCategories,
            [.necessary, .functionality]
        )
    }
}
