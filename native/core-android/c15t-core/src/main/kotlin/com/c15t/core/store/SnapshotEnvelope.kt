package com.c15t.core.store

import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.policy.EvaluationPolicy
import com.c15t.core.policy.NoticeDismissal
import kotlinx.serialization.Serializable

/**
 * What gets persisted under `com.c15t.snapshot`.
 *
 * `native/CONTRACT.md` calls the stored object a snapshot envelope, and this is
 * why: the [snapshot] keeps exactly the shape the React Native boundary reads,
 * while the two evaluation inputs the mobile snapshot deliberately leaves out
 * ride alongside it. Without them a restart would forget the policy scope and the
 * notice dismissal, and every launch would re-prompt.
 */
@Serializable
data class SnapshotEnvelope(
	val snapshot: ConsentSnapshot,
	val evaluationPolicy: EvaluationPolicy? = null,
	val noticeDismissal: NoticeDismissal? = null,
)
