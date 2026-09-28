/**
 * String ordering for canonical sets and fingerprint keys.
 *
 * `String.prototype.localeCompare` gives the order every canonical set in
 * c15t has used so far, so it is the order stored fingerprints depend on.
 * Its first call in a page initialises the ICU collator, which costs a few
 * milliseconds on the main thread before the banner can show. Every string
 * these sets hold is printable ASCII, and for printable ASCII the root
 * collation is a fixed table: punctuation, then digits, then letters
 * compared without case, with lowercase before uppercase on a tie. This
 * module applies that table directly and only falls back to the collator
 * for a string it cannot place, so the order is unchanged and the collator
 * stays unloaded on the common path.
 *
 * @internal
 */

/**
 * Printable ASCII in root-collation order. Uppercase letters share the
 * primary weight of their lowercase letter and sort after it on a tie.
 */
const ASCII_ORDER =
	' _-,;:!?.\'"()[]{}@*/\\&#%`^+<=>|~$0123456789abcdefghijklmnopqrstuvwxyz';

const FIRST_PRINTABLE = 0x20;
const LAST_PRINTABLE = 0x7e;
const UPPER_A = 0x41;
const UPPER_Z = 0x5a;
const CASE_OFFSET = 0x20;

/** Primary weight per code point, or -1 outside printable ASCII. */
const PRIMARY = new Int8Array(LAST_PRINTABLE + 1).fill(-1);
for (let index = 0; index < ASCII_ORDER.length; index += 1) {
	const code = ASCII_ORDER.charCodeAt(index);
	PRIMARY[code] = index;
	if (code >= UPPER_A + CASE_OFFSET && code <= UPPER_Z + CASE_OFFSET) {
		PRIMARY[code - CASE_OFFSET] = index;
	}
}

const isPrintableAscii = function isPrintableAscii(value: string): boolean {
	for (let index = 0; index < value.length; index += 1) {
		const code = value.charCodeAt(index);
		if (code < FIRST_PRINTABLE || code > LAST_PRINTABLE) {
			return false;
		}
	}
	return true;
};

const isUppercase = function isUppercase(code: number): boolean {
	return code >= UPPER_A && code <= UPPER_Z;
};

/**
 * Compares two strings in the order `localeCompare` gives under the root
 * collation, without a collator when both are printable ASCII.
 *
 * @param left - First string.
 * @param right - Second string.
 * @returns Negative when `left` sorts first, positive when `right` does,
 * zero when they are equal.
 * @example
 * ```ts
 * ['scopeMode', 'scope', 'Scope'].sort(compareCanonical);
 * // ['scope', 'Scope', 'scopeMode']
 * ```
 */
export const compareCanonical = function compareCanonical(
	left: string,
	right: string
): number {
	if (!(isPrintableAscii(left) && isPrintableAscii(right))) {
		return left.localeCompare(right);
	}
	const shared = Math.min(left.length, right.length);
	for (let index = 0; index < shared; index += 1) {
		const difference =
			(PRIMARY[left.charCodeAt(index)] as number) -
			(PRIMARY[right.charCodeAt(index)] as number);
		if (difference !== 0) {
			return difference;
		}
	}
	if (left.length !== right.length) {
		return left.length - right.length;
	}
	for (let index = 0; index < shared; index += 1) {
		const leftUpper = isUppercase(left.charCodeAt(index));
		const rightUpper = isUppercase(right.charCodeAt(index));
		if (leftUpper !== rightUpper) {
			return leftUpper ? 1 : -1;
		}
	}
	return 0;
};
