package com.c15t.android

import android.content.Context
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.c15t.core.C15t
import com.c15t.core.NativeConfig
import com.c15t.core.model.ConsentCategory
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

	/**
	 * Comma-separated category ids the app offers, e.g.
	 * `necessary, functionality, measurement, marketing`. This is the Android
	 * spelling of the `consentCategories` a web host passes to its provider, and
	 * iOS reads the same declaration from the `com.c15t.categories` plist array.
	 */
	const val META_CATEGORIES = "com.c15t.CATEGORIES"

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

		// One executor for both the core and the observer registered below, so the launch
		// replay and the foreground replay cannot deliver the same queued entry twice.
		val executor = TaskExecutor { task -> background.execute(task) }

		C15t.bootstrap(
			config = config,
			store = store,
			clock = clock,
			transport = http,
			executor = executor,
			logger = logger,
		)

		if (observeForeground && foregroundObserver == null) {
			onMainThread {
				val observer = C15tForegroundObserver(executor)
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
			consentCategories = declaredCategories(C15tManifestValue.raw(bundle, META_CATEGORIES)),
			vendors = declaredVendors(C15tManifestValue.raw(bundle, META_VENDORS)),
			detectedGpc = C15tManifestValue.boolean(C15tManifestValue.raw(bundle, META_GPC)),
		)
	}

	/**
	 * Parse a declared category scope from manifest text.
	 *
	 * The value is a comma-separated list of category ids. Spaces around a name
	 * are decoration; a name neither core knows is dropped rather than trusted,
	 * the same call the iOS plist reader makes about an unknown raw value, so a
	 * typo narrows the rows instead of installing a category that cannot exist.
	 * `necessary` in the list is harmless: the kernel lists it whatever the
	 * declaration says, and the declaration only ever narrows the optional set.
	 *
	 * @param raw the raw bundle entry, typically `bundle.get(key)`.
	 * @return the declared categories in declaration order, or `null` when
	 *   nothing usable is declared, which tells the core to offer the full
	 *   policy scope.
	 */
	fun declaredCategories(raw: Any?): List<ConsentCategory>? =
		C15tManifestValue.string(raw)
			?.split(',')
			?.mapNotNull { ConsentCategory.fromWireName(it.trim()) }
			?.takeIf { it.isNotEmpty() }

	/**
	 * Parse a declared vendor scope from manifest text.
	 *
	 * The value is a comma-separated list of IAB vendor ids. Spaces around an id are decoration, and
	 * an entry that is not a positive whole number is dropped rather than trusted -- the same call
	 * [declaredCategories] makes about a name neither core knows, so a typo in an id cannot install a
	 * disclosure the framework never assigned. Duplicates are dropped here rather than carried: the
	 * request half sorts and dedupes anyway, and a device that stored the same id twice would report a
	 * scope longer than the publisher's partner list.
	 *
	 * An id the served list does not carry stays in the declaration and costs nothing, because pruning
	 * a served document never adds an entry to satisfy a scope. That is the point of reading ids here
	 * instead of resolving them: nothing this key declares has to be verifiable at launch.
	 *
	 * @param raw the raw bundle entry, typically `bundle.get(key)`.
	 * @return the declared ids in declaration order and without repeats, or `null` when nothing usable
	 *   is declared, which tells the core to keep every vendor it is served.
	 */
	fun declaredVendors(raw: Any?): List<Int>? =
		C15tManifestValue.string(raw)
			?.split(',')
			?.mapNotNull { entry -> entry.trim().toIntOrNull()?.takeIf { it > 0 } }
			?.distinct()
			?.takeIf { it.isNotEmpty() }

	/** Manifest key that forces GPC on for a staged build. */
	const val META_GPC = "com.c15t.FORCE_GPC"

	/**
	 * Comma-separated IAB vendor ids the app declares, e.g. `42, 755, 8`. This is the Android
	 * spelling of the `iab.vendors` array a web host passes to its provider, and iOS reads the same
	 * declaration from the `com.c15t.vendors` plist string.
	 *
	 * The device half of the declaration -- prune the list the core holds -- is what carries the
	 * disclosure promise, and it runs whatever this key says. The request half travels to the backend
	 * as `x-c15t-vendors`, which is an optimisation about bytes: an unusable entry here costs a
	 * slightly wider request, not a wider disclosure, and a declaration too long to fit on the request
	 * line is sent as no header at all.
	 *
	 * Absent and empty both read as "declare nothing", which keeps every served vendor. A host that
	 * means no vendors has to say so with a scope that names none, not by leaving this key out.
	 */
	const val META_VENDORS = "com.c15t.VENDORS"

	private fun onMainThread(block: () -> Unit) {
		if (Looper.myLooper() == Looper.getMainLooper()) {
			block()
		} else {
			Handler(Looper.getMainLooper()).post(block)
		}
	}
}
