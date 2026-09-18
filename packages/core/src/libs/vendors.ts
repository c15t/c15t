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
	/** Already-resolved vendors to merge over. Their presentation wins. */
	existing?: readonly ResolvedVendor[];
	/** Vendors declared in code through the runtime option. */
	config?: readonly Vendor[];
	/** Vendors declared by the backend or a manifest. */
	manifest?: readonly Vendor[];
	/** Scripts and network rules that carry a `vendor` slug. */
	owners?: readonly VendorOwner[];
	/** Called once per vendor that has no presentable declaration. */
	onWarn?: (message: string) => void;
}

const SOURCE_RANK: Record<VendorSource, number> = {
	config: 0,
	manifest: 1,
	script: 2,
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
		disabled: vendor.disabled ?? (onlyNecessary(vendor.category) || undefined),
		presentable: isPresentable(vendor),
		source,
	};
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
		if (!existing) {
			byId.set(vendor.id, vendor);
			changed = true;
			continue;
		}
		if (SOURCE_RANK[vendor.source] <= SOURCE_RANK[existing.source]) {
			if (!sameVendor(existing, vendor)) {
				byId.set(vendor.id, vendor);
				changed = true;
			}
		}
	}
	if (!changed) {
		return current;
	}
	return [...byId.values()].sort((left, right) =>
		left.id.localeCompare(right.id)
	);
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
		JSON.stringify(left.category) === JSON.stringify(right.category)
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
		if (
			!existing ||
			SOURCE_RANK[candidate.source] < SOURCE_RANK[existing.source]
		) {
			byId.set(candidate.id, candidate);
		}
	};
	for (const vendor of input.config ?? []) {
		place(toResolved(vendor, 'config'));
	}
	for (const vendor of input.manifest ?? []) {
		place(toResolved(vendor, 'manifest'));
	}

	// Scripts and rules only know the slug and their own category. Collect
	// every owner's category so a slug-only vendor still lands under the
	// categories that gate it.
	const ownerCategories = new Map<string, HasCondition<AllConsentNames>[]>();
	for (const owner of input.owners ?? []) {
		if (!owner.vendor) {
			continue;
		}
		const list = ownerCategories.get(owner.vendor) ?? [];
		list.push(owner.category);
		ownerCategories.set(owner.vendor, list);
	}
	for (const [id, categories] of ownerCategories) {
		if (byId.has(id)) {
			continue;
		}
		const category: HasCondition<AllConsentNames> =
			categories.length === 1 && categories[0] !== undefined
				? categories[0]
				: { or: categories };
		byId.set(id, {
			category,
			disabled: onlyNecessary(category) || undefined,
			id,
			presentable: false,
			source: 'script',
		});
		input.onWarn?.(
			`[c15t] Vendor "${id}" is referenced by a script or rule but has no declaration with a name and privacy policy URL. It gates loading but is hidden from the preference surface until declared in \`vendors\`.`
		);
	}

	return [...byId.values()].sort((left, right) =>
		left.id.localeCompare(right.id)
	);
};
