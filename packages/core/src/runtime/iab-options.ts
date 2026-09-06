/**
 * Whether an `iab` option describes a CMP that should be mounted.
 *
 * `false` and an absent option both mean "no IAB"; so does an options
 * object whose `enabled` is `false`, which keeps the configuration around
 * but inert. Every path that has to agree on this — the runtime kernel's
 * transport context, the lazy CMP factory, a server render deciding
 * whether an `iab` policy pack is eligible — reads it from here, so a
 * server and the browser it hands off to resolve the same policy.
 *
 * @param iab - The `iab` option as the caller received it.
 * @returns `true` when a CMP is configured and not switched off.
 * @example
 * ```ts
 * isIABConfigured(undefined); // false
 * isIABConfigured(false); // false
 * isIABConfigured({ enabled: false }); // false
 * isIABConfigured({ cmpId: 160 }); // true
 * ```
 */
export const isIABConfigured = function isIABConfigured(
	iab: { enabled?: boolean } | false | null | undefined
): boolean {
	return (
		iab !== false && iab !== null && iab !== undefined && iab.enabled !== false
	);
};
