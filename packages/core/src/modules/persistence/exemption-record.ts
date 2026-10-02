/** Ordering for explicit objections, kept separately from consent receipts. */
import { OPTIONAL_CONSENT_CATEGORIES } from '../../consent-record/types';
import type { ExemptionPreferences } from '../../consent-record/types';

/** Merge one preference per category, keeping a refusal on equal times. */
export const mergeExemptionPreferences = (
	left: ExemptionPreferences | null | undefined,
	right: ExemptionPreferences | null | undefined
): ExemptionPreferences | null => {
	if (!left && !right) {
		return null;
	}
	const categories: ExemptionPreferences['categories'] = {};
	for (const category of OPTIONAL_CONSENT_CATEGORIES) {
		const first = left?.categories[category];
		const second = right?.categories[category];
		let selected = first ?? second;
		if (
			first &&
			second &&
			(second.confirmedAt > first.confirmedAt ||
				(second.confirmedAt === first.confirmedAt && !second.value))
		) {
			selected = second;
		}
		if (selected) {
			categories[category] = selected;
		}
	}
	return { categories, version: 1 };
};

/** A clear voids older preference evidence, including objection reversals. */
export const exemptionsSinceEpoch = (
	record: ExemptionPreferences | null | undefined,
	epoch: number
): ExemptionPreferences | null => {
	if (!record) {
		return null;
	}
	if (epoch <= 0) {
		return record;
	}
	const categories: ExemptionPreferences['categories'] = {};
	for (const category of OPTIONAL_CONSENT_CATEGORIES) {
		const decision = record.categories[category];
		if (decision && decision.confirmedAt >= epoch) {
			categories[category] = decision;
		}
	}
	if (Object.keys(categories).length === 0) {
		return null;
	}
	return Object.keys(categories).length ===
		Object.keys(record.categories).length
		? record
		: { categories, version: 1 };
};
