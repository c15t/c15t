import type { ConsentSnapshot } from '@c15t/core';
import { resolveIABDialogDisplayModel } from '@c15t/iab/headless';
import type { HeadlessIABDisplayRow } from '@c15t/iab/headless';

import { classes } from '../generated/iab-styles';
import { classes as shared } from '../generated/styles';
import { resolveCopy } from '../ui/copy';
import { h } from '../ui/dom';
import type { SurfaceContext } from '../ui/surface';
import { createVendorDisclosures } from './vendor-disclosures';

/** Preference content preserves focused controls while the IAB draft changes. */
export interface IABPreferences {
	element: HTMLElement;
	sync: (snapshot: ConsentSnapshot) => void;
}

/** Render purpose, special-feature, and vendor choices from the shared model. */
export const createIABPreferences = (
	ctx: SurfaceContext,
	vendorsFirst: boolean,
	moreVendorsText = 'Show more partners'
): IABPreferences => {
	const { client, noStyle } = ctx;
	const snapshot = client.getSnapshot();
	const copy = resolveCopy(snapshot);
	const t = copy.t.iab;
	const model = resolveIABDialogDisplayModel(snapshot.iab);
	const styles = classes.dialog;
	const css = (value: string): string => (noStyle ? '' : value);
	const updates: ((value: ConsentSnapshot) => void)[] = [];
	const element = h('div', { class: css(styles.body) });
	const purposes = h('div', {
		'aria-labelledby': 'c15t-iab-purposes-tab',
		class: css(styles.tabPanel),
		id: 'c15t-iab-purposes',
		role: 'tabpanel',
	});
	const vendors = h('div', {
		'aria-labelledby': 'c15t-iab-vendors-tab',
		class: css(styles.tabPanel),
		id: 'c15t-iab-vendors',
		role: 'tabpanel',
	});

	const toggle = (
		label: string,
		testId: string,
		read: (value: ConsentSnapshot) => boolean,
		write: (value: boolean) => void,
		subject: string,
		isMixed?: (value: ConsentSnapshot) => boolean
	): HTMLElement => {
		const button = h(
			'button',
			{
				'aria-label': `${subject}: ${label}`,
				class: css(shared.switch.root),
				'data-c15t-iab-toggle': '',
				'data-testid': testId,
				id: testId,
				onclick: () => write(!read(client.getSnapshot())),
				role: isMixed ? 'checkbox' : 'switch',
				type: 'button',
			},
			h(
				'span',
				{ class: css(shared.switch.track) },
				h('span', { class: css(shared.switch.thumb) })
			)
		);
		const partial = h(
			'span',
			{
				'aria-hidden': 'true',
				class: css(styles.partialIndicator),
			},
			noStyle ? '−' : ''
		);
		const update = (current: ConsentSnapshot): void => {
			const checked = read(current);
			const mixed = isMixed?.(current) ?? false;
			partial.hidden = !mixed;
			button.setAttribute('aria-checked', mixed ? 'mixed' : String(checked));
			button.setAttribute('data-state', checked ? 'checked' : 'unchecked');
		};
		updates.push(update);
		update(snapshot);
		return h(
			'div',
			{ class: css(styles.purposeHeader) },
			h('label', { for: testId }, label),
			...(isMixed ? [partial] : []),
			button
		);
	};

	const readConsent = (
		row: HeadlessIABDisplayRow,
		value: ConsentSnapshot
	): boolean =>
		Boolean(
			row.toggle === 'special-feature'
				? value.iab?.specialFeatureOptIns[row.id]
				: value.iab?.purposeConsents[row.id]
		);
	const writeConsent = (row: HeadlessIABDisplayRow, value: boolean): void => {
		const handle = client.runtime.iab;
		if (row.locked || !handle) {
			return;
		}
		if (row.toggle === 'special-feature') {
			handle.setSpecialFeatureOptIn(row.id, value);
		} else {
			handle.setPurposeConsent(row.id, value);
		}
		for (const vendor of row.vendors) {
			if (
				!vendor.usesLegitimateInterest &&
				Boolean(client.getSnapshot().iab?.vendorConsents[String(vendor.id)]) !==
					value
			) {
				handle.setVendorConsent(vendor.id, value);
			}
		}
	};

	const renderPurpose = (row: HeadlessIABDisplayRow): HTMLElement => {
		const details = h(
			'details',
			{
				class: css(styles.purposeItem),
				'data-c15t-iab-disclosure': '',
				'data-testid': row.testId,
			},
			h(
				'summary',
				{ class: css(styles.purposeHeader) },
				h('span', { 'aria-hidden': 'true', 'data-c15t-iab-chevron': '' }, '›'),
				h('span', { class: css(styles.purposeName) }, row.name)
			)
		);
		const body = h(
			'div',
			{ class: css(styles.purposeContent) },
			h('p', { class: css(styles.purposeDescription) }, row.description)
		);
		for (const illustration of row.illustrations) {
			body.append(h('p', {}, illustration));
		}
		if (row.locked) {
			body.append(h('p', {}, t.preferenceCenter.vendorList.requiredNotice));
		} else {
			body.append(
				toggle(
					t.preferenceCenter.purposeItem.withYourPermission,
					`${row.testId}-consent`,
					(value) => readConsent(row, value),
					(value) => writeConsent(row, value),
					row.name
				)
			);
			if (
				row.kind === 'purpose' &&
				row.vendors.some((vendor) => vendor.usesLegitimateInterest)
			) {
				body.append(
					h('p', {}, t.preferenceCenter.purposeItem.rightToObject),
					toggle(
						t.preferenceCenter.purposeItem.legitimateInterest,
						`${row.testId}-li`,
						(value) => Boolean(value.iab?.purposeLegitimateInterests[row.id]),
						(value) => {
							const handle = client.runtime.iab;
							handle?.setPurposeLegitimateInterest(row.id, value);
							for (const vendor of row.vendors) {
								if (vendor.usesLegitimateInterest) {
									handle?.setVendorLegitimateInterest(vendor.id, value);
								}
							}
						},
						row.name
					)
				);
			}
		}
		body.append(
			h(
				'p',
				{},
				t.preferenceCenter.purposeItem.partners.replace(
					'{count}',
					String(row.vendors.length)
				)
			)
		);
		const partners = h('ul');
		for (const vendor of row.vendors) {
			partners.append(h('li', {}, vendor.name));
		}
		body.append(partners);
		details.append(body);
		return details;
	};
	for (const row of model.consentRows) {
		if (row.kind === 'stack') {
			purposes.append(
				h(
					'details',
					{
						class: css(styles.stackItem),
						'data-c15t-iab-disclosure': '',
						'data-testid': row.testId,
					},
					h(
						'summary',
						{ class: css(styles.stackHeader) },
						h(
							'span',
							{ 'aria-hidden': 'true', 'data-c15t-iab-chevron': '' },
							'›'
						),
						h('span', { class: css(styles.stackName) }, row.name)
					),
					h('p', {}, row.description),
					toggle(
						t.preferenceCenter.purposeItem.withYourPermission,
						`${row.testId}-consent`,
						(value) =>
							row.purposes.every((purpose) => readConsent(purpose, value)),
						(value) => {
							for (const purpose of row.purposes) {
								writeConsent(purpose, value);
							}
						},
						row.name,
						(value) =>
							row.purposes.some((purpose) => readConsent(purpose, value)) &&
							!row.purposes.every((purpose) => readConsent(purpose, value))
					),
					...row.purposes.map(renderPurpose)
				)
			);
		} else {
			purposes.append(renderPurpose(row));
		}
	}
	if (model.essentialRows.length) {
		purposes.append(
			h(
				'section',
				{},
				h('h3', {}, t.preferenceCenter.specialPurposes.title),
				...model.essentialRows.map(renderPurpose)
			)
		);
	}
	purposes.append(
		h(
			'p',
			{ class: css(styles.consentNotice) },
			t.preferenceCenter.footer.consentStorage
		)
	);

	const vendorRows = [
		...Object.values(snapshot.iab?.gvl?.vendors ?? {}),
		...(snapshot.iab?.customVendors ?? []),
	];
	const list = h('div', { class: css(styles.vendorListContent) });
	const search = h('input', {
		'aria-label': t.preferenceCenter.vendorList.search,
		class: css(styles.searchInput),
		placeholder: t.preferenceCenter.vendorList.search,
		type: 'search',
	});
	const count = h('p', { 'aria-live': 'polite' });
	let limit = 50;
	let vendorUpdatesStart = updates.length;
	const more = h(
		'button',
		{
			class: css(shared.button.button),

			type: 'button',
		},
		moreVendorsText
	);
	const renderVendors = (): void => {
		updates.splice(vendorUpdatesStart);
		list.replaceChildren();
		const query = search.value.trim().toLocaleLowerCase();
		const filtered = vendorRows.filter((vendor) =>
			vendor.name.toLocaleLowerCase().includes(query)
		);
		count.textContent = t.preferenceCenter.vendorList.showingCount
			.replace('{filtered}', String(Math.min(limit, filtered.length)))
			.replace('{total}', String(filtered.length));
		more.hidden = filtered.length <= limit;
		for (const vendor of filtered.slice(0, limit)) {
			const id = String(vendor.id);
			const custom = snapshot.iab?.customVendors.some(
				(entry) => String(entry.id) === id
			);
			const details = h(
				'details',
				{
					class: css(styles.vendorListItem),
					'data-c15t-iab-disclosure': '',
					'data-testid': `iab-vendor-${id}`,
				},
				h(
					'summary',
					{ class: css(styles.vendorListItemHeader) },
					h(
						'span',
						{ 'aria-hidden': 'true', 'data-c15t-iab-chevron': '' },
						'›'
					),
					h('span', { class: css(styles.vendorListName) }, vendor.name)
				)
			);
			const body = h('div', {
				class: css(styles.vendorDetails),
				'data-c15t-iab-vendor-details': '',
			});
			if (custom) {
				body.append(h('p', {}, t.common.customPartner));
			}
			if (vendor.purposes.length) {
				body.append(
					toggle(
						t.preferenceCenter.purposeItem.withYourPermission,
						`iab-vendor-${id}-consent`,
						(value) => Boolean(value.iab?.vendorConsents[id]),
						(value) => client.runtime.iab?.setVendorConsent(id, value),
						vendor.name
					)
				);
			}
			if (vendor.legIntPurposes?.length) {
				body.append(
					toggle(
						t.preferenceCenter.purposeItem.legitimateInterest,
						`iab-vendor-${id}-li`,
						(value) => Boolean(value.iab?.vendorLegitimateInterests[id]),
						(value) =>
							client.runtime.iab?.setVendorLegitimateInterest(id, value),
						vendor.name
					)
				);
			}
			body.append(createVendorDisclosures(snapshot, vendor, copy));
			details.append(body);
			list.append(details);
		}
		for (const update of updates) {
			update(client.getSnapshot());
		}
	};
	more.addEventListener('click', () => {
		limit += 50;
		renderVendors();
	});
	search.addEventListener('input', () => {
		limit = 50;
		renderVendors();
	});
	vendors.append(
		h('div', { class: css(styles.searchContainer) }, search),
		count,
		list,
		more
	);
	let vendorsRendered = false;
	const tabs = h('div', {
		'aria-label': t.preferenceCenter.title,
		class: css(styles.tabsList),
		role: 'tablist',
	});
	const purposeTab = h(
		'button',
		{
			'aria-controls': purposes.id,
			class: css(styles.tabButton),
			id: 'c15t-iab-purposes-tab',
			role: 'tab',
			type: 'button',
		},
		`${t.preferenceCenter.tabs.purposes} (${model.purposeTabCount})`
	);
	const vendorTab = h(
		'button',
		{
			'aria-controls': vendors.id,
			class: css(styles.tabButton),
			id: 'c15t-iab-vendors-tab',
			role: 'tab',
			type: 'button',
		},
		`${t.preferenceCenter.tabs.vendors} (${model.vendorTabCount})`
	);
	const select = (showVendors: boolean): void => {
		if (showVendors && !vendorsRendered) {
			vendorUpdatesStart = updates.length;
			renderVendors();
			vendorsRendered = true;
		}
		purposes.hidden = showVendors;
		vendors.hidden = !showVendors;
		for (const [tab, selected] of [
			[purposeTab, !showVendors],
			[vendorTab, showVendors],
		] as const) {
			tab.setAttribute('aria-selected', String(selected));
			tab.setAttribute('data-state', selected ? 'active' : 'inactive');
			tab.tabIndex = selected ? 0 : -1;
		}
	};
	purposeTab.addEventListener('click', () => select(false));
	vendorTab.addEventListener('click', () => select(true));
	tabs.addEventListener('keydown', (event) => {
		if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
			return;
		}
		event.preventDefault();
		const showVendors =
			event.key === 'End' ||
			(event.key !== 'Home' &&
				document.activeElement !== vendorTab &&
				vendorTab.tabIndex !== 0);
		select(showVendors);
		(showVendors ? vendorTab : purposeTab).focus();
	});
	tabs.append(purposeTab, vendorTab);
	element.append(
		h('div', { class: css(styles.tabsContainer) }, tabs),
		h('div', { class: css(styles.content) }, purposes, vendors)
	);
	select(vendorsFirst);
	return {
		element,
		sync: (value) => {
			for (const update of updates) {
				update(value);
			}
		},
	};
};
