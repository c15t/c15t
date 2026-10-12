package com.c15t.core

import com.c15t.core.spi.HttpResponse
import com.c15t.core.store.C15tStore
import com.c15t.core.transport.C15tProtocol
import com.c15t.core.transport.HostedTransport
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * The `x-c15t-vendors` request line: its shape, and the cases where it stays off the request.
 *
 * The header is the mobile spelling of the `vendorIds` parameter that `gvlRequestUrl` in
 * `packages/backend/src/http/gvl.ts` puts on the upstream GVL request, so the value contract is
 * copied rather than invented: deduplicated, ascending, comma-separated, and absent wherever a scope
 * would be a lie or a burden. The ordering is not cosmetic -- upstream keys its cache on the sorted
 * id list (`fetch-gvl.ts` sorts before it builds the key), so two publishers who typed the same
 * partners in a different order have to arrive as one question.
 *
 * Both seams are graded. [shaping] checks the formatter directly, which is where the four rules are
 * cheapest to read; [overTheWire] drives a configured kernel through the real transport, because a
 * formatter nobody calls is exactly the mistake this whole change is about -- [NativeConfig.vendors]
 * reaching a kernel but not a request.
 *
 * What is *not* claimed here, and must stay that way: the header is an optimisation about bytes and
 * never the disclosure guarantee. [com.c15t.core.DeclaredVendorScopeTest] keeps a scoped kernel
 * narrowing a list that arrived wide, which is the answer a producer that ignores this header gets.
 */
class VendorScopeHeaderTest {
	@Test
	fun `a declared scope travels deduplicated and ascending`() {
		assertEquals(
			"8,42,755",
			C15tProtocol.vendorScopeHeaderValue(listOf(755, 8, 42)),
			"ascending, whatever order the host wrote the list in",
		)
		assertEquals(
			"8,42,755",
			C15tProtocol.vendorScopeHeaderValue(listOf(42, 8, 755, 8, 42)),
			"a partner named twice is one partner",
		)
		assertEquals("7", C15tProtocol.vendorScopeHeaderValue(listOf(7)), "one id is still a scope")
	}

	/**
	 * No scope declared, no header sent -- in both notations.
	 *
	 * `null` and `emptyList()` are the same answer everywhere else in this pair of cores, and the
	 * request line may not be where they start meaning different things: `gvlRequestUrl` does not
	 * append its parameter for an empty list either, so a header carrying an empty value would be a
	 * third thing a producer has to have a rule for.
	 */
	@Test
	fun `an undeclared or empty scope sends no header`() {
		assertNull(C15tProtocol.vendorScopeHeaderValue(null), "no declaration")
		assertNull(C15tProtocol.vendorScopeHeaderValue(emptyList()), "an empty list is the same no-declaration")
	}

	/**
	 * Past the request-line ceiling the scope is not named at all, and the cap is the one web uses.
	 *
	 * 500 is `MAX_GVL_QUERY_VENDOR_IDS`, in `packages/iab/src/tcf/fetch-gvl.ts` and in
	 * `packages/backend/src/http/gvl.ts` alike, and both of those keep pruning locally above it: the
	 * web answer for a 609-id publisher is "fetch the list whole, show your own partners". Truncating
	 * a header to what fits would be a different scope than the one the host declared -- the worst
	 * shape available here -- so the whole header goes and the local prune carries the promise.
	 *
	 * The boundary is graded on both sides, because an off-by-one here is a publisher silently
	 * under-scoped on every request.
	 */
	@Test
	fun `a scope above the request-line ceiling sends no header`() {
		val atCap = (1..C15tProtocol.MAX_VENDOR_SCOPE_HEADER_IDS).toList()
		val value = C15tProtocol.vendorScopeHeaderValue(atCap)
		assertTrue(value != null, "exactly at the ceiling the scope still travels")
		assertEquals(atCap.joinToString(","), value)
		assertNull(
			C15tProtocol.vendorScopeHeaderValue(atCap + 5_001),
			"one id past the ceiling and nothing about the scope goes on the request line",
		)

		// The vectors lane's own over-cap publisher: 609 declared ids against a 54-vendor document.
		val overCap = (1..609).toList()
		assertNull(C15tProtocol.vendorScopeHeaderValue(overCap), "the 609-id vector sends no header")
	}

	/**
	 * A configured kernel puts the scope on the `/init` it sends, beside the other overrides.
	 *
	 * The whole point of the header is that a producer reads it before it builds the response, so the
	 * only version of this worth testing is the one that reaches a socket-shaped seam. Everything
	 * after `=` is what a proxy or a cache key sees.
	 */
	@Test
	fun `a scoped kernel sends the header on its init request`() {
		val http = RecordingHttpClient { HttpResponse(status = 200, body = initBody()) }
		// The transport is deliberately built from a config that names no vendors: the declaration
		// reaches the request through the init context the kernel hands over, which is the one shape
		// `core-swift` has too, and a transport that read the scope off its own copy of the config
		// would pass this test while the kernel's declaration went nowhere.
		val transportConfig = NativeConfig(portalUrl = "https://test.c15t.app")
		testKernel(
			config = NativeConfig(portalUrl = "https://test.c15t.app", vendors = listOf(755, 8, 42, 8)),
			store = C15tStore(InMemoryKeyValueStore()),
			transport = HostedTransport(http, transportConfig),
		).bootstrap()

		val init = http.requests.first { it.url.endsWith("/init") }
		assertEquals("8,42,755", init.headers[C15tProtocol.VENDOR_SCOPE_HEADER])
	}

	/**
	 * Nothing on the request when the host declared nothing, and nothing above the ceiling.
	 *
	 * The kernel's own shape of the two absence rules, on a real request rather than on the formatter:
	 * an empty value would be a claim about a scope the app never named, and a truncated one would be
	 * a claim about the wrong scope.
	 */
	@Test
	fun `an unscoped kernel sends no vendor header at all`() {
		for (declared in listOf(null, emptyList(), (1..501).toList())) {
			val http = RecordingHttpClient { HttpResponse(status = 200, body = initBody()) }
			testKernel(
				config = NativeConfig(portalUrl = "https://test.c15t.app", vendors = declared),
				store = C15tStore(InMemoryKeyValueStore()),
				transport = HostedTransport(http, NativeConfig(portalUrl = "https://test.c15t.app")),
			).bootstrap()

			val init = http.requests.first { it.url.endsWith("/init") }
			assertNull(
				init.headers[C15tProtocol.VENDOR_SCOPE_HEADER],
				"a declaration of ${(declared?.size ?: "null")} ids must not appear on the request line",
			)
		}
	}
}
