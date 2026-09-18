package com.c15t.core

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.KernelOverrides
import com.c15t.core.transport.C15tProtocol

/**
 * Everything the core needs that is not an injected capability.
 *
 * Pure data: nothing here runs at construction, and no field changes consent
 * semantics on its own. The backend identifies the project by URL, the same way
 * the hosted transport in `@c15t/core` assumes, so there is no key in this type.
 *
 * @property portalUrl c15t backend base URL, without a trailing slash.
 * @property initUrl Overrides `$portalUrl/init`, for a deployment fronted by a
 * same-origin proxy.
 * @property domain Value sent as the `domain` field of `POST /subjects`. Defaults
 * to the host of [portalUrl].
 * @property consentCategories Categories the host offers. `null` uses the full
 * policy scope.
 * @property vendors Vendor ids this deployment may disclose, or `null` for no
 * declaration. The Android twin of `iab.vendors` on web.
 *
 * Web puts that option to three uses: filtering the GVL request, narrowing the list the
 * module holds through `narrowGVLToVendors`, and clearing a summary that had counted the
 * wider list. The first one reaches this core as the `x-c15t-vendors` request header, the
 * second is what [com.c15t.core.C15tKernel] does with this field on every path a list
 * arrives by, and the third has no native equivalent yet because this build holds one
 * list and reports it whole.
 *
 * `null` and an empty list are the same answer: no scope declared, so a served list is
 * kept exactly as it arrived. Both web narrows read an empty list that way --
 * `narrowGVLToVendors` in `packages/iab/src/tcf/fetch-gvl.ts` hands the document back, and
 * `gvlRequestUrl` in `packages/backend/src/http/gvl.ts` does not put the scope on the
 * request line at all -- and [com.c15t.core.tc.narrowToVendorIds] says so on its own
 * terms. A core that read `emptyList()` as "show nobody" would leave a publisher who never
 * scoped anything with an empty drawer under a consent the subject can still give, so a
 * host that means no vendors has to say so somewhere other than here.
 *
 * Ids the served document does not carry buy nothing, so an out-of-range or
 * publisher-custom id costs nothing, and the framework half of the document -- purposes,
 * features, stacks, and both version numbers -- is never moved by a scope.
 * @property overrides Developer overrides applied before the first init, so a
 * staged build can pin country, region, language, or GPC.
 * @property detectedGpc The GPC signal the device reports, or `null` when it has
 * none. There is no user-agent GPC flag to read natively, so this has to come
 * from wherever the signal actually lives: a WebView's
 * `isGlobalPrivacyControlEnabled`, an equivalent Android check, or the React
 * Native layer. `null` means "no signal", which is not the same answer as
 * `false`. An app override on [overrides] wins over this.
 * @property extraHeaders Extra request headers, for a deployment that needs its
 * own auth or tenant header.
 * @property maxPendingSaves Offline write queue depth; the contract maximum is 20.
 */
data class NativeConfig(
	val portalUrl: String,
	val initUrl: String? = null,
	val domain: String? = null,
	val sdkVersion: String = C15tProtocol.DEFAULT_SDK_VERSION,
	val consentCategories: List<ConsentCategory>? = null,
	val vendors: List<Int>? = null,
	val overrides: KernelOverrides = KernelOverrides(),
	val detectedGpc: Boolean? = null,
	val extraHeaders: Map<String, String> = emptyMap(),
	val maxPendingSaves: Int = 20,
) {
	init {
		require(portalUrl.isNotBlank()) { "NativeConfig.portalUrl must not be blank" }
	}
}
