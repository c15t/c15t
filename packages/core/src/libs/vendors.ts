/**
 * Vendor declaration resolution.
 *
 * Vendors reach the kernel from three places: the runtime's `vendors`
 * option, the `vendor` slug on scripts and network rules, and the backend's
 * `/init` response. Existence is the union of all three. Presentation
 * (name, privacy policy, description) follows config over manifest and
 * ignores scripts, which only carry the slug. The category follows config,
 * then manifest, then an `or` of every owning script's or rule's category.
 *
 * Pure. No DOM, no kernel access.
 */

import type { Vendor } from '@c15t/schema/types';

import type { AllConsentNames } from '../consent/consent-types';
import type { ResolvedVendor, VendorSource } from '../types';
import type { HasCondition } from './has';
import { extractConsentNamesFromCondition } from './has';

/** A script or network rule that names the vendor it belongs to. */
export interface VendorOwner {
	vendor?: string;
	category: HasCondition<AllConsentNames>;
}

export interface ResolveVendorsInput {
	/**
	 * Already-resolved vendors to merge over. Pass only the entries that
	 * should survive: a caller applying a fresh manifest list drops the
	 * previous manifest entries first, so the backend can update or remove
	 * a vendor.
	 */
	existing?: readonly ResolvedVendor[];
	/** Vendors declared in code through the runtime option. */
	config?: readonly Vendor[];
	/** Vendors declared by the backend or a manifest. */
	manifest?: readonly Vendor[];
	/** Scripts and network rules that carry a `vendor` slug. */
	owners?: readonly VendorOwner[];
	/** Called once per vendor that is dropped or has no presentable declaration. */
	onWarn?: (message: string) => void;
}
const SOURCE_RANK: Record<VendorSource, number> = {
	config: 0,
	manifest: 1,
	script: 2,
};

/**
 * The slug shape the wire accepts as a `vendorChoice.grants` key. A script
 * or rule slug that does not match would make every save fail backend
 * validation, so it is dropped at declaration with a warning instead.
 */
const VENDOR_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/u;

const invalidSlugWarning = (id: string): string =>
	`[c15t] Vendor id "${id}" is not a lowercase slug of up to 64 characters (letters, digits, ".", "_" and "-"). It is ignored: anything it names is gated by its category only.`;

/** Whether a string is a slug the wire schema accepts. */
export const isValidVendorId = function isValidVendorId(
	value: string
): boolean {
	return VENDOR_ID_PATTERN.test(value);
};

const isPresentable = function isPresentable(
	vendor: Pick<Vendor, 'name' | 'privacyPolicyUrl'> | ResolvedVendor
): boolean {
	return (
		typeof vendor.name === 'string' &&
		vendor.name.length > 0 &&
		typeof vendor.privacyPolicyUrl === 'string' &&
		vendor.privacyPolicyUrl.length > 0
	);
};

/** Whether a category condition only ever resolves to `necessary`. */
const onlyNecessary = function onlyNecessary(
	category: HasCondition<AllConsentNames>
): boolean {
	const names = extractConsentNamesFromCondition(category);
	return names.length > 0 && names.every((name) => name === 'necessary');
};

/** Plain JSON copy so freezing the snapshot never freezes caller config. */
const copyCategory = function copyCategory(
	category: HasCondition<AllConsentNames>
): HasCondition<AllConsentNames> {
	return typeof category === 'string'
		? category
		: (JSON.parse(JSON.stringify(category)) as HasCondition<AllConsentNames>);
};

const toResolved = function toResolved(
	vendor: Vendor,
	source: VendorSource
): ResolvedVendor {
	return {
		...vendor,
		category: copyCategory(vendor.category),
		// A vendor that only ever falls under `necessary` can never be turned
		// off, whatever the declaration says.
		disabled: onlyNecessary(vendor.category) ? true : vendor.disabled,
		presentable: isPresentable(vendor),
		source,
	};
};

const sameVendor = function sameVendor(
	left: ResolvedVendor,
	right: ResolvedVendor
): boolean {
	return (
		left.source === right.source &&
		left.name === right.name &&
		left.privacyPolicyUrl === right.privacyPolicyUrl &&
		left.description === right.description &&
		left.legalName === right.legalName &&
		left.homepageUrl === right.homepageUrl &&
		left.disabled === right.disabled &&
		JSON.stringify(left.category) === JSON.stringify(right.category) &&
		JSON.stringify(left.ownerCategory) ===
			JSON.stringify(right.ownerCategory) &&
		JSON.stringify(left.shadowed) === JSON.stringify(right.shadowed)
	);
};

/**
 * A declared entry that remembers the owners of its slug. The category lands
 * on the outermost declaration that has none yet and on the copy it shadows,
 * so whichever declaration is left after a removal still knows its owners.
 */
const withOwners = function withOwners(
	vendor: ResolvedVendor,
	ownerCategory: HasCondition<AllConsentNames>
): ResolvedVendor {
	if (vendor.source === 'script') {
		return vendor;
	}
	const next: ResolvedVendor = { ...vendor };
	if (!next.ownerCategory) {
		next.ownerCategory = ownerCategory;
	}
	if (next.shadowed) {
		next.shadowed = withOwners(next.shadowed, ownerCategory);
	}
	return next;
};

/** Whether two resolved lists hold the same vendors, in any order. */
export const sameDeclaredVendors = function sameDeclaredVendors(
	left: readonly ResolvedVendor[],
	right: readonly ResolvedVendor[]
): boolean {
	if (left.length !== right.length) {
		return false;
	}
	const byId = new Map(right.map((vendor) => [vendor.id, vendor]));
	return left.every((vendor) => {
		const other = byId.get(vendor.id);
		return other !== undefined && sameVendor(vendor, other);
	});
};

/** One condition for every owner of a slug. */
const ownerCondition = function ownerCondition(
	categories: readonly HasCondition<AllConsentNames>[]
): HasCondition<AllConsentNames> {
	return categories.length === 1 && categories[0] !== undefined
		? categories[0]
		: { or: [...categories] };
};

/** The script-sourced entry a set of owner categories would produce. */
const scriptEntry = function scriptEntry(
	id: string,
	category: HasCondition<AllConsentNames>
): ResolvedVendor {
	return {
		category,
		disabled: onlyNecessary(category) || undefined,
		id,
		presentable: false,
		source: 'script',
	};
};

/**
 * The lower-priority declaration an entry shadows, when its own source is
 * removed: the manifest copy a config entry replaced, or the script-sourced
 * entry the owners of the slug would produce. `null` when nothing else
 * declares the vendor.
 */
export const ownerFallback = function ownerFallback(
	vendor: ResolvedVendor
): ResolvedVendor | null {
	if (vendor.shadowed) {
		return vendor.shadowed;
	}
	if (!vendor.ownerCategory) {
		return null;
	}
	return scriptEntry(vendor.id, vendor.ownerCategory);
};

/** The entry without its shadow, keeping the owners the shadow knew. */
const withoutShadow = function withoutShadow(
	vendor: ResolvedVendor
): ResolvedVendor {
	const { shadowed, ...rest } = vendor;
	const next: ResolvedVendor = rest;
	if (!next.ownerCategory && shadowed?.ownerCategory) {
		next.ownerCategory = shadowed.ownerCategory;
	}
	return next;
};

/**
 * One incoming declaration merged onto the entry already held for its id.
 * Returns `existing` itself when nothing changes, so callers can detect a
 * no-op by reference.
 *
 * A higher- or equal-priority copy replaces the entry and takes over what it
 * remembered: a config entry arriving over a backend one shadows it, one
 * arriving over a script fallback keeps the owners, and a newer copy of the
 * same source inherits both. A backend copy arriving under a config entry
 * becomes that entry's shadow instead.
 */
const mergeEntry = function mergeEntry(
	existing: ResolvedVendor,
	incoming: ResolvedVendor
): ResolvedVendor {
	if (SOURCE_RANK[incoming.source] > SOURCE_RANK[existing.source]) {
		const shadowable =
			existing.source === 'config' && incoming.source === 'manifest';
		if (
			shadowable &&
			!(existing.shadowed && sameVendor(existing.shadowed, incoming))
		) {
			return { ...existing, shadowed: incoming };
		}
		return existing;
	}
	const next: ResolvedVendor = { ...incoming };
	if (existing.source === incoming.source) {
		next.ownerCategory ??= existing.ownerCategory;
		next.shadowed ??= existing.shadowed;
	} else if (existing.source === 'script') {
		next.ownerCategory ??= existing.category;
	} else {
		next.shadowed ??= existing;
	}
	return sameVendor(existing, next) ? existing : next;
};

/**
 * A resolved list with one source's entries removed, each replaced by the
 * declaration it shadowed, if any. The input to a fresh merge of that
 * source, so a vendor the backend or the runtime option dropped keeps the
 * copy another source still declares.
 */
export const withoutSourceVendors = function withoutSourceVendors(
	declared: readonly ResolvedVendor[],
	source: VendorSource
): ResolvedVendor[] {
	const kept: ResolvedVendor[] = [];
	for (const vendor of declared) {
		if (vendor.source !== source) {
			// A shadow of the removed source goes too, or a later removal of
			// the winner would restore a copy that source no longer declares.
			kept.push(
				vendor.shadowed?.source === source ? withoutShadow(vendor) : vendor
			);
			continue;
		}
		const fallback = ownerFallback(vendor);
		if (fallback) {
			kept.push(fallback);
		}
	}
	return kept;
};

/** `withoutSourceVendors` for the backend's entries. */
export const withoutManifestVendors = function withoutManifestVendors(
	declared: readonly ResolvedVendor[]
): ResolvedVendor[] {
	return withoutSourceVendors(declared, 'manifest');
};

/**
 * Merge two resolved lists by id. The entry with the higher-priority source
 * keeps its presentation; when the sources tie the incoming entry wins so a
 * newer declaration of the same vendor updates its copy.
 */
export const mergeDeclaredVendors = function mergeDeclaredVendors(
	current: readonly ResolvedVendor[],
	incoming: readonly ResolvedVendor[]
): readonly ResolvedVendor[] {
	if (incoming.length === 0) {
		return current;
	}
	const byId = new Map<string, ResolvedVendor>();
	for (const vendor of current) {
		byId.set(vendor.id, vendor);
	}
	let changed = false;
	for (const vendor of incoming) {
		const existing = byId.get(vendor.id);
		const next = existing ? mergeEntry(existing, vendor) : vendor;
		if (next !== existing) {
			byId.set(vendor.id, next);
			changed = true;
		}
	}
	if (!changed) {
		return current;
	}
	return [...byId.values()].sort((left, right) =>
		left.id.localeCompare(right.id)
	);
};

/**
 * Resolve every declaration source into one list sorted by id.
 *
 * @param input - Declarations from config, manifest and owning integrations.
 * @returns Resolved vendors. Empty when nothing is declared.
 */
export const resolveVendors = function resolveVendors(
	input: ResolveVendorsInput
): readonly ResolvedVendor[] {
	const byId = new Map<string, ResolvedVendor>();
	for (const vendor of input.existing ?? []) {
		byId.set(vendor.id, vendor);
	}
	const place = (candidate: ResolvedVendor) => {
		const existing = byId.get(candidate.id);
		byId.set(
			candidate.id,
			existing ? mergeEntry(existing, candidate) : candidate
		);
	};
	// A declared id that the wire cannot carry as a grant key is dropped with
	// a warning, the same way an owner slug is: one bad id would otherwise
	// make every save fail backend validation.
	const declare = (vendor: Vendor, source: 'config' | 'manifest') => {
		if (!isValidVendorId(vendor.id)) {
			input.onWarn?.(invalidSlugWarning(vendor.id));
			return;
		}
		place(toResolved(vendor, source));
	};
	for (const vendor of input.config ?? []) {
		declare(vendor, 'config');
	}
	for (const vendor of input.manifest ?? []) {
		declare(vendor, 'manifest');
	}

	// Scripts and rules only know the slug and their own category. Collect
	// every owner's category so a slug-only vendor still lands under the
	// categories that gate it.
	const ownerCategories = new Map<string, HasCondition<AllConsentNames>[]>();
	for (const owner of input.owners ?? []) {
		if (!owner.vendor) {
			continue;
		}
		if (!isValidVendorId(owner.vendor)) {
			input.onWarn?.(invalidSlugWarning(owner.vendor));
			continue;
		}
		const list = ownerCategories.get(owner.vendor) ?? [];
		list.push(owner.category);
		ownerCategories.set(owner.vendor, list);
	}
	for (const [id, categories] of ownerCategories) {
		const existing = byId.get(id);
		// A declared vendor keeps its own presentation, but its owners' categories
		// are remembered so that dropping the declaration later leaves a
		// script-sourced fallback rather than nothing.
		if (existing) {
			byId.set(id, withOwners(existing, ownerCondition(categories)));
			continue;
		}
		const category = ownerCondition(categories);
		byId.set(id, scriptEntry(id, category));
		input.onWarn?.(
			`[c15t] Vendor "${id}" is referenced by a script or rule but has no declaration with a name and privacy policy URL. It gates loading but is hidden from the preference surface until declared in \`vendors\`.`
		);
	}

	return [...byId.values()].sort((left, right) =>
		left.id.localeCompare(right.id)
	);
};
