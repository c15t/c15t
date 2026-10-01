package com.c15t.core.model

import kotlinx.serialization.Serializable

/**
 * The unit of a consent write, built once per explicit action.
 *
 * Mirrors `SavePayload` in `packages/core/src/types.ts`. It is persisted before
 * the request goes out and replayed unchanged on every retry, so a later init
 * that changes the policy never rewrites a queued payload: the receipts, the
 * captured action time, and the decision inputs all stay as the subject left
 * them.
 */
@Serializable
data class SavePayload(
	val subjectId: String,
	val subject: ConsentSubject,
	/** Receipt snapshot for this action. */
	val choice: ExplicitChoice?,
	/** Exactly the categories this action confirmed. */
	val confirmed: ConfirmedCoverage,
	/** Effective permissions after the action. */
	val consents: ConsentState,
	val overrides: KernelOverrides,
	val user: KernelUser?,
	val model: ConsentModel,
	val uiSource: ActiveUI?,
	val consentAction: ConsentAction,
	val policySnapshotToken: String?,
	/** Policy inputs captured with the action; the backend recomputes them. */
	val decisionInputs: DecisionInputs? = null,
	/** Equals `confirmed.actionAt`, for backends that read one time. */
	val givenAt: Long,
)

/**
 * One entry in the offline write queue.
 *
 * The wrapper exists so a delivered entry can be removed by [id] without
 * comparing payloads field by field, and so the queued-at time is available for
 * logging without touching the wire payload.
 */
@Serializable
data class QueuedSave(
	val id: String,
	val queuedAt: Long,
	val payload: SavePayload,
	/**
	 * Sends of these exact bytes that the backend did not accept.
	 *
	 * Local bookkeeping only: it never reaches the wire, because the queue stores the
	 * request body inside [payload] and the body is what stays frozen. An entry written by
	 * an older build reads as zero, which is the honest reading -- nothing has been tried
	 * under this build.
	 */
	val attempts: Int = 0,
)
