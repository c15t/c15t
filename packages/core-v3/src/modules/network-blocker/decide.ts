/**
 * Per-request block evaluation.
 *
 * Pure: takes a parsed URL, the method, the current rules list, and
 * the current snapshot, and returns whether to block the request.
 * Walks the rules in order and returns on the first match whose
 * consent condition is denied.
 */
import type { ConsentSnapshot } from '../../types';
import { evaluateConsent } from '../has';
import type { BlockDecision, NetworkBlockerRule } from './types';
import { hostnameMatchesRule, methodMatchesRule, pathMatchesRule } from './url';

/**
 * Evaluate a request against the rules list. Returns the first matching
 * rule whose consent condition is denied; otherwise `{ shouldBlock: false }`.
 */
export function evaluateBlock(
	url: URL,
	method: string,
	rules: NetworkBlockerRule[],
	snapshot: ConsentSnapshot
): BlockDecision {
	for (const rule of rules) {
		if (!hostnameMatchesRule(url.hostname, rule)) continue;
		if (!pathMatchesRule(url.pathname, rule)) continue;
		if (!methodMatchesRule(method, rule)) continue;

		const allowed = evaluateConsent({ category: rule.category }, snapshot);
		if (!allowed) {
			return { shouldBlock: true, rule };
		}
	}
	return { shouldBlock: false };
}
