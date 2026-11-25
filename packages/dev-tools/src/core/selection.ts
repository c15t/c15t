import { policyDefault } from '@c15t/core';
import type { ConsentSnapshot, ConsentState } from '@c15t/core';

/**
 * Read a displayed selection without copying masked effective permissions:
 * a staged edit, else the recorded choice, else off when a restriction such
 * as GPC denies the category, else the presentation or policy default.
 */
export const readSelection = (
	snapshot: ConsentSnapshot,
	draft: Partial<ConsentState>,
	category: keyof ConsentState,
	defaults?: Partial<ConsentState>
): boolean => {
	if (category === 'necessary') {
		return true;
	}
	const chosen =
		draft[category] ?? snapshot.explicitChoice?.categories[category]?.value;
	if (chosen !== undefined) {
		return chosen;
	}
	if ((snapshot.restrictions[category]?.length ?? 0) > 0) {
		return false;
	}
	return defaults?.[category] ?? policyDefault(snapshot.policyRule, category);
};
