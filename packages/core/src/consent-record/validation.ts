/**
 * Structural validation helpers shared by the record readers.
 *
 * Deterministic and side-effect free. Timestamps must be finite,
 * non-negative safe integers in epoch milliseconds and must not be later
 * than the supplied `now`; there is deliberately no clock-skew tolerance
 * in this slice.
 *
 * @internal
 */

import { OPTIONAL_CONSENT_CATEGORIES } from './types';
import type {
	CategoryDecision,
	ChoiceBasis,
	ExplicitChoice,
	NoticeDismissal,
	OptionalConsentCategory,
} from './types';

/** One structural problem found while reading a record. */
export interface RecordIssue {
	code:
		| 'not-an-object'
		| 'unsupported-version'
		| 'unknown-key'
		| 'out-of-scope'
		| 'invalid-boolean'
		| 'invalid-timestamp'
		| 'future-timestamp'
		| 'invalid-fingerprint'
		| 'invalid-identifier'
		| 'invalid-basis';
	path: string;
}

/** Largest epoch millisecond value `Date` can represent. */
const MAX_DATE_MS = 8_640_000_000_000_000;

const OPTIONAL_CATEGORY_SET: ReadonlySet<string> = new Set(
	OPTIONAL_CONSENT_CATEGORIES
);

export const isOptionalConsentCategory = function isOptionalConsentCategory(
	value: string
): value is OptionalConsentCategory {
	return OPTIONAL_CATEGORY_SET.has(value);
};

/**
 * Plain object with a plain or null prototype. Class instances and objects
 * with a custom prototype are rejected so inherited fields cannot pose as
 * record data.
 */
export const isPlainRecord = function isPlainRecord(
	value: unknown
): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false;
	}
	const prototype = Object.getPrototypeOf(value) as unknown;
	return prototype === Object.prototype || prototype === null;
};

/** Own enumerable string keys only. */
export const ownKeys = function ownKeys(
	value: Record<string, unknown>
): string[] {
	return Object.keys(value);
};

/** Own property value, or `undefined` when the key is inherited or absent. */
export const ownValue = function ownValue(
	value: Record<string, unknown>,
	key: string
): unknown {
	return Object.hasOwn(value, key) ? value[key] : undefined;
};

/**
 * Checks an epoch-millisecond timestamp. Returns the issue code when the
 * value is unusable, or `null` when it is valid.
 */
export const checkTimestamp = function checkTimestamp(
	value: unknown,
	now: number
): RecordIssue['code'] | null {
	if (
		typeof value !== 'number' ||
		!Number.isSafeInteger(value) ||
		value < 0 ||
		value > MAX_DATE_MS
	) {
		return 'invalid-timestamp';
	}
	if (value > now) {
		return 'future-timestamp';
	}
	return null;
};

export const isNonEmptyString = function isNonEmptyString(
	value: unknown
): value is string {
	return typeof value === 'string' && value.length > 0;
};

const checkBasis = function checkBasis(
	value: unknown,
	path: string,
	issues: RecordIssue[]
): value is ChoiceBasis {
	if (!isPlainRecord(value)) {
		issues.push({ code: 'invalid-basis', path });
		return false;
	}
	const kind = ownValue(value, 'kind');
	if (kind === 'choice-v1') {
		if (!isNonEmptyString(ownValue(value, 'fingerprint'))) {
			issues.push({ code: 'invalid-fingerprint', path: `${path}.fingerprint` });
			return false;
		}
		return true;
	}
	if (kind === 'legacy-v2') {
		const materialFingerprint = ownValue(value, 'materialFingerprint');
		if (
			materialFingerprint !== undefined &&
			!isNonEmptyString(materialFingerprint)
		) {
			issues.push({
				code: 'invalid-fingerprint',
				path: `${path}.materialFingerprint`,
			});
			return false;
		}
		return true;
	}
	issues.push({ code: 'invalid-basis', path: `${path}.kind` });
	return false;
};

const checkDecision = function checkDecision(
	value: unknown,
	path: string,
	now: number,
	issues: RecordIssue[]
): value is CategoryDecision {
	if (!isPlainRecord(value)) {
		issues.push({ code: 'not-an-object', path });
		return false;
	}
	let valid = true;
	if (typeof ownValue(value, 'value') !== 'boolean') {
		issues.push({ code: 'invalid-boolean', path: `${path}.value` });
		valid = false;
	}
	const timestampIssue = checkTimestamp(ownValue(value, 'confirmedAt'), now);
	if (timestampIssue) {
		issues.push({ code: timestampIssue, path: `${path}.confirmedAt` });
		valid = false;
	}
	if (!checkBasis(ownValue(value, 'basis'), `${path}.basis`, issues)) {
		valid = false;
	}
	return valid;
};

/**
 * Result of validating a v3 in-memory record. The whole record is rejected
 * on any structural issue; grants are never salvaged from a broken record.
 */
export type ValidationResult<RecordType> =
	| { ok: true; record: RecordType }
	| { ok: false; issues: RecordIssue[] };

/**
 * Validates a version 3 explicit choice. Unknown versions never fall
 * through to the legacy reader.
 */
export const validateExplicitChoice = function validateExplicitChoice(
	input: unknown,
	now: number
): ValidationResult<ExplicitChoice> {
	const issues: RecordIssue[] = [];
	if (!isPlainRecord(input)) {
		return { issues: [{ code: 'not-an-object', path: '' }], ok: false };
	}
	if (ownValue(input, 'version') !== 3) {
		return {
			issues: [{ code: 'unsupported-version', path: 'version' }],
			ok: false,
		};
	}
	const inputCategories = ownValue(input, 'categories');
	if (!isPlainRecord(inputCategories)) {
		return {
			issues: [{ code: 'not-an-object', path: 'categories' }],
			ok: false,
		};
	}

	const categories: ExplicitChoice['categories'] = {};
	for (const key of ownKeys(inputCategories)) {
		if (!isOptionalConsentCategory(key)) {
			issues.push({ code: 'unknown-key', path: `categories.${key}` });
			continue;
		}
		const decision = inputCategories[key];
		if (checkDecision(decision, `categories.${key}`, now, issues)) {
			categories[key] = {
				basis: { ...decision.basis },
				confirmedAt: decision.confirmedAt,
				value: decision.value,
			};
		}
	}

	if (issues.length > 0) {
		return { issues, ok: false };
	}
	return { ok: true, record: { categories, version: 3 } };
};

/** Validates a version 1 notice dismissal. */
export const validateNoticeDismissal = function validateNoticeDismissal(
	input: unknown,
	now: number
): ValidationResult<NoticeDismissal> {
	if (!isPlainRecord(input)) {
		return { issues: [{ code: 'not-an-object', path: '' }], ok: false };
	}
	if (ownValue(input, 'version') !== 1) {
		return {
			issues: [{ code: 'unsupported-version', path: 'version' }],
			ok: false,
		};
	}
	const issues: RecordIssue[] = [];
	const dismissedAt = ownValue(input, 'dismissedAt');
	const fingerprint = ownValue(input, 'fingerprint');
	const timestampIssue = checkTimestamp(dismissedAt, now);
	if (timestampIssue) {
		issues.push({ code: timestampIssue, path: 'dismissedAt' });
	}
	if (!isNonEmptyString(fingerprint)) {
		issues.push({ code: 'invalid-fingerprint', path: 'fingerprint' });
	}
	if (issues.length > 0) {
		return { issues, ok: false };
	}
	return {
		ok: true,
		record: {
			dismissedAt: dismissedAt as number,
			fingerprint: fingerprint as string,
			version: 1,
		},
	};
};
