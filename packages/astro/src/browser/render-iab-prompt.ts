/**
 * The browser-rendered IAB TCF banner.
 *
 * Loaded only when a page owes an IAB banner the server did not render: a
 * prerendered page in hosted or manifest mode, or a render that had no
 * vendor list yet. It builds the markup `iab-prompt.astro` would have
 * produced, from the same model, into the spot `<IABConsentBanner />`
 * marked. The spot carries the stylesheet class names, so this chunk
 * imports no stylesheet of its own.
 */

import type { ConsentPresentation, ConsentSnapshot } from '@c15t/core';

import type { IABPromptClassNames } from '../banner/class-names';
import { resolveIABPromptModel } from '../banner/iab-prompt-model';
import type {
	IABPromptButton,
	IABPromptModel,
	IABPromptProps,
} from '../banner/iab-prompt-model';
import { IAB_PROMPT_SLOT_ATTRIBUTE } from '../banner/slot';
import { element, hiddenBanner, readSpot, renderBrandingTag } from './dom';

/** Site options the IAB banner reads. */
export interface RenderIABPromptOptions {
	presentation?: ConsentPresentation;
}

/** What `<IABConsentBanner />` leaves in its spot. */
export interface IABPromptSlotData {
	props: IABPromptProps;
	classNames: IABPromptClassNames;
}

const EMPTY_CLASS_NAMES: IABPromptClassNames = {
	actions: {},
	branding: {},
	button: {},
	iabBanner: {},
};

const readSlot = function readSlot(slot: HTMLElement): IABPromptSlotData {
	const parsed = readSpot(
		slot,
		IAB_PROMPT_SLOT_ATTRIBUTE
	) as Partial<IABPromptSlotData> | null;
	return {
		classNames: { ...EMPTY_CLASS_NAMES, ...parsed?.classNames },
		props: parsed?.props ?? {},
	};
};

const renderButton = function renderButton(
	model: IABPromptModel,
	props: IABPromptProps,
	button: IABPromptButton,
	extra: Record<string, string> = {}
): HTMLElement {
	return element(
		'button',
		{
			class: model.classes.button,
			'data-action': button.action,
			'data-c15t-action': button.action,
			...extra,
			'data-mode': button.mode,
			'data-size': props.noStyle ? undefined : 'small',
			'data-testid': `iab-consent-banner-${button.action}-button`,
			'data-variant': button.variant,
			type: 'button',
		},
		[button.label]
	);
};

const renderHeader = function renderHeader(model: IABPromptModel): HTMLElement {
	const items: HTMLElement[] = model.displayItems.map((name) =>
		element('li', {}, [name])
	);
	if (model.copy.andMore) {
		items.push(
			element('li', { class: model.classes.purposeMore }, [model.copy.andMore])
		);
	}
	return element(
		'div',
		{ class: model.classes.header, 'data-testid': 'iab-consent-banner-header' },
		[
			element('h2', { class: model.classes.title }, [model.copy.title]),
			element('p', { class: model.classes.description }, [
				model.copy.descriptionBefore,
				element(
					'button',
					{
						class: model.classes.partnersLink,
						'data-c15t-action': 'customize',
						'data-c15t-dialog': 'iab',
						'data-c15t-tab': 'vendors',
						'data-testid': 'iab-consent-banner-partners-link',
						type: 'button',
					},
					[model.copy.partnersLink]
				),
				model.copy.descriptionAfter,
			]),
			element('ul', { class: model.classes.purposeList }, items),
			element('p', { class: model.classes.notice }, [model.copy.notice]),
		]
	);
};

/**
 * Build the IAB banner for a snapshot, without inserting it.
 *
 * @param snapshot - A snapshot with a policy and a vendor list.
 * @param slot - The props and class names `<IABConsentBanner />` left.
 * @param options - The site options the banner reads.
 * @returns The overlay (blocking banners only) followed by the banner root,
 * or nothing when this banner does not answer the policy.
 */
export const buildIABPrompt = function buildIABPrompt(
	snapshot: ConsentSnapshot,
	slot: IABPromptSlotData,
	options: RenderIABPromptOptions
): HTMLElement[] {
	const { props } = slot;
	const model = resolveIABPromptModel({
		classNames: slot.classNames,
		presentation: options.presentation,
		props,
		snapshot,
	});
	if (!model.canRender) {
		return [];
	}
	const footer = element(
		'div',
		{
			class: model.classes.footer,
			'data-direction': 'row',
			'data-split': 'true',
			'data-testid': 'iab-consent-banner-footer',
		},
		[
			element(
				'div',
				{ class: model.classes.actionGroup, 'data-direction': 'row' },
				model.choiceButtons.map((button) => renderButton(model, props, button))
			),
			element(
				'div',
				{ class: model.classes.actionGroup, 'data-direction': 'row' },
				[
					renderButton(model, props, model.customizeButton, {
						'data-c15t-dialog': 'iab',
					}),
				]
			),
		]
	);
	const card = element(
		'div',
		{
			'aria-label': model.copy.title,
			'aria-modal': model.blocking ? 'true' : undefined,
			class: model.classes.card,
			'data-testid': 'iab-consent-banner-card',
			role: model.blocking ? 'dialog' : 'region',
		},
		[renderHeader(model), footer]
	);
	const branding = renderBrandingTag({
		hide: props.hideBranding,
		noStyle: props.noStyle,
		securedBy: model.copy.securedBy,
		snapshot,
		styles: slot.classNames.branding,
		testId: 'iab-consent-banner-branding',
	});
	const root = element(
		'div',
		{
			class: model.classes.root,
			'data-blocking': model.blocking ? 'true' : undefined,
			'data-position': model.position,
			'data-testid': 'iab-consent-banner-root',
			dir: model.textDirection,
			lang: model.language,
			tabindex: '-1',
		},
		[
			element(
				'div',
				{ class: model.classes.cardShell },
				branding ? [branding, card] : [card]
			),
		]
	);
	return hiddenBanner(
		root,
		model.blocking
			? element('div', {
					'aria-hidden': 'true',
					class: model.classes.overlay,
					'data-testid': 'iab-consent-banner-overlay',
				})
			: null
	);
};

/**
 * Render the IAB banner into the spot `<IABConsentBanner />` left for it.
 *
 * @param snapshot - The current snapshot.
 * @param options - The site options the banner reads.
 * @returns `true` when a banner was inserted. `false` when there is no
 * spot, or the snapshot's policy or vendor list does not call for one yet.
 */
export const renderIABPromptIntoSlot = function renderIABPromptIntoSlot(
	snapshot: ConsentSnapshot,
	options: RenderIABPromptOptions
): boolean {
	const slot = document.querySelector<HTMLElement>(
		`[${IAB_PROMPT_SLOT_ATTRIBUTE}]`
	);
	if (!slot) {
		return false;
	}
	const nodes = buildIABPrompt(snapshot, readSlot(slot), options);
	if (nodes.length === 0) {
		return false;
	}
	slot.replaceWith(...nodes);
	return true;
};
