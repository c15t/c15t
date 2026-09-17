package com.c15t.android

import android.content.Context
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.c15t.core.C15t
import com.c15t.core.NativeConfig
import com.c15t.core.model.KernelError
import com.c15t.core.model.PrivacySignals
import com.c15t.core.spi.Clock
import com.c15t.core.spi.TaskExecutor
import com.c15t.core.transport.C15tTransport
import com.c15t.core.transport.HostedTransport
import java.util.concurrent.Executors

/**
 * The Android wiring, kept separate from the engine so the engine stays testable
 * without a device.
 *
 * Everything a host has to do is either declare its backend in the manifest and let
 * [C15tInitializer] run, or call [install] itself from `Application.onCreate`.
 */
object C15tAndroid {
	private const val TAG = "c15t"

	/** Manifest keys the Initializer reads; the app declares these. */
	const val META_PORTAL_URL = "com.c15t.PORTAL_URL"

	const val META_INIT_URL = "com.c15t.INIT_URL"
	const val META_DOMAIN = "com.c15t.DOMAIN"

	@Volatile
	private var foregroundObserver: C15tForegroundObserver? = null

	private val background = Executors.newSingleThreadExecutor { runnable ->
		Thread(runnable, "c15t-io").apply { isDaemon = true }
	}

	/**
	 * Build the platform capabilities, install them, and start the core.
	 *
	 * Idempotent through [C15t.bootstrap], so it is safe to call from both an
	 * initializer and application code.
	 *
	 * @param transport override the backend transport, for a host that proxies
	 * c15t through its own HTTP stack.
	 * @param observeForeground register the process-foreground observer that replays
	 * the offline queue. Turn it off only if the host drives [C15t.flushPending] and
	 * [C15t.refresh] itself.
	 */
	fun install(
		context: Context,
		config: NativeConfig,
		transport: C15tTransport? = null,
		clock: Clock = Clock.SYSTEM,
		observeForeground: Boolean = true,
		logger: (KernelError) -> Unit = { error -> Log.w(TAG, "${error.code}: ${error.message}") },
	) {
		val appContext = context.applicationContext
		val store = C15tStores.create(appContext)
		val http = transport ?: HostedTransport(C15tHttpClient(), config)

		C15t.bootstrap(
			config = config,
			store = store,
			clock = clock,
			transport = http,
			executor = TaskExecutor { task -> background.execute(task) },
			logger = logger,
		)

		if (observeForeground && foregroundObserver == null) {
			onMainThread {
				val observer = C15tForegroundObserver()
				foregroundObserver = observer
				androidx.lifecycle.ProcessLifecycleOwner.get().lifecycle.addObserver(observer)
			}
		}
	}

	/**
	 * Start c15t from manifest metadata, the zero-code path.
	 *
	 * Without `com.c15t.PORTAL_URL` there is no backend to talk to, so this logs and
	 * leaves the core uninstalled: reads still answer deny-all, which is the safe
	 * state for a misconfigured build rather than a crash at startup.
	 */
	fun bootstrap(context: Context) {
		val config = configFrom(context)
		if (config == null) {
			Log.i(TAG, "no $META_PORTAL_URL meta-data declared; c15t stays inactive until C15tAndroid.install")
			return
		}
		install(context, config)
	}

	/** Read the declared configuration, or `null` when nothing usable is declared. */
	fun configFrom(context: Context): NativeConfig? {
		val bundle = try {
			context.packageManager
				.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
				.metaData
		} catch (error: PackageManager.NameNotFoundException) {
			null
		} ?: return null

		val portalUrl = bundle.getString(META_PORTAL_URL)
		if (portalUrl.isNullOrBlank()) {
			return null
		}
		val gpc = bundle.getString(META_GPC)?.toBooleanStrictOrNull() ?: false
		return NativeConfig(
			portalUrl = portalUrl.trim(),
			initUrl = bundle.getString(META_INIT_URL)?.takeIf { it.isNotBlank() },
			domain = bundle.getString(META_DOMAIN)?.takeIf { it.isNotBlank() },
			privacySignals = PrivacySignals(gpc = gpc),
		)
	}

	/** Manifest key that forces GPC on for a staged build. */
	const val META_GPC = "com.c15t.FORCE_GPC"

	private fun onMainThread(block: () -> Unit) {
		if (Looper.myLooper() == Looper.getMainLooper()) {
			block()
		} else {
			Handler(Looper.getMainLooper()).post(block)
		}
	}
}
