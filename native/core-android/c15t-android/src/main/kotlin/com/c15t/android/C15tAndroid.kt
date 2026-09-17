package com.c15t.android

import android.content.Context
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.c15t.core.C15t
import com.c15t.core.NativeConfig
import com.c15t.core.model.KernelError
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

	@Volatile
	private var reachability: C15tReachability? = null

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
	 * @param observeReachability also replay the queue when the process gains a network.
	 * This one needs `android.permission.ACCESS_NETWORK_STATE`, which belongs to the
	 * host: without it the registration is refused and c15t carries on with the launch
	 * and foreground replays, so declaring it buys a faster retry rather than correctness.
	 */
	fun install(
		context: Context,
		config: NativeConfig,
		transport: C15tTransport? = null,
		clock: Clock = Clock.SYSTEM,
		observeForeground: Boolean = true,
		observeReachability: Boolean = true,
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

		if (observeReachability && reachability == null) {
			onMainThread {
				if (reachability == null) {
					reachability = C15tReachability.register(appContext) { C15t.flushPending() }
				}
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

		// Every value goes through `C15tManifestValue`, which reads whichever type the
		// manifest parser chose. A hand-edited manifest and an Expo-generated one do not
		// arrive as the same Java type, and a reader that names one of them honours only
		// the app that happened to spell it that way.
		val portalUrl = C15tManifestValue.string(C15tManifestValue.raw(bundle, META_PORTAL_URL))
			?: return null
		// Absent stays absent. `false` is an answer and a missing key is not, and the
		// core treats them differently when it derives the signal.
		return NativeConfig(
			portalUrl = portalUrl,
			initUrl = C15tManifestValue.string(C15tManifestValue.raw(bundle, META_INIT_URL)),
			domain = C15tManifestValue.string(C15tManifestValue.raw(bundle, META_DOMAIN)),
			detectedGpc = C15tManifestValue.boolean(C15tManifestValue.raw(bundle, META_GPC)),
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
