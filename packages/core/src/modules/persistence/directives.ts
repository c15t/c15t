/**
 * The one merge for privacy directive lists, shared by the storage read,
 * the write path and reconciliation so they never disagree on order: a
 * fingerprint or `sameRecord` comparison of the same directives must match.
 *
 * Pure.
 */
import type { PrivacyOptOut } from '../../consent-record/types';

/** Identity of a directive: time, source and categories. */
const directiveKey = function directiveKey(directive: PrivacyOptOut): string {
	return JSON.stringify([
		directive.recordedAt,
		directive.source,
		[...directive.categories].sort(),
	]);
};

/**
 * Union of directive lists without duplicates, ordered by `recordedAt`
 * and then by identity, so any two runtimes derive the same list from the
 * same directives.
 *
 * @param lists - Directive lists to merge.
 * @returns The merged list.
 */
export const mergeDirectives = function mergeDirectives(
	...lists: readonly (readonly PrivacyOptOut[])[]
): PrivacyOptOut[] {
	const byKey = new Map<string, PrivacyOptOut>();
	for (const directive of lists.flat()) {
		const key = directiveKey(directive);
		if (!byKey.has(key)) {
			byKey.set(key, directive);
		}
	}
	return [...byKey.entries()]
		.sort(([leftKey, left], [rightKey, right]) => {
			if (left.recordedAt !== right.recordedAt) {
				return left.recordedAt - right.recordedAt;
			}
			if (leftKey === rightKey) {
				return 0;
			}
			return leftKey < rightKey ? -1 : 1;
		})
		.map(([, directive]) => directive);
};
