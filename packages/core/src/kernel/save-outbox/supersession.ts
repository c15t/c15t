/**
 * The one supersession rule of the save outbox: which part of a save newer
 * state already covers. Loaded with the kernel; the stored queue's code
 * loads on demand (`queue.ts`).
 */

import { OPTIONAL_CONSENT_CATEGORIES } from '../../consent-record/types';
import type { OptionalConsentCategory } from '../../consent-record/types';
import type { ConsentSnapshot, SavePayload } from '../../types';

/** A save waiting for a replay. */
export interface PendingSaveEntry {
	payload: SavePayload;
	queuedAt: number;
	attempts: number;
}

/**
 * What newer state covers of an older save: the categories decided again
 * since, and whether a newer vendor map replaced the save's own.
 */
export interface Supersession {
	category: (category: OptionalConsentCategory) => boolean;
	vendors: boolean;
}

const NOTHING_SUPERSEDED: Supersession = {
	category: () => false,
	vendors: false,
};

/**
 * The part of a save nothing newer covers, or `null` when nothing is left.
 *
 * Surviving categories keep their receipts and action time, so a replay
 * records when the visitor decided. A narrowed save is a `custom` action
 * and cannot replay the full TC string. The vendor map is a whole decision
 * of its own: narrowing the categories says nothing about it, and it goes
 * only when a newer map replaced it, taking with it a save that has no
 * category left.
 *
 * Every caller that asks "is this save superseded?" asks it here: the
 * outbox for a send in flight ({@link liveSupersession}) and the queue for
 * stored entries ({@link supersededBy}).
 */
export const withoutSuperseded = function withoutSuperseded(
	payload: SavePayload,
	by: Supersession
): SavePayload | null {
	const keys = OPTIONAL_CONSENT_CATEGORIES.filter((category) =>
		Object.hasOwn(payload.confirmed.categories, category)
	);
	const kept = keys.filter((category) => !by.category(category));
	let selected = payload;
	if (kept.length === 0 && keys.length > 0) {
		return null;
	}
	if (kept.length < keys.length) {
		const categories: Partial<Record<OptionalConsentCategory, boolean>> = {};
		const receipts: SavePayload['choice']['categories'] = {};
		const consents = {
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
		};
		for (const category of kept) {
			const receipt = payload.choice.categories[category];
			if (receipt) {
				categories[category] = receipt.value;
				receipts[category] = receipt;
				consents[category] = payload.consents[category];
			}
		}
		selected = {
			...payload,
			choice: { categories: receipts, version: 3 },
			confirmed: { ...payload.confirmed, categories },
			consentAction: 'custom',
			consents,
			tcString: null,
		};
	}
	if (selected.vendorChoice === undefined || !by.vendors) {
		return selected;
	}
	const { vendorChoice: _superseded, ...remaining } = selected;
	return Object.keys(remaining.confirmed.categories).length > 0
		? remaining
		: null;
};

/**
 * What `newer` covers of `older`: the categories it confirmed and, when it
 * carried one, the vendor map. Nothing when it belongs to another subject
 * or acted before `older`.
 */
export const supersededBy = function supersededBy(
	older: SavePayload,
	newer: SavePayload
): Supersession {
	if (
		older.subjectId !== newer.subjectId ||
		older.confirmed.actionAt > newer.confirmed.actionAt
	) {
		return NOTHING_SUPERSEDED;
	}
	return {
		category: (category) => Object.hasOwn(newer.confirmed.categories, category),
		vendors: newer.vendorChoice !== undefined,
	};
};

/**
 * What the live state covers of a save sent from `action`, the snapshot the
 * save committed: every category whose receipt changed since, and the
 * vendor map once another one replaced it.
 */
export const liveSupersession = function liveSupersession(
	action: ConsentSnapshot,
	current: ConsentSnapshot
): Supersession {
	return {
		category: (category) =>
			current.explicitChoice?.categories[category] !==
			action.explicitChoice?.categories[category],
		vendors: current.vendorChoice !== action.vendorChoice,
	};
};

/**
 * The same save under another subject id. Keys keep their positions, so a
 * queued entry moved by a reassignment still serializes identically to one
 * rebuilt from the original payload.
 */
export const withSubjectId = function withSubjectId(
	payload: SavePayload,
	subjectId: string
): SavePayload {
	return {
		...payload,
		subject: { ...payload.subject, subjectId },
		subjectId,
	};
};
