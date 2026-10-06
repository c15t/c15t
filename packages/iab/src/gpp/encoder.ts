/**
 * GPP string encoding.
 *
 * Encodes the GPP header and the fixed-width US sections. A TCF EU section
 * is the TC String itself, so it is never re-encoded here.
 *
 * @packageDocumentation
 */

import {
	GPC_SUBSECTION,
	GPC_SUBSECTION_TYPE,
	GPP_HEADER_ID,
	GPP_HEADER_VERSION,
} from './sections';
import type { GPPFieldSpec, USSectionDefinition } from './sections';

/** Values for one subsection, keyed by field name. */
export type GPPFieldValues = Record<string, number | boolean | number[]>;

const BASE64_URL =
	'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** `value` as a big-endian bit string `bits` wide. */
const fixedInteger = function fixedInteger(
	value: number,
	bits: number
): string {
	if (!Number.isInteger(value) || value < 0 || value >= 2 ** bits) {
		throw new RangeError(`GPP: ${value} does not fit in ${bits} bits.`);
	}
	return value.toString(2).padStart(bits, '0');
};

/** Fibonacci code of a positive integer, ending in `11`. */
const fibonacciInteger = function fibonacciInteger(value: number): string {
	const sequence = [1, 2];
	while (
		(sequence.at(-1) ?? 0) + (sequence.at(-2) ?? 0) <= value &&
		sequence.length < 64
	) {
		sequence.push((sequence.at(-1) ?? 0) + (sequence.at(-2) ?? 0));
	}
	let remaining = value;
	const digits: string[] = [];
	for (let index = sequence.length - 1; index >= 0; index -= 1) {
		const term = sequence[index] ?? 0;
		if (term <= remaining) {
			digits[index] = '1';
			remaining -= term;
		} else {
			digits[index] = '0';
		}
	}
	return `${digits.join('').replace(/0+$/u, '')}1`;
};

/**
 * Encodes sorted, distinct integers as a Fibonacci-coded range: a 12-bit
 * group count, then each run as an offset from the end of the previous one.
 */
export const fibonacciRange = function fibonacciRange(
	values: readonly number[]
): string {
	const sorted = [...new Set(values)].sort((left, right) => left - right);
	const groups: number[][] = [];
	for (const value of sorted) {
		const group = groups.at(-1);
		if (group && group.at(-1) === value - 1) {
			group.push(value);
		} else {
			groups.push([value]);
		}
	}
	let offset = 0;
	let bits = fixedInteger(groups.length, 12);
	for (const group of groups) {
		const first = group[0] ?? 0;
		const last = group.at(-1) ?? first;
		if (group.length === 1) {
			bits += `0${fibonacciInteger(first - offset)}`;
		} else {
			bits += `1${fibonacciInteger(first - offset)}${fibonacciInteger(last - first)}`;
		}
		offset = last;
	}
	return bits;
};

/**
 * Base64url without padding characters. The bit string is padded with
 * zeros to a whole byte, then to a whole character, as GPP's compressed
 * encoding requires.
 */
export const compressedBase64Url = function compressedBase64Url(
	bits: string
): string {
	let padded = bits.padEnd(Math.ceil(bits.length / 8) * 8, '0');
	padded = padded.padEnd(Math.ceil(padded.length / 6) * 6, '0');
	let encoded = '';
	for (let index = 0; index < padded.length; index += 6) {
		encoded += BASE64_URL.charAt(
			Number.parseInt(padded.slice(index, index + 6), 2)
		);
	}
	return encoded;
};

const encodeField = function encodeField(
	[name, bits, count]: GPPFieldSpec,
	values: GPPFieldValues
): string {
	const value = values[name];
	if (count === undefined) {
		return fixedInteger(Number(value ?? 0), bits);
	}
	const entries = Array.isArray(value) ? value : [];
	if (entries.length !== count) {
		throw new RangeError(`GPP: ${name} needs ${count} entries.`);
	}
	return entries.map((entry) => fixedInteger(entry, bits)).join('');
};

/** Encodes one subsection from its field table. */
const encodeSubsection = function encodeSubsection(
	fields: readonly GPPFieldSpec[],
	values: GPPFieldValues
): string {
	return compressedBase64Url(
		fields.map((field) => encodeField(field, values)).join('')
	);
};

/** One US section's field values, as `getSection` reports them. */
export interface USSectionValues {
	core: GPPFieldValues;
	/** GPC flag; encoded only when the section defines a GPC subsection. */
	gpc: boolean;
}

/**
 * Encodes a US section: the core subsection, then the GPC subsection when
 * the section defines one.
 *
 * @param definition - The section's field table.
 * @param values - Field values. Absent fields encode as `0`.
 * @returns The section string.
 * @throws {RangeError} When a value does not fit its field.
 */
export const encodeUSSection = function encodeUSSection(
	definition: USSectionDefinition,
	values: USSectionValues
): string {
	const core = encodeSubsection(definition.core, values.core);
	if (!definition.gpc) {
		return core;
	}
	return `${core}.${encodeSubsection(GPC_SUBSECTION, {
		Gpc: values.gpc ? 1 : 0,
		SubsectionType: GPC_SUBSECTION_TYPE,
	})}`;
};

/** An encoded section and its ID. */
export interface EncodedGPPSection {
	id: number;
	encoded: string;
}

/**
 * Joins sections into a GPP string behind a header listing their IDs.
 *
 * @param sections - Encoded sections, in any order.
 * @returns The GPP string, or `''` when there is no section.
 */
export const encodeGPPString = function encodeGPPString(
	sections: readonly EncodedGPPSection[]
): string {
	if (sections.length === 0) {
		return '';
	}
	const ordered = [...sections].sort((left, right) => left.id - right.id);
	const header = compressedBase64Url(
		fixedInteger(GPP_HEADER_ID, 6) +
			fixedInteger(GPP_HEADER_VERSION, 6) +
			fibonacciRange(ordered.map((section) => section.id))
	);
	return [header, ...ordered.map((section) => section.encoded)].join('~');
};
