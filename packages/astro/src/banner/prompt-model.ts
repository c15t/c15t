/**
 * What the consent banner shows for a snapshot.
 *
 * `prompt.astro` renders this on the server. The browser renders the same
 * model when the server could not: a prerendered page in hosted or
 * manifest mode, where only the visitor's own `/init` can say which policy
 * applies. Keeping the decisions here means the two renderings cannot
 * drift apart.
 */

import {
	defaultTranslationConfig,
	resolveConsentPresentation,
} from '@c15t/core';
import type {
	ConsentPresentation,
	ConsentSnapshot,
	LegalLinks,
} from '@c15t/core';
import type { Translations } from '@c15t/translations';
import { getTextDirection } from '@c15t/ui/utils';

import type { PromptClassNames } from './class-names';

export { PROMPT_SLOT_ATTRIBUTE } from './slot';

/** The `<ConsentBanner />` props that shape its markup. */
export interface PromptProps {
	/** Override the banner heading. */
	title?: string;
	/** Override the banner body copy. */
	description?: string;
	/** Override the reject button label. */
	rejectButtonText?: string;
	/** Override the accept button label. */
	acceptButtonText?: string;
	/** Override the notice acknowledgement label. */
	dismissButtonText?: string;
	/** Override the customize button label. */
	customizeButtonText?: string;
	/** Ship the DOM without the bundled stylesheet's class names. */
	noStyle?: boolean;
	/** Extra class on the banner root. */
	class?: string;
	/** Drop the "Secured by c15t" tag. */
	hideBranding?: boolean;
	/** Which legal links to render inline. `null` renders none. */
	legalLinks?: (keyof LegalLinks)[] | null;
}

/** Input for {@link resolvePromptModel}. */
export interface PromptModelInput {
	snapshot: ConsentSnapshot;
	props: PromptProps;
	/** The integration's `presentation` option. */
	presentation?: ConsentPresentation;
	/** The integration's `legalLinks` option. */
	legalLinks?: LegalLinks;
	/** The stylesheet class names the markup uses. */
	classNames: PromptClassNames;
}

/** One inline legal link. */
export interface PromptLegalLink {
	key: keyof LegalLinks;
	href: string | undefined;
	label: string;
}

/** Everything the banner markup needs. */
export interface PromptModel {
	blocking: boolean;
	direction: string;
	textDirection: 'ltr' | 'rtl';
	language: string | undefined;
	model: string;
	prompt: string | undefined;
	position: string;
	variant: string;
	shouldFill: boolean;
	split: boolean;
	copy: {
		title: string;
		description: string;
		securedBy: string;
	};
	legalLinks: PromptLegalLink[];
	rights: { right: string; label: string }[];
	actionGroups: { action: string; label: string; primary: boolean }[][];
	classes: {
		root: string;
		overlay: string;
		cardShell: string;
		card: string;
		header: string;
		title: string;
		description: string;
		footer: string;
		rights: string;
		rightLink: string;
		actionGroup: string;
		button: string;
	};
}

/**
 * The first defined string, so a prop outranks the bundle and the bundle
 * outranks the English fallback.
 *
 * @param values - Candidates, most specific first.
 * @returns The first defined value, or an empty string.
 */
const firstOf = function firstOf(...values: (string | undefined)[]): string {
	return values.find((value) => value !== undefined) ?? '';
};

/**
 * Join class names, skipping empty ones.
 *
 * @param names - Class names, possibly missing.
 * @returns A space-separated class list.
 */
export const joinClasses = function joinClasses(
	...names: (string | undefined)[]
): string {
	return names.filter(Boolean).join(' ');
};

/**
 * Swap a physical corner for its mirror image.
 *
 * @param position - A position such as `bottom-left`.
 * @returns The mirrored position.
 */
const mirrorCorner = function mirrorCorner(position: string): string {
	if (position.endsWith('-left')) {
		return position.replace(/-left$/u, '-right');
	}
	if (position.endsWith('-right')) {
		return position.replace(/-right$/u, '-left');
	}
	return position;
};

type TranslationBundle = Partial<Translations>;

/**
 * Button and rights labels, props first, then the bundle, then English.
 *
 * @param bundle - The snapshot's translations.
 * @param fallback - The English translations.
 * @param props - The component props.
 * @returns Labels keyed by action and by right.
 */
const resolveLabels = function resolveLabels(
	bundle: TranslationBundle,
	fallback: TranslationBundle,
	props: PromptProps
): { actions: Record<string, string>; rights: Record<string, string> } {
	return {
		actions: {
			accept: firstOf(
				props.acceptButtonText,
				bundle.common?.acceptAll,
				fallback.common?.acceptAll
			),
			customize: firstOf(
				props.customizeButtonText,
				bundle.common?.customize,
				fallback.common?.customize
			),
			// Acknowledgement leaves category choices and permissions unchanged.
			dismiss: firstOf(
				props.dismissButtonText,
				bundle.common?.acknowledge,
				bundle.common?.dismiss,
				fallback.common?.acknowledge
			),
			reject: firstOf(
				props.rejectButtonText,
				bundle.common?.rejectAll,
				fallback.common?.rejectAll
			),
		},
		rights: {
			'opt-out': firstOf(bundle.rights?.optOut, fallback.rights?.optOut),
			preferences: firstOf(
				bundle.rights?.preferences,
				fallback.rights?.preferences
			),
		},
	};
};

/**
 * Heading and body copy. A notice prompt explains and points at the
 * opt-out; it never asks, so it has copy of its own.
 *
 * @param bundle - The snapshot's translations.
 * @param fallback - The English translations.
 * @param props - The component props.
 * @param notice - Whether the policy prompts with a notice.
 * @returns The banner copy.
 */
const resolveCopy = function resolveCopy(
	bundle: TranslationBundle,
	fallback: TranslationBundle,
	props: PromptProps,
	notice: boolean
): PromptModel['copy'] {
	const banner = bundle.cookieBanner;
	const english = fallback.cookieBanner;
	return {
		description: notice
			? firstOf(
					props.description,
					banner?.noticeDescription,
					english?.noticeDescription
				)
			: firstOf(props.description, banner?.description, english?.description),
		securedBy: firstOf(bundle.common?.securedBy, fallback.common?.securedBy),
		title: notice
			? firstOf(props.title, banner?.noticeTitle, english?.noticeTitle)
			: firstOf(props.title, banner?.title, english?.title),
	};
};

/**
 * Class names for every element, or none with `noStyle`.
 *
 * @param classNames - The stylesheet class maps.
 * @param props - The component props.
 * @returns The class list for each element.
 */
const resolveClasses = function resolveClasses(
	classNames: PromptClassNames,
	props: PromptProps
): PromptModel['classes'] {
	const { actions, banner, button } = classNames;
	const noStyle = props.noStyle === true;
	const cls = (...names: (string | undefined)[]): string =>
		noStyle ? '' : joinClasses(...names);
	return {
		actionGroup: cls(actions.actionGroup),
		button: cls(button.button),
		card: cls(banner.card),
		cardShell: cls(banner.cardShell),
		description: cls(banner.description),
		footer: cls(actions.actionRoot, banner.footer),
		header: cls(banner.header),
		overlay: cls(banner.overlay, banner.overlayVisible),
		rightLink: cls(banner.rightLink),
		rights: cls(banner.rights),
		root: joinClasses(cls(banner.root, banner.bannerVisible), props.class),
		title: cls(banner.title),
	};
};

/**
 * Resolve the banner's copy, actions, layout and class names.
 *
 * @param input - The snapshot, the component props and the site options.
 * @returns The banner model.
 */
export const resolvePromptModel = function resolvePromptModel(
	input: PromptModelInput
): PromptModel {
	const { snapshot, props } = input;
	const fallback = defaultTranslationConfig.translations
		.en as TranslationBundle;
	const bundle = (snapshot.translations?.translations ??
		fallback) as TranslationBundle;
	const labels = resolveLabels(bundle, fallback, props);
	const textDirection = getTextDirection(snapshot.translations?.language);

	// Same policy-driven action resolution the Svelte and React banners use,
	// so an opt-out or IAB policy produces the same buttons in the same order.
	const presentation = resolveConsentPresentation({
		policy: snapshot.policyRule,
		presentation: input.presentation,
		surface: 'prompt',
	});
	const {
		actionGroups,
		blocking,
		direction,
		primaryActions,
		shouldFillActions: shouldFill,
		preferenceControls,
		variant,
	} = presentation;

	// A corner the host did not choose follows the text direction, the same
	// mirroring the React and Svelte roots apply; a host corner is kept as is.
	const position =
		textDirection === 'rtl' &&
		presentation.positionSource === 'default' &&
		(variant === 'floating' || variant === 'widget')
			? mirrorCorner(presentation.position)
			: presentation.position;

	return {
		actionGroups: actionGroups.map((group) =>
			group.map((action) => ({
				action,
				label: labels.actions[action] ?? action,
				primary: primaryActions.includes(action),
			}))
		),
		blocking,
		classes: resolveClasses(input.classNames, props),
		copy: resolveCopy(
			bundle,
			fallback,
			props,
			snapshot.policyRule.prompt === 'notice'
		),
		direction,
		language: snapshot.translations?.language,
		legalLinks: (props.legalLinks ?? [])
			.filter((key) => input.legalLinks?.[key])
			.map((key) => ({
				href: input.legalLinks?.[key]?.href,
				key,
				label: input.legalLinks?.[key]?.label ?? key,
			})),
		model: snapshot.policyRule.model,
		position,
		prompt:
			snapshot.policyRule.prompt === 'none'
				? undefined
				: snapshot.policyRule.prompt,
		rights: preferenceControls.map((right) => ({
			label: labels.rights[right] ?? right,
			right,
		})),
		shouldFill,
		split: actionGroups.length > 1 && !shouldFill,
		textDirection,
		variant,
	};
};
