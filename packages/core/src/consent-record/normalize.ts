/**
 * Legacy v2 browser record reader.
 *
 * Takes the raw parsed record (`{ consents, consentInfo }`) together with
 * its encoding provenance and produces a version 3 explicit choice in
 * memory. It never writes storage, never renews the stored time, and never
 * stamps the current prompt fingerprint on old decisions.
 *
 * Provenance matters: the compact cookie encoding deliberately omits
 * `false`, so a recognized compact record restores `false` for the known
 * legacy category universe. A JSON record keeps absent keys absent.
 *
 * @internal
 */

import { OPTIONAL_CONSENT_CATEGORIES } from './types';
import type {
	CategoryDecision,
	ChoiceBasis,
	ConsentSubject,
	ExplicitChoice,
} from './types';
import {
	checkTimestamp,
	isNonEmptyString,
	isOptionalConsentCategory,
	isPlainRecord,
	ownKeys,
	ownValue,
} from './validation';
import type { RecordIssue } from './validation';

/** How the raw record was encoded before parsing. */
export type LegacyRecordEncoding = 'json' | 'compact';

export interface NormalizeLegacyOptions {
	/** Current time in epoch milliseconds. Future record times are invalid. */
	now: number;
	encoding: LegacyRecordEncoding;
}

export type NormalizeLegacyResult =
	| { ok: true; choice: ExplicitChoice; subject: ConsentSubject | null }
	| {
			ok: false;
			reason: 'empty' | 'malformed' | 'unsupported-version';
			issues: RecordIssue[];
	  };

const IDENTIFIER_KEYS = [
	'subjectId',
	'externalId',
	'identityProvider',
] as const;

const readSubject = function readSubject(
	consentInfo: Record<string, unknown>,
	issues: RecordIssue[]
): ConsentSubject | null {
	const subject: ConsentSubject = {};
	let hasIdentity = false;
	for (const key of IDENTIFIER_KEYS) {
		const value = ownValue(consentInfo, key);
		if (value === undefined) {
			continue;
		}
		if (typeof value !== 'string') {
			issues.push({ code: 'invalid-identifier', path: `consentInfo.${key}` });
			continue;
		}
		if (value.length > 0) {
			subject[key] = value;
			hasIdentity = true;
		}
	}
	return hasIdentity ? subject : null;
};

const readBasis = function readBasis(
	consentInfo: Record<string, unknown>,
	issues: RecordIssue[]
): ChoiceBasis {
	const fingerprint = ownValue(consentInfo, 'materialPolicyFingerprint');
	if (fingerprint === undefined || fingerprint === '') {
		return { kind: 'legacy-v2' };
	}
	if (!isNonEmptyString(fingerprint)) {
		issues.push({
			code: 'invalid-fingerprint',
			path: 'consentInfo.materialPolicyFingerprint',
		});
		return { kind: 'legacy-v2' };
	}
	return { kind: 'legacy-v2', materialFingerprint: fingerprint };
};

/**
 * Normalizes a parsed v2 record. The whole record is rejected on any
 * structural issue so a malformed record never contributes a grant.
 */
// oxlint-disable-next-line complexity -- Whole-record validation reads every field once in a fixed order.
export const normalizeLegacyConsentRecord =
	function normalizeLegacyConsentRecord(
		input: unknown,
		options: NormalizeLegacyOptions
	): NormalizeLegacyResult {
		if (input === null || input === undefined) {
			return { issues: [], ok: false, reason: 'empty' };
		}
		if (!isPlainRecord(input)) {
			return {
				issues: [{ code: 'not-an-object', path: '' }],
				ok: false,
				reason: 'malformed',
			};
		}
		if (Object.hasOwn(input, 'version')) {
			// A versioned envelope is not a v2 record; never fall through.
			return {
				issues: [{ code: 'unsupported-version', path: 'version' }],
				ok: false,
				reason: 'unsupported-version',
			};
		}

		const consentInfo = ownValue(input, 'consentInfo');
		const consents = ownValue(input, 'consents');
		if (!isPlainRecord(consentInfo)) {
			return {
				issues: [{ code: 'not-an-object', path: 'consentInfo' }],
				ok: false,
				reason: 'malformed',
			};
		}
		if (
			typeof ownValue(consentInfo, 'id') === 'string' &&
			typeof ownValue(consentInfo, 'subjectId') !== 'string'
		) {
			// v1.x server-id record. Explicitly unsupported, not anonymous v2.
			return {
				issues: [{ code: 'unsupported-version', path: 'consentInfo.id' }],
				ok: false,
				reason: 'unsupported-version',
			};
		}
		if (!isPlainRecord(consents)) {
			return {
				issues: [{ code: 'not-an-object', path: 'consents' }],
				ok: false,
				reason: 'malformed',
			};
		}

		const issues: RecordIssue[] = [];
		const time = ownValue(consentInfo, 'time');
		const timestampIssue = checkTimestamp(time, options.now);
		if (timestampIssue) {
			issues.push({ code: timestampIssue, path: 'consentInfo.time' });
		}
		const subject = readSubject(consentInfo, issues);
		const basis = readBasis(consentInfo, issues);

		const values = new Map<string, boolean>();
		for (const key of ownKeys(consents)) {
			const value = consents[key];
			if (key === 'necessary') {
				if (typeof value !== 'boolean') {
					issues.push({ code: 'invalid-boolean', path: `consents.${key}` });
				}
				continue;
			}
			if (!isOptionalConsentCategory(key)) {
				// v2 preserved custom keys; they carry no category meaning here.
				continue;
			}
			if (typeof value !== 'boolean') {
				issues.push({ code: 'invalid-boolean', path: `consents.${key}` });
				continue;
			}
			values.set(key, value);
		}

		if (issues.length > 0) {
			return { issues, ok: false, reason: 'malformed' };
		}

		const confirmedAt = time as number;
		const categories: ExplicitChoice['categories'] = {};
		for (const category of OPTIONAL_CONSENT_CATEGORIES) {
			const stored = values.get(category);
			let value: boolean | undefined = stored;
			if (value === undefined && options.encoding === 'compact') {
				value = false;
			}
			if (value === undefined) {
				continue;
			}
			const decision: CategoryDecision = {
				basis: { ...basis },
				confirmedAt,
				value,
			};
			categories[category] = decision;
		}

		return { choice: { categories, version: 3 }, ok: true, subject };
	};
