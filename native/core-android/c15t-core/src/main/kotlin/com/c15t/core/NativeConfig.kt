package com.c15t.core

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.KernelOverrides
import com.c15t.core.model.PrivacySignals
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
 * @property overrides Developer overrides applied before the first init, so a
 * staged build can pin country, region, language, or force GPC on.
 * @property privacySignals Signals the device reports at launch.
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
	val overrides: KernelOverrides = KernelOverrides(),
	val privacySignals: PrivacySignals = PrivacySignals(),
	val extraHeaders: Map<String, String> = emptyMap(),
	val maxPendingSaves: Int = 20,
) {
	init {
		require(portalUrl.isNotBlank()) { "NativeConfig.portalUrl must not be blank" }
	}
}
