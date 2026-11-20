import { policyDefault } from '@c15t/core';
import type { ConsentSnapshot, ConsentState } from '@c15t/core';

/** Read a displayed selection without copying masked effective permissions. */
export const readSelection = (
	snapshot: ConsentSnapshot,
	draft: Partial<ConsentState>,
	category: keyof ConsentState,
	defaults?: Partial<ConsentState>
): boolean => {
	if (category === 'necessary') {
		return true;
	}
	return (
		draft[category] ??
		snapshot.explicitChoice?.categories[category]?.value ??
		defaults?.[category] ??
		policyDefault(snapshot.policyRule, category)
	);
};
