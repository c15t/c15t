package com.c15t.core

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.KernelError
import com.c15t.core.model.KernelOverrides
import com.c15t.core.model.KernelUser
import com.c15t.core.spi.Clock
import com.c15t.core.spi.TaskExecutor
import com.c15t.core.store.C15tStore
import com.c15t.core.transport.C15tTransport
import java.util.concurrent.atomic.AtomicReference

/**
 * The process-wide entry point, and the mirror of the Swift API in
 * `native/CONTRACT.md`.
 *
 * Every name here is the contract's name, so a binding layer can forward call for
 * call. [bootstrap] is idempotent and safe from an app-launch hook; the read
 * paths work before it runs and simply answer deny-all, which is what keeps an
 * ad SDK that starts earlier than c15t from ever seeing a permissive answer.
 *
 * ```kotlin
 * C15t.bootstrap(config, store, clock, transport, null)
 * if (C15t.isAllowed(ConsentCategory.MEASUREMENT)) {
 *     // safe to initialise the measurement SDK
 * }
 * C15t.save(CommitIntent.All)
 * ```
 */
object C15t {
	private val kernel = AtomicReference<C15tKernel?>()

	/** The active kernel, or `null` before [bootstrap]. */
	val current: C15tKernel?
		get() = kernel.get()

	/**
	 * Install and start the core.
	 *
	 * Repeated calls are ignored while a kernel is installed, which makes this safe
	 * from both an `androidx.startup` initializer and an Application onCreate.
	 *
	 * @param store Persistence the host provides; see [C15tStore].
	 * @param executor Where init and delivery run; `null` uses a daemon thread.
	 */
	fun bootstrap(
		config: NativeConfig,
		store: C15tStore,
		clock: Clock = Clock.SYSTEM,
		transport: C15tTransport = C15tTransport.NONE,
		executor: TaskExecutor? = null,
		logger: (KernelError) -> Unit = {},
	) {
		val created = C15tKernel(
			config = config,
			store = store,
			clock = clock,
			transport = transport,
			executor = executor,
			logger = logger,
		)
		if (kernel.compareAndSet(null, created)) {
			created.bootstrap()
		}
	}

	/** Replace the installed kernel. Intended for tests and host teardown. */
	fun reset() {
		kernel.set(null)
	}

	/** The current snapshot, or a deny-all snapshot before [bootstrap]. */
	fun snapshot(): ConsentSnapshot = kernel.get()?.snapshot() ?: ConsentSnapshot.denyAll()

	/** Whether [category] may run; false for every optional category until ready. */
	fun isAllowed(category: ConsentCategory): Boolean = kernel.get()?.isAllowed(category) ?: !category.optional

	/** Observe one category's permission, starting immediately. */
	fun gate(
		category: ConsentCategory,
		onChange: (Boolean) -> Unit,
	): Subscription = kernel.get()?.gate(category, onChange) ?: Subscription { onChange(false) }

	/** Observe every snapshot change, held weakly. */
	fun onChange(observer: (ConsentSnapshot) -> Unit): Subscription =
		kernel.get()?.onChange(observer) ?: Subscription {}

	/** Observe emitted errors. */
	fun onError(observer: (KernelError) -> Unit): Subscription = kernel.get()?.onError(observer) ?: Subscription {}

	/** Record a decision, or a no-op result when the core was never installed. */
	fun save(intent: CommitIntent): CommitResult {
		val active = kernel.get() ?: return CommitResult(
			ok = false,
			revision = 0,
			confirmed = emptyMap(),
			queued = false,
			delivered = false,
			error = KernelError("not-bootstrapped", "c15t: C15t.bootstrap() has not run"),
		)
		return active.save(intent)
	}

	/** Close the first-layer prompt. */
	fun dismissNotice() {
		kernel.get()?.dismissNotice()
	}

	/** Re-run init. */
	fun refresh() {
		kernel.get()?.refresh()
	}

	/** Attach an external identity. */
	fun identify(user: KernelUser) {
		kernel.get()?.identify(user)
	}

	/** Detach the external identity. */
	fun logout() {
		kernel.get()?.logout()
	}

	/** Apply developer overrides, replacing the whole record when [merge] is false. */
	fun setOverrides(overrides: KernelOverrides, merge: Boolean = true) {
		kernel.get()?.setOverrides(overrides, merge)
	}

	/**
	 * Whether the installed kernel hydrated a stored envelope.
	 *
	 * `false` before [bootstrap] and before any stored state exists, which is what a
	 * binding layer reports as `hasStoredSnapshot` in its handshake.
	 */
	val hasStoredSnapshot: Boolean
		get() = kernel.get()?.hasStoredSnapshot ?: false

	/** Replay the offline queue. */
	fun flushPending(): FlushResult = kernel.get()?.flushPending() ?: FlushResult(delivered = 0, remaining = 0)
}
