/**
 * The vendor slug shape, in a module with no imports, for the save path.
 * `vendors.ts` keeps its own copy: importing either way between the two
 * lets the bundler split extra chunks onto the first page load. A test in
 * `vendors.test.ts` keeps the copies in step.
 *
 * @packageDocumentation
 */

/**
 * The slug shape the wire accepts as a `vendorChoice.grants` key. A script
 * or rule slug that does not match would make every save fail backend
 * validation, so it is dropped at declaration with a warning instead.
 */
const VENDOR_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/u;

/**
 * Whether a string is a slug the wire schema accepts.
 *
 * @param value - A candidate vendor id.
 * @returns `true` for a lowercase slug of up to 64 characters.
 * @internal
 */
export const isValidVendorId = function isValidVendorId(
	value: string
): boolean {
	return VENDOR_ID_PATTERN.test(value);
};
