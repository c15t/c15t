/**
 * Policy Panel
 * Displays detailed runtime policy-pack diagnostics from /init
 */

import type { ConsentStoreState } from '@c15t/core';

import { createDisconnectedState, createSection } from '../components/ui';
import { clearElement, div, span } from '../core/renderer';
import { formatInitSource } from '../utils/init-source';

import componentStyles from '../styles/components.module.css';

export interface PolicyPanelOptions {
	getState: () => ConsentStoreState | null;
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

	return [
		{
			result: matched === 'region' ? `MATCH → ${resolved}` : 'MISS',
			step: `region(${regionKey})`,
		},
		{
			result:
				// oxlint-disable-next-line no-nested-ternary -- Branches mirror a closed three-state presentation matrix.
				matched === 'country'
					? `MATCH → ${resolved}`
					: matched === 'region'
						? 'SKIPPED'
						: 'MISS',
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
// oxlint-disable-next-line complexity -- Control flow mirrors the protocol or state matrix and is kept together.
const buildSurfaceCards = function buildSurfaceCards(
	prefix: string,
	policySurface: SurfaceState | undefined,
	storeSurface: SurfaceState
): HTMLElement[] {
	const policyLayout =
		Array.isArray(policySurface?.layout) && policySurface.layout.length === 0
			? null
			: (policySurface?.layout ?? null);
	const storeLayout =
		Array.isArray(storeSurface.layout) && storeSurface.layout.length === 0
			? null
			: (storeSurface.layout ?? null);
	const actions = formatList(
		policySurface?.allowedActions ?? storeSurface.allowedActions
	);
	const primary =
		policySurface?.primaryActions ?? storeSurface.primaryActions ?? null;
	const layout = policyLayout ?? storeLayout;
	const direction = policySurface?.direction ?? storeSurface.direction ?? null;
	const profile = policySurface?.uiProfile ?? storeSurface.uiProfile ?? null;
	const scrollLock =
		policySurface?.scrollLock ?? storeSurface.scrollLock ?? null;

	// Skip entirely if nothing is configured
	if (
		actions === '—' &&
		(!primary || primary.length === 0) &&
		!layout &&
		!direction &&
		!profile &&
		scrollLock === null
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
// oxlint-disable-next-line complexity -- Control flow mirrors the protocol or state matrix and is kept together.
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

	const initData = state.lastBannerFetchData;
	const activePolicy = initData?.policy;
	const policyDecision = initData?.policyDecision;
	const initSource = formatInitSource(
		state.initDataSource,
		state.initDataSourceDetail
	);

	// Match trace — always shown
	container.appendChild(
		createMatchTraceSection({
			policyDecision,
			policyId: activePolicy?.id ?? policyDecision?.policyId,
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
					createHint(`Init Source: ${initSource}`),
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
					createCard('ID', activePolicy?.id ?? policyDecision?.policyId ?? '—'),
					createCard('Model', getModelLabel(activePolicy?.model)),
					createCard(
						'Scope',
						getScopeModeLabel(
							activePolicy?.consent?.scopeMode ?? state.policyScopeMode
						)
					),
					createCard(
						'Categories',
						formatList(
							state.policyCategories ?? activePolicy?.consent?.categories
						)
					),
					createCard(
						'Preselected',
						formatList(activePolicy?.consent?.preselectedCategories)
					),
					createCard(
						'Expiry',
						typeof activePolicy?.consent?.expiryDays === 'number'
							? `${activePolicy.consent.expiryDays}d`
							: '—'
					),
				]),
				createHint(
					`${initSource} · ${formatFingerprint(policyDecision?.fingerprint)}`
				),
			],
			title: 'Policy',
		})
	);

	// UI surfaces — only if there's a UI mode set
	const uiMode = activePolicy?.ui?.mode;
	if (uiMode && uiMode !== 'none') {
		const bannerCards = buildSurfaceCards(
			'Banner',
			activePolicy?.ui?.banner,
			state.policyBanner
		);
		const dialogCards = buildSurfaceCards(
			'Dialog',
			activePolicy?.ui?.dialog,
			state.policyDialog
		);

		if (bannerCards.length > 0 || dialogCards.length > 0) {
			container.appendChild(
				createSection({
					children: [createGrid(3, [...bannerCards, ...dialogCards])],
					title: `UI · ${uiMode}`,
				})
			);
		}
	}

	// Proof & snapshot — compact row
	const proofLabel = formatProofSummary(activePolicy?.proof);
	const snapshotLabel = initData?.policySnapshotToken ? 'present' : 'missing';
	container.appendChild(
		createSection({
			children: [
				createGrid(3, [
					createCard('Proof', proofLabel),
					createCard('Snapshot', snapshotLabel),
					createCard(
						'I18n',
						activePolicy?.i18n?.messageProfile ??
							activePolicy?.i18n?.language ??
							'—'
					),
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
