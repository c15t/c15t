/**
 * The words an IAB disclosure is allowed to use, and nothing else.
 *
 * The strings are `iab.preferenceCenter`, `iab.common`, and `iab.banner.title`
 * in `packages/translations/src/translations/en.ts`, copied rather than
 * imported: that bundle is a runtime dependency of the web surfaces and this
 * package ships without one, so a phone carries the English the product ships
 * and a host passes {@link ConsentIabDrawerProps.copy} to say anything else.
 *
 * `{count}` stays a placeholder in the templates rather than becoming a
 * function, so an override keeps the same hole to fill and one interpolation
 * rule covers every count on the surface.
 *
 * Three counts are spelled out here instead -- how many purposes, special
 * purposes, and features one partner claims. The web builds that line inline in
 * `vendor-list.tsx` with its own singular and plural, and there is no key for it
 * in the bundle to copy, so the mirror writes the same words the same way.
 *
 * @packageDocumentation
 */

/** Every string one disclosure renders. */
export interface ConsentIabCopy {
	/** Label for the grant-everything action. */
	readonly acceptAll: string;
	/** Label for the control that leaves the disclosure without saving. */
	readonly close: string;
	/** Heading over the partners that are absent from the GVL. */
	readonly customPartners: string;
	/** Body of the disclosure, under its heading. */
	readonly description: string;
	/** Heading of the locked essential-functions section. */
	readonly essentialTitle: string;
	/** Heading over a partner's claimed features. */
	readonly features: string;
	/** Heading over the partners that are registered with the TCF. */
	readonly iabVendors: string;
	/** Heading of the legitimate-interest leg of a partner's disclosure. */
	readonly legitimateInterest: string;
	/** Short form of that basis, in a partner row's badge. */
	readonly legitimateInterestShort: string;
	/** Label for the action that objects to a legitimate-interest claim. */
	readonly objectButton: string;
	/** What that action reads once the objection is held. */
	readonly objected: string;
	/** How many partners claim a row, in the row's own meta line. */
	readonly partners: string;
	/** What a reader hears for a stack whose switches are split. */
	readonly partiallyEnabled: string;
	/** The purposes tab, and the heading over a partner's consent claims. */
	readonly purposes: string;
	/** Label for the deny-everything action. */
	readonly rejectAll: string;
	/** The right a subject holds over a legitimate-interest claim. */
	readonly rightToObject: string;
	/** Label for the action that writes the whole selection. */
	readonly saveSettings: string;
	/** Heading over a partner's claimed special features. */
	readonly specialFeatures: string;
	/** Heading over a partner's claimed special purposes. */
	readonly specialPurposes: string;
	/** Heading of the disclosure. */
	readonly title: string;
	/** The vendors tab. */
	readonly vendors: string;
}

/** The English the web surfaces ship. */
export const ENGLISH_IAB_COPY: ConsentIabCopy = {
	acceptAll: 'Accept All',
	close: 'Close',
	customPartners: 'Custom Partners',
	description:
		'Customize your privacy settings here. You can choose which types of cookies and tracking technologies you allow.',
	essentialTitle: 'Essential Functions (Required)',
	features: 'Features',
	iabVendors: 'IAB Registered Vendors',
	legitimateInterest: 'Legitimate Interest',
	legitimateInterestShort: 'Leg. Interest',
	objectButton: 'Object',
	objected: 'Objected',
	partiallyEnabled: 'Partially enabled',
	partners: '{count} partners',
	purposes: 'Purposes',
	rejectAll: 'Reject All',
	rightToObject:
		'You have the right to object to processing based on legitimate interest.',
	saveSettings: 'Save Settings',
	specialFeatures: 'Special Features',
	specialPurposes: 'Special Purposes',
	title: 'Privacy Settings',
	vendors: 'Vendors',
};

/** Copy a host passes in, on top of the English. */
export type ConsentIabCopyOverrides = Partial<ConsentIabCopy>;

/**
 * Fill a `{count}` template.
 *
 * @param template - Copy carrying a `{count}` placeholder.
 * @param count - Number to put in its place.
 * @returns The line as the subject reads it.
 */
export const withCount = function withCount(
	template: string,
	count: number
): string {
	return template.replace('{count}', String(count));
};

/**
 * A heading with the size of the list beside it, the way both tabs and both
 * partner legs write theirs: `Purposes (11)`.
 *
 * @param label - The heading's own word.
 * @param count - How many entries follow it.
 * @returns The label and its count.
 */
export const withTotal = function withTotal(
	label: string,
	count: number
): string {
	return `${label} (${String(count)})`;
};

/**
 * The meta line under a partner's name: how many of each TCF object it claims.
 *
 * It mirrors the string `vendor-list.tsx` builds -- `4 purposes, 2 special, 1
 * feature` -- including the way it drops a clause that is empty and leaves
 * `special` unpluralised.
 *
 * @param counts - How many of each object the partner claims.
 * @param counts.features - Claimed features.
 * @param counts.purposes - Claimed purposes.
 * @param counts.specialPurposes - Claimed special purposes.
 * @returns The clause, without a trailing comma.
 */
export const partnerClaims = function partnerClaims(counts: {
	features: number;
	purposes: number;
	specialPurposes: number;
}): string {
	const parts = [
		`${String(counts.purposes)} ${counts.purposes === 1 ? 'purpose' : 'purposes'}`,
	];

	if (counts.specialPurposes > 0) {
		parts.push(`, ${String(counts.specialPurposes)} special`);
	}

	if (counts.features > 0) {
		parts.push(
			`, ${String(counts.features)} ${counts.features === 1 ? 'feature' : 'features'}`
		);
	}

	return parts.join('');
};

/**
 * Resolve the copy one disclosure renders.
 *
 * @param overrides - Strings the host wants to write itself.
 * @returns Every string, with the English under any hole.
 */
export const resolveIabCopy = function resolveIabCopy(
	overrides?: ConsentIabCopyOverrides
): ConsentIabCopy {
	if (overrides === undefined) {
		return ENGLISH_IAB_COPY;
	}

	return { ...ENGLISH_IAB_COPY, ...overrides };
};
