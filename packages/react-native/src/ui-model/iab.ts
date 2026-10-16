/**
 * The IAB TCF screens as portable screen models.
 *
 * Every builder reads the display model `@c15t/iab` publishes, plus the draft
 * selection, and returns a {@link Screen}. Which rows exist, which carry a
 * switch, and what each switch holds are decided here so that the RN, SwiftUI,
 * and Compose renderers cannot drift apart on anything with legal weight.
 *
 * @packageDocumentation
 */

import type {
	ConsentIabDisplayModel,
	ConsentIabDisplayRow,
	ConsentIabDisplayStackRow,
	ConsentIabProcessedVendor,
	ConsentIabSelection,
} from '../components/iab-display-model';
import type { ConsentIabCopy } from '../components/internal/iab-copy';
import {
	dayCount,
	partnerCount,
	withCount,
} from '../components/internal/iab-copy';
import {
	featureRowId,
	purposeRowId,
	specialFeatureRowId,
	specialPurposeRowId,
	stackRowId,
	vendorConsentRowId,
	vendorLegitimateInterestRowId,
	vendorRouteId,
} from './iab-selection';
import type { Screen, ScreenAction, ScreenRow, ScreenSection } from './types';

/** Route id of the IAB first layer. */
export const IAB_FIRST_LAYER_SCREEN = 'iab.firstLayer';

/** Route id of the purposes half of the manage screen. */
export const IAB_PURPOSES_SCREEN = 'iab.manage';

/** Route id of the partner list. */
export const IAB_VENDORS_SCREEN = 'iab.vendors';

const rowIdForPurpose = (row: ConsentIabDisplayRow): string =>
	row.toggle === 'special-feature'
		? specialFeatureRowId(row.id)
		: purposeRowId(row.id);

/** Seconds in a day, for cookie lifetimes. */
const SECONDS_PER_DAY = 86_400;

/** Inputs every IAB builder takes. */
export interface IabScreenInput {
	/** Copy in force. */
	readonly copy: ConsentIabCopy;
	/** Disclosure from `@c15t/iab`. */
	readonly model: ConsentIabDisplayModel;
}

/** Inputs of the builders that draw switches. */
export interface IabDraftInput extends IabScreenInput {
	/** Draft the switches show. */
	readonly selection: ConsentIabSelection;
}

/**
 * The manage screens' footer: save first, then the two whole-surface choices
 * as an equal pair.
 *
 * @param copy - Copy in force.
 * @returns The three actions.
 */
const manageActions = function manageActions(
	copy: ConsentIabCopy
): ScreenAction[] {
	return [
		{ emphasis: 'primary', id: 'save', label: copy.saveSettings },
		{ emphasis: 'tonal', id: 'rejectAll', label: copy.rejectAll },
		{ emphasis: 'tonal', id: 'acceptAll', label: copy.acceptAll },
	];
};

/**
 * The distinct partners behind a set of rows, in first-seen order.
 *
 * @param rows - Rows whose partners are collected.
 * @param rows.vendors - Partners claiming each row.
 * @returns One entry per partner.
 */
const distinctVendors = function distinctVendors(
	rows: readonly { readonly vendors: readonly ConsentIabProcessedVendor[] }[]
): ConsentIabProcessedVendor[] {
	const seen = new Map<string, ConsentIabProcessedVendor>();

	for (const row of rows) {
		for (const vendor of row.vendors) {
			if (!seen.has(String(vendor.id))) {
				seen.set(String(vendor.id), vendor);
			}
		}
	}

	return [...seen.values()];
};

/**
 * How many distinct partners claim a set of rows.
 *
 * @param rows - Rows whose partners are counted.
 * @param rows.vendors - Partners claiming each row.
 * @returns Distinct partner ids.
 */
export const distinctVendorCount = function distinctVendorCount(
	rows: readonly { readonly vendors: readonly ConsentIabProcessedVendor[] }[]
): number {
	return distinctVendors(rows).length;
};

/**
 * Names for a list of ids, dropping ids the disclosure doesn't carry.
 *
 * @param entries - Named entries to look ids up in.
 * @param ids - Ids to name.
 * @returns The names, in id order.
 */
const namesFor = function namesFor(
	entries: readonly { readonly id: number; readonly name: string }[],
	ids: readonly number[]
): string[] {
	return ids
		.map((id) => entries.find((entry) => entry.id === id)?.name)
		.filter((name): name is string => typeof name === 'string');
};

/**
 * Whether every purpose in a stack is on, some are, or none are.
 *
 * @param stack - Stack to read.
 * @param selection - Draft in force.
 * @returns `all`, `some`, or `none`.
 */
const stackState = function stackState(
	stack: ConsentIabDisplayStackRow,
	selection: ConsentIabSelection
): 'all' | 'none' | 'some' {
	// The stack switch covers only the purposes some partner holds on consent;
	// the others have locked switches and can never be on.
	const covered = stack.purposes.filter((purpose) => purpose.hasConsentBasis);
	const on = covered.filter(
		(purpose) => selection.purposeConsents[purpose.id] === true
	).length;

	if (on === 0) {
		return 'none';
	}

	return on === covered.length ? 'all' : 'some';
};

/**
 * A purpose row with its switch.
 *
 * A purpose no partner processes on consent keeps its row but disables the
 * switch, because moving it would change nothing a partner relies on.
 *
 * @param copy - Copy in force.
 * @param row - Purpose to draw.
 * @param selection - Draft in force.
 * @returns The row.
 */
const purposeRow = function purposeRow(
	copy: ConsentIabCopy,
	row: ConsentIabDisplayRow,
	selection: ConsentIabSelection
): ScreenRow {
	return {
		control: {
			disabled: !row.hasConsentBasis,
			kind: 'switch',
			value: row.hasConsentBasis && selection.purposeConsents[row.id] === true,
		},
		detail: partnerCount(copy, row.vendors.length),
		id: purposeRowId(row.id),
		navigatesTo: purposeRowId(row.id),
		title: row.name,
	};
};

/**
 * A stack row: on when every purpose in it is on, and labelled partial when
 * only some are.
 *
 * @param copy - Copy in force.
 * @param stack - Stack to draw.
 * @param selection - Draft in force.
 * @returns The row.
 */
const stackRow = function stackRow(
	copy: ConsentIabCopy,
	stack: ConsentIabDisplayStackRow,
	selection: ConsentIabSelection
): ScreenRow {
	const state = stackState(stack, selection);

	return {
		control: {
			disabled: !stack.purposes.some((purpose) => purpose.hasConsentBasis),
			kind: 'switch',
			value: state === 'all',
		},
		detail:
			state === 'some'
				? copy.partiallyEnabled
				: partnerCount(copy, distinctVendorCount(stack.purposes)),
		id: stackRowId(stack.id),
		navigatesTo: stackRowId(stack.id),
		title: stack.name,
	};
};

/**
 * A special feature row with its opt-in switch.
 *
 * @param copy - Copy in force.
 * @param row - Special feature to draw.
 * @param selection - Draft in force.
 * @returns The row.
 */
const specialFeatureRow = function specialFeatureRow(
	copy: ConsentIabCopy,
	row: ConsentIabDisplayRow,
	selection: ConsentIabSelection
): ScreenRow {
	return {
		control: {
			disabled: false,
			kind: 'switch',
			value: selection.specialFeatureOptIns[row.id] === true,
		},
		detail: partnerCount(copy, row.vendors.length),
		id: specialFeatureRowId(row.id),
		navigatesTo: specialFeatureRowId(row.id),
		title: row.name,
	};
};

/**
 * Drop sections with no rows.
 *
 * @param sections - Candidate sections.
 * @returns The sections worth drawing.
 */
const nonEmpty = function nonEmpty(
	sections: readonly ScreenSection[]
): ScreenSection[] {
	return sections.filter((section) => section.rows.length > 0);
};

/**
 * The IAB first layer.
 *
 * The body names the partner count, the summary lists every purpose, stack,
 * and special feature the subject is asked about, and a row opens the partner
 * list. Accept and Reject share one emphasis; Manage is a text action.
 *
 * @param input - Copy and disclosure.
 * @returns The first-layer screen.
 */
export const buildIabFirstLayer = function buildIabFirstLayer({
	copy,
	model,
}: IabScreenInput): Screen {
	const total = model.vendors.length;

	return {
		actions: [
			{ emphasis: 'parity', id: 'acceptAll', label: copy.acceptAll },
			{ emphasis: 'parity', id: 'rejectAll', label: copy.rejectAll },
			{ emphasis: 'text', id: 'manage', label: copy.manage },
		],
		id: IAB_FIRST_LAYER_SCREEN,
		intro: withCount(copy.bannerDescription, total, 'partnerCount'),
		sections: nonEmpty([
			{
				footer: copy.legitimateInterestNotice,
				id: 'summary',
				rows: model.consentRows.map((row) => ({
					id: row.kind === 'stack' ? stackRowId(row.id) : rowIdForPurpose(row),
					title: row.name,
				})),
			},
			{
				id: 'partners',
				rows: [
					{
						id: 'partners',
						navigatesTo: IAB_VENDORS_SCREEN,
						title: partnerCount(copy, total),
					},
				],
			},
		]),
		title: copy.bannerTitle,
	};
};

/**
 * The purposes half of the manage screen.
 *
 * Purposes and stacks carry a switch and open their detail. Special features
 * carry their opt-in. Special purposes and features carry no switch at all:
 * TCF Policies forbid a control next to processing that cannot be refused.
 *
 * @param input - Copy, disclosure, and draft.
 * @returns The purposes screen.
 */
export const buildIabPurposes = function buildIabPurposes({
	copy,
	model,
	selection,
}: IabDraftInput): Screen {
	const consent: ScreenRow[] = [];
	const specialFeatures: ScreenRow[] = [];

	for (const row of model.consentRows) {
		if (row.kind === 'stack') {
			consent.push(stackRow(copy, row, selection));
		} else if (row.toggle === 'special-feature') {
			specialFeatures.push(specialFeatureRow(copy, row, selection));
		} else {
			consent.push(purposeRow(copy, row, selection));
		}
	}

	return {
		actions: manageActions(copy),
		id: IAB_PURPOSES_SCREEN,
		intro: copy.description,
		sections: nonEmpty([
			{ header: copy.purposes, id: 'consent', rows: consent },
			{
				header: copy.specialFeatures,
				id: 'specialFeatures',
				rows: specialFeatures,
			},
			{
				header: copy.essentialTitle,
				id: 'essential',
				rows: model.essentialRows.map((row) => ({
					detail: partnerCount(copy, row.vendors.length),
					id: specialPurposeRowId(row.id),
					navigatesTo: specialPurposeRowId(row.id),
					title: row.name,
				})),
			},
			{
				footer: model.featuresStandardText ?? copy.featuresDescription,
				header: copy.features,
				id: 'features',
				rows: model.featureRows.map((row) => ({
					id: featureRowId(row.id),
					navigatesTo: featureRowId(row.id),
					title: row.name,
				})),
			},
		]),
		title: copy.title,
	};
};

/**
 * The legal bases a partner claims, as one line.
 *
 * @param copy - Copy in force.
 * @param vendor - Partner to describe.
 * @returns "Consent · Legitimate Interest", or whichever half applies.
 */
const vendorBases = function vendorBases(
	copy: ConsentIabCopy,
	vendor: ConsentIabProcessedVendor
): string | undefined {
	const bases: string[] = [];

	if (vendor.purposes.length > 0) {
		bases.push(copy.consent);
	}

	if (vendor.legIntPurposes.length > 0) {
		bases.push(copy.legitimateInterest);
	}

	return bases.length > 0 ? bases.join(' · ') : undefined;
};

/**
 * One partner in the list: its consent switch when it asks for consent, and
 * a way into its detail either way.
 *
 * @param copy - Copy in force.
 * @param vendor - Partner to draw.
 * @param selection - Draft in force.
 * @returns The row.
 */
const vendorRow = function vendorRow(
	copy: ConsentIabCopy,
	vendor: ConsentIabProcessedVendor,
	selection: ConsentIabSelection
): ScreenRow {
	const asksConsent = vendor.purposes.length > 0;
	const detail = vendorBases(copy, vendor);

	const row: ScreenRow = {
		id: asksConsent ? vendorConsentRowId(vendor.id) : vendorRouteId(vendor.id),
		navigatesTo: vendorRouteId(vendor.id),
		title: vendor.name,
	};
	const detailed = detail === undefined ? row : { ...row, detail };
	if (!asksConsent) {
		return detailed;
	}
	return {
		...detailed,
		control: {
			disabled: false,
			kind: 'switch',
			value: selection.vendorConsents[String(vendor.id)] === true,
		},
	};
};

/** Inputs of {@link buildIabVendors}. */
export interface IabVendorsInput extends IabDraftInput {
	/** Search text; matched case-insensitively against partner names. */
	readonly query?: string;
}

/**
 * The partner list, filtered by a search.
 *
 * IAB-registered partners come first and custom partners after, each keeping
 * the order the caller sorted them in. A search with no hits returns no
 * sections and the empty-state text instead.
 *
 * @param input - Copy, disclosure, draft, and search text.
 * @returns The partner list screen.
 */
export const buildIabVendors = function buildIabVendors({
	copy,
	model,
	query = '',
	selection,
}: IabVendorsInput): Screen {
	const needle = query.trim().toLocaleLowerCase();
	const matches =
		needle === ''
			? model.vendors
			: model.vendors.filter((vendor) =>
					vendor.name.toLocaleLowerCase().includes(needle)
				);
	const sections = nonEmpty([
		{
			header: copy.iabVendors,
			id: 'iab',
			rows: matches
				.filter((vendor) => vendor.isCustom !== true)
				.map((vendor) => vendorRow(copy, vendor, selection)),
		},
		{
			header: copy.customPartners,
			id: 'custom',
			rows: matches
				.filter((vendor) => vendor.isCustom === true)
				.map((vendor) => vendorRow(copy, vendor, selection)),
		},
	]);

	const screen: Screen = {
		actions: manageActions(copy),
		id: IAB_VENDORS_SCREEN,
		sections,
		title: copy.vendors,
	};
	if (sections.length === 0 && needle !== '') {
		return {
			...screen,
			empty: withCount(copy.noVendorsFound, query.trim(), 'searchTerm'),
		};
	}
	return screen;
};

/**
 * Rows naming entries by id, each opening its own detail.
 *
 * @param entries - Named entries.
 * @param ids - Ids to list.
 * @param rowId - Row id for one entry id.
 * @returns One row per named id.
 */
const namedRows = function namedRows(
	entries: readonly { readonly id: number; readonly name: string }[],
	ids: readonly number[],
	rowId: (id: number) => string
): ScreenRow[] {
	return ids.flatMap((id) => {
		const entry = entries.find((candidate) => candidate.id === id);

		return entry === undefined
			? []
			: [{ id: rowId(id), navigatesTo: rowId(id), title: entry.name }];
	});
};

/**
 * Days, rounded, for a duration in seconds.
 *
 * @param copy - Copy in force.
 * @param seconds - Duration.
 * @returns The duration as days.
 */
const daysFor = function daysFor(
	copy: ConsentIabCopy,
	seconds: number
): string {
	return dayCount(copy, Math.max(0, Math.round(seconds / SECONDS_PER_DAY)));
};

/** Inputs of {@link buildIabVendorDetail}. */
export interface IabVendorDetailInput extends IabDraftInput {
	/** Partner to show. */
	readonly vendorId: number | string;
}

/**
 * One partner's detail: its consent switch, its legitimate interest with the
 * right to object, the processing it does without a choice, what it stores,
 * and its privacy policy.
 *
 * @param input - Copy, disclosure, draft, and partner id.
 * @returns The detail screen, or `null` when the partner isn't in the model.
 */
export const buildIabVendorDetail = function buildIabVendorDetail({
	copy,
	model,
	selection,
	vendorId,
}: IabVendorDetailInput): Screen | null {
	const vendor = model.vendors.find(
		(candidate) => String(candidate.id) === String(vendorId)
	);

	if (vendor === undefined) {
		return null;
	}

	const key = String(vendor.id);
	const { data } = model;
	const consentNames = namesFor(data.purposes, vendor.purposes);
	const legitimateNames = namesFor(data.purposes, vendor.legIntPurposes);
	const storage: ScreenRow[] = [];
	const retention = vendor.dataRetention?.stdRetention;

	if (typeof retention === 'number') {
		storage.push({
			control: { kind: 'value', text: dayCount(copy, retention) },
			id: 'retention',
			title: copy.retention,
		});
	}

	if (vendor.usesCookies && typeof vendor.cookieMaxAgeSeconds === 'number') {
		storage.push({
			control: {
				kind: 'value',
				text: daysFor(copy, vendor.cookieMaxAgeSeconds),
			},
			id: 'cookieLifetime',
			title: copy.cookieLifetime,
		});
	}

	if (vendor.usesNonCookieAccess) {
		storage.push({ id: 'nonCookieAccess', title: copy.usesNonCookieAccess });
	}

	if (vendor.deviceStorageDisclosureUrl !== null) {
		storage.push({
			control: { kind: 'link', url: vendor.deviceStorageDisclosureUrl },
			id: 'storageDisclosure',
			title: copy.storageDisclosure,
		});
	}

	return {
		actions: [],
		id: vendorRouteId(vendor.id),
		sections: nonEmpty([
			{
				footer: consentNames.join(', '),
				id: 'consent',
				rows:
					vendor.purposes.length > 0
						? [
								{
									control: {
										disabled: false,
										kind: 'switch',
										value: selection.vendorConsents[key] === true,
									},
									id: vendorConsentRowId(vendor.id),
									title: copy.consent,
								},
							]
						: [],
			},
			{
				footer: legitimateNames.join(', '),
				id: 'legitimateInterest',
				rows:
					vendor.legIntPurposes.length > 0
						? [
								{
									control: {
										disabled: false,
										kind: 'switch',
										value: selection.vendorLegitimateInterests[key] !== false,
									},
									id: vendorLegitimateInterestRowId(vendor.id),
									info: copy.rightToObject,
									title: copy.legitimateInterest,
								},
							]
						: [],
			},
			{
				header: copy.specialPurposes,
				id: 'specialPurposes',
				rows: namedRows(
					data.specialPurposes,
					vendor.specialPurposes,
					specialPurposeRowId
				),
			},
			{
				header: copy.specialFeatures,
				id: 'specialFeatures',
				rows: namedRows(
					data.specialFeatures,
					vendor.specialFeatures,
					specialFeatureRowId
				),
			},
			{
				header: copy.features,
				id: 'features',
				rows: namedRows(data.features, vendor.features, featureRowId),
			},
			{ header: copy.storage, id: 'storage', rows: storage },
			{
				id: 'links',
				rows:
					vendor.policyUrl === ''
						? []
						: [
								{
									control: { kind: 'link', url: vendor.policyUrl },
									id: 'privacyPolicy',
									title: copy.privacyPolicy,
								},
							],
			},
		]),
		title: vendor.name,
	};
};

/**
 * A row drawn on its own detail screen, where it can't open itself.
 *
 * @param row - Row as the list draws it.
 * @returns The row without its navigation.
 */

const inPlace = (row: ScreenRow): ScreenRow => {
	const result = { ...row };
	delete result.navigatesTo;
	return result;
};

/**
 * The display row behind a route id, wherever it lives in the model.
 *
 * @param model - Disclosure to search.
 * @param routeId - Route id such as `purpose.1` or `stack.4`.
 * @returns The row and its kind, or `null`.
 */
const rowForRoute = function rowForRoute(
	model: ConsentIabDisplayModel,
	routeId: string
): ConsentIabDisplayRow | ConsentIabDisplayStackRow | null {
	const consentPurposes = model.consentRows.flatMap((row) =>
		row.kind === 'stack' ? row.purposes : [row]
	);
	const candidates: (ConsentIabDisplayRow | ConsentIabDisplayStackRow)[] = [
		...model.consentRows.filter((row) => row.kind === 'stack'),
		...consentPurposes,
		...model.essentialRows,
		...model.featureRows,
	];

	return (
		candidates.find((row) => {
			if (row.kind === 'stack') {
				return stackRowId(row.id) === routeId;
			}

			if (row.kind === 'special-feature') {
				return specialFeatureRowId(row.id) === routeId;
			}

			if (row.kind === 'special-purpose') {
				return specialPurposeRowId(row.id) === routeId;
			}

			if (row.kind === 'feature') {
				return featureRowId(row.id) === routeId;
			}

			return purposeRowId(row.id) === routeId;
		}) ?? null
	);
};

/** Inputs of {@link buildIabPurposeDetail}. */
export interface IabPurposeDetailInput extends IabDraftInput {
	/** Route id: `purpose.N`, `stack.N`, `specialFeature.N`, `specialPurpose.N`, or `feature.N`. */
	readonly routeId: string;
}

/**
 * One purpose, stack, special feature, special purpose, or feature in detail.
 *
 * The switch repeats the list's switch under the same row id, so moving it
 * here moves it there. A stack lists its purposes as switch rows of their
 * own. Examples and the partners that use it follow.
 *
 * @param input - Copy, disclosure, draft, and route id.
 * @returns The detail screen, or `null` when the route names nothing.
 */
export const buildIabPurposeDetail = function buildIabPurposeDetail({
	copy,
	model,
	routeId,
	selection,
}: IabPurposeDetailInput): Screen | null {
	const row = rowForRoute(model, routeId);

	if (row === null) {
		return null;
	}

	const sections: ScreenSection[] = [];
	let vendors: ConsentIabProcessedVendor[];

	if (row.kind === 'stack') {
		sections.push(
			{ id: 'control', rows: [inPlace(stackRow(copy, row, selection))] },
			{
				header: copy.purposes,
				id: 'purposes',
				rows: row.purposes.map((purpose) =>
					purposeRow(copy, purpose, selection)
				),
			}
		);
		vendors = distinctVendors(row.purposes);
	} else {
		if (row.kind === 'purpose') {
			sections.push({
				id: 'control',
				rows: [inPlace(purposeRow(copy, row, selection))],
			});
		} else if (row.kind === 'special-feature') {
			sections.push({
				id: 'control',
				rows: [inPlace(specialFeatureRow(copy, row, selection))],
			});
		}

		sections.push({
			header: copy.examples,
			id: 'examples',
			rows: row.illustrations.map((text, index) => ({
				id: `example.${String(index)}`,
				title: text,
			})),
		});
		({ vendors } = row);
	}

	sections.push({
		header: copy.partnersUsing,
		id: 'partners',
		rows: vendors.map((vendor) => ({
			id: `partner.${String(vendor.id)}`,
			navigatesTo: vendorRouteId(vendor.id),
			title: vendor.name,
		})),
	});

	return {
		actions: [],
		id: routeId,
		intro: row.description,
		sections: nonEmpty(sections),
		title: row.name,
	};
};
