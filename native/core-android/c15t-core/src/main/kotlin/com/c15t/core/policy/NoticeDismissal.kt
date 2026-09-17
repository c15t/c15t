package com.c15t.core.policy

import kotlinx.serialization.Serializable

/**
 * Local record that the current notice was dismissed.
 *
 * The shared contract keeps the mobile [com.c15t.core.model.ConsentSnapshot]
 * narrow, so this lives in the stored envelope next to the policy projection and
 * only reaches the snapshot through [PolicyEvaluator]'s prompt calculation.
 */
@Serializable
data class NoticeDismissal(
	val dismissedAt: Long,
	val fingerprint: String,
) {
	/**
	 * `true` when the dismissal still covers the notice it was made against.
	 *
	 * [fingerprint] is the notice-prompt fingerprint, never the choice one: the two
	 * surfaces change on different rules, and a dismissal compared against the wrong
	 * one asks a subject to dismiss a banner they already dismissed.
	 */
	fun covers(
		fingerprint: String?,
		now: Long,
		noticeMs: Long,
	): Boolean {
		if (fingerprint != null && this.fingerprint != fingerprint) {
			return false
		}
		return now - dismissedAt <= noticeMs
	}
}
