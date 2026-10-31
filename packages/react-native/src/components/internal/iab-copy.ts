/**
 * Copy for the IAB TCF surfaces.
 *
 * English fallbacks follow `@c15t/translations` (`iab.banner`,
 * `iab.preferenceCenter`), reworded for an app rather than a website. A host
 * passes its own strings through `copy` on the IAB components.
 */

/** Every string the IAB surfaces render. */
export interface ConsentIabCopy {
	/** Accept every purpose, feature, and partner. */
	readonly acceptAll: string;
	/** Accessibility label of the navigation bar's back button. */
	readonly back: string;
	/** First-layer body. `{partnerCount}` becomes the number of partners. */
	readonly bannerDescription: string;
	/** First-layer heading. */
	readonly bannerTitle: string;
	/** Accessibility label of the close button. */
	readonly close: string;
	/** A partner's consent switch. */
	readonly consent: string;
	/** A partner's cookie lifetime row. */
	readonly cookieLifetime: string;
	/** Heading over partners not registered with the IAB. */
	readonly customPartners: string;
	/** A duration of exactly one day. `{count}` becomes 1. */
	readonly day: string;
	/** A duration. `{count}` becomes the number of days. */
	readonly days: string;
	/** Text under the manage screen's title. */
	readonly description: string;
	/** Heading over the special purposes, which cannot be refused. */
	readonly essentialTitle: string;
	/** Heading over a purpose's illustrations. */
	readonly examples: string;
	/** Heading over the informational features. */
	readonly features: string;
	/** Text under the features when the GVL carries no standard text. */
	readonly featuresDescription: string;
	/** Heading over IAB-registered partners. */
	readonly iabVendors: string;
	/** A partner's legitimate interest switch. */
	readonly legitimateInterest: string;
	/** First-layer note about legitimate interest and the right to object. */
	readonly legitimateInterestNotice: string;
	/** First-layer action that opens the manage screen. */
	readonly manage: string;
	/** Empty search result. `{searchTerm}` becomes the query. */
	readonly noVendorsFound: string;
	/** Spoken after a row's title on the button that explains the row. */
	readonly moreInfo: string;
	/** Dismisses an explanation alert. */
	readonly ok: string;
	/** A stack where some, not all, purposes are allowed. */
	readonly partiallyEnabled: string;
	/** A count of exactly one partner. `{count}` becomes 1. */
	readonly partner: string;
	/** A partner count. `{count}` becomes the number. */
	readonly partners: string;
	/** Heading over the partners that use one purpose. */
	readonly partnersUsing: string;
	/** A partner's privacy policy link. */
	readonly privacyPolicy: string;
	/** The purposes segment and heading. */
	readonly purposes: string;
	/** Refuse every purpose, feature, and partner. */
	readonly rejectAll: string;
	/** A partner's data retention row. */
	readonly retention: string;
	/** Explanation behind the legitimate interest info button. */
	readonly rightToObject: string;
	/** Save the switches as they stand. */
	readonly saveSettings: string;
	/** Placeholder of the partner search field. */
	readonly search: string;
	/** Heading over the special features. */
	readonly specialFeatures: string;
	/** Heading over a partner's special purposes. */
	readonly specialPurposes: string;
	/** Heading over a partner's storage facts. */
	readonly storage: string;
	/** A partner's device storage disclosure link. */
	readonly storageDisclosure: string;
	/** Manage screen heading. */
	readonly title: string;
	/** A partner's non-cookie storage row. */
	readonly usesNonCookieAccess: string;
	/** The partners segment. */
	readonly vendors: string;
}

/** English fallbacks. */
export const ENGLISH_IAB_COPY: ConsentIabCopy = {
	acceptAll: 'Accept All',
	back: 'Back',
	bannerDescription:
		'We and our {partnerCount} partners store and/or access information on your device and process personal data, such as unique identifiers and usage data, for this app, to:',
	bannerTitle: 'We value your privacy',
	close: 'Close',
	consent: 'Consent',
	cookieLifetime: 'Cookie lifetime',
	customPartners: 'Custom Partners',
	day: '{count} day',
	days: '{count} days',
	description:
		'Choose which purposes and partners may use your data. You can change this at any time.',
	essentialTitle: 'Essential Functions (Required)',
	examples: 'Examples',
	features: 'Features',
	featuresDescription:
		'These means of processing can be used solely in pursuit of one or several purposes for which you are given a choice in this notice.',
	iabVendors: 'IAB Registered Vendors',
	legitimateInterest: 'Legitimate Interest',
	legitimateInterestNotice:
		'Some partners claim a legitimate interest to process your data. You have the right to object to this processing, customize your choices, and withdraw your consent at any time.',
	manage: 'Manage options',
	moreInfo: 'More info',
	noVendorsFound: 'No vendors found matching "{searchTerm}"',
	ok: 'OK',
	partiallyEnabled: 'Partially enabled',
	partner: '{count} partner',
	partners: '{count} partners',
	partnersUsing: 'Partners Using This Purpose',
	privacyPolicy: 'Privacy Policy',
	purposes: 'Purposes',
	rejectAll: 'Reject All',
	retention: 'Data retention',
	rightToObject:
		'You have the right to object to processing based on legitimate interest.',
	saveSettings: 'Save Settings',
	search: 'Search vendors',
	specialFeatures: 'Special Features',
	specialPurposes: 'Special Purposes',
	storage: 'Storage',
	storageDisclosure: 'Storage Disclosure',
	title: 'Privacy Settings',
	usesNonCookieAccess: 'Non-cookie storage',
	vendors: 'Vendors',
};

/** Host overrides for any subset of {@link ConsentIabCopy}. */
export type ConsentIabCopyOverrides = Partial<ConsentIabCopy>;

/**
 * Fill one placeholder in a template.
 *
 * @param template - Template holding the placeholder.
 * @param value - Value to put in its place.
 * @param placeholder - Placeholder name, without braces.
 * @returns The filled string.
 */
export const withCount = function withCount(
	template: string,
	value: number | string,
	placeholder = 'count'
): string {
	return template.replace(`{${placeholder}}`, String(value));
};

/**
 * A partner count, singular for one.
 *
 * @param copy - Copy in force.
 * @param count - Number of partners.
 * @returns The count in words, as in "1 partner" or "3 partners".
 */
export const partnerCount = function partnerCount(
	copy: ConsentIabCopy,
	count: number
): string {
	return withCount(count === 1 ? copy.partner : copy.partners, count);
};

/**
 * A number of days, singular for one.
 *
 * @param copy - Copy in force.
 * @param count - Number of days.
 * @returns The duration in words, as in "1 day" or "365 days".
 */
export const dayCount = function dayCount(
	copy: ConsentIabCopy,
	count: number
): string {
	return withCount(count === 1 ? copy.day : copy.days, count);
};

/**
 * Append a total to a label, as in "Vendors (42)".
 *
 * @param label - Label to extend.
 * @param count - Total to append.
 * @returns The label with its total.
 */
export const withTotal = function withTotal(
	label: string,
	count: number
): string {
	return `${label} (${String(count)})`;
};

/**
 * Merge host overrides onto the English fallbacks.
 *
 * @param overrides - Host strings.
 * @returns Copy with every key filled.
 */
export const resolveIabCopy = function resolveIabCopy(
	overrides?: ConsentIabCopyOverrides
): ConsentIabCopy {
	if (overrides === undefined) {
		return ENGLISH_IAB_COPY;
	}

	return { ...ENGLISH_IAB_COPY, ...overrides };
};
