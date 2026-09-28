/**
 * Handling for the deprecated `isServiceSpecific` option.
 *
 * @packageDocumentation
 */

let hasWarned = false;

/**
 * Warns once when a caller passes `isServiceSpecific: false`.
 *
 * TCF requires IsServiceSpecific=1 in every TC string, so c15t ignores the
 * option and always encodes `true`.
 *
 * @param isServiceSpecific - The value the caller passed, if any
 *
 * @internal
 */
export function warnIfServiceSpecificDisabled(
	isServiceSpecific: boolean | undefined
): void {
	if (isServiceSpecific !== false || hasWarned) {
		return;
	}

	hasWarned = true;
	console.warn(
		'[c15t] IAB `isServiceSpecific: false` is deprecated and ignored. TCF requires IsServiceSpecific=1, so c15t always encodes true.'
	);
}
