/**
 * Pure recording helper for explicit category patches.
 *
 * Implements the reviewed partial-save rule: an object patch confirms
 * exactly its own optional category keys at one captured action time and
 * the current choice basis. Omitted categories keep their existing
 * decision untouched, so an unrelated edit never renews an old grant and a
 * new grant never inherits an old lifetime. Supplying an unchanged value
 * is a reconfirmation and refreshes that category.
 *
 * Expansion of `'all'`, `'none'` and no-input saves belongs to the kernel
 * integration and is deliberately not implemented here.
 *
 * @internal
 */

import type {
	EvaluationPolicy,
	ExplicitChoice,
	OptionalConsentCategory,
} from './types';
import {
	checkTimestamp,
	isOptionalConsentCategory,
	isPlainRecord,
	ownKeys,
} from './validation';
import type { RecordIssue } from './validation';

export interface RecordPatchOptions {
	policy: EvaluationPolicy;
	/** Epoch milliseconds captured before any mutation or async work. */
	actionAt: number;
	/** Current time, used to reject a future `actionAt`. Defaults to `actionAt`. */
	now?: number;
}

export type RecordPatchResult =
	| {
			ok: true;
			choice: ExplicitChoice;
			/** Categories whose decision was replaced by this action. */
			confirmed: readonly OptionalConsentCategory[];
	  }
	| { ok: false; issues: RecordIssue[] };

const EMPTY_CHOICE: ExplicitChoice = Object.freeze({
	categories: Object.freeze({}),
	version: 3,
}) as ExplicitChoice;

/**
 * Applies an explicit object patch to the previous choice.
 *
 * The command is validated completely before anything is recorded: unknown
 * keys, non-boolean values, `necessary: false`, and a positive value for a
 * category outside the current selectable scope reject the whole patch.
 * An explicit `false` outside scope is accepted because a persistent
 * refusal must remain possible there. An empty object is a documented
 * no-op success: it confirms nothing and refreshes nothing.
 */
export const recordCategoryPatch = function recordCategoryPatch(
	previous: ExplicitChoice | null,
	patch: unknown,
	options: RecordPatchOptions
): RecordPatchResult {
	const issues: RecordIssue[] = [];
	const timestampIssue = checkTimestamp(
		options.actionAt,
		options.now ?? options.actionAt
	);
	if (timestampIssue) {
		issues.push({ code: timestampIssue, path: 'actionAt' });
	}
	if (!isPlainRecord(patch)) {
		issues.push({ code: 'not-an-object', path: '' });
		return { issues, ok: false };
	}

	const confirmed: OptionalConsentCategory[] = [];
	const values = new Map<OptionalConsentCategory, boolean>();
	for (const key of ownKeys(patch)) {
		const value = patch[key];
		if (key === 'necessary') {
			if (value !== true) {
				issues.push({ code: 'invalid-boolean', path: key });
			}
			continue;
		}
		if (!isOptionalConsentCategory(key)) {
			issues.push({ code: 'unknown-key', path: key });
			continue;
		}
		if (typeof value !== 'boolean') {
			issues.push({ code: 'invalid-boolean', path: key });
			continue;
		}
		if (value && !options.policy.scope.includes(key)) {
			issues.push({ code: 'out-of-scope', path: key });
			continue;
		}
		values.set(key, value);
		confirmed.push(key);
	}

	if (issues.length > 0) {
		return { issues, ok: false };
	}

	const base = previous ?? EMPTY_CHOICE;
	if (values.size === 0) {
		return { choice: base, confirmed: [], ok: true };
	}

	const categories: ExplicitChoice['categories'] = { ...base.categories };
	for (const [key, value] of values) {
		categories[key] = {
			basis: {
				fingerprint: options.policy.choice.fingerprint,
				kind: 'choice-v1',
			},
			confirmedAt: options.actionAt,
			value,
		};
	}

	return { choice: { categories, version: 3 }, confirmed, ok: true };
};
