package com.c15t.reactnative

import android.content.Context
import android.content.pm.PackageManager
import com.c15t.android.C15tAndroid
import com.c15t.core.C15t
import com.c15t.core.NativeConfig
import com.c15t.core.model.KernelOverrides
import java.util.Locale

/**
 * Starts the consent core, once, ahead of the React host.
 *
 * Hydration is the reason this exists as its own step: [C15t.bootstrap] reads the
 * stored envelope synchronously before it puts anything on a worker thread, so a
 * launch hook that runs here means the first JavaScript frame already resolves
 * `getBootstrap()` and `getSnapshot()` against real stored consent instead of an
 * empty deny-all.
 *
 * An app that installs the core itself sets `com.c15t.reactnative.AUTO_BOOTSTRAP` to
 * `false`, and this then stays out of the way: the reads answer deny-all until that
 * app calls [C15t.bootstrap], and the module keeps working against whatever core is
 * installed.
 */
object C15tReactNativeBootstrap {
	/** Manifest switch for apps that own their own bootstrap. */
	const val META_AUTO_BOOTSTRAP = "com.c15t.reactnative.AUTO_BOOTSTRAP"

	private val lock = Any()

	/**
	 * Install the core if it is not already running.
	 *
	 * @return `true` when a core is installed after the call.
	 */
	fun ensure(context: Context): Boolean {
		if (C15t.current != null) {
			return true
		}
		if (!autoBootstrapEnabled(context)) {
			return false
		}
		val config = C15tAndroid.configFrom(context)?.withDeviceLanguage() ?: return false
		synchronized(lock) {
			if (C15t.current != null) {
				return true
			}
			// Installs the encrypted store, the transport, and the foreground observer
			// that replays the offline queue, then starts the core.
			C15tAndroid.install(context, config)
		}
		return C15t.current != null
	}

	/** Whether the launch hook should bootstrap, honouring the host's opt-out. */
	fun autoBootstrapEnabled(context: Context): Boolean = readFlag(context) != false

	private fun readFlag(context: Context): Boolean? = try {
		context.packageManager
			.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
			.metaData
			?.let { bundle ->
				if (bundle.containsKey(META_AUTO_BOOTSTRAP)) {
					bundle.getBoolean(META_AUTO_BOOTSTRAP)
				} else {
					null
				}
			}
	} catch (error: PackageManager.NameNotFoundException) {
		null
	}

	/**
	 * Pin the device language unless the app declared one.
	 *
	 * The protocol resolves translations to exactly one language, so the native side
	 * supplies the locale rather than leaving it for JavaScript to guess.
	 */
	private fun NativeConfig.withDeviceLanguage(): NativeConfig {
		if (!overrides.language.isNullOrBlank()) {
			return this
		}
		val language = Locale.getDefault().language.takeIf { it.isNotBlank() } ?: C15tPayload.DEFAULT_LANGUAGE
		return copy(
			overrides = KernelOverrides(
				country = overrides.country,
				region = overrides.region,
				language = language,
				gpc = overrides.gpc,
			),
		)
	}
}
