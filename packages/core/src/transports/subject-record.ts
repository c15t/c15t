/**
 * Maps a backend subject record onto the kernel's hydration records.
 *
 * `GET /subjects/:id` from `@c15t/backend` carries three things the kernel
 * can hydrate from: `subjectChoice`, the latest receipt per category with
 * each receipt's original confirmation time and policy basis; the subject's
 * identifiers; and `privacyDirectives`, the standing opt-out directives that
 * apply to it. A 2.x backend carries none of those, only per-consent
 * `preferences` (granted codes) and `givenAt`; those rows map to legacy-v2
 * grants timed at their `givenAt` for the codes they hold, and to nothing for
 * the rest, exactly as the v3 backend derives them for rows written before
 * receipts existed. An absent code is historical omission, not a refusal.
 *
 * Nothing here stamps, renews or invents. A consent item whose receipts exist
 * but cannot be read as the v3 wire poisons the read: nothing is salvaged
 * from it and no legacy grant is derived in its place. A merged receipt set
 * that fails structural validation drops the whole choice, matching the
 * browser reader. The hosted service outside this repository
 * returns neither shape from `/init`, only a boolean `consents` map without
 * times or bases; that map cannot become a receipt and is not mapped here.
 */
import type {
	ConsentItem,
	GetSubjectOutput,
	PrivacyDirectiveWire,
	SubjectChoiceWire,
} from '@c15t/schema/types';

import { OPTIONAL_CONSENT_CATEGORIES } from '../consent-record/types';
import type {
	ConsentSubject,
	ExplicitChoice,
	OptionalConsentCategory,
	PrivacyOptOut,
} from '../consent-record/types';
import {
	checkTimestamp,
	isOptionalConsentCategory,
	validateExplicitChoice,
} from '../consent-record/validation';
import type { HydrationRecords } from '../types';

/** Validated records returned by a subject transport. */
export type TransportHydrationRecords = HydrationRecords;

/** The subject read as the wire carries it, dates already revived. */
export type SubjectRecordWire = GetSubjectOutput;

export interface MapSubjectRecordOptions {
	/** Current time in epoch milliseconds. Future receipts are invalid. */
	now: number;
}

const COOKIE_BANNER = 'cookie_banner';

/** Whether a consent item carries receipts this reader can use. */
type ItemReceipts =
	| { kind: 'absent' }
	| { kind: 'unreadable' }
	| { kind: 'receipts'; categories: SubjectChoiceWire['categories'] };

const itemReceipts = (item: ConsentItem): ItemReceipts => {
	const { choice } = item;
	if (choice === undefined || choice === null) {
		return { kind: 'absent' };
	}
	if (
		typeof choice !== 'object' ||
		choice.version !== 3 ||
		typeof choice.categories !== 'object' ||
		choice.categories === null
	) {
		return { kind: 'unreadable' };
	}
	return { categories: choice.categories, kind: 'receipts' };
};

const toTime = (value: Date | string | number): number =>
	value instanceof Date ? value.getTime() : new Date(value).getTime();

/**
 * Legacy-v2 grants a 2.x consent item holds.
 *
 * The 2.x backend kept only the granted codes, so a present code is a grant
 * at `givenAt` and an absent one is nothing: the refusal the client may have
 * submitted was never stored and is not invented here.
 */
const legacyReceipts = (
	item: ConsentItem
): ExplicitChoice['categories'] | undefined => {
	if (item.type !== COOKIE_BANNER || item.preferences === undefined) {
		return undefined;
	}
	const confirmedAt = toTime(item.givenAt);
	const categories: ExplicitChoice['categories'] = {};
	for (const category of OPTIONAL_CONSENT_CATEGORIES) {
		if (item.preferences[category] === true) {
			categories[category] = {
				basis: { kind: 'legacy-v2' },
				confirmedAt,
				value: true,
			};
		}
	}
	return categories;
};

/**
 * The latest receipt per category across the consent items, for backends
 * that do not send `subjectChoice`. `null` when any item's receipts are
 * unreadable: the record is then not evidence this reader can use.
 */
const mergeItems = (
	items: readonly ConsentItem[]
): SubjectChoiceWire | null | undefined => {
	const categories: SubjectChoiceWire['categories'] = {};
	let any = false;
	const ordered = [...items].sort(
		(left, right) => toTime(left.givenAt) - toTime(right.givenAt)
	);
	for (const item of ordered) {
		const stored = itemReceipts(item);
		if (stored.kind === 'unreadable') {
			return null;
		}
		const receipts =
			stored.kind === 'receipts' ? stored.categories : legacyReceipts(item);
		if (!receipts) {
			continue;
		}
		for (const category of OPTIONAL_CONSENT_CATEGORIES) {
			const receipt = receipts[category];
			if (!receipt) {
				continue;
			}
			const current = categories[category];
			if (current === undefined || receipt.confirmedAt >= current.confirmedAt) {
				categories[category] = receipt;
				any = true;
			}
		}
	}
	return any ? { categories, version: 3 } : undefined;
};

/** Identifiers as stored: literal strings, never decoded or coerced. */
const mapSubject = (
	subject: GetSubjectOutput['subject']
): ConsentSubject | null => {
	const mapped: ConsentSubject = { subjectId: subject.id };
	if (typeof subject.externalId === 'string' && subject.externalId) {
		mapped.externalId = subject.externalId;
		if (
			typeof subject.identityProvider === 'string' &&
			subject.identityProvider
		) {
			mapped.identityProvider = subject.identityProvider;
		}
	}
	return mapped;
};

/** A directive is kept only when every part of it is well formed. */
const mapDirective = (
	directive: PrivacyDirectiveWire,
	now: number
): PrivacyOptOut | undefined => {
	if (directive.source !== 'gpc') {
		return undefined;
	}
	if (checkTimestamp(directive.recordedAt, now)) {
		return undefined;
	}
	const categories: OptionalConsentCategory[] = [];
	for (const category of directive.categories) {
		if (!isOptionalConsentCategory(category) || categories.includes(category)) {
			return undefined;
		}
		categories.push(category);
	}
	if (categories.length === 0) {
		return undefined;
	}
	return {
		categories: categories.sort((left, right) => left.localeCompare(right)),
		recordedAt: directive.recordedAt,
		source: 'gpc',
	};
};

/**
 * Maps a subject read onto hydration records.
 *
 * `choice` is `null` when the backend holds no usable receipt: none at all,
 * or a set that fails validation. The kernel treats both as no explicit
 * choice, which under opt-in means denied until the subject decides.
 */
export const mapSubjectRecordToHydrationRecords =
	function mapSubjectRecordToHydrationRecords(
		record: SubjectRecordWire,
		options: MapSubjectRecordOptions
	): TransportHydrationRecords {
		const wire =
			record.subjectChoice === undefined
				? mergeItems(record.consents)
				: record.subjectChoice;
		const validated = wire
			? validateExplicitChoice(wire, options.now)
			: undefined;

		const directives: PrivacyOptOut[] = [];
		for (const directive of record.privacyDirectives ?? []) {
			const mapped = mapDirective(directive, options.now);
			if (mapped) {
				directives.push(mapped);
			}
		}

		return {
			choice: validated?.ok ? validated.record : null,
			now: options.now,
			optOutDirectives: directives,
			subject: mapSubject(record.subject),
		};
	};

/**
 * Revives the date strings a JSON subject read carries.
 *
 * `GetSubjectOutput` types `givenAt` and friends as `Date`; over the wire
 * they are ISO strings. Applied at the transport boundary so the mapper can
 * take the schema type at its word.
 */
export const reviveSubjectRecord = function reviveSubjectRecord(
	raw: unknown
): SubjectRecordWire | undefined {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		return undefined;
	}
	const record = raw as Record<string, unknown>;
	const { subject, consents } = record;
	if (
		typeof subject !== 'object' ||
		subject === null ||
		typeof (subject as { id?: unknown }).id !== 'string' ||
		!Array.isArray(consents)
	) {
		return undefined;
	}
	const revive = (value: unknown): Date | undefined => {
		if (value instanceof Date) {
			return value;
		}
		if (typeof value === 'string' || typeof value === 'number') {
			return new Date(value);
		}
		return undefined;
	};
	const items: ConsentItem[] = [];
	for (const entry of consents) {
		if (typeof entry !== 'object' || entry === null) {
			continue;
		}
		const item = entry as Record<string, unknown>;
		const givenAt = revive(item.givenAt);
		if (
			!givenAt ||
			typeof item.id !== 'string' ||
			typeof item.type !== 'string'
		) {
			continue;
		}
		items.push({
			...(item as unknown as ConsentItem),
			givenAt,
			isLatestPolicy: item.isLatestPolicy === true,
			policyEffectiveDate: revive(item.policyEffectiveDate),
		});
	}
	const subjectRecord = subject as Record<string, unknown>;
	return {
		...(record as unknown as SubjectRecordWire),
		consents: items,
		subject: {
			...(subjectRecord as unknown as GetSubjectOutput['subject']),
			createdAt: revive(subjectRecord.createdAt),
		},
	};
};
