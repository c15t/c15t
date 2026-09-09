import type { ConsentSnapshot } from '@c15t/core';
import { resolveIABDialogDisplayModel } from '@c15t/iab/headless';
import type { HeadlessIABDisplayRow } from '@c15t/iab/headless';

import { classes } from '../generated/iab-styles';
import { classes as shared } from '../generated/styles';
import { resolveCopy } from '../ui/copy';
import { h } from '../ui/dom';
import type { SurfaceContext } from '../ui/surface';

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
		subject: string
	): HTMLElement => {
		const button = h(
			'button',
			{
				'aria-label': `${subject}: ${label}`,
				class: css(shared.switch.root),
				'data-testid': testId,
				id: testId,
				onclick: () => write(!read(client.getSnapshot())),
				role: 'switch',
				type: 'button',
			},
			h(
				'span',
				{ class: css(shared.switch.track) },
				h('span', { class: css(shared.switch.thumb) })
			)
		);
		const update = (current: ConsentSnapshot): void => {
			const checked = read(current);
			button.setAttribute('aria-checked', String(checked));
			button.setAttribute('data-state', checked ? 'checked' : 'unchecked');
		};
		updates.push(update);
		update(snapshot);
		return h(
			'div',
			{ class: css(styles.purposeHeader) },
			h('label', { for: testId }, label),
			button
		);
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
					(value) =>
						Boolean(
							row.toggle === 'special-feature'
								? value.iab?.specialFeatureOptIns[row.id]
								: value.iab?.purposeConsents[row.id]
						),
					(value) => {
						if (row.toggle === 'special-feature') {
							client.runtime.iab?.setSpecialFeatureOptIn(row.id, value);
						} else {
							client.runtime.iab?.setPurposeConsent(row.id, value);
						}
					},
					row.name
				)
			);
			if (
				row.kind === 'purpose' &&
				row.vendors.some((vendor) => vendor.legIntPurposes.includes(row.id))
			) {
				body.append(
					h('p', {}, t.preferenceCenter.purposeItem.rightToObject),
					toggle(
						t.preferenceCenter.purposeItem.legitimateInterest,
						`${row.testId}-li`,
						(value) => Boolean(value.iab?.purposeLegitimateInterests[row.id]),
						(value) =>
							client.runtime.iab?.setPurposeLegitimateInterest(row.id, value),
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
	// oxlint-disable-next-line complexity -- Vendor disclosures have independent optional fields.
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
			const body = h('div', { class: css(styles.vendorDetails) });
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
			const link = (href: string | undefined, label: string): void => {
				if (href && /^https?:\/\//iu.test(href)) {
					body.append(
						h(
							'p',
							{},
							h('a', { href, rel: 'noreferrer', target: '_blank' }, label)
						)
					);
				}
			};
			link(
				'privacyPolicyUrl' in vendor
					? vendor.privacyPolicyUrl
					: (vendor.urls?.find((url) => url.langId === (copy.language ?? 'en'))
							?.privacy ?? vendor.urls?.[0]?.privacy),
				t.preferenceCenter.vendorList.privacyPolicy
			);
			if ('deviceStorageDisclosureUrl' in vendor) {
				link(
					vendor.deviceStorageDisclosureUrl,
					t.preferenceCenter.vendorList.storageDisclosure
				);
			}
			const groups = [
				[
					t.preferenceCenter.vendorList.purposes,
					vendor.purposes,
					snapshot.iab?.gvl?.purposes,
				],
				[
					t.preferenceCenter.vendorList.legitimateInterest,
					vendor.legIntPurposes ?? [],
					snapshot.iab?.gvl?.purposes,
				],
				[
					t.preferenceCenter.vendorList.specialPurposes,
					'specialPurposes' in vendor ? vendor.specialPurposes : [],
					snapshot.iab?.gvl?.specialPurposes,
				],
				[
					t.preferenceCenter.vendorList.features,
					vendor.features ?? [],
					snapshot.iab?.gvl?.features,
				],
				[
					t.preferenceCenter.vendorList.specialFeatures,
					vendor.specialFeatures ?? [],
					snapshot.iab?.gvl?.specialFeatures,
				],
			] as const;
			for (const [title, ids, names] of groups) {
				if (ids.length) {
					body.append(
						h('h4', {}, title),
						h(
							'ul',
							{},
							...ids.map((purpose) =>
								h('li', {}, names?.[purpose]?.name ?? String(purpose))
							)
						)
					);
				}
			}
			if (
				'cookieMaxAgeSeconds' in vendor &&
				typeof vendor.cookieMaxAgeSeconds === 'number'
			) {
				body.append(
					h(
						'p',
						{},
						t.preferenceCenter.vendorList.maxAge.replace(
							'{days}',
							String(Math.ceil(vendor.cookieMaxAgeSeconds / 86400))
						)
					)
				);
			}
			if ('usesNonCookieAccess' in vendor && vendor.usesNonCookieAccess) {
				body.append(h('p', {}, t.preferenceCenter.vendorList.nonCookieAccess));
			}
			if (
				'dataRetention' in vendor &&
				typeof vendor.dataRetention?.stdRetention === 'number'
			) {
				body.append(
					h(
						'p',
						{},
						t.preferenceCenter.vendorList.retention.replace(
							'{days}',
							String(vendor.dataRetention.stdRetention)
						)
					)
				);
			}
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
