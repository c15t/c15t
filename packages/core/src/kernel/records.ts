/**
 * Validation for records that enter the kernel without creating a choice:
 * SSR seeds, storage hydration and server-mapped receipts.
 *
 * Pure. Every record is checked with the reviewed validators against the
 * supplied `now`; one invalid record rejects the whole input so nothing is
 * salvaged from a broken record.
 */
import { OPTIONAL_CONSENT_CATEGORIES } from '../consent-record/types';
import type {
	ConsentSubject,
	ExplicitChoice,
	NoticeDismissal,
	OptionalConsentCategory,
	PrivacyOptOut,
} from '../consent-record/types';
import {
	checkTimestamp,
	isNonEmptyString,
	isPlainRecord,
	ownKeys,
	ownValue,
	validateExplicitChoice,
	validateNoticeDismissal,
} from '../consent-record/validation';
import type { RecordIssue } from '../consent-record/validation';
import type { HydrationRecords } from '../types';

/** Validated records with the same omit/clear semantics as the input. */
export interface ValidatedRecords {
	choice?: ExplicitChoice | null;
	subject?: ConsentSubject | null;
	noticeDismissal?: NoticeDismissal | null;
	optOutDirectives?: readonly PrivacyOptOut[];
}

export type ValidateRecordsResult =
	| { ok: true; records: ValidatedRecords }
	| { ok: false; issues: RecordIssue[] };

const SUBJECT_KEYS = ['subjectId', 'externalId', 'identityProvider'] as const;

const OPTIONAL_CATEGORY_SET: ReadonlySet<string> = new Set(
	OPTIONAL_CONSENT_CATEGORIES
);

const validateSubject = function validateSubject(
	input: unknown,
	issues: RecordIssue[]
): ConsentSubject | null {
	if (!isPlainRecord(input)) {
		issues.push({ code: 'not-an-object', path: 'subject' });
		return null;
	}
	const subject: ConsentSubject = {};
	let any = false;
	for (const key of ownKeys(input)) {
		if (!SUBJECT_KEYS.includes(key as (typeof SUBJECT_KEYS)[number])) {
			issues.push({ code: 'unknown-key', path: `subject.${key}` });
			continue;
		}
		const value = ownValue(input, key);
		if (value === undefined) {
			continue;
		}
		if (!isNonEmptyString(value)) {
			issues.push({ code: 'invalid-identifier', path: `subject.${key}` });
			continue;
		}
		subject[key as (typeof SUBJECT_KEYS)[number]] = value;
		any = true;
	}
	return any ? subject : null;
};

const validateDirective = function validateDirective(
	input: unknown,
	path: string,
	now: number,
	issues: RecordIssue[]
): PrivacyOptOut | null {
	if (!isPlainRecord(input)) {
		issues.push({ code: 'not-an-object', path });
		return null;
	}
	let ok = true;
	if (ownValue(input, 'source') !== 'gpc') {
		issues.push({ code: 'invalid-basis', path: `${path}.source` });
		ok = false;
	}
	const recordedAt = ownValue(input, 'recordedAt');
	const timestampIssue = checkTimestamp(recordedAt, now);
	if (timestampIssue) {
		issues.push({ code: timestampIssue, path: `${path}.recordedAt` });
		ok = false;
	}
	const rawCategories = ownValue(input, 'categories');
	const categories: OptionalConsentCategory[] = [];
	if (Array.isArray(rawCategories)) {
		for (const [index, entry] of rawCategories.entries()) {
			if (typeof entry !== 'string' || !OPTIONAL_CATEGORY_SET.has(entry)) {
				issues.push({
					code: 'unknown-key',
					path: `${path}.categories[${index}]`,
				});
				ok = false;
				continue;
			}
			if (!categories.includes(entry as OptionalConsentCategory)) {
				categories.push(entry as OptionalConsentCategory);
			}
		}
	} else {
		issues.push({ code: 'not-an-object', path: `${path}.categories` });
		ok = false;
	}
	if (!ok) {
		return null;
	}
	return {
		categories: categories.sort(),
		recordedAt: recordedAt as number,
		source: 'gpc',
	};
};

/**
 * Validate hydration input. Keys that are omitted stay omitted so the
 * caller can preserve current values; `null` and empty arrays pass through
 * as explicit clears.
 */
export const validateHydrationRecords = function validateHydrationRecords(
	input: HydrationRecords,
	now: number
): ValidateRecordsResult {
	const issues: RecordIssue[] = [];
	const records: ValidatedRecords = {};

	if (input.choice !== undefined) {
		if (input.choice === null) {
			records.choice = null;
		} else {
			const result = validateExplicitChoice(input.choice, now);
			if (result.ok === true) {
				records.choice = result.record;
			} else {
				issues.push(
					...result.issues.map((issue) => ({
						...issue,
						path: `choice.${issue.path}`,
					}))
				);
			}
		}
	}
	if (input.subject !== undefined) {
		records.subject =
			input.subject === null ? null : validateSubject(input.subject, issues);
	}
	if (input.noticeDismissal !== undefined) {
		if (input.noticeDismissal === null) {
			records.noticeDismissal = null;
		} else {
			const result = validateNoticeDismissal(input.noticeDismissal, now);
			if (result.ok === true) {
				records.noticeDismissal = result.record;
			} else {
				issues.push(
					...result.issues.map((issue) => ({
						...issue,
						path: `noticeDismissal.${issue.path}`,
					}))
				);
			}
		}
	}
	if (input.optOutDirectives !== undefined) {
		if (Array.isArray(input.optOutDirectives)) {
			const directives: PrivacyOptOut[] = [];
			for (const [index, entry] of input.optOutDirectives.entries()) {
				const directive = validateDirective(
					entry,
					`optOutDirectives[${index}]`,
					now,
					issues
				);
				if (directive) {
					directives.push(directive);
				}
			}
			records.optOutDirectives = directives;
		} else {
			issues.push({ code: 'not-an-object', path: 'optOutDirectives' });
		}
	}

	if (issues.length > 0) {
		return { issues, ok: false };
	}
	return { ok: true, records };
};

/** Whether two subjects carry the same identifiers. */
export const sameSubject = function sameSubject(
	left: ConsentSubject | null,
	right: ConsentSubject | null
): boolean {
	if (left === right) {
		return true;
	}
	if (!left || !right) {
		return false;
	}
	return SUBJECT_KEYS.every((key) => left[key] === right[key]);
};

/**
 * Merge two choices keeping the newest receipt per category. Ties keep the
 * current receipt. Used for server-mapped records so a delayed read never
 * replaces a newer local action.
 */
export const mergeNewestChoice = function mergeNewestChoice(
	current: ExplicitChoice | null,
	incoming: ExplicitChoice | null
): ExplicitChoice | null {
	if (!current) {
		return incoming;
	}
	if (!incoming) {
		return current;
	}
	const categories: ExplicitChoice['categories'] = { ...current.categories };
	for (const category of OPTIONAL_CONSENT_CATEGORIES) {
		const theirs = incoming.categories[category];
		const ours = categories[category];
		if (theirs && (!ours || theirs.confirmedAt > ours.confirmedAt)) {
			categories[category] = theirs;
		}
	}
	return { categories, version: 3 };
};
