package com.c15t.core.model

/**
 * Why one category is or is not allowed, in the three states a host SDK has to tell
 * apart.
 *
 * This is the answer `native/CONTRACT.md` makes the native gate report instead of a
 * boolean. A boolean answers `false` both for a subject who
 * refused and for a device whose policy has not resolved, and those need opposite
 * handling: a refused category stays off, an unresolved one stays off *and keeps
 * listening*. Collapsing them either initializes an SDK on an unknown, which is the
 * violation this package exists to prevent, or switches off forever a category that
 * was about to be granted.
 *
 * [PENDING] is not a promise that an answer is coming. A first launch with no network
 * stays [PENDING] for the life of the process, which is the safe answer. A host that
 * cannot wait that long bounds the wait itself; the core grows no timeout, because
 * whatever number it picked would become a legally loadable answer the policy never
 * gave.
 */
enum class ConsentDecision {
	/** The category may run: `necessary`, or a resolved policy plus a grant. */
	GRANTED,

	/** The category must not run, and that answer is final until the subject acts. */
	DENIED,

	/** Nothing has decided yet, so `false` here is not a refusal. Keep listening. */
	PENDING,
	;
}
