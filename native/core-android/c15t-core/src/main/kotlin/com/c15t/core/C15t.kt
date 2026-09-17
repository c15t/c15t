package com.c15t.core

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentDecision
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
 * when (C15t.decision(ConsentCategory.MEASUREMENT)) {
 *     ConsentDecision.GRANTED -> measurementSdk.init()
 *     ConsentDecision.DENIED -> Unit
 *     // Not answered yet: stay off, and switch on when the answer says so.
 *     ConsentDecision.PENDING -> C15t.gateDecision(ConsentCategory.MEASUREMENT) { decision ->
 *         if (decision == ConsentDecision.GRANTED) measurementSdk.init()
 *     }
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

	/**
	 * Why [category] is or is not allowed, in the three states a host SDK can act on.
	 *
	 * Before [bootstrap] this answers [ConsentDecision.PENDING] for an optional
	 * category rather than [ConsentDecision.DENIED], which is the whole point of the
	 * type: an ad SDK that starts ahead of c15t has not been refused, it has not been
	 * answered, and it has to keep listening. Only a resolved policy plus a subject
	 * refusal produces `DENIED`.
	 *
	 * One read of memory, with no fallback that touches storage. See
	 * [C15tKernel.decision].
	 */
	fun decision(category: ConsentCategory): ConsentDecision = kernel.get()?.decision(category)
		?: if (category.optional) ConsentDecision.PENDING else ConsentDecision.GRANTED

	/**
	 * Whether the core has hydrated and the first init has resolved, so a decision is
	 * an answer rather than a placeholder.
	 *
	 * `false` before [bootstrap].
	 */
	fun isReady(): Boolean = kernel.get()?.isReady() ?: false

	/** Observe one category's permission, starting immediately. */
	fun gate(
		category: ConsentCategory,
		onChange: (Boolean) -> Unit,
	): Subscription = kernel.get()?.gate(category, onChange) ?: Subscription { onChange(false) }

	/**
	 * Observe one category's [ConsentDecision], starting immediately: the contract's
	 * decision-carrying `gate`.
	 *
	 * Fires at registration with the decision as it stands, including one reached long
	 * before the call, then on every published change; the returned handle cancels.
	 * Before [bootstrap] there is nothing to observe, so it gives the pre-bootstrap
	 * answer once, hands back a handle with nothing left to cancel, and goes quiet.
	 *
	 * The immediate call is deliberate and not a copy of the boolean [gate]'s shape:
	 * that one builds its pre-bootstrap answer into the handle, so a host with no
	 * kernel installed hears nothing until it closes. Registration must never be
	 * silence, so this answers on the calling thread before it returns.
	 *
	 * Named rather than an overload of [gate] because both callback types erase to
	 * `Function1`, which Kotlin cannot declare as two methods. See
	 * [C15tKernel.gateDecision].
	 */
	fun gateDecision(
		category: ConsentCategory,
		onDecision: (ConsentDecision) -> Unit,
	): Subscription {
		val active = kernel.get()
		if (active == null) {
			onDecision(decision(category))
			return Subscription {}
		}
		return active.gateDecision(category, onDecision)
	}

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
