package com.c15t.reactnative

import com.c15t.core.C15t
import com.c15t.core.Subscription
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.KernelError
import com.c15t.core.model.KernelUser
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.Locale

/**
 * The `C15t` TurboModule: the JavaScript surface in
 * `src/specs/NativeC15t.ts`, forwarding call for call to the Kotlin core.
 *
 * Nothing in here decides anything about consent. It reads state the core already
 * holds, forwards the actions the user took, and reports the results as the JSON the
 * JavaScript protocol expects. That is deliberate: there is one consent kernel, and a
 * rule duplicated here would be a second one to keep honest.
 *
 * Threading. [getBootstrap] and [getSnapshot] are synchronous methods and do no disk
 * or network work at all: the core keeps one immutable snapshot in an atomic
 * reference, so a read is a volatile load plus an encode. They never post to the
 * core's worker and wait, which is the deadlock the New Architecture rules warn about
 * for a synchronous module method. Everything that could block returns a promise, and
 * the core's own calls return as soon as the local commit is durable, with delivery
 * left to the core's dispatcher, so the promises resolve on the calling thread
 * without an extra hop that could queue behind the very work being awaited.
 */
class C15tReactNativeModule(appContext: ReactApplicationContext) : NativeC15tSpec(appContext) {
	private val context: ReactApplicationContext = appContext
	private val pump = C15tChangePump(sink = this::publish)

	// Held as fields on purpose: the core keeps snapshot observers weakly, so the
	// module has to own the lambdas or the callbacks would silently stop.
	private val snapshotObserver: (ConsentSnapshot) -> Unit = pump::onSnapshot

	private val errorObserver: (KernelError) -> Unit = pump::onError

	private var snapshotSubscription: Subscription? = null

	private var errorSubscription: Subscription? = null

	@Volatile
	private var listenerCount = 0

	init {
		subscribeToCore()
	}

	/** Handshake payload: the cached snapshot, never a network wait. */
	override fun getBootstrap(): String {
		ensureCore()
		return C15tPayload.bootstrap(
			snapshot = C15t.snapshot(),
			hasStoredSnapshot = C15t.hasStoredSnapshot,
		)
	}

	/** The current snapshot, encoded for the wire. */
	override fun getSnapshot(): String {
		ensureCore()
		return C15tPayload.snapshot(C15t.snapshot(), fallbackLanguage = deviceLanguage())
	}

	override fun commit(
		intent: String,
		promise: Promise,
	) {
		val parsed = C15tPayload.parseCommitIntent(intent)
		if (parsed == null) {
			promise.resolve(C15tPayload.invalidIntent(intent))
			return
		}
		if (!ensureCore()) {
			promise.resolve(C15tPayload.notBootstrapped())
			return
		}
		try {
			val result = C15t.save(parsed)
			promise.resolve(C15tPayload.commitResult(result, C15t.snapshot()))
		} catch (error: Exception) {
			promise.reject(REJECT_COMMIT, error.message, error)
		}
	}

	override fun setOverrides(
		overrides: String,
		promise: Promise,
	) {
		if (!ensureCore()) {
			promise.reject(REJECT_NOT_BOOTSTRAPPED, C15tPayload.MESSAGE_NOT_BOOTSTRAPPED)
			return
		}
		// Replaced rather than merged, because the protocol distinguishes an explicit
		// null from an omitted field and the kernel's own merge cannot. A refusal
		// leaves the live overrides exactly as they were.
		when (val read = C15tPayload.parseOverrides(overrides, C15t.snapshot().overrides)) {
			is OverridesRead.Refused -> promise.reject(read.code, read.message)
			is OverridesRead.Applied -> try {
				C15t.setOverrides(read.overrides, merge = false)
				promise.resolve(null)
			} catch (error: Exception) {
				promise.reject(REJECT_OVERRIDES, error.message, error)
			}
		}
	}

	override fun dismissNotice() {
		if (ensureCore()) {
			C15t.dismissNotice()
		}
	}

	override fun refresh(promise: Promise) {
		if (!ensureCore()) {
			promise.reject(REJECT_NOT_BOOTSTRAPPED, C15tPayload.MESSAGE_NOT_BOOTSTRAPPED)
			return
		}
		try {
			C15t.refresh()
			// The contract's refresh covers the queue too, and the core's refresh only
			// re-runs init.
			C15t.flushPending()
			promise.resolve(null)
		} catch (error: Exception) {
			promise.reject(REJECT_REFRESH, error.message, error)
		}
	}

	override fun identify(
		externalId: String,
		promise: Promise,
	) {
		if (!ensureCore()) {
			promise.reject(REJECT_NOT_BOOTSTRAPPED, C15tPayload.MESSAGE_NOT_BOOTSTRAPPED)
			return
		}
		try {
			C15t.identify(KernelUser(externalId = externalId))
			promise.resolve(null)
		} catch (error: Exception) {
			promise.reject(REJECT_IDENTIFY, error.message, error)
		}
	}

	override fun logout(promise: Promise) {
		if (!ensureCore()) {
			// Sign-out is not a no-op the app can be told about after the fact: with no
			// core there is no subject to detach, and resolving would report a logout
			// that did not happen.
			promise.reject(REJECT_NOT_BOOTSTRAPPED, C15tPayload.MESSAGE_NOT_BOOTSTRAPPED)
			return
		}
		try {
			C15t.logout()
			promise.resolve(null)
		} catch (error: Exception) {
			promise.reject(REJECT_LOGOUT, error.message, error)
		}
	}

	override fun addListener(eventName: String) {
		listenerCount += 1
	}

	override fun removeListeners(count: Double) {
		listenerCount = (listenerCount - count.toInt()).coerceAtLeast(0)
	}

	/** Drop the core subscriptions when React tears this module down. */
	override fun invalidate() {
		snapshotSubscription?.close()
		errorSubscription?.close()
		snapshotSubscription = null
		errorSubscription = null
		super.invalidate()
	}

	/**
	 * Start the core when a launch hook did not.
	 *
	 * @return `true` when a core is installed and reads can mean something.
	 */
	private fun ensureCore(): Boolean {
		val started = C15tReactNativeBootstrap.ensure(context)
		if (started) {
			subscribeToCore()
		}
		return started
	}

	/** Subscribe once the core exists, since a subscription before it would be inert. */
	private fun subscribeToCore() {
		if (C15t.current == null || snapshotSubscription != null) {
			return
		}
		synchronized(this) {
			if (snapshotSubscription != null) {
				return
			}
			snapshotSubscription = C15t.onChange(snapshotObserver)
			errorSubscription = C15t.onError(errorObserver)
		}
		// Anything the core published between launch and this subscription is not lost:
		// JavaScript pulls the snapshot on mount.
		pump.onSnapshot(C15t.snapshot())
	}

	private fun publish(
		event: String,
		payload: String,
	) {
		if (listenerCount == 0) {
			// No subscriber, and a snapshot event is only ever a hint to go and read.
			return
		}
		try {
			context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
				?.emit(event, payload)
		} catch (error: Exception) {
			// React is going away. The next mount pulls the snapshot anyway.
		}
	}

	private fun deviceLanguage(): String = Locale.getDefault().language
		.takeIf { it.isNotBlank() }
		?: C15tPayload.DEFAULT_LANGUAGE

	private companion object {
		const val REJECT_COMMIT = "C15T_COMMIT_FAILED"

		const val REJECT_OVERRIDES = C15tPayload.REJECT_OVERRIDES
		const val REJECT_REFRESH = "C15T_REFRESH_FAILED"
		const val REJECT_IDENTIFY = "C15T_IDENTIFY_FAILED"
		const val REJECT_LOGOUT = "C15T_LOGOUT_FAILED"
		const val REJECT_NOT_BOOTSTRAPPED = "C15T_NOT_BOOTSTRAPPED"
	}
}
