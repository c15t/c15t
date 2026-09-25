/**
 * What the IAB TCF banner shows for a snapshot.
 *
 * `iab-prompt.astro` renders this on the server. The browser renders the
 * same model when the server could not: a prerendered page in hosted or
 * manifest mode, or a render without a vendor list yet.
 */

import {
	defaultTranslationConfig,
	resolveConsentPresentation,
	resolveIABBannerSummary,
} from '@c15t/core';
import type { ConsentPresentation, ConsentSnapshot } from '@c15t/core';
import type { Translations } from '@c15t/translations';
import { getTextDirection } from '@c15t/ui/utils';

import type { IABPromptClassNames } from './class-names';
import { joinClasses } from './prompt-model';

/** An action on the IAB banner. */
export type IABAction = 'reject' | 'accept' | 'customize';

/** The `<IABConsentBanner />` props that shape its markup. */
export interface IABPromptProps {
	/** Which action gets the filled treatment. */
	primaryButton?: IABAction;
	/**
	 * Which consent models this banner responds to. Matches the `models`
	 * prop on the React, Svelte and Vue IAB banners.
	 */
	models?: string[];
	/** Ship the DOM without the bundled stylesheet's class names. */
	noStyle?: boolean;
	/** Extra class on the banner root. */
	class?: string;
	/** Drop the "Secured by c15t" tag. */
	hideBranding?: boolean;
	/** Paint the backdrop that goes with the banner's `aria-modal`. */
	scrollLock?: boolean;
}

/** Input for {@link resolveIABPromptModel}. */
export interface IABPromptModelInput {
	snapshot: ConsentSnapshot;
	props: IABPromptProps;
	/** The integration's `presentation` option. */
	presentation?: ConsentPresentation;
	/** The stylesheet class names the markup uses. */
	classNames: IABPromptClassNames;
}

/** One banner button. */
export interface IABPromptButton {
	action: IABAction;
	label: string;
	mode: string | undefined;
	variant: string | undefined;
}

/** Everything the IAB banner markup needs. */
export interface IABPromptModel {
	/**
	 * Whether this banner answers the snapshot's policy and has the vendor
	 * list its copy counts from.
	 */
	canRender: boolean;
	/** Whether the snapshot has the vendor list the copy counts from. */
	vendorListReady: boolean;
	blocking: boolean;
	textDirection: 'ltr' | 'rtl';
	language: string | undefined;
	position: string;
	copy: {
		title: string;
		descriptionBefore: string;
		partnersLink: string;
		descriptionAfter: string;
		andMore: string | undefined;
		notice: string;
		securedBy: string;
	};
	displayItems: string[];
	/** Reject and accept, in that order. */
	choiceButtons: IABPromptButton[];
	customizeButton: IABPromptButton;
	classes: {
		root: string;
		overlay: string;
		cardShell: string;
		card: string;
		header: string;
		title: string;
		description: string;
		partnersLink: string;
		purposeList: string;
		purposeMore: string;
		notice: string;
		footer: string;
		actionGroup: string;
		button: string;
	};
}

type IABCopy = NonNullable<Translations['iab']>;
type IABSummary = ReturnType<typeof resolveIABBannerSummary>;

/** The translated IAB copy, with the English bundle behind it. */
interface IABTranslations {
	iab: IABCopy;
	english: IABCopy;
	securedBy: string;
}

const text = function text(
	value: string | undefined,
	backup: string | undefined
): string {
	return value ?? backup ?? '';
};

const resolveIABTranslations = function resolveIABTranslations(
	snapshot: ConsentSnapshot
): IABTranslations {
	const fallback = defaultTranslationConfig.translations
		.en as Partial<Translations>;
	const bundle = (snapshot.translations?.translations ??
		fallback) as Partial<Translations>;
	const english = fallback.iab as IABCopy;
	return {
		english,
		iab: (bundle.iab ?? english) as IABCopy,
		securedBy: text(bundle.common?.securedBy, fallback.common?.securedBy),
	};
};

/**
 * Heading, description, partners link and notice, with the counts the
 * summary derived from the vendor list filled in.
 */
const resolveIABCopy = function resolveIABCopy(
	{ english, iab, securedBy }: IABTranslations,
	summary: IABSummary
): IABPromptModel['copy'] {
	const { banner } = iab;
	const { banner: englishBanner } = english;
	const vendorCount = String(summary.vendorCount);
	const description = text(
		banner?.description,
		englishBanner?.description
	).replace('{partnerCount}', vendorCount);
	const partnersLink = text(
		banner?.partnersLink,
		englishBanner?.partnersLink
	).replace('{count}', vendorCount);
	// The link sits inside the sentence, so the copy is split around it rather
	// than concatenated — a translation is free to put it anywhere.
	const [descriptionBefore = description, descriptionAfter = ''] =
		description.split(partnersLink);
	const andMore = text(banner?.andMore, englishBanner?.andMore);
	const notice = text(
		banner?.legitimateInterestNotice,
		englishBanner?.legitimateInterestNotice
	);
	const scope = text(
		banner?.scopeServiceSpecific,
		englishBanner?.scopeServiceSpecific
	);
	return {
		andMore:
			summary.remainingCount > 0
				? andMore.replace('{count}', String(summary.remainingCount))
				: undefined,
		descriptionAfter,
		descriptionBefore,
		notice: `${notice} ${scope}`,
		partnersLink,
		securedBy,
		title: text(banner?.title, englishBanner?.title),
	};
};

/** Class names for every element, or none with `noStyle`. */
const resolveIABClasses = function resolveIABClasses(
	classNames: IABPromptClassNames,
	props: IABPromptProps
): IABPromptModel['classes'] {
	const { actions, button, iabBanner } = classNames;
	const noStyle = props.noStyle === true;
	const cls = (...names: (string | undefined)[]): string =>
		noStyle ? '' : joinClasses(...names);
	return {
		actionGroup: cls(actions.actionGroup),
		button: cls(button.button),
		card: cls(iabBanner.card),
		cardShell: cls(iabBanner.cardShell),
		description: cls(iabBanner.description),
		footer: cls(actions.actionRoot, iabBanner.footer),
		header: cls(iabBanner.header),
		notice: cls(iabBanner.legitimateInterestNotice),
		overlay: cls(iabBanner.overlay, iabBanner.overlayVisible),
		partnersLink: cls(iabBanner.partnersLink),
		purposeList: cls(iabBanner.purposeList),
		purposeMore: cls(iabBanner.purposeMore),
		root: joinClasses(
			cls(iabBanner.root, iabBanner.bannerVisible),
			props.class
		),
		title: cls(iabBanner.title),
	};
};

/**
 * The three buttons. The shared button stylesheet keys its variants off
 * `data-*`. `reject` is never filled even when it is the primary action,
 * which is what the React and Svelte banners do too.
 */
const resolveIABButton = function resolveIABButton(
	action: IABAction,
	{ english, iab }: IABTranslations,
	props: IABPromptProps
): IABPromptButton {
	const labels: Record<IABAction, string> = {
		accept: text(iab.common?.acceptAll, english.common?.acceptAll),
		customize: text(iab.common?.customize, english.common?.customize),
		reject: text(iab.common?.rejectAll, english.common?.rejectAll),
	};
	const label = labels[action];
	if (props.noStyle) {
		return { action, label, mode: undefined, variant: undefined };
	}
	const primary = action === (props.primaryButton ?? 'customize');
	return {
		action,
		label,
		mode: primary && action !== 'reject' ? 'filled' : 'stroke',
		variant: primary ? 'primary' : 'neutral',
	};
};

/**
 * Resolve the IAB banner's copy, summary, buttons and class names.
 *
 * @param input - The snapshot, the component props and the site options.
 * @returns The IAB banner model.
 */
export const resolveIABPromptModel = function resolveIABPromptModel(
	input: IABPromptModelInput
): IABPromptModel {
	const { snapshot, props } = input;
	const models = props.models ?? ['iab'];
	const { blocking } = resolveConsentPresentation({
		override: { scrollLock: props.scrollLock },
		policy: snapshot.policyRule,
		presentation: input.presentation,
		surface: 'prompt',
	});
	const summary = resolveIABBannerSummary(
		snapshot.iab?.enabled === false ? null : (snapshot.iab ?? null)
	);
	const translations = resolveIABTranslations(snapshot);
	const textDirection = getTextDirection(snapshot.translations?.language);

	return {
		blocking,
		canRender: summary.isReady && models.includes(snapshot.policyRule.model),
		choiceButtons: (['reject', 'accept'] as const).map((action) =>
			resolveIABButton(action, translations, props)
		),
		classes: resolveIABClasses(input.classNames, props),
		copy: resolveIABCopy(translations, summary),
		customizeButton: resolveIABButton('customize', translations, props),
		displayItems: [...summary.displayItems],
		language: snapshot.translations?.language,
		position: textDirection === 'ltr' ? 'bottom-left' : 'bottom-right',
		textDirection,
		vendorListReady: summary.isReady,
	};
};
