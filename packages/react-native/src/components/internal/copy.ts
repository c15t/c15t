/**
 * The words a consent surface shows.
 *
 * Copy comes from the backend bundle on the snapshot, which arrives as either a
 * complete payload or a partial one from an older backend: every group and every
 * string inside it may be absent. A consent banner that renders `undefined` in
 * place of a button label is worse than one that renders English, so each field
 * has a fallback and the resolver is total.
 */

import type { ConsentSnapshot } from '../../protocol';
import type {
	AllConsentNames,
	KernelTranslations,
} from '../../protocol/vocabulary';

/** Title and description pair for one consent category. */
export interface ConsentCategoryCopy {
	/** One-line explanation of what the category covers. */
	readonly description: string;
	/** What the category is called in this language. */
	readonly title: string;
}

/** Every string a built-in surface renders. */
export interface ConsentCopy {
	/** Label for the grant-everything action. */
	readonly acceptAll: string;
	/** Label for the acknowledgement action on a notice. */
	readonly acknowledge: string;
	/** Body of the opt-in banner. */
	readonly bannerDescription: string;
	/** Heading of the opt-in banner. */
	readonly bannerTitle: string;
	/** Label for the action that opens finer control. */
	readonly customize: string;
	/** Per-category copy, keyed by category. */
	readonly categories: Readonly<Record<AllConsentNames, ConsentCategoryCopy>>;
	/** Label that closes a surface without a decision. */
	readonly dismiss: string;
	/** Body of the consent manager. */
	readonly dialogDescription: string;
	/** Heading of the consent manager. */
	readonly dialogTitle: string;
	/** Body of the notice banner. */
	readonly noticeDescription: string;
	/** Heading of the notice banner. */
	readonly noticeTitle: string;
	/** Standing entry point to the preference centre. */
	readonly preferences: string;
	/** Label for the deny-everything action. */
	readonly rejectAll: string;
	/** Label that writes the per-category selection. */
	readonly save: string;
}

/** English copy used for any string the bundle does not carry. */
const ENGLISH: Omit<ConsentCopy, 'categories'> = {
	acceptAll: 'Accept all',
	acknowledge: 'Acknowledge',
	bannerDescription:
		'Choose how your data may be used. You can change this at any time.',
	bannerTitle: 'Your privacy',
	customize: 'Customize',
	dialogDescription: 'Pick the categories you allow below.',
	dialogTitle: 'Manage consent',
	dismiss: 'Dismiss',
	noticeDescription:
		'We process your data to deliver this app. Learn more in the settings.',
	noticeTitle: 'How we use your data',
	preferences: 'Manage preferences',
	rejectAll: 'Reject all',
	save: 'Save',
};

/** English per-category copy, in the order the scopes list them. */
const ENGLISH_CATEGORIES: Readonly<
	Record<AllConsentNames, ConsentCategoryCopy>
> = {
	experience: {
		description: 'Improves how the app responds to you.',
		title: 'Experience',
	},
	functionality: {
		description: 'Enables features you ask for, such as saved settings.',
		title: 'Functionality',
	},
	marketing: {
		description: 'Shows you advertising that is relevant to you.',
		title: 'Marketing',
	},
	measurement: {
		description: 'Measures how the app is used and how it performs.',
		title: 'Measurement',
	},
	necessary: {
		description: 'Required for the app to work. It cannot be turned off.',
		title: 'Strictly necessary',
	},
};

/** One `{ title, description }` pair, in either the complete or partial shape. */
interface TitleDescription {
	readonly description?: string | null;
	readonly title?: string | null;
}

/** The bundle shape this resolver reads, with every group optional. */
interface CopySource {
	readonly common?: {
		readonly acceptAll?: string | null;
		readonly acknowledge?: string | null;
		readonly customize?: string | null;
		readonly dismiss?: string | null;
		readonly rejectAll?: string | null;
		readonly save?: string | null;
	};
	readonly consentManagerDialog?: TitleDescription;
	readonly consentTypes?: {
		readonly experience?: TitleDescription;
		readonly functionality?: TitleDescription;
		readonly marketing?: TitleDescription;
		readonly measurement?: TitleDescription;
		readonly necessary?: TitleDescription;
	};
	readonly cookieBanner?: TitleDescription & {
		readonly noticeDescription?: string | null;
		readonly noticeTitle?: string | null;
	};
	readonly rights?: {
		readonly preferences?: string | null;
	};
}

/**
 * Use a bundle string when it carries actual text.
 *
 * An empty string from the backend is treated as missing: a blank button is not
 * a translation, and the fallback is the better rendering of the two.
 *
 * @param value - Bundle value, which may be absent or blank.
 * @param fallback - English text to use otherwise.
 * @returns One or the other.
 */
const text = function text(
	value: string | null | undefined,
	fallback: string
): string {
	return typeof value === 'string' && value.trim() !== '' ? value : fallback;
};

/**
 * Resolve one category pair against its English default.
 *
 * @param value - Bundle pair, which may be absent in whole or in part.
 * @param fallback - English pair.
 * @returns A pair with both fields present.
 */
const categoryCopy = function categoryCopy(
	value: TitleDescription | undefined,
	fallback: ConsentCategoryCopy
): ConsentCategoryCopy {
	return {
		description: text(value?.description, fallback.description),
		title: text(value?.title, fallback.title),
	};
};

/**
 * Resolve the four banner headings.
 *
 * @param banner - `cookieBanner` from the bundle.
 * @returns The heading and body for each of the two banner layouts.
 */
const bannerCopy = function bannerCopy(
	banner: NonNullable<CopySource['cookieBanner']>
): Pick<
	ConsentCopy,
	'bannerDescription' | 'bannerTitle' | 'noticeDescription' | 'noticeTitle'
> {
	return {
		bannerDescription: text(banner.description, ENGLISH.bannerDescription),
		bannerTitle: text(banner.title, ENGLISH.bannerTitle),
		noticeDescription: text(
			banner.noticeDescription,
			ENGLISH.noticeDescription
		),
		noticeTitle: text(banner.noticeTitle, ENGLISH.noticeTitle),
	};
};

/**
 * Resolve the action labels the bundle names.
 *
 * @param common - `common` from the bundle.
 * @returns Every button label except the preference-centre link.
 */
const actionCopy = function actionCopy(
	common: NonNullable<CopySource['common']>
): Pick<
	ConsentCopy,
	'acceptAll' | 'acknowledge' | 'customize' | 'dismiss' | 'rejectAll' | 'save'
> {
	return {
		acceptAll: text(common.acceptAll, ENGLISH.acceptAll),
		acknowledge: text(common.acknowledge, ENGLISH.acknowledge),
		customize: text(common.customize, ENGLISH.customize),
		dismiss: text(common.dismiss, ENGLISH.dismiss),
		rejectAll: text(common.rejectAll, ENGLISH.rejectAll),
		save: text(common.save, ENGLISH.save),
	};
};

/**
 * Resolve every category pair.
 *
 * @param types - `consentTypes` from the bundle, which may name none of them.
 * @returns Per-category copy with both fields present.
 */
const categoryMap = function categoryMap(
	types: CopySource['consentTypes']
): ConsentCopy['categories'] {
	return {
		experience: categoryCopy(types?.experience, ENGLISH_CATEGORIES.experience),
		functionality: categoryCopy(
			types?.functionality,
			ENGLISH_CATEGORIES.functionality
		),
		marketing: categoryCopy(types?.marketing, ENGLISH_CATEGORIES.marketing),
		measurement: categoryCopy(
			types?.measurement,
			ENGLISH_CATEGORIES.measurement
		),
		necessary: categoryCopy(types?.necessary, ENGLISH_CATEGORIES.necessary),
	};
};

/**
 * Whether two resolved copy objects carry the same strings.
 *
 * The snapshot reparses on every native event, so the bundle object is never
 * identical twice in a row. Comparing the resolved strings is what lets a
 * surface skip a rerender that changes nothing it displays.
 *
 * @param current - Copy the subscriber rendered last.
 * @param next - Copy the subscriber would render now.
 * @returns `true` when every visible string matches.
 */
export const isConsentCopyEqual = function isConsentCopyEqual(
	current: ConsentCopy,
	next: ConsentCopy
): boolean {
	for (const key of [
		'acceptAll',
		'acknowledge',
		'bannerDescription',
		'bannerTitle',
		'customize',
		'dialogDescription',
		'dialogTitle',
		'dismiss',
		'noticeDescription',
		'noticeTitle',
		'preferences',
		'rejectAll',
		'save',
	] as const) {
		if (current[key] !== next[key]) {
			return false;
		}
	}

	for (const category of Object.keys(ENGLISH_CATEGORIES) as AllConsentNames[]) {
		const currentCategory = current.categories[category];
		const nextCategory = next.categories[category];

		if (
			currentCategory.description !== nextCategory.description ||
			currentCategory.title !== nextCategory.title
		) {
			return false;
		}
	}

	return true;
};

/**
 * Resolve the consent-manager heading and its standing entry point.
 *
 * @param source - The whole bundle.
 * @returns The manager copy plus the label for the preference centre.
 */
const managerCopy = function managerCopy(
	source: CopySource
): Pick<ConsentCopy, 'dialogDescription' | 'dialogTitle' | 'preferences'> {
	const dialog = source.consentManagerDialog ?? {};

	return {
		dialogDescription: text(dialog.description, ENGLISH.dialogDescription),
		dialogTitle: text(dialog.title, ENGLISH.dialogTitle),
		preferences: text(source.rights?.preferences, ENGLISH.preferences),
	};
};

/**
 * Read the bundle off a snapshot into one flat object of strings.
 *
 * @param translations - Bundle from `snapshot.translations`, usually present.
 * @returns Every string a surface renders, all non-empty.
 */
export const resolveConsentCopy = function resolveConsentCopy(
	translations: KernelTranslations | null | undefined
): ConsentCopy {
	const source = (translations?.translations ?? {}) as CopySource;
	const common = source.common ?? {};
	const banner = source.cookieBanner ?? {};

	return {
		...actionCopy(common),
		...bannerCopy(banner),
		...managerCopy(source),
		categories: categoryMap(source.consentTypes),
	};
};

/**
 * Select the resolved copy out of a snapshot.
 *
 * Module scope, so the subscription behind it stays stable. Pair it with
 * {@link isConsentCopyEqual}: a surface that shows only words then stays quiet
 * through every grant, receipt, and policy event.
 *
 * @param snapshot - Snapshot to read.
 * @returns Copy ready to render, with fallbacks applied.
 */
export const selectConsentCopy = (snapshot: ConsentSnapshot): ConsentCopy =>
	resolveConsentCopy(snapshot.translations);
