import { consentTypes } from '@c15t/core';
import type {
	AllConsentNames,
	ConsentSnapshot,
	ConsentState,
	PresentationAction,
} from '@c15t/core';
import type { CompleteTranslations } from '@c15t/translations';

import { classes } from '../generated/styles';
import { renderActionFooter, resolveActions } from './actions';
import { renderBranding } from './branding';
import { formatCategoryName, resolveCopy } from './copy';
import { cx, h, svg } from './dom';
import type { SurfaceContext } from './surface';

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
	noStyle: boolean,
	onToggle: () => void
): HTMLButtonElement {
	return h(
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
};

const buildContent = function buildContent(
	copy: RowCopy,
	ids: { trigger: string; content: string },
	noStyle: boolean
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
				copy.description
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
 * Toggles are a draft until the visitor saves, the way every other adapter
 * treats them; "Accept all" and "Reject all" bypass the draft.
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
	const { noStyle } = ctx;
	const hideBranding = options.hideBranding ?? true;

	let draft: Partial<ConsentState> = {};
	let { fingerprint } = ctx.client.getSnapshot().evaluationPolicy.choice;
	let openItem: AllConsentNames | null = null;
	let rows: Row[] = [];
	let renderedFrom: {
		categories: string;
		translations: ConsentSnapshot['translations'];
		policyRule: ConsentSnapshot['policyRule'];
	} | null = null;

	const element = h('div', {
		class: noStyle ? '' : classes.manager.manager,
		'data-testid': 'consent-widget-root',
	});

	const isChecked = function isChecked(
		snapshot: ConsentSnapshot,
		name: AllConsentNames
	): boolean {
		if (name === 'necessary') {
			return true;
		}
		return (
			draft[name] ??
			snapshot.explicitChoice?.categories[name]?.value ??
			ctx.client.options.presentation?.preferences?.defaults?.[name] ??
			(snapshot.policyRule.model === 'opt-out' ||
				snapshot.policyRule.preselectedCategories.includes(name))
		);
	};

	const setOpen = function setOpen(name: AllConsentNames): void {
		openItem = openItem === name ? null : name;
		for (const row of rows) {
			patchOpen(row, openItem === row.name);
		}
	};

	const toggle = function toggle(name: AllConsentNames): void {
		const next = !isChecked(ctx.client.getSnapshot(), name);
		draft = { ...draft, [name]: next };
		const row = rows.find((candidate) => candidate.name === name);
		if (row) {
			patchSwitch(row, next);
		}
	};

	const buildRow = function buildRow(
		snapshot: ConsentSnapshot,
		copy: RowCopy
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
		const switchButton = buildSwitch(copy, noStyle, () => {
			if (!copy.disabled) {
				toggle(name);
			}
		});
		const content = buildContent(copy, ids, noStyle);
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
		const row: Row = { arrow, content, item, name, switchButton, trigger };
		patchOpen(row, openItem === name);
		patchSwitch(row, isChecked(snapshot, name));
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
			actions: resolveActions(
				snapshot,
				'preferences',
				ctx.client.options.presentation
			),
			buttonTestId: (action) => testIds[action],
			footerClassName: classes.manager.footer,
			label: (action) => labels[action],
			noStyle,
			onAction: (action) => {
				const current = ctx.client.getSnapshot();
				const pending: Partial<ConsentState> = {};
				for (const category of ctx.client.consentCategories) {
					if (category !== 'necessary') {
						pending[category] = isChecked(current, category);
					}
				}
				if (action === 'accept') {
					void ctx.client.acceptAll();
				} else if (action === 'reject') {
					void ctx.client.rejectAll();
				} else {
					void ctx.client.save(pending);
				}
			},
			subGroupTestId: 'consent-widget-footer-sub-group',
			testId: 'consent-widget-footer',
		});
	};

	const rebuild = function rebuild(snapshot: ConsentSnapshot): void {
		const { t, dir } = resolveCopy(snapshot);
		const categories = ctx.client.consentCategories;
		element.replaceChildren();
		element.setAttribute('dir', dir);
		rows = categories.map((name) =>
			buildRow(snapshot, resolveRowCopy(t, name))
		);

		const list = h('div', {
			class: noStyle ? '' : accordion.list,
			'data-testid': 'consent-widget-accordion',
		});
		for (const row of rows) {
			list.append(row.item);
		}
		element.append(list, buildFooter(snapshot, t));
		const branding = renderBranding({
			branding: snapshot.branding,
			hide: hideBranding,
			noStyle,
			securedBy: t.common.securedBy,
			testId: 'consent-widget-branding',
			variant: 'dialog-tag',
		});
		if (branding) {
			element.append(branding);
		}
		renderedFrom = {
			categories: categories.join(','),
			policyRule: snapshot.policyRule,
			translations: snapshot.translations,
		};
	};

	return {
		element,
		resetDraft() {
			draft = {};
		},
		sync(snapshot) {
			if (fingerprint !== snapshot.evaluationPolicy.choice.fingerprint) {
				draft = {};
				({ fingerprint } = snapshot.evaluationPolicy.choice);
			}
			const categories = ctx.client.consentCategories.join(',');
			if (
				!renderedFrom ||
				renderedFrom.categories !== categories ||
				renderedFrom.translations !== snapshot.translations ||
				renderedFrom.policyRule !== snapshot.policyRule
			) {
				rebuild(snapshot);
				return;
			}
			for (const row of rows) {
				patchSwitch(row, isChecked(snapshot, row.name));
			}
		},
	};
};
