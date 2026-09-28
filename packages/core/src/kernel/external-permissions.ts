import type { ConsentState } from '../types';

/** Normalize a complete external CMP decision; omitted categories fail closed. */
export const normalizeExternalPermissions = (
	permissions: Partial<ConsentState>
): Readonly<ConsentState> =>
	Object.freeze({
		experience: permissions.experience === true,
		functionality: permissions.functionality === true,
		marketing: permissions.marketing === true,
		measurement: permissions.measurement === true,
		necessary: true,
	});

/** External decisions are volatile authority, never c15t choice receipts. */
export const evaluateExternalPermissions = (
	permissions: Readonly<ConsentState>
) => ({
	nextDeadline: null,
	permissions,
	promptRequirement: { kind: 'none' as const },
	restrictions: {},
});
