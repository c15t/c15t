package com.c15t.core

import com.c15t.core.model.ConsentCategory
import com.c15t.core.store.C15tStore
import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * The subject-facing category list the snapshot carries: the rows a consent
 * surface lists.
 *
 * The web dialog derives that list from the resolved policy crossed with the
 * categories the app registered -- `choiceScope ?? scope` in `use-manager.ts`,
 * projected in `packages/core/src/policy.ts` -- and never from the category
 * vocabulary. A native core that listed the vocabulary instead would show a
 * subject categories the resolved rule does not govern, and the same backend
 * would answer two different dialogs by platform. These tests pin the kernel's
 * half of the rule; the protocol fixtures pin the half both cores share.
 */
class CategoryScopeTest {
	@Test
	fun `a resolved scope narrower than the vocabulary lists only the scope`() {
		val kernel = kernelWithPolicy(
			scope = """["measurement"]""",
			declared = null,
		)

		assertEquals(
			listOf("necessary", "measurement"),
			kernel.snapshot().consentCategories,
			"a host that declares nothing is asked about the whole scope, and about nothing the scope does not name",
		)
	}

	@Test
	fun `a declared scope narrows the list the subject is shown`() {
		// The policy governs experience too, but the host declares no experience
		// integration, so the subject is not asked -- the same web dialog shows
		// four rows against this rule and this declaration.
		val kernel = kernelWithPolicy(
			scope = """["experience","functionality","marketing","measurement"]""",
			declared = listOf(
				ConsentCategory.NECESSARY,
				ConsentCategory.FUNCTIONALITY,
				ConsentCategory.MEASUREMENT,
				ConsentCategory.MARKETING,
			),
		)

		assertEquals(
			listOf("necessary", "functionality", "marketing", "measurement"),
			kernel.snapshot().consentCategories,
			"names in canonical sorted order after necessary, so both cores serialize the same list",
		)
	}

	@Test
	fun `a declared name the policy does not govern never reaches the list`() {
		val kernel = kernelWithPolicy(
			scope = """["measurement"]""",
			declared = listOf(
				ConsentCategory.NECESSARY,
				ConsentCategory.EXPERIENCE,
				ConsentCategory.MEASUREMENT,
			),
		)

		assertEquals(
			listOf("necessary", "measurement"),
			kernel.snapshot().consentCategories,
			"a row the evaluator will not honour is a row that cannot be honoured",
		)
	}

	@Test
	fun `before any policy resolves the fallback scope decides the list`() {
		// No transport answers: the device stays pending, where the evaluator runs
		// the safe fallback rule over every optional category. The list follows
		// that rule, narrowed by the declaration, instead of inventing a scope.
		val kernel = testKernel(
			config = NativeConfig(
				portalUrl = "https://test.c15t.app",
				consentCategories = listOf(ConsentCategory.FUNCTIONALITY),
			),
			store = C15tStore(InMemoryKeyValueStore()),
		)
		kernel.bootstrap()

		assertEquals(
			listOf("necessary", "functionality"),
			kernel.snapshot().consentCategories,
		)
	}

	private fun kernelWithPolicy(
		scope: String,
		declared: List<ConsentCategory>?,
	): C15tKernel {
		val kernel = testKernel(
			config = NativeConfig(
				portalUrl = "https://test.c15t.app",
				consentCategories = declared,
			),
			store = C15tStore(InMemoryKeyValueStore()),
			transport = RecordingTransport()
				.respondInit(initSuccess(body = initBody(scope = scope))),
		)
		kernel.bootstrap()
		return kernel
	}
}
