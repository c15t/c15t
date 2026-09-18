package com.c15t.core.store

import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.policy.EvaluationPolicy
import com.c15t.core.policy.NoticeDismissal
import com.c15t.core.tc.GlobalVendorList
import kotlinx.serialization.Serializable

/**
 * What gets persisted under `com.c15t.snapshot`.
 *
 * `native/CONTRACT.md` calls the stored object a snapshot envelope, and this is
 * why: the [snapshot] keeps exactly the shape the React Native boundary reads,
 * while the inputs the mobile snapshot deliberately leaves out ride alongside it.
 * Without them a restart would forget the policy scope, the notice dismissal, and
 * the vendor list a disclosure was drawn from, and every launch would re-prompt.
 */
@Serializable
data class SnapshotEnvelope(
	val snapshot: ConsentSnapshot,
	val evaluationPolicy: EvaluationPolicy? = null,
	val noticeDismissal: NoticeDismissal? = null,
	/**
	 * The last vendor list the backend served, kept for the same reason and by the same rule as
	 * [evaluationPolicy], and the one place this build writes its bytes.
	 *
	 * Both are inputs the derived snapshot cannot carry -- one is the rule the receipts were judged
	 * against, the other is the document the purpose and vendor names in a disclosure come from -- and
	 * both have to outlive the `/init` that served them.
	 *
	 * The published snapshot does carry the list, at [com.c15t.core.model.ConsentSnapshot.iab], because
	 * that is the key the React Native bridge reads and the key `core-swift` puts it on: a drawer that
	 * renders partner names has to reach the list the same way on both platforms. This key is the
	 * durable half of the same fact. [com.c15t.core.C15tKernel] nulls the snapshot slot on the way in
	 * and refills it on hydration, so the encrypted blob holds one copy of a document that is by far
	 * the largest thing in it, written on every committed mutation, and a device that upgrades from a
	 * build that kept the list only here loses nothing: this is the key that build wrote, and it is
	 * still the key read first.
	 *
	 * Storage rules are therefore the envelope's and not a new set: the same encrypted slot, the same
	 * `C15tJson.storage` codec, which refuses a document carrying a key this build does not model, and
	 * the same all-or-nothing consequence -- an unreadable envelope is nothing stored, and
	 * [com.c15t.core.store.C15tStore.clearConsentState] drops this key along with the receipts, which
	 * is right, because a wiped device is no longer showing anybody a disclosure.
	 *
	 * It is kept because losing it is not neutral. A device that drew purpose and vendor names off one
	 * list and relaunches without it either renders a disclosure with no names behind it or re-derives
	 * one from a `/init` that served no list, and either way the claim made to the subject changes
	 * without the subject doing anything. See [com.c15t.core.C15tKernel.vendorList].
	 */
	val gvl: GlobalVendorList? = null,
)
