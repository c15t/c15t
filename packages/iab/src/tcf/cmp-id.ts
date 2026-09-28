/**
 * CMP identity validation.
 *
 * A TC String carries the CMP ID in a 12-bit core-string field, and the TCF
 * encoder rejects anything below 2. Catching a bad ID here keeps a
 * misconfiguration from surfacing as an unmounted CMP that answers
 * `__tcfapi` with an unusable ID and then fails at save time.
 *
 * @packageDocumentation
 */

/**
 * Lowest CMP ID IAB Europe issues. The TC String reserves 0 and 1.
 *
 * @internal
 */
export const MIN_CMP_ID = 2;

/**
 * Highest CMP ID that fits the 12-bit TC String field.
 *
 * @internal
 */
export const MAX_CMP_ID = 4_095;

/**
 * True when `value` can be encoded as the CMP ID of a TC String.
 *
 * @param value - Candidate CMP ID, typically from user configuration.
 * @returns Whether the value is a encodable CMP ID.
 *
 * @internal
 */
export const isValidCmpId = function isValidCmpId(
	value: unknown
): value is number {
	return (
		typeof value === 'number' &&
		Number.isInteger(value) &&
		value >= MIN_CMP_ID &&
		value <= MAX_CMP_ID
	);
};

/**
 * Builds the error thrown when a CMP ID cannot be used.
 *
 * @param value - The rejected value, for the message.
 * @returns An error naming the accepted range and where to register.
 *
 * @internal
 */
export const createCmpIdError = function createCmpIdError(
	value: unknown
): Error {
	const received =
		value === undefined ? 'undefined (no cmpId was provided)' : String(value);
	return new Error(
		`@c15t/iab needs a CMP ID registered with IAB Europe: an integer from ${MIN_CMP_ID} to ${MAX_CMP_ID}. ` +
			`A TC String cannot be encoded without one, so no consent record is written. ` +
			`Register at https://register.consensu.org/CMP, or omit cmpId and let the backend ` +
			`return it from /init. Received: ${received}.`
	);
};

/**
 * Returns a usable CMP ID or throws before any TC String is encoded.
 *
 * @param value - Candidate CMP ID.
 * @returns The validated CMP ID.
 * @throws {Error} When the value is not an encodable CMP ID.
 *
 * @internal
 */
export const assertValidCmpId = function assertValidCmpId(
	value: unknown
): number {
	if (!isValidCmpId(value)) {
		throw createCmpIdError(value);
	}
	return value;
};
