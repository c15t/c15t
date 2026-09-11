import type {
	ConsentSnapshot,
	GlobalVendorList,
	NonIABVendor,
} from '@c15t/core';

import type { SurfaceCopy } from '../ui/copy';
import { h } from '../ui/dom';

type Vendor = GlobalVendorList['vendors'][number] | NonIABVendor;
type NamedItems = Record<number, { name: string; description?: string }>;

const duration = (value: number | null | undefined): number | undefined =>
	typeof value === 'number' && Number.isFinite(value) && value >= 0
		? value
		: undefined;

const safeUrl = (value: string | undefined): string | undefined => {
	if (!value) {
		return undefined;
	}
	try {
		const url = new URL(value);
		return url.protocol === 'https:' || url.protocol === 'http:'
			? url.href
			: undefined;
	} catch {
		return undefined;
	}
};

const createStorageDisclosures = (
	vendor: Vendor,
	copy: SurfaceCopy,
	standardRetention: number | undefined
): DocumentFragment => {
	const content = document.createDocumentFragment();
	const t = copy.t.iab.preferenceCenter.vendorList;
	if (vendor.usesCookies) {
		content.append(h('p', {}, t.usesCookies));
	}
	const seconds = duration(vendor.cookieMaxAgeSeconds);
	if (seconds !== undefined) {
		const age = t.maxAge.replace('{days}', String(Math.ceil(seconds / 86400)));
		const refreshes =
			'cookieRefresh' in vendor && vendor.cookieRefresh
				? t.maxAgeRefreshes
				: undefined;
		content.append(h('p', {}, refreshes ? `${age} ${refreshes}` : age));
	}
	if (vendor.usesNonCookieAccess) {
		content.append(h('p', {}, t.nonCookieAccess));
	}
	if (standardRetention !== undefined) {
		content.append(
			h('p', {}, t.retention.replace('{days}', String(standardRetention)))
		);
	}
	return content;
};

const createPolicyLinks = (
	vendor: Vendor,
	copy: SurfaceCopy
): DocumentFragment => {
	const content = document.createDocumentFragment();
	const t = copy.t.iab.preferenceCenter.vendorList;
	const appendLink = (href: string | undefined, label: string): void => {
		const safe = safeUrl(href);
		if (safe) {
			content.append(
				h(
					'p',
					{},
					h(
						'a',
						{ href: safe, rel: 'noopener noreferrer', target: '_blank' },
						label
					)
				)
			);
		}
	};
	if ('privacyPolicyUrl' in vendor) {
		appendLink(vendor.privacyPolicyUrl, t.privacyPolicy);
	} else {
		const language = (copy.language ?? 'en').toLowerCase();
		const [languageBase] = language.split('-');
		const urls = [...(vendor.urls ?? [])].sort((left, right) => {
			const rank = (lang: string): number => {
				if (lang.toLowerCase() === language) {
					return 0;
				}
				if (lang.toLowerCase() === languageBase) {
					return 1;
				}
				return lang.toLowerCase() === 'en' ? 2 : 3;
			};
			return rank(left.langId) - rank(right.langId);
		});
		appendLink(
			urls.map((url) => safeUrl(url.privacy)).find(Boolean),
			t.privacyPolicy
		);
		appendLink(
			urls.map((url) => safeUrl(url.legIntClaim)).find(Boolean),
			t.legitimateInterest
		);
		appendLink(vendor.deviceStorageDisclosureUrl, t.storageDisclosure);
	}

	return content;
};

/**
 * Render the vendor's declared policies, data use, storage, and retention.
 * Missing durations remain undisclosed rather than becoming zero days.
 *
 * @param snapshot - Current consent state containing the GVL definitions.
 * @param vendor - Registered or custom vendor to describe.
 * @param copy - Resolved translations and preferred language.
 * @returns Disclosure content to append after the vendor's consent controls.
 */
export const createVendorDisclosures = (
	snapshot: ConsentSnapshot,
	vendor: Vendor,
	copy: SurfaceCopy
): DocumentFragment => {
	const content = document.createDocumentFragment();
	const t = copy.t.iab.preferenceCenter.vendorList;
	const gvl = snapshot.iab?.gvl;
	const standardRetention = duration(
		'privacyPolicyUrl' in vendor
			? vendor.dataRetentionDays
			: vendor.dataRetention?.stdRetention
	);
	const retention =
		'dataRetention' in vendor ? vendor.dataRetention : undefined;
	content.append(createPolicyLinks(vendor, copy));

	const appendGroup = (
		title: string,
		ids: number[],
		names: NamedItems | undefined,
		retentionById?: Record<number, number>,
		fallbackRetention?: number
	): void => {
		if (!ids.length) {
			return;
		}
		content.append(
			h('h3', {}, title),
			h(
				'ul',
				{},
				...ids.map((id) => {
					const item = names?.[id];
					const days = duration(retentionById?.[id]) ?? fallbackRetention;
					return h(
						'li',
						{},
						h('span', {}, item?.name ?? String(id)),
						item?.description ? h('p', {}, item.description) : null,
						days === undefined
							? null
							: h(
									'p',
									{},
									(t.retainedDays ?? t.retention).replace(
										'{days}',
										String(days)
									)
								)
					);
				})
			)
		);
	};
	appendGroup(
		t.purposes,
		vendor.purposes,
		gvl?.purposes,
		retention?.purposes,
		standardRetention
	);
	appendGroup(
		t.legitimateInterest,
		vendor.legIntPurposes ?? [],
		gvl?.purposes,
		retention?.purposes,
		standardRetention
	);
	appendGroup(
		t.specialPurposes,
		'specialPurposes' in vendor ? vendor.specialPurposes : [],
		gvl?.specialPurposes,
		retention?.specialPurposes,
		standardRetention
	);
	appendGroup(t.features, vendor.features ?? [], gvl?.features);
	appendGroup(
		t.specialFeatures,
		vendor.specialFeatures ?? [],
		gvl?.specialFeatures
	);
	appendGroup(
		t.dataCategories,
		vendor.dataCategories ?? [],
		gvl?.dataCategories
	);
	content.append(createStorageDisclosures(vendor, copy, standardRetention));
	return content;
};
