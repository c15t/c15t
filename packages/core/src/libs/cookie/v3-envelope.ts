/**
 * @packageDocumentation
 * Reads consent records written by c15t v3.
 *
 * @remarks
 * v3 stores its record under the same `c15t` cookie and localStorage key
 * as v2, in a different format:
 *
 * - Cookie: `v=3&sid=<id>&b=<basis>|<basis>&me=<0|1>.<confirmedAt>.<basisIndex>&…`
 * - localStorage: `{"version":3,"subject":{…},"categories":{…},"iab":{…}}`
 *
 * Sites on v2 and v3 can share one cookie domain while they upgrade at
 * different times. This module turns a v3 record into the v2 shape so a
 * choice made on a v3 site keeps applying on a v2 site, with the same
 * subject ID.
 *
 * @internal
 */

import type { ConsentState } from '../../types/compliance';
import type { ConsentInfo } from '../../types/consent-types';

const V3_CATEGORIES = [
	'functionality',
	'experience',
	'measurement',
	'marketing',
] as const;

type V3Category = (typeof V3_CATEGORIES)[number];

const COMPACT_CATEGORY_CODES: Record<string, V3Category> = {
	fn: 'functionality',
	ex: 'experience',
	me: 'measurement',
	mk: 'marketing',
};

const COMPACT_PREFIX = 'v=3';
const DIGITS_ONLY = /^\d+$/;

interface V3Decision {
	value: boolean;
	confirmedAt: number;
	/** v2 material policy fingerprint, when v3 kept the choice from v2. */
	legacyFingerprint?: string;
}

interface V3Envelope {
	subjectId?: string;
	externalId?: string;
	identityProvider?: string;
	epoch?: number;
	categories: Partial<Record<V3Category, V3Decision>>;
	customVendorConsents?: Record<string, boolean>;
	customVendorLegitimateInterests?: Record<string, boolean>;
}

/**
 * A v3 record converted to the shape v2 storage reads return.
 *
 * @internal
 */
export interface V2RecordFromV3 {
	consents: ConsentState;
	consentInfo: ConsentInfo;
	iabCustomVendorConsents?: Record<string, boolean>;
	iabCustomVendorLegitimateInterests?: Record<string, boolean>;
}

function decode(value: string): string | undefined {
	try {
		const decoded = decodeURIComponent(value);
		return decoded.length > 0 ? decoded : undefined;
	} catch {
		return undefined;
	}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function nonEmptyString(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Copies own boolean entries. `__proto__` ids are dropped. */
function readBooleanMap(input: unknown): Record<string, boolean> | undefined {
	if (!isPlainObject(input)) {
		return undefined;
	}
	const map: Record<string, boolean> = {};
	for (const [key, value] of Object.entries(input)) {
		if (typeof value === 'boolean' && key !== '__proto__') {
			map[key] = value;
		}
	}
	return Object.keys(map).length > 0 ? map : undefined;
}

/**
 * Whether a stored value is a v3 record in either encoding: the compact
 * cookie string or the parsed localStorage JSON.
 *
 * @internal
 */
export function isV3ConsentRecord(value: unknown): boolean {
	if (typeof value === 'string') {
		return value === COMPACT_PREFIX || value.startsWith(`${COMPACT_PREFIX}&`);
	}
	return isPlainObject(value) && value.version === 3;
}

/** The v2 fingerprint of a `legacy-v2` basis (`l<fingerprint>`). */
function parseCompactBasis(entry: string): string | undefined {
	return entry.charAt(0) === 'l' ? decode(entry.slice(1)) : undefined;
}

function parseCompactDecision(
	value: string,
	bases: (string | undefined)[]
): V3Decision | undefined {
	const [flag, time, index, ...rest] = value.split('.');
	if (
		rest.length > 0 ||
		(flag !== '0' && flag !== '1') ||
		!time ||
		!DIGITS_ONLY.test(time)
	) {
		return undefined;
	}
	const confirmedAt = Number(time);
	if (!isTimestamp(confirmedAt)) {
		return undefined;
	}
	const legacyFingerprint =
		index && DIGITS_ONLY.test(index) ? bases[Number(index)] : undefined;
	return {
		confirmedAt,
		value: flag === '1',
		...(legacyFingerprint ? { legacyFingerprint } : {}),
	};
}

function parseCompactBooleanMap(
	value: string
): Record<string, boolean> | undefined {
	const map: Record<string, boolean> = {};
	for (const entry of value.split('|')) {
		const separator = entry.indexOf('.');
		const flag = entry.slice(0, separator);
		const id = separator > 0 ? decode(entry.slice(separator + 1)) : undefined;
		if ((flag === '0' || flag === '1') && id && id !== '__proto__') {
			map[id] = flag === '1';
		}
	}
	return Object.keys(map).length > 0 ? map : undefined;
}

function parseCompactEnvelope(raw: string): V3Envelope {
	const fields = new Map<string, string>();
	for (const part of raw.split('&').slice(1)) {
		const separator = part.indexOf('=');
		if (separator > 0) {
			fields.set(part.slice(0, separator), part.slice(separator + 1));
		}
	}

	const bases = (fields.get('b') ?? '').split('|').map(parseCompactBasis);

	const envelope: V3Envelope = { categories: {} };
	for (const [key, value] of fields) {
		const category = COMPACT_CATEGORY_CODES[key];
		if (category) {
			const decision = parseCompactDecision(value, bases);
			if (decision) {
				envelope.categories[category] = decision;
			}
		}
	}

	const epoch = fields.get('e');
	if (epoch && DIGITS_ONLY.test(epoch)) {
		envelope.epoch = Number(epoch);
	}
	const subjectId = fields.get('sid');
	const externalId = fields.get('eid');
	const identityProvider = fields.get('idp');
	envelope.subjectId = subjectId ? decode(subjectId) : undefined;
	envelope.externalId = externalId ? decode(externalId) : undefined;
	envelope.identityProvider = identityProvider
		? decode(identityProvider)
		: undefined;

	const consents = fields.get('icv');
	const legitimateInterests = fields.get('icvli');
	envelope.customVendorConsents = consents
		? parseCompactBooleanMap(consents)
		: undefined;
	envelope.customVendorLegitimateInterests = legitimateInterests
		? parseCompactBooleanMap(legitimateInterests)
		: undefined;
	return envelope;
}

function parseJsonDecision(input: unknown): V3Decision | undefined {
	if (
		!isPlainObject(input) ||
		typeof input.value !== 'boolean' ||
		!isTimestamp(input.confirmedAt)
	) {
		return undefined;
	}
	const basis = isPlainObject(input.basis) ? input.basis : {};
	const legacyFingerprint =
		basis.kind === 'legacy-v2'
			? nonEmptyString(basis.materialFingerprint)
			: undefined;
	return {
		confirmedAt: input.confirmedAt,
		value: input.value,
		...(legacyFingerprint ? { legacyFingerprint } : {}),
	};
}

function parseJsonEnvelope(input: Record<string, unknown>): V3Envelope {
	const envelope: V3Envelope = { categories: {} };
	const categories = isPlainObject(input.categories) ? input.categories : {};
	for (const category of V3_CATEGORIES) {
		const decision = parseJsonDecision(categories[category]);
		if (decision) {
			envelope.categories[category] = decision;
		}
	}
	if (isTimestamp(input.epoch)) {
		envelope.epoch = input.epoch;
	}
	const subject = isPlainObject(input.subject) ? input.subject : {};
	envelope.subjectId = nonEmptyString(subject.subjectId);
	envelope.externalId = nonEmptyString(subject.externalId);
	envelope.identityProvider = nonEmptyString(subject.identityProvider);
	const iab = isPlainObject(input.iab) ? input.iab : {};
	envelope.customVendorConsents = readBooleanMap(iab.customVendorConsents);
	envelope.customVendorLegitimateInterests = readBooleanMap(
		iab.customVendorLegitimateInterests
	);
	return envelope;
}

/**
 * The v2 material policy fingerprint every decision was made under, or
 * `undefined`. Only `legacy-v2` decisions carry one: v3's own fingerprint is
 * computed differently, and handing it to v2 would read as a policy change
 * and revoke every grant.
 */
function sharedLegacyFingerprint(
	decisions: readonly V3Decision[]
): string | undefined {
	const [first, ...rest] = decisions;
	const fingerprint = first?.legacyFingerprint;
	if (!fingerprint) {
		return undefined;
	}
	return rest.every((decision) => decision.legacyFingerprint === fingerprint)
		? fingerprint
		: undefined;
}

/**
 * Converts a v3 record to the v2 storage shape.
 *
 * @param value - A stored value for which {@link isV3ConsentRecord} is true:
 * the compact cookie string or the parsed localStorage JSON.
 * @returns The v2 record, or `null` when the record holds no usable
 * category decision, so the visitor is asked again.
 *
 * @remarks
 * Categories v3 holds no decision for are denied, as v2 expects every
 * category to be set. Decisions confirmed before the record's clear epoch
 * are void in v3 and are dropped here too. `consentInfo.time` is the latest
 * confirmation time.
 *
 * @internal
 */
export function convertV3ConsentRecord(value: unknown): V2RecordFromV3 | null {
	let envelope: V3Envelope;
	if (typeof value === 'string') {
		envelope = parseCompactEnvelope(value);
	} else if (isPlainObject(value)) {
		envelope = parseJsonEnvelope(value);
	} else {
		return null;
	}

	const consents: ConsentState = {
		experience: false,
		functionality: false,
		marketing: false,
		measurement: false,
		necessary: true,
	};
	const decisions: V3Decision[] = [];
	for (const category of V3_CATEGORIES) {
		const decision = envelope.categories[category];
		if (!decision) {
			continue;
		}
		if (envelope.epoch !== undefined && decision.confirmedAt < envelope.epoch) {
			continue;
		}
		consents[category] = decision.value;
		decisions.push(decision);
	}

	if (decisions.length === 0) {
		return null;
	}

	const consentInfo: ConsentInfo = {
		time: Math.max(...decisions.map((decision) => decision.confirmedAt)),
	};
	if (envelope.subjectId) {
		consentInfo.subjectId = envelope.subjectId;
	}
	if (envelope.externalId) {
		consentInfo.externalId = envelope.externalId;
	}
	if (envelope.identityProvider) {
		consentInfo.identityProvider = envelope.identityProvider;
	}
	const fingerprint = sharedLegacyFingerprint(decisions);
	if (fingerprint) {
		consentInfo.materialPolicyFingerprint = fingerprint;
	}

	const record: V2RecordFromV3 = { consentInfo, consents };
	if (envelope.customVendorConsents) {
		record.iabCustomVendorConsents = envelope.customVendorConsents;
	}
	if (envelope.customVendorLegitimateInterests) {
		record.iabCustomVendorLegitimateInterests =
			envelope.customVendorLegitimateInterests;
	}
	return record;
}
