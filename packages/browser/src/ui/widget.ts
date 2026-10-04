import { consentTypes, vendorsListedUnder } from '@c15t/core';
import type {
	AllConsentNames,
	ConsentSnapshot,
	PresentationAction,
} from '@c15t/core';
import { createPreferenceDraft } from '@c15t/core/preference-draft';
import type { CompleteTranslations } from '@c15t/translations';

import { classes } from '../generated/styles';
import { renderActionFooter, resolveActions } from './actions';
import { renderBranding } from './branding';
import { formatCategoryName, resolveCopy } from './copy';
import { cx, h, svg } from './dom';
import type { SurfaceContext } from './surface';
import { createVendorList } from './vendor-list';
import type { VendorList } from './vendor-list';

/** The preference list plus its footer. */
export interface Widget {
	/** The widget root. */
	readonly element: HTMLElement;
	/** Reconcile the rows and switches with a snapshot. */
	sync: (snapshot: ConsentSnapshot) => void;
	/** Drop unsaved toggles. */
	resetDraft: () => void;
}

/** Options for {@link createWidget}. */
export interface WidgetOptions {
	/** Drop the "Secured by c15t" tag. Defaults to `true`. */
	hideBranding?: boolean;
}

const PLUS = 'M5 12h14M12 5v14';
const MINUS = 'M5 12h14';

const { accordion, switch: switchStyles } = classes;

interface Row {
	name: AllConsentNames;
	item: HTMLElement;
	trigger: HTMLElement;
	arrow: SVGSVGElement;
	content: HTMLElement;
	switchButton: HTMLButtonElement;
	vendorList: VendorList | null;
}

interface RowCopy {
	name: AllConsentNames;
	title: string;
	description: string;
	disabled: boolean;
}

const resolveRowCopy = function resolveRowCopy(
	t: CompleteTranslations,
	name: AllConsentNames
): RowCopy {
	const type = consentTypes.find((candidate) => candidate.name === name);
	return {
		description: t.consentTypes[name]?.description ?? type?.description ?? '',
		disabled: type?.disabled ?? false,
		name,
		title: t.consentTypes[name]?.title ?? formatCategoryName(name),
	};
};

const buildArrow = function buildArrow(): SVGSVGElement {
	const arrow = svg('0 0 24 24', [PLUS], {
		fill: 'none',
		stroke: 'currentColor',
		'stroke-linecap': 'round',
		'stroke-linejoin': 'round',
		'stroke-width': '2',
	});
	for (const path of arrow.querySelectorAll('path')) {
		path.setAttribute('fill', 'none');
	}
	return arrow;
};

const buildSwitch = function buildSwitch(
	copy: RowCopy,
	ctx: Pick<SurfaceContext, 'noStyle' | 'slot'>,
	onToggle: () => void
): HTMLButtonElement {
	const { noStyle } = ctx;
	const element = h(
		'button',
		{
			'aria-label': copy.title,
			class: noStyle ? '' : cx(switchStyles.root, switchStyles.rootSmall),
			'data-disabled': copy.disabled ? '' : undefined,
			'data-slot': 'switch',
			'data-testid': `consent-widget-switch-${copy.name}`,
			disabled: copy.disabled,
			onclick: onToggle,
			role: 'switch',
			type: 'button',
		},
		h(
			'span',
			{
				class: noStyle ? '' : cx(switchStyles.track, switchStyles.trackSmall),
				'data-slot': 'switch-track',
			},
			h('span', {
				class: noStyle ? '' : cx(switchStyles.thumb, switchStyles.thumbSmall),
				'data-slot': 'switch-thumb',
			})
		)
	);
	return ctx.slot(element, 'toggle');
};

const buildContent = function buildContent(
	copy: RowCopy,
	ids: { trigger: string; content: string },
	noStyle: boolean,
	vendorList: VendorList | null
): HTMLElement {
	return h(
		'div',
		{
			'aria-labelledby': ids.trigger,
			class: noStyle ? '' : accordion.content,
			'data-slot': 'preference-item-content',
			'data-testid': `consent-widget-accordion-content-${copy.name}`,
			id: ids.content,
		},
		h(
			'div',
			{
				class: noStyle ? '' : accordion.contentViewport,
				'data-slot': 'preference-item-content-viewport',
			},
			h(
				'div',
				{
					class: noStyle ? '' : accordion.contentInner,
					'data-slot': 'preference-item-content-inner',
				},
				copy.description,
				vendorList?.element
			)
		)
	);
};

const patchSwitch = function patchSwitch(row: Row, checked: boolean): void {
	row.switchButton.setAttribute('aria-checked', String(checked));
	row.switchButton.setAttribute(
		'data-state',
		checked ? 'checked' : 'unchecked'
	);
};

const patchOpen = function patchOpen(row: Row, open: boolean): void {
	const state = open ? 'open' : 'closed';
	row.item.setAttribute('data-state', state);
	row.trigger.setAttribute('data-state', state);
	row.trigger.setAttribute('aria-expanded', String(open));
	row.content.setAttribute('data-state', state);
	row.content.setAttribute('aria-hidden', String(!open));
	if (open) {
		row.content.removeAttribute('inert');
	} else {
		row.content.setAttribute('inert', '');
	}
	row.arrow.querySelector('path')?.setAttribute('d', open ? MINUS : PLUS);
};

/**
 * The category list the preference centre renders.
 *
 * Toggles stage into a `@c15t/core/preference-draft` draft until the
 * visitor saves, the way every other adapter treats them; "Accept all" and
 * "Reject all" discard it. Each category lists its declared vendors with a
 * switch per vendor: vendor switches stage into the same draft, are
 * disabled while their category is off in it, and Save records only the
 * vendors the visitor moved. When the policy or the vendor list changes
 * under a staged edit, a notice asks the visitor to review before saving.
 *
 * @param ctx - The mount context.
 * @param options - Widget options.
 * @returns The widget.
 */
// oxlint-disable-next-line max-lines-per-function -- Rows, draft and footer are one unit.
export const createWidget = function createWidget(
	ctx: SurfaceContext,
	options: WidgetOptions = {}
): Widget {
	const { noStyle, slot } = ctx;
	const hideBranding = options.hideBranding ?? true;

	const draft = createPreferenceDraft(ctx.client.kernel, {
		defaults: ctx.client.presentation?.preferences?.defaults,
	});
	const openVendorCards = new Set<string>();
	let openItem: AllConsentNames | null = null;
	let rows: Row[] = [];
	let review: HTMLElement | null = null;
	let renderedFrom: {
		categories: string;
		translations: ConsentSnapshot['translations'];
		policyRule: ConsentSnapshot['policyRule'];
		experiment: ConsentSnapshot['experiment'];
		vendors: ConsentSnapshot['vendors'];
	} | null = null;

	const element = slot(
		h('div', {
			class: noStyle ? '' : classes.manager.manager,
			'data-testid': 'consent-widget-root',
		}),
		'consentWidget'
	);

	const isChecked = (name: AllConsentNames): boolean =>
		draft.getState().values[name];

	const patchVendors = function patchVendors(): void {
		const { vendors } = draft.getState();
		for (const row of rows) {
			row.vendorList?.patch(
				isChecked(row.name),
				(vendorId) => vendors[vendorId] ?? true
			);
		}
	};

	/** Show or hide the review notice and bring every switch up to date. */
	const patchAll = function patchAll(): void {
		for (const row of rows) {
			patchSwitch(row, isChecked(row.name));
		}
		patchVendors();
		review?.toggleAttribute('hidden', !draft.getState().isStale);
	};

	const setOpen = function setOpen(name: AllConsentNames): void {
		openItem = openItem === name ? null : name;
		for (const row of rows) {
			patchOpen(row, openItem === row.name);
		}
	};

	const toggle = function toggle(name: AllConsentNames): void {
		draft.set(name, !isChecked(name));
		patchAll();
	};

	const toggleVendor = function toggleVendor(
		vendorId: string,
		granted: boolean
	): void {
		draft.setVendor(vendorId, granted);
		// One vendor can sit under several categories; every row follows.
		patchAll();
	};

	const buildRow = function buildRow(
		snapshot: ConsentSnapshot,
		copy: RowCopy,
		t: CompleteTranslations
	): Row {
		const { name } = copy;
		const ids = {
			content: `c15t-pref-${name}-content`,
			trigger: `c15t-pref-${name}-trigger`,
		};
		const arrow = buildArrow();
		const trigger = h(
			'button',
			{
				'aria-controls': ids.content,
				class: noStyle ? '' : accordion.trigger,
				'data-slot': 'preference-item-trigger',
				'data-testid': `consent-widget-accordion-trigger-${name}`,
				id: ids.trigger,
				onclick: () => {
					setOpen(name);
				},
				type: 'button',
			},
			h(
				'span',
				{
					class: noStyle ? '' : accordion.arrow,
					'data-slot': 'preference-item-leading',
					'data-testid': `consent-widget-accordion-arrow-${name}`,
				},
				arrow
			),
			h(
				'span',
				{ 'data-slot': 'preference-item-header' },
				h(
					'span',
					{
						class: noStyle ? '' : accordion.title,
						'data-slot': 'preference-item-title',
					},
					copy.title
				)
			)
		);
		const switchButton = buildSwitch(copy, ctx, () => {
			if (!copy.disabled) {
				toggle(name);
			}
		});
		const vendorList = createVendorList({
			category: name,
			copy: t.consentManagerDialog.vendors,
			noStyle,
			onToggle: toggleVendor,
			openCards: openVendorCards,
			slot,
			vendors:
				snapshot.model === 'iab'
					? []
					: vendorsListedUnder(snapshot.vendors?.declared ?? [], name),
		});
		const content = buildContent(copy, ids, noStyle, vendorList);
		const item = h(
			'div',
			{
				class: noStyle ? '' : accordion.item,
				'data-disabled': copy.disabled ? '' : undefined,
				'data-slot': 'preference-item',
				'data-testid': `consent-widget-accordion-item-${name}`,
			},
			h(
				'div',
				{ class: noStyle ? '' : accordion.triggerRow },
				trigger,
				h(
					'div',
					{
						class: noStyle ? '' : accordion.control,
						'data-slot': 'preference-item-control',
					},
					switchButton
				)
			),
			content
		);
		const row: Row = {
			arrow,
			content,
			item,
			name,
			switchButton,
			trigger,
			vendorList,
		};
		patchOpen(row, openItem === name);
		patchSwitch(row, isChecked(name));
		return row;
	};

	const buildFooter = function buildFooter(
		snapshot: ConsentSnapshot,
		t: CompleteTranslations
	): HTMLElement {
		const labels: Record<PresentationAction, string> = {
			accept: t.common.acceptAll,
			customize: t.common.customize,
			dismiss: t.common.acknowledge,
			reject: t.common.rejectAll,
			save: t.common.save,
		};
		const testIds: Record<PresentationAction, string> = {
			accept: 'consent-widget-footer-accept-all-button',
			customize: 'consent-widget-footer-customize-button',
			dismiss: 'consent-widget-footer-dismiss-button',
			reject: 'consent-widget-reject-button',
			save: 'consent-widget-footer-save-button',
		};
		return renderActionFooter({
			actions: resolveActions(snapshot, 'preferences', ctx.client.presentation),
			buttonTestId: (action) => testIds[action],
			footerClassName: classes.manager.footer,
			footerSlot: 'consentWidgetFooter',
			groupSlot: 'consentWidgetFooterSubGroup',
			label: (action) => labels[action],
			noStyle,
			onAction: (action) => {
				// Accept all and Reject all supersede every staged switch.
				if (action === 'accept' || action === 'reject') {
					draft.reset();
					void (action === 'accept'
						? ctx.client.acceptAll()
						: ctx.client.rejectAll());
					return;
				}
				// The displayed categories and only the vendors the visitor
				// moved; nothing while the draft is stale.
				const input = draft.toSaveInput();
				if (input) {
					void ctx.client.save(input);
				} else {
					patchAll();
				}
			},
			slot,
			subGroupTestId: 'consent-widget-footer-sub-group',
			testId: 'consent-widget-footer',
		});
	};

	const rebuild = function rebuild(snapshot: ConsentSnapshot): void {
		const { t, dir } = resolveCopy(snapshot);
		const categories = draft.getState().displayedCategories;
		element.replaceChildren();
		element.setAttribute('dir', dir);
		rows = categories.map((name) =>
			buildRow(snapshot, resolveRowCopy(t, name), t)
		);
		review = h(
			'div',
			{ 'data-testid': 'consent-widget-review', role: 'alert' },
			'The privacy policy changed. Review the current choices before saving. ',
			h(
				'button',
				{
					onclick: () => {
						draft.reset();
						patchAll();
					},
					type: 'button',
				},
				'Review choices'
			)
		);

		const list = slot(
			h('div', {
				class: noStyle ? '' : accordion.list,
				'data-testid': 'consent-widget-accordion',
			}),
			'consentWidgetAccordion'
		);
		for (const row of rows) {
			list.append(row.item);
		}
		element.append(review, list, buildFooter(snapshot, t));
		patchAll();
		const branding = slot(
			renderBranding({
				branding: snapshot.branding,
				hide: hideBranding,
				noStyle,
				securedBy: t.common.securedBy,
				testId: 'consent-widget-branding',
				variant: 'dialog-tag',
			}),
			'consentWidgetTag'
		);
		if (branding) {
			element.append(branding);
		}
		renderedFrom = {
			categories: categories.join(','),
			experiment: snapshot.experiment,
			policyRule: snapshot.policyRule,
			translations: snapshot.translations,
			vendors: snapshot.vendors,
		};
	};

	return {
		element,
		resetDraft() {
			draft.reset();
		},
		sync(snapshot) {
			draft.setDefaults(ctx.client.presentation?.preferences?.defaults);
			const categories = draft.getState().displayedCategories.join(',');
			if (
				!renderedFrom ||
				renderedFrom.categories !== categories ||
				renderedFrom.translations !== snapshot.translations ||
				renderedFrom.policyRule !== snapshot.policyRule ||
				renderedFrom.experiment !== snapshot.experiment ||
				renderedFrom.vendors !== snapshot.vendors
			) {
				rebuild(snapshot);
				return;
			}
			patchAll();
		},
	};
};
