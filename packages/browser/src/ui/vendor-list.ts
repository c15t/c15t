import type { AllConsentNames, ResolvedVendor } from '@c15t/core';
import type { VendorListTranslations } from '@c15t/translations';

import { classes } from '../generated/styles';
import { cx, h } from './dom';
import type { SlotApplier } from './slots';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PLUS = 'M5 12h14M12 5v14';
const MINUS = 'M5 12h14';

const DEFAULT_COPY: VendorListTranslations = {
	disabledByCategory: 'Turn on this category to choose vendors.',
	privacyPolicy: 'Privacy policy',
	switchLabel: 'Allow {vendor}',
	title: 'Vendors ({count})',
};

const {
	preferenceItem: itemStyles,
	switch: switchStyles,
	vendorList: listStyles,
} = classes;

/** The vendor rows under one category, and how to bring them up to date. */
export interface VendorList {
	/** The `<section>` to append inside the category's content. */
	readonly element: HTMLElement;
	/**
	 * Reflect the draft: switches are disabled while the category is off,
	 * and each shows whether its vendor is allowed.
	 *
	 * @param categoryOn - Whether the parent category is on in the draft.
	 * @param isChecked - Whether a vendor is allowed in the draft.
	 */
	patch: (
		categoryOn: boolean,
		isChecked: (vendorId: string) => boolean
	) => void;
}

/** What {@link createVendorList} needs. */
export interface VendorListParams {
	/** The category row the list sits under. */
	category: AllConsentNames;
	/** The vendors listed under it, in declared order. */
	vendors: readonly ResolvedVendor[];
	/** Translated copy; missing keys fall back to English. */
	copy: Partial<VendorListTranslations> | undefined;
	/** Ship the DOM without class names. */
	noStyle: boolean;
	/** Marks the switches as `toggle` parts, like the category switches. */
	slot: SlotApplier;
	/**
	 * Keys (`<category>:<vendor id>`) of the cards that are open. Owned by
	 * the widget so a rebuild keeps them open.
	 */
	openCards: Set<string>;
	/** Stage a vendor's grant in the draft. */
	onToggle: (vendorId: string, granted: boolean) => void;
}

interface VendorRow {
	vendor: ResolvedVendor;
	item: HTMLElement;
	trigger: HTMLButtonElement | null;
	path: SVGPathElement;
	content: HTMLElement | null;
	switchButton: HTMLButtonElement | null;
}

const buildIcon = function buildIcon(): {
	icon: SVGSVGElement;
	path: SVGPathElement;
	title: SVGTitleElement;
} {
	const icon = document.createElementNS(SVG_NS, 'svg');
	for (const [name, value] of Object.entries({
		'aria-hidden': 'true',
		fill: 'none',
		focusable: 'false',
		stroke: 'currentColor',
		'stroke-linecap': 'round',
		'stroke-linejoin': 'round',
		'stroke-width': '2',
		viewBox: '0 0 24 24',
	})) {
		icon.setAttribute(name, value);
	}
	const title = document.createElementNS(SVG_NS, 'title');
	const path = document.createElementNS(SVG_NS, 'path');
	icon.append(title, path);
	return { icon, path, title };
};

/** A small switch with the markup the other adapters' vendor switches use. */
const buildSwitch = function buildSwitch(params: {
	describedBy: string;
	label: string;
	noStyle: boolean;
	testId: string;
}): HTMLButtonElement {
	const { noStyle } = params;
	return h(
		'button',
		{
			'aria-describedby': params.describedBy,
			'aria-label': params.label,
			class: noStyle ? '' : switchStyles.root,
			'data-size': noStyle ? undefined : 'small',
			'data-slot': 'switch',
			'data-testid': params.testId,
			role: 'switch',
			type: 'button',
		},
		h(
			'span',
			{
				class: noStyle ? '' : switchStyles.track,
				'data-slot': 'switch-track',
			},
			h('span', {
				class: noStyle ? '' : switchStyles.thumb,
				'data-slot': 'switch-thumb',
			})
		)
	);
};

/** The collapsible part of a card: the description and privacy link. */
const buildDetails = function buildDetails(params: {
	category: AllConsentNames;
	copy: VendorListTranslations;
	ids: { content: string; trigger: string };
	noStyle: boolean;
	vendor: ResolvedVendor;
}): HTMLElement {
	const { category, copy, ids, noStyle, vendor } = params;
	const style = (name: keyof typeof listStyles): string =>
		noStyle ? '' : (listStyles[name] ?? '');
	return h(
		'div',
		{
			'aria-labelledby': ids.trigger,
			class: noStyle ? '' : cx(itemStyles.content, listStyles.content),
			'data-slot': 'preference-item-content',
			'data-testid': `consent-widget-vendor-content-${category}-${vendor.id}`,
			id: ids.content,
		},
		h(
			'div',
			{
				class: noStyle ? '' : itemStyles.contentViewport,
				'data-slot': 'preference-item-content-viewport',
			},
			h(
				'div',
				{
					class: noStyle
						? ''
						: cx(itemStyles.contentInner, listStyles.contentInner),
					'data-slot': 'preference-item-content-inner',
				},
				vendor.description
					? h('p', { class: style('description') }, vendor.description)
					: null,
				vendor.privacyPolicyUrl
					? h(
							'a',
							{
								class: style('link'),
								href: vendor.privacyPolicyUrl,
								rel: 'noopener noreferrer',
								target: '_blank',
							},
							copy.privacyPolicy
						)
					: null
			)
		)
	);
};

/**
 * The vendor cards nested inside one category's content, the same markup,
 * classes, `data-slot`s and test ids as the React, Vue and Svelte vendor
 * lists. Each card opens for its description and privacy policy link and
 * carries a switch that stages a grant in the widget's draft. A `disabled`
 * vendor is listed without a switch, since the kernel ignores grants for it.
 *
 * @param params - The category, its vendors and the widget's callbacks.
 * @returns The list, or `null` when the category has no vendor to list.
 */
// oxlint-disable-next-line max-lines-per-function -- One card's markup and its patching belong together.
export const createVendorList = function createVendorList(
	params: VendorListParams
): VendorList | null {
	const { category, vendors, noStyle, openCards } = params;
	if (vendors.length === 0) {
		return null;
	}
	const copy = { ...DEFAULT_COPY, ...params.copy };
	const style = (name: keyof typeof listStyles): string =>
		noStyle ? '' : (listStyles[name] ?? '');
	const hint = h(
		'p',
		{
			class: style('hint'),
			'data-testid': `consent-widget-vendor-hint-${category}`,
		},
		copy.disabledByCategory
	);
	const element = h('section', {
		'aria-label': copy.title.replace('{count}', String(vendors.length)),
		class: style('root'),
		'data-testid': `consent-widget-vendor-list-${category}`,
	});

	const setOpen = function setOpen(row: VendorRow, open: boolean): void {
		const state = open ? 'open' : 'closed';
		row.item.setAttribute('data-state', state);
		row.path.setAttribute('d', open ? MINUS : PLUS);
		const title = row.path.previousSibling;
		if (title) {
			title.textContent = open ? 'Close' : 'Open';
		}
		if (row.trigger) {
			row.trigger.setAttribute('data-state', state);
			row.trigger.setAttribute('aria-expanded', String(open));
		}
		if (row.content) {
			row.content.setAttribute('data-state', state);
			row.content.setAttribute('aria-hidden', String(!open));
			row.content.toggleAttribute('inert', !open);
		}
	};

	const rows = vendors.map((vendor, index): VendorRow => {
		const name = vendor.name ?? vendor.id;
		const hasDetails = Boolean(vendor.description || vendor.privacyPolicyUrl);
		const key = `${category}:${vendor.id}`;
		const ids = {
			content: `c15t-vendor-${category}-${index}-content`,
			label: `c15t-vendor-${category}-${vendor.id}`,
			trigger: `c15t-vendor-${category}-${index}-trigger`,
		};
		const { icon, path } = buildIcon();
		const trigger = h(
			'button',
			{
				'aria-controls': ids.content,
				'aria-disabled': hasDetails ? undefined : 'true',
				class: noStyle ? '' : cx(itemStyles.trigger, listStyles.trigger),
				'data-disabled': !hasDetails,
				'data-slot': 'preference-item-trigger',
				'data-testid': `consent-widget-vendor-trigger-${category}-${vendor.id}`,
				disabled: !hasDetails,
				id: ids.trigger,
				type: 'button',
			},
			h(
				'div',
				{
					class: noStyle ? '' : cx(itemStyles.leading, listStyles.arrow),
					'data-slot': 'preference-item-leading',
				},
				icon
			),
			h(
				'span',
				{
					class: style('name'),
					'data-testid': `consent-widget-vendor-name-${category}-${vendor.id}`,
					id: ids.label,
				},
				name
			)
		);
		// A `disabled` vendor is presented without a toggle: the kernel ignores
		// grants for it, so a switch would only mislead.
		const switchButton =
			vendor.disabled === true
				? null
				: params.slot(
						buildSwitch({
							describedBy: ids.label,
							label: copy.switchLabel.replace('{vendor}', name),
							noStyle,
							testId: `consent-widget-vendor-switch-${category}-${vendor.id}`,
						}),
						'toggle'
					);
		const content = hasDetails
			? buildDetails({
					category,
					copy,
					ids,
					noStyle,
					vendor,
				})
			: null;
		const item = h(
			'div',
			{
				class: noStyle ? '' : cx(itemStyles.root, listStyles.item),
				'data-disabled': !hasDetails,
				'data-slot': 'preference-item-root',
				'data-testid': `consent-widget-vendor-item-${category}-${vendor.id}`,
			},
			h(
				'div',
				{ class: style('header') },
				trigger,
				switchButton
					? h('div', { class: style('control') }, switchButton)
					: null
			),
			content
		);
		const row: VendorRow = {
			content,
			item,
			path,
			switchButton,
			trigger: hasDetails ? trigger : null,
			vendor,
		};
		trigger.addEventListener('click', () => {
			if (!hasDetails) {
				return;
			}
			const open = !openCards.has(key);
			if (open) {
				openCards.add(key);
			} else {
				openCards.delete(key);
			}
			setOpen(row, open);
		});
		switchButton?.addEventListener('click', () => {
			if (switchButton.disabled) {
				return;
			}
			params.onToggle(
				vendor.id,
				switchButton.getAttribute('aria-checked') !== 'true'
			);
		});
		setOpen(row, openCards.has(key));
		return row;
	});

	for (const row of rows) {
		element.append(row.item);
	}

	return {
		element,
		patch(categoryOn, isChecked) {
			if (categoryOn) {
				hint.remove();
			} else if (!hint.isConnected) {
				element.prepend(hint);
			}
			for (const row of rows) {
				const button = row.switchButton;
				if (!button) {
					continue;
				}
				const checked = isChecked(row.vendor.id);
				button.setAttribute('aria-checked', String(checked));
				button.setAttribute('data-state', checked ? 'checked' : 'unchecked');
				button.disabled = !categoryOn;
				button.toggleAttribute('data-disabled', !categoryOn);
			}
		},
	};
};
