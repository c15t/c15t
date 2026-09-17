package com.c15t.core

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.ConsentSubject
import com.c15t.core.model.KernelError
import com.c15t.core.model.KernelOverrides
import com.c15t.core.model.KernelUser
import com.c15t.core.model.ConfirmedCoverage
import com.c15t.core.model.DecisionInputs
import com.c15t.core.model.ExplicitChoice
import com.c15t.core.model.QueuedSave
import com.c15t.core.model.SavePayload
import com.c15t.core.policy.EvaluationPolicy
import com.c15t.core.policy.NoticeDismissal
import com.c15t.core.policy.PolicyEvaluator
import com.c15t.core.spi.Clock
import com.c15t.core.spi.TaskExecutor
import com.c15t.core.store.C15tStore
import com.c15t.core.store.PendingSaveQueue
import com.c15t.core.store.SnapshotEnvelope
import com.c15t.core.transport.C15tTransport
import com.c15t.core.transport.InitContext
import com.c15t.core.transport.InitMapper
import com.c15t.core.transport.SaveOutcome
import com.c15t.core.transport.TransportOutcome
import java.lang.ref.WeakReference
import java.util.UUID
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

/**
 * The consent engine.
 *
 * One immutable [ConsentSnapshot] is the whole state, held in an
 * [AtomicReference] and replaced on every mutation. That shape is the contract's
 * central performance rule: [snapshot] and [isAllowed] are a single volatile read
 * with no lock, no disk, and no allocation, which is what lets an ad SDK call them
 * from the main thread while a save is in flight.
 *
 * Mutation paths hold [mutationLock] only while they compute the next snapshot in
 * memory. Persistence and network always happen after the lock is released.
 *
 * @param store Typed persistence over the host's storage.
 * @param transport Backend commands; [C15tTransport.NONE] keeps the core local-only.
 * @param executor Where init and write delivery run. [TaskExecutor.DIRECT] runs
 * them inline, which is what the tests use to make ordering observable.
 * @param logger Receives every [KernelError] the core emits.
 */
class C15tKernel(
	private val config: NativeConfig,
	private val store: C15tStore,
	private val clock: Clock = Clock.SYSTEM,
	private val transport: C15tTransport = C15tTransport.NONE,
	executor: TaskExecutor? = null,
	private val idGenerator: () -> String = { UUID.randomUUID().toString() },
	private val logger: (KernelError) -> Unit = {},
) {
	private val background: TaskExecutor = executor
		?: TaskExecutor { task -> backgroundPool.execute(task) }

	private val state = AtomicReference(ConsentSnapshot.denyAll())
	private val mutationLock = Any()
	private val bootstrapped = AtomicBoolean(false)

	/** Validated policy from the last init, guarded by [mutationLock]. */
	private var evaluationPolicy: EvaluationPolicy? = null

	/** Local notice dismissal, guarded by [mutationLock]. */
	private var noticeDismissal: NoticeDismissal? = null

	private val snapshotObservers = CopyOnWriteArrayList<WeakReference<(ConsentSnapshot) -> Unit>>()
	private val strongObservers = CopyOnWriteArrayList<(ConsentSnapshot) -> Unit>()
	private val errorObservers = CopyOnWriteArrayList<WeakReference<(KernelError) -> Unit>>()

	private val queue = PendingSaveQueue(store, config.maxPendingSaves, idGenerator)

	/**
	 * Load stored state, adopt the subject id, then kick a flush and an init.
	 *
	 * Idempotent and safe from any launch hook, including one that runs before the
	 * first Activity exists. Everything after the synchronous hydration runs on
	 * [background], so the caller's thread never waits on the network.
	 */
	fun bootstrap() {
		if (!bootstrapped.compareAndSet(false, true)) {
			return
		}
		val now = clock.nowMillis()
		val subject = resolveSubject()
		val envelope = store.readEnvelope()

		if (envelope == null) {
			// First launch, or a payload this build cannot read: deny-all until an
			// init resolves, with ready false so a host can tell the two apart.
			publishPure(
				ConsentSnapshot.denyAll(subject, now).copy(
					consentCategories = config.consentCategories?.map { it.wireName },
					overrides = config.overrides,
					privacySignals = config.privacySignals,
				)
			)
			synchronized(mutationLock) {
				evaluationPolicy = null
				noticeDismissal = null
			}
			persist()
		} else {
			val restored = envelope.snapshot
			synchronized(mutationLock) {
				evaluationPolicy = envelope.evaluationPolicy
				noticeDismissal = envelope.noticeDismissal
			}
			val hydrated = restored.copy(
				ready = true,
				subject = restored.subject?.copy(id = subject.id) ?: subject,
				consentCategories = config.consentCategories?.map { it.wireName } ?: restored.consentCategories,
				overrides = merge(restored.overrides, config.overrides),
				privacySignals = config.privacySignals,
			)
			publishPure(PolicyEvaluator.evaluate(hydrated, envelope.evaluationPolicy, envelope.noticeDismissal, now))
			persist()
		}

		// Contract: retry on the next launch and on foreground, so a write that
		// never left the device is on its way before the first prompt is drawn.
		// Both go through the executor: with TaskExecutor.DIRECT they stay
		// synchronous, which is what the tests rely on.
		background.execute { flushPending() }
		background.execute { runInit() }
	}

	/** `true` once [bootstrap] has run. */
	val isBootstrapped: Boolean
		get() = bootstrapped.get()

	/**
	 * The current snapshot.
	 *
	 * Synchronous, allocation-free, and never touches disk or the network. Returns
	 * the same instance until something changes, so a caller can compare by
	 * identity to decide whether to do work.
	 */
	fun snapshot(): ConsentSnapshot = state.get()

	/**
	 * Whether [category] may run right now.
	 *
	 * `necessary` is always true. Every optional category is false while the state
	 * is not ready or the policy is still pending.
	 */
	fun isAllowed(category: ConsentCategory): Boolean = state.get().isAllowed(category)

	/**
	 * Call [onChange] now with the current permission for [category], then again
	 * whenever that permission changes.
	 *
	 * The observer is held strongly for as long as the returned handle is open, so
	 * a caller that keeps only the handle still gets callbacks.
	 */
	fun gate(
		category: ConsentCategory,
		onChange: (Boolean) -> Unit,
	): Subscription {
		val observer: (ConsentSnapshot) -> Unit = { onChange(it.isAllowed(category)) }
		strongObservers += observer
		onChange(state.get().isAllowed(category))
		return Subscription { strongObservers.remove(observer) }
	}

	/** Observe every snapshot change. The lambda is held weakly, per the contract. */
	fun onChange(observer: (ConsentSnapshot) -> Unit): Subscription {
		val reference = WeakReference(observer)
		snapshotObservers += reference
		return Subscription { snapshotObservers.remove(reference) }
	}

	/** Observe errors the core emits, including an unsupported policy contract. */
	fun onError(observer: (KernelError) -> Unit): Subscription {
		val reference = WeakReference(observer)
		errorObservers += reference
		return Subscription { errorObservers.remove(reference) }
	}

	/**
	 * Record a consent decision.
	 *
	 * The order is the contract's: capture the action time once, update permissions
	 * in memory, persist the payload, and only then put it on the wire. A host that
	 * loses connectivity here still gates correctly, because the local commit never
	 * depends on the response.
	 */
	fun save(intent: CommitIntent): CommitResult {
		// Captured once, before any disk or network call, and reused by every
		// replay so the backend derives the same consent id.
		val actionAt = clock.nowMillis()
		var published: ConsentSnapshot
		var policy: EvaluationPolicy?

		synchronized(mutationLock) {
			val current = state.get()
			policy = evaluationPolicy
			val intentConsents = intent.consentsByCategory
			val prior = stillValid(current.explicitChoice, policy, actionAt)
			val consents = LinkedHashMap(prior)
			for ((category, value) in intentConsents) {
				consents[category.wireName] = value
			}
			val confirmed = LinkedHashMap<String, Boolean>(intentConsents.size)
			for ((category, value) in intentConsents) {
				confirmed[category.wireName] = value
			}

			val choice = ExplicitChoice(
				consents = consents,
				action = intent.action,
				actionAt = actionAt,
				fingerprint = policy?.choiceFingerprint,
			)
			published = PolicyEvaluator.evaluate(
				snapshot = current.copy(
					explicitChoice = choice,
					revision = current.revision + 1,
					error = null,
				),
				policy = policy,
				noticeDismissal = noticeDismissal,
				now = actionAt,
			)
			state.set(published)
		}

		val payload = buildSavePayload(published, policy, intent, actionAt)
		val entry = queue.enqueue(payload, actionAt)
		persist()

		var delivered = false
		background.execute { delivered = deliver(entry) }
		val result = CommitResult(
			ok = true,
			revision = published.revision,
			confirmed = payload.confirmed.categories,
			queued = true,
			delivered = delivered,
		)
		notifySnapshot(published)
		return result
	}

	/** Close the first-layer prompt without recording a choice. */
	fun dismissNotice() {
		val now = clock.nowMillis()
		var published: ConsentSnapshot
		synchronized(mutationLock) {
			val current = state.get()
			noticeDismissal = NoticeDismissal(
				dismissedAt = now,
				fingerprint = evaluationPolicy?.choiceFingerprint ?: "",
			)
			published = PolicyEvaluator.evaluate(
				snapshot = current.copy(revision = current.revision + 1),
				policy = evaluationPolicy,
				noticeDismissal = noticeDismissal,
				now = now,
			)
			state.set(published)
		}
		persist()
		notifySnapshot(published)
	}

	/** Re-run init: policy, geo, translations, and any server-side subject id. */
	fun refresh() {
		background.execute { runInit() }
	}

	/** Attach an external identity to the subject, then refresh. */
	fun identify(user: KernelUser) {
		var published: ConsentSnapshot
		var subject: ConsentSubject
		synchronized(mutationLock) {
			val current = state.get()
			subject = (current.subject ?: ConsentSubject(idGenerator())).let {
				it.copy(externalId = user.externalId)
			}
			published = current.copy(
				subject = subject,
				revision = current.revision + 1,
			)
			state.set(published)
		}
		persist()
		notifySnapshot(published)
		background.execute {
			transport.identify(subject, user)
			runInit()
		}
	}

	/**
	 * Detach the external identity.
	 *
	 * The c15t subject id stays: it is the installation's identity, not the user's,
	 * and the records already attached to it stay attributable.
	 */
	fun logout() {
		var published: ConsentSnapshot
		var subject: ConsentSubject
		synchronized(mutationLock) {
			val current = state.get()
			subject = (current.subject ?: ConsentSubject(idGenerator())).copy(externalId = null)
			published = current.copy(subject = subject, revision = current.revision + 1)
			state.set(published)
		}
		persist()
		notifySnapshot(published)
		background.execute { transport.logout(subject) }
	}

	/**
	 * Apply developer overrides and re-evaluate immediately.
	 *
	 * Only the members present in [overrides] change, so a caller can pin a country
	 * without clearing its language.
	 */
	fun setOverrides(overrides: KernelOverrides) {
		var published: ConsentSnapshot
		synchronized(mutationLock) {
			val current = state.get()
			published = PolicyEvaluator.evaluate(
				snapshot = current.copy(
					overrides = merge(current.overrides, overrides),
					revision = current.revision + 1,
				),
				policy = evaluationPolicy,
				noticeDismissal = noticeDismissal,
				now = clock.nowMillis(),
			)
			state.set(published)
		}
		persist()
		notifySnapshot(published)
		refresh()
	}

	/**
	 * Replay the offline queue, oldest first, each payload unchanged.
	 *
	 * Stops at the first entry the backend could not be reached for, since trying
	 * the rest on a dead connection wastes battery.
	 */
	fun flushPending(): FlushResult {
		val pending = queue.pending()
		if (pending.isEmpty()) {
			return FlushResult(delivered = 0, remaining = 0)
		}
		var delivered = 0
		var error: KernelError? = null
		for (entry in pending) {
			when (val outcome = transport.save(entry)) {
				is SaveOutcome.Delivered -> {
					queue.complete(entry.id)
					delivered += 1
				}

				is SaveOutcome.Rejected -> {
					error = KernelError(
						code = "save-rejected",
						message = "c15t: /subjects responded ${outcome.status}; the payload stays queued",
					)
				}

				is SaveOutcome.Unavailable -> {
					return FlushResult(
						delivered = delivered,
						remaining = pending.size - delivered,
						error = error ?: KernelError("save-unavailable", outcome.message),
					)
				}
			}
		}
		return FlushResult(
			delivered = delivered,
			remaining = queue.pending().size,
			error = error,
		)
	}

	/** Drop stored consent and the queue, keeping the subject id. */
	fun reset() {
		queue.clear()
		store.clearConsentState()
		publishPure(ConsentSnapshot.denyAll(resolveSubject(), clock.nowMillis()))
	}

	// -- internals ------------------------------------------------------------

	private fun resolveSubject(): ConsentSubject {
		store.readSubject()?.let { return it }
		// A UUID v4 owned by c15t. Never derived from a hardware identifier.
		val created = ConsentSubject(id = idGenerator())
		store.writeSubject(created)
		return created
	}

	private fun runInit() {
		val current = state.get()
		val outcome = try {
			transport.init(
				InitContext(
					overrides = current.overrides,
					subject = current.subject,
					gpc = current.privacySignals.gpc || current.overrides.test == true,
				)
			)
		} catch (error: Exception) {
			TransportOutcome.NetworkFailure("c15t transport: ${error.message ?: error.javaClass.simpleName}")
		}
		val mapped = InitMapper.map(outcome)
		var published: ConsentSnapshot
		var emitted: KernelError?

		synchronized(mutationLock) {
			val base = state.get()
			val subject = mapped.subjectId?.let { serverId ->
				base.subject?.copy(id = serverId) ?: ConsentSubject(id = serverId)
			} ?: base.subject
			evaluationPolicy = mapped.evaluationPolicy ?: evaluationPolicy
			emitted = mapped.error

			// A failed init while a definitive policy is already in force is a
			// connectivity event, not a policy change. Re-latching the pending flag
			// there would drop a device that merely lost signal back to deny-all,
			// which is the opposite of the contract's cached-snapshot rule. The flag
			// therefore only ever clears, and the resolution the current permissions
			// were computed from stays in place while error records the attempt.
			val superseded = mapped.policyPending && !base.policyPending
			published = PolicyEvaluator.evaluate(
				snapshot = base.copy(
					resolution = if (superseded) base.resolution else mapped.resolution,
					policyPending = mapped.policyPending && base.policyPending,
					// A failed init leaves the local state unready: nothing resolved, so
					// gates keep denying. Only a definitive answer makes it ready.
					ready = if (mapped.policyPending) base.ready else true,
					subject = subject,
					location = mapped.location ?: base.location,
					overrides = merge(base.overrides, mapped.resolvedOverrides),
					privacySignals = mapped.resolvedPrivacySignals ?: base.privacySignals,
					policySnapshotToken = mapped.policySnapshotToken ?: base.policySnapshotToken,
					translations = mapped.translations ?: base.translations,
					error = mapped.error,
					revision = base.revision + 1,
					consentCategories = base.consentCategories ?: config.consentCategories?.map { it.wireName },
				),
				policy = evaluationPolicy,
				noticeDismissal = noticeDismissal,
				now = clock.nowMillis(),
			)
			state.set(published)
		}

		// A resolved subject belongs in protected storage as soon as it is known.
		published.subject?.let { store.writeSubject(it) }
		persist()
		emitted?.let(::emitError)
		notifySnapshot(published)
	}

	private fun deliver(entry: QueuedSave): Boolean = when (val outcome = transport.save(entry)) {
		is SaveOutcome.Delivered -> {
			queue.complete(entry.id)
			true
		}

		is SaveOutcome.Rejected -> {
			emitError(
				KernelError(
					code = "save-rejected",
					message = "c15t: /subjects responded ${outcome.status}; the payload stays queued",
				)
			)
			false
		}

		is SaveOutcome.Unavailable -> false
	}

	private fun buildSavePayload(
		published: ConsentSnapshot,
		policy: EvaluationPolicy?,
		intent: CommitIntent,
		actionAt: Long,
	): SavePayload {
		val confirmed = LinkedHashMap<String, Boolean>(intent.consentsByCategory.size)
		for ((category, value) in intent.consentsByCategory) {
			confirmed[category.wireName] = value
		}
		val subject = published.subject ?: resolveSubject()
		val gpc = published.overrides.test ?: published.privacySignals.gpc
		return SavePayload(
			subjectId = subject.id,
			subject = subject,
			choice = published.explicitChoice,
			confirmed = ConfirmedCoverage(categories = confirmed, actionAt = actionAt),
			consents = published.effectivePermissions,
			overrides = published.overrides,
			// The mobile snapshot carries identity on the subject, so the user
			// object is reconstructed from it rather than held separately.
			user = published.subject?.externalId?.let { KernelUser(externalId = it) },
			model = published.model,
			uiSource = published.activeUI,
			consentAction = intent.action,
			policySnapshotToken = published.policySnapshotToken,
			decisionInputs = DecisionInputs(
				policyId = published.resolution.policyId,
				fingerprint = published.resolution.fingerprint ?: policy?.policyFingerprint,
				country = published.overrides.country ?: published.location?.country,
				region = published.overrides.region ?: published.location?.region,
				language = published.overrides.language ?: published.location?.language ?: "",
				gpc = gpc,
			),
			givenAt = actionAt,
		)
	}

	/** The receipts from before this action that the current policy still honours. */
	private fun stillValid(
		choice: ExplicitChoice?,
		policy: EvaluationPolicy?,
		now: Long,
	): Map<String, Boolean> {
		if (choice == null || policy == null) {
			return emptyMap()
		}
		if (!choice.matchesFingerprint(policy.choiceFingerprint)) {
			return emptyMap()
		}
		return if (now - choice.actionAt <= policy.choiceMs) choice.consents else emptyMap()
	}

	private fun publishPure(snapshot: ConsentSnapshot) {
		state.set(snapshot)
	}

	/** Persist the published state. Always called with [mutationLock] released. */
	private fun persist() {
		val snapshot = state.get()
		val envelope = synchronized(mutationLock) {
			SnapshotEnvelope(snapshot = snapshot, evaluationPolicy = evaluationPolicy, noticeDismissal = noticeDismissal)
		}
		store.writeEnvelope(envelope)
		store.flush()
	}

	private fun merge(
		base: KernelOverrides,
		patch: KernelOverrides?,
	): KernelOverrides {
		if (patch == null) {
			return base
		}
		return KernelOverrides(
			country = patch.country ?: base.country,
			region = patch.region ?: base.region,
			language = patch.language ?: base.language,
			test = patch.test ?: base.test,
		)
	}

	private fun notifySnapshot(snapshot: ConsentSnapshot) {
		for (reference in snapshotObservers) {
			reference.get()?.invoke(snapshot) ?: snapshotObservers.remove(reference)
		}
		for (observer in strongObservers) {
			observer.invoke(snapshot)
		}
	}

	private fun emitError(error: KernelError) {
		logger(error)
		for (reference in errorObservers) {
			reference.get()?.invoke(error) ?: errorObservers.remove(reference)
		}
	}

	private companion object {
		val backgroundPool = Executors.newSingleThreadExecutor { runnable ->
			Thread(runnable, "c15t-core").apply { isDaemon = true }
		}
	}
}
