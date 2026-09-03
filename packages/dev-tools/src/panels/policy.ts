/**
 * Policy Panel
 * Displays detailed runtime policy-pack diagnostics from /init
 */

import type {
	ConsentSnapshot,
	PolicyDecision,
	ResolvedPolicy,
} from '@c15t/core';

import { createDisconnectedState, createSection } from '../components/ui';
import { clearElement, div, span } from '../core/renderer';

import componentStyles from '../styles/components.module.css';

export interface PolicyPanelOptions {
	getState: () => ConsentSnapshot | null;
}

/**
 * Renders the policy panel content
 */
const buildTraceEntries = function buildTraceEntries(
	decision:
		| {
				policyId: string;
				matchedBy: 'region' | 'country' | 'default' | 'fallback';
				country: string | null;
				region: string | null;
		  }
		| undefined,
	policyId: string | undefined
): { step: string; result: string }[] {
	if (!decision) {
		return [{ result: 'UNAVAILABLE', step: 'decision metadata' }];
	}

	const country = decision.country ?? 'n/a';
	const regionKey =
		decision.country && decision.region
			? `${decision.country}-${decision.region}`
			: 'n/a';
	const resolved = policyId ?? decision.policyId ?? 'unknown';
	const matched = decision.matchedBy;
	let countryResult = 'MISS';
	if (matched === 'country') {
		countryResult = `MATCH → ${resolved}`;
	} else if (matched === 'region') {
		countryResult = 'SKIPPED';
	}

	return [
		{
			result: matched === 'region' ? `MATCH → ${resolved}` : 'MISS',
			step: `region(${regionKey})`,
		},
		{
			result: countryResult,
			step: `country(${country})`,
		},
		{
			result: matched === 'fallback' ? `MATCH → ${resolved}` : 'SKIPPED',
			step: 'fallback(geo-fail)',
		},
		{
			result: matched === 'default' ? `MATCH → ${resolved}` : 'SKIPPED',
			step: 'default(catch-all)',
		},
	];
};
const createHint = function createHint(text: string): HTMLElement {
	return span({
		className: componentStyles.overrideHint,
		text,
	});
};
const createMatchTraceSection = function createMatchTraceSection(options: {
	policyDecision:
		| {
				policyId: string;
				matchedBy: 'region' | 'country' | 'default' | 'fallback';
				country: string | null;
				region: string | null;
		  }
		| undefined;
	policyId: string | undefined;
}): HTMLElement {
	const { policyDecision, policyId } = options;
	const entries = buildTraceEntries(policyDecision, policyId);

	return createSection({
		children: [
			div({
				children: entries.map((entry) =>
					div({
						children: [
							span({
								style: {
									color: 'var(--c15t-text-muted)',
									fontFamily: 'ui-monospace, monospace',
									fontSize: 'var(--c15t-devtools-font-size-xs)',
								},
								text: entry.step,
							}),
							span({
								style: {
									fontFamily: 'ui-monospace, monospace',
									fontSize: 'var(--c15t-devtools-font-size-xs)',
								},
								text: entry.result,
							}),
						],
						className: componentStyles.gridCard ?? '',
						style: {
							alignItems: 'center',
							display: 'flex',
							gap: '10px',
							justifyContent: 'space-between',
							padding: '6px 10px',
						},
					})
				),
				style: {
					display: 'grid',
					gap: '4px',
					gridTemplateColumns: '1fr',
				},
			}),
			createHint(
				'region → country → default · fallback on geo failure · Simulate via Location tab'
			),
		],
		title: 'Match Trace',
	});
};
const createGrid = function createGrid(
	columns: number,
	children: HTMLElement[]
): HTMLElement {
	return div({
		children,
		style: {
			display: 'grid',
			gap: 'var(--c15t-space-sm, 0.5rem)',
			gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
		},
	});
};
const createCard = function createCard(
	label: string,
	value: string
): HTMLElement {
	return div({
		children: [
			span({
				style: {
					color: 'var(--c15t-text-muted)',
					fontSize: 'var(--c15t-devtools-font-size-xs)',
				},
				text: label,
			}),
			span({
				style: {
					fontFamily: 'ui-monospace, monospace',
					fontSize: 'var(--c15t-font-size-sm)',
					fontWeight: '500',
				},
				text: value,
			}),
		],
		className: componentStyles.gridCard ?? '',
		style: {
			alignItems: 'flex-start',
			flexDirection: 'column',
			gap: '2px',
			minHeight: 'auto',
			padding: '8px 10px',
		},
	});
};
const getModelLabel = function getModelLabel(
	model: string | undefined
): string {
	switch (model) {
		case 'opt-in':
			return 'Opt-In';
		case 'opt-out':
			return 'Opt-Out';
		case 'iab':
			return 'IAB TCF';
		default:
			return 'None';
	}
};
const getScopeModeLabel = function getScopeModeLabel(
	mode: string | null | undefined
): string {
	switch (mode) {
		case 'strict':
			return 'Strict';
		case 'permissive':
			return 'Permissive';
		default:
			return '—';
	}
};
const formatList = function formatList(
	items: string[] | null | undefined
): string {
	if (!items || items.length === 0) {
		return '—';
	}
	if (items.includes('*')) {
		return '* (all)';
	}
	return items.join(', ');
};
const formatFingerprint = function formatFingerprint(
	fingerprint: string | undefined
): string {
	if (!fingerprint) {
		return 'no fingerprint';
	}
	if (fingerprint.length <= 12) {
		return fingerprint;
	}
	return `${fingerprint.slice(0, 8)}…${fingerprint.slice(-4)}`;
};

const normalizeLayout = (
	layout: SurfaceState['layout']
): SurfaceState['layout'] => {
	if (Array.isArray(layout) && layout.length === 0) {
		return null;
	}
	return layout ?? null;
};

const surfaceValue = <Key extends keyof SurfaceState>(
	policySurface: SurfaceState | undefined,
	storeSurface: SurfaceState,
	key: Key
): SurfaceState[Key] => policySurface?.[key] ?? storeSurface[key];

const hasSurfaceConfiguration = (
	actions: string,
	primary: SurfaceState['primaryActions'],
	layout: SurfaceState['layout'],
	direction: SurfaceState['direction'],
	profile: SurfaceState['uiProfile'],
	scrollLock: SurfaceState['scrollLock']
): boolean =>
	actions !== '—' ||
	Boolean(primary?.length) ||
	Boolean(layout) ||
	Boolean(direction) ||
	Boolean(profile) ||
	scrollLock !== null;
const buildSurfaceCards = function buildSurfaceCards(
	prefix: string,
	policySurface: SurfaceState | undefined,
	storeSurface: SurfaceState
): HTMLElement[] {
	const policyLayout = normalizeLayout(policySurface?.layout);
	const storeLayout = normalizeLayout(storeSurface.layout);
	const actions = formatList(
		surfaceValue(policySurface, storeSurface, 'allowedActions')
	);
	const primary = surfaceValue(policySurface, storeSurface, 'primaryActions');
	const layout = policyLayout ?? storeLayout;
	const direction = surfaceValue(policySurface, storeSurface, 'direction');
	const profile = surfaceValue(policySurface, storeSurface, 'uiProfile');
	const scrollLock =
		surfaceValue(policySurface, storeSurface, 'scrollLock') ?? null;

	// Skip entirely if nothing is configured
	if (
		!hasSurfaceConfiguration(
			actions,
			primary,
			layout,
			direction,
			profile,
			scrollLock
		)
	) {
		return [];
	}

	const cards: HTMLElement[] = [createCard(`${prefix} Actions`, actions)];

	if (primary && primary.length > 0) {
		cards.push(createCard(`${prefix} Primary`, primary.join(', ')));
	}
	if (layout) {
		cards.push(
			createCard(
				`${prefix} Layout`,
				Array.isArray(layout)
					? layout
							.map((group) =>
								Array.isArray(group) ? `[${group.join(', ')}]` : group
							)
							.join(' / ')
					: layout
			)
		);
	}
	if (direction) {
		cards.push(createCard(`${prefix} Direction`, direction));
	}
	if (profile) {
		cards.push(createCard(`${prefix} Profile`, profile));
	}
	if (scrollLock !== null) {
		cards.push(createCard(`${prefix} Scroll Lock`, scrollLock ? 'on' : 'off'));
	}

	return cards;
};
const formatProofSummary = function formatProofSummary(
	proof:
		| {
				storeIp?: boolean;
				storeUserAgent?: boolean;
				storeLanguage?: boolean;
		  }
		| undefined
): string {
	if (!proof) {
		return '—';
	}
	const parts: string[] = [];
	if (proof.storeIp) {
		parts.push('IP');
	}
	if (proof.storeUserAgent) {
		parts.push('UA');
	}
	if (proof.storeLanguage) {
		parts.push('Lang');
	}
	return parts.length > 0 ? parts.join(', ') : 'none';
};

const firstDefined = <Value>(
	primary: Value | undefined,
	fallback: Value
): Value => primary ?? fallback;

// oxlint-disable-next-line complexity -- Optional policy fields are flattened into one display model.
const getPolicyPanelValues = (
	activePolicy: ResolvedPolicy | undefined,
	policyDecision: PolicyDecision | undefined,
	state: ConsentSnapshot
) => {
	const consent = activePolicy?.consent;
	const i18n = activePolicy?.i18n;
	const ui = activePolicy?.ui;
	const snapshotCategories =
		state.policyCategories.length > 0 ? [...state.policyCategories] : undefined;
	return {
		banner: ui?.banner,
		categories: firstDefined(snapshotCategories, consent?.categories),
		dialog: ui?.dialog,
		expiryDays: consent?.expiryDays,
		fingerprint: policyDecision?.fingerprint,
		i18n: firstDefined(i18n?.messageProfile, firstDefined(i18n?.language, '—')),
		id: firstDefined(
			activePolicy?.id,
			firstDefined(policyDecision?.policyId, '—')
		),
		model: activePolicy?.model,
		preselectedCategories: consent?.preselectedCategories,
		proof: activePolicy?.proof,
		scopeMode: firstDefined(consent?.scopeMode, state.policyScopeMode),
		traceId: firstDefined(activePolicy?.id, policyDecision?.policyId),
		uiMode: ui?.mode,
	};
};

const appendPolicySurfaceSection = (
	container: HTMLElement,
	values: ReturnType<typeof getPolicyPanelValues>,
	state: ConsentSnapshot
): void => {
	const { uiMode } = values;
	if (!uiMode || uiMode === 'none') {
		return;
	}
	const bannerCards = buildSurfaceCards(
		'Banner',
		values.banner,
		state.policyBanner ?? {}
	);
	const dialogCards = buildSurfaceCards(
		'Dialog',
		values.dialog,
		state.policyDialog ?? {}
	);
	if (bannerCards.length === 0 && dialogCards.length === 0) {
		return;
	}
	container.appendChild(
		createSection({
			children: [createGrid(3, [...bannerCards, ...dialogCards])],
			title: `UI · ${uiMode}`,
		})
	);
};
export const renderPolicyPanel = function renderPolicyPanel(
	container: HTMLElement,
	options: PolicyPanelOptions
): void {
	const { getState } = options;
	clearElement(container);

	const state = getState();
	if (!state) {
		container.appendChild(createDisconnectedState());
		return;
	}

	const activePolicy = state.policy ?? undefined;
	const policyDecision = state.policyDecision ?? undefined;
	const values = getPolicyPanelValues(activePolicy, policyDecision, state);
	const policyStatus = state.policyProvisional
		? 'Provisional (init pending)'
		: 'Resolved';

	// Match trace — always shown
	container.appendChild(
		createMatchTraceSection({
			policyDecision,
			policyId: values.traceId,
		})
	);

	if (!activePolicy && !policyDecision) {
		container.appendChild(
			createSection({
				children: [
					div({
						style: {
							color: 'var(--c15t-text-muted)',
							fontSize: 'var(--c15t-devtools-font-size-sm)',
							padding: '10px 12px',
						},
						text: 'No active policy matched for this request.',
					}),
					createHint(`Policy: ${policyStatus}`),
				],
				title: 'Policy',
			})
		);
		return;
	}

	// Core policy identity
	container.appendChild(
		createSection({
			children: [
				createGrid(3, [
					createCard('ID', values.id),
					createCard('Model', getModelLabel(values.model)),
					createCard('Scope', getScopeModeLabel(values.scopeMode)),
					createCard('Categories', formatList(values.categories)),
					createCard('Preselected', formatList(values.preselectedCategories)),
					createCard(
						'Expiry',
						typeof values.expiryDays === 'number'
							? `${values.expiryDays}d`
							: '—'
					),
				]),
				createHint(
					`${policyStatus} · ${formatFingerprint(values.fingerprint)}`
				),
			],
			title: 'Policy',
		})
	);

	// UI surfaces — only if there's a UI mode set
	appendPolicySurfaceSection(container, values, state);

	// Proof & snapshot — compact row
	const proofLabel = formatProofSummary(values.proof);
	const snapshotLabel = state.policySnapshotToken ? 'present' : 'missing';
	container.appendChild(
		createSection({
			children: [
				createGrid(3, [
					createCard('Proof', proofLabel),
					createCard('Snapshot', snapshotLabel),
					createCard('I18n', values.i18n),
				]),
			],
			title: 'Proof & Snapshot',
		})
	);
};

// ---------------------------------------------------------------------------
// UI surface helpers
// ---------------------------------------------------------------------------

interface SurfaceState {
	allowedActions?: string[] | null;
	primaryActions?: string[] | null;
	layout?: (string | string[])[] | null;
	direction?: string | null;
	uiProfile?: string | null;
	scrollLock?: boolean | null;
}

// ---------------------------------------------------------------------------
// Match trace
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------
