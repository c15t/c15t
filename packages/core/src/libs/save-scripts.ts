/**
 * The scripts a page configured, as a consent save carries them.
 *
 * Each entry keeps only the fields that decide whether a script may run:
 * its category condition, vendor, IAB requirements and loading flags. No
 * source URL, inline code or callback leaves the page. A backend stores
 * the list beside the consent record and can work out which scripts the
 * recorded consent allowed.
 *
 * An entry the backend would reject is dropped here rather than sent, so a
 * malformed script config never costs the visitor their consent record.
 *
 * @packageDocumentation
 */
import { allConsentNames } from '../consent/consent-types';
import type { AllConsentNames } from '../consent/consent-types';
import type { ConsentSnapshot } from '../types';
import type { HasCondition } from './has';
import type { Script } from './script-loader/types';
import { isValidVendorId } from './vendors';

/** Most entries one save carries. Matches the POST /subjects limit. */
export const MAX_SAVE_SCRIPTS = 256;
/** Longest script id a save carries. Matches the POST /subjects limit. */
export const MAX_SAVE_SCRIPT_ID_LENGTH = 256;
const MAX_IAB_IDS = 64;
const MAX_CONDITION_DEPTH = 16;

/**
 * A configured script's gating fields, as sent with a consent save.
 *
 * @public
 */
export interface SaveScript {
	/** The script's `id`. */
	id: string;
	/** The category condition the script loads under. */
	category: HasCondition<AllConsentNames>;
	/**
	 * Vendor slug for vendor-level consent outside IAB. Left off when the
	 * gate ignores the visitor's denial of it; see {@link withHonoredVendors}.
	 */
	vendor?: string;
	/** IAB TCF vendor ID. */
	vendorId?: number | string;
	/** IAB TCF purposes the script needs consent for. */
	iabPurposes?: number[];
	/** IAB TCF purposes the script can use under legitimate interest. */
	iabLegIntPurposes?: number[];
	/** IAB TCF special features the script needs. */
	iabSpecialFeatures?: number[];
	/** Present when the script loads regardless of consent. */
	alwaysLoad?: true;
	/** Present when the script mounts no element and only runs callbacks. */
	callbackOnly?: true;
	/** Present when the script stays on the page after consent is revoked. */
	persistAfterConsentRevoked?: true;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isCondition = function isCondition(value: unknown, depth = 0): boolean {
	if (typeof value === 'string') {
		return (allConsentNames as readonly string[]).includes(value);
	}
	if (!isRecord(value) || depth >= MAX_CONDITION_DEPTH) {
		return false;
	}
	const keys = Object.keys(value);
	const [key] = keys;
	if (keys.length !== 1 || key === undefined) {
		return false;
	}
	const operand = value[key];
	if (key === 'not') {
		return isCondition(operand, depth + 1);
	}
	if (key !== 'and' && key !== 'or') {
		return false;
	}
	return Array.isArray(operand)
		? operand.length > 0 &&
				operand.every((item) => isCondition(item, depth + 1))
		: isCondition(operand, depth + 1);
};

const isIabIds = (value: unknown): value is number[] =>
	Array.isArray(value) &&
	value.length <= MAX_IAB_IDS &&
	value.every((id) => Number.isSafeInteger(id) && id >= 1);

const isVendorId = (value: unknown): value is number | string =>
	(typeof value === 'number' && Number.isSafeInteger(value) && value >= 1) ||
	(typeof value === 'string' && value.length > 0 && value.length <= 64);

const OPTIONAL_KEYS = new Set([
	'alwaysLoad',
	'callbackOnly',
	'iabLegIntPurposes',
	'iabPurposes',
	'iabSpecialFeatures',
	'persistAfterConsentRevoked',
	'vendor',
	'vendorId',
]);

/**
 * Whether `value` is an entry a backend accepts. The save outbox checks
 * stored entries with this before replaying them.
 *
 * @param value - A candidate entry.
 * @returns `true` when every field is present in its accepted form.
 * @internal
 */
export const isSaveScript = function isSaveScript(
	value: unknown
): value is SaveScript {
	if (
		!isRecord(value) ||
		typeof value.id !== 'string' ||
		value.id.length === 0 ||
		value.id.length > MAX_SAVE_SCRIPT_ID_LENGTH ||
		!isCondition(value.category)
	) {
		return false;
	}
	return Object.entries(value).every(([key, field]) => {
		if (key === 'id' || key === 'category') {
			return true;
		}
		if (!OPTIONAL_KEYS.has(key)) {
			return false;
		}
		switch (key) {
			case 'vendor':
				return typeof field === 'string' && isValidVendorId(field);
			case 'vendorId':
				return isVendorId(field);
			case 'iabPurposes':
			case 'iabLegIntPurposes':
			case 'iabSpecialFeatures':
				return isIabIds(field);
			default:
				return field === true;
		}
	});
};

/**
 * Whether `value` is a list of entries a backend accepts.
 *
 * @param value - A candidate list.
 * @returns `true` for an array within the size limit of valid entries.
 * @internal
 */
export const isSaveScripts = (value: unknown): value is SaveScript[] =>
	Array.isArray(value) &&
	value.length <= MAX_SAVE_SCRIPTS &&
	value.every(isSaveScript);

/**
 * The gating fields of each script, leaving out any the backend would
 * reject. An invalid vendor slug is left off its entry, since the vendor
 * gate ignores it too. A script is left out when its id or category is
 * invalid, or when its `vendorId` or a nonempty IAB list is: the loader
 * still gates it as an IAB script, and the backend would read the rest as
 * a category-only one.
 *
 * @param scripts - Configured scripts.
 * @returns One entry per valid script, in input order.
 * @internal
 */
export const toSaveScripts = function toSaveScripts(
	scripts: readonly Script[]
): SaveScript[] {
	const entries: SaveScript[] = [];
	for (const script of scripts) {
		const entry: SaveScript = { category: script.category, id: script.id };
		if (typeof script.vendor === 'string' && isValidVendorId(script.vendor)) {
			entry.vendor = script.vendor;
		}
		if (script.vendorId !== undefined) {
			if (!isVendorId(script.vendorId)) {
				continue;
			}
			entry.vendorId = script.vendorId;
		}
		let unreadable = false;
		for (const key of [
			'iabPurposes',
			'iabLegIntPurposes',
			'iabSpecialFeatures',
		] as const) {
			const ids: unknown = script[key];
			// Same test as the loader's `hasIabMeta`: an empty list gates nothing.
			if (!ids || (ids as { length?: unknown }).length === 0) {
				continue;
			}
			if (!isIabIds(ids)) {
				unreadable = true;
				break;
			}
			entry[key] = [...ids];
		}
		if (unreadable) {
			continue;
		}
		for (const key of [
			'alwaysLoad',
			'callbackOnly',
			'persistAfterConsentRevoked',
		] as const) {
			if (script[key] === true) {
				entry[key] = true;
			}
		}
		if (isSaveScript(entry)) {
			entries.push(entry);
		}
	}
	return entries;
};

/**
 * One list from every loader's entries: identical entries once, in the
 * order first declared, capped at {@link MAX_SAVE_SCRIPTS}.
 *
 * @param lists - Each loader's entries.
 * @returns The merged list, or `undefined` when no loader declared any.
 * @internal
 */
export const mergeSaveScripts = function mergeSaveScripts(
	lists: Iterable<readonly SaveScript[]>
): SaveScript[] | undefined {
	const seen = new Set<string>();
	const merged: SaveScript[] = [];
	for (const list of lists) {
		for (const entry of list) {
			const key = JSON.stringify(entry);
			if (!seen.has(key) && merged.length < MAX_SAVE_SCRIPTS) {
				seen.add(key);
				merged.push(entry);
			}
		}
	}
	return merged.length > 0 ? merged : undefined;
};

/**
 * The entries with the vendor slug left off where the vendor gate ignores
 * the visitor's denial: the vendor is not declared, or is declared
 * `disabled`. The save still sends that denial so other devices keep it,
 * and a backend reading the slug would block a script the browser loaded.
 *
 * @param scripts - Entries to send.
 * @param snapshot - The snapshot the save records.
 * @returns The entries as the vendor gate reads them.
 * @internal
 */
export const withHonoredVendors = function withHonoredVendors(
	scripts: readonly SaveScript[],
	snapshot: Pick<ConsentSnapshot, 'vendorChoice' | 'vendors'>
): SaveScript[] {
	// Same rule as `deniedVendorIds`: a denial counts only for a vendor the
	// visitor can still see and switch.
	const toggleable = new Set(
		(snapshot.vendors?.declared ?? [])
			.filter((vendor) => vendor.disabled !== true)
			.map((vendor) => vendor.id)
	);
	const ignored = new Set(
		(snapshot.vendorChoice?.denied ?? []).filter((id) => !toggleable.has(id))
	);
	return scripts.map((entry) => {
		if (entry.vendor === undefined || !ignored.has(entry.vendor)) {
			return entry;
		}
		const { vendor: _ignored, ...rest } = entry;
		return rest;
	});
};
