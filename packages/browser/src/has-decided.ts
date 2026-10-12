import type { ConsentSnapshot } from '@c15t/core';

/**
 * Whether the visitor has answered the choice prompt: a recorded choice, or
 * the acknowledgement a choice prompt with no category to decide records.
 *
 * @param snapshot - The kernel snapshot.
 * @returns `true` once either record exists.
 * @internal
 */
export const hasDecided = (snapshot: ConsentSnapshot): boolean =>
	snapshot.explicitChoice !== null ||
	snapshot.noticeDismissal?.fingerprint ===
		snapshot.evaluationPolicy.choice.fingerprint;
