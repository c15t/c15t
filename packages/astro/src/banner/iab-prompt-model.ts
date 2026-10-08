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
import type { AllThemeKeys, Theme } from '@c15t/ui/theme';
import { getTextDirection } from '@c15t/ui/utils';

import type { IABPromptClassNames } from './class-names';
import { joinClasses } from './prompt-model';
import { resolveSlotBinding } from './theme-slots';

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
	/**
	 * Skip the entry animation. Defaults to the integration's
	 * `disableAnimation`.
	 */
	disableAnimation?: boolean;
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
	/** The integration's `disableAnimation` option. */
	disableAnimation?: boolean;
	/** The stylesheet class names the markup uses. */
	classNames: IABPromptClassNames;
	/** The integration's `theme`, for `slots`. */
	theme?: Theme;
}

/** One banner button. */
export interface IABPromptButton {
	action: IABAction;
	label: string;
	mode: string | undefined;
	variant: string | undefined;
	/** The button's classes, with its `buttonPrimary` or `buttonSecondary` slot. */
	className: string;
	/** The button's inline style from that slot. */
	style: string | undefined;
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
	/** The resolved banner shape, the arm's when an experiment runs. */
	variant: string;
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
	/** Inline styles from `theme.slots`, by the same element names. */
	styles: Partial<Record<keyof IABPromptModel['classes'], string>>;
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

/** The `theme.slots` key each IAB banner element answers to. */
const IAB_PROMPT_SLOTS = {
	card: 'iabConsentBannerCard',
	footer: 'iabConsentBannerFooter',
	header: 'iabConsentBannerHeader',
	overlay: 'iabConsentBannerOverlay',
	root: 'iabConsentBanner',
} as const satisfies Partial<
	Record<keyof IABPromptModel['classes'], AllThemeKeys>
>;

/**
 * Class names and inline styles for every element: the stock classes, or
 * none with `noStyle`, then the element's `theme.slots` entry. With
 * `disableAnimation` the entering classes, which mark the mount, are left
 * out before the slots apply.
 */
const resolveIABClasses = function resolveIABClasses(
	classNames: IABPromptClassNames,
	props: IABPromptProps,
	theme: Theme | undefined,
	disableAnimation: boolean
): Pick<IABPromptModel, 'classes' | 'styles'> {
	const { actions, button, iabBanner } = classNames;
	const noStyle = props.noStyle === true;
	const cls = (...names: (string | undefined)[]): string =>
		noStyle ? '' : joinClasses(...names);
	const entering = (name: string | undefined) =>
		disableAnimation ? undefined : name;
	const classes: IABPromptModel['classes'] = {
		actionGroup: cls(actions.actionGroup),
		button: cls(button.button),
		card: cls(iabBanner.card),
		cardShell: cls(iabBanner.cardShell),
		description: cls(iabBanner.description),
		footer: cls(actions.actionRoot, iabBanner.footer),
		header: cls(iabBanner.header),
		notice: cls(iabBanner.legitimateInterestNotice),
		overlay: cls(
			iabBanner.overlay,
			iabBanner.overlayVisible,
			entering(iabBanner.overlayEntering)
		),
		partnersLink: cls(iabBanner.partnersLink),
		purposeList: cls(iabBanner.purposeList),
		purposeMore: cls(iabBanner.purposeMore),
		root: cls(
			iabBanner.root,
			iabBanner.bannerVisible,
			entering(iabBanner.bannerEntering)
		),
		title: cls(iabBanner.title),
	};
	const styles: IABPromptModel['styles'] = {};
	for (const [name, key] of Object.entries(IAB_PROMPT_SLOTS) as [
		keyof typeof IAB_PROMPT_SLOTS,
		AllThemeKeys,
	][]) {
		const binding = resolveSlotBinding(theme, key, classes[name]);
		classes[name] = binding.class;
		styles[name] = binding.style;
	}
	// The `class` prop goes last, as the component's own override.
	classes.root = joinClasses(classes.root, props.class);
	return { classes, styles };
};

/**
 * The three buttons. The shared button stylesheet keys its variants off
 * `data-*`. `reject` is never filled even when it is the primary action,
 * which is what the React and Svelte banners do too.
 */
const resolveIABButton = function resolveIABButton(
	action: IABAction,
	{ english, iab }: IABTranslations,
	props: IABPromptProps,
	buttonClass: string,
	theme: Theme | undefined
): IABPromptButton {
	const labels: Record<IABAction, string> = {
		accept: text(iab.common?.acceptAll, english.common?.acceptAll),
		customize: text(iab.common?.customize, english.common?.customize),
		reject: text(iab.common?.rejectAll, english.common?.rejectAll),
	};
	const label = labels[action];
	const primary = action === (props.primaryButton ?? 'customize');
	const slot = resolveSlotBinding(
		theme,
		primary ? 'buttonPrimary' : 'buttonSecondary',
		buttonClass
	);
	if (props.noStyle) {
		return {
			action,
			className: slot.class,
			label,
			mode: undefined,
			style: slot.style,
			variant: undefined,
		};
	}
	return {
		action,
		className: slot.class,
		label,
		mode: primary && action !== 'reject' ? 'filled' : 'stroke',
		style: slot.style,
		variant: primary ? 'primary' : 'neutral',
	};
};

const mirrorCorner = function mirrorCorner(corner: string): string {
	if (corner.endsWith('-left')) {
		return corner.replace(/-left$/u, '-right');
	}
	if (corner.endsWith('-right')) {
		return corner.replace(/-right$/u, '-left');
	}
	return corner;
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
	const presentation = resolveConsentPresentation({
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
	// A default corner mirrors for RTL, as in the React and Svelte IAB
	// banners; a position the host or an experiment arm set is kept.
	const position =
		textDirection === 'rtl' && presentation.positionSource === 'default'
			? mirrorCorner(presentation.position)
			: presentation.position;
	const classesAndStyles = resolveIABClasses(
		input.classNames,
		props,
		input.theme,
		props.disableAnimation ?? input.disableAnimation ?? false
	);
	const button = (action: IABAction) =>
		resolveIABButton(
			action,
			translations,
			props,
			classesAndStyles.classes.button,
			input.theme
		);

	return {
		blocking: presentation.blocking,
		canRender: summary.isReady && models.includes(snapshot.policyRule.model),
		choiceButtons: (['reject', 'accept'] as const).map(button),
		...classesAndStyles,
		copy: resolveIABCopy(translations, summary),
		customizeButton: button('customize'),
		displayItems: [...summary.displayItems],
		language: snapshot.translations?.language,
		position,
		textDirection,
		variant: presentation.variant,
		vendorListReady: summary.isReady,
	};
};
