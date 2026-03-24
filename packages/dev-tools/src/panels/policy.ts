/**
 * Policy Panel
 * Displays detailed runtime policy-pack diagnostics from /init
 */

import type { ConsentStoreState } from 'c15t';
import { createDisconnectedState, createSection } from '../components/ui';
import { clearElement, div, span } from '../core/renderer';
import componentStyles from '../styles/components.module.css';
import { formatInitSource } from '../utils/init-source';

export interface PolicyPanelOptions {
	getState: () => ConsentStoreState | null;
}

/**
 * Renders the policy panel content
 */
export function renderPolicyPanel(
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
				title: 'Policy',
				children: [
					div({
						style: {
							padding: '10px 12px',
							fontSize: 'var(--c15t-devtools-font-size-sm)',
							color: 'var(--c15t-text-muted)',
						},
						text: 'No active policy matched for this request.',
					}),
					createHint(`Init Source: ${initSource}`),
				],
			})
		);
		return;
	}

	// Core policy identity
	container.appendChild(
		createSection({
			title: 'Policy',
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
					title: `UI · ${uiMode}`,
					children: [createGrid(3, [...bannerCards, ...dialogCards])],
				})
			);
		}
	}

	// Proof & snapshot — compact row
	const proofLabel = formatProofSummary(activePolicy?.proof);
	const snapshotLabel = initData?.policySnapshotToken ? 'present' : 'missing';
	container.appendChild(
		createSection({
			title: 'Proof & Snapshot',
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
		})
	);
}

// ---------------------------------------------------------------------------
// UI surface helpers
// ---------------------------------------------------------------------------

interface SurfaceState {
	allowedActions?: string[] | null;
	primaryAction?: string | null;
	layout?: Array<string | string[]> | null;
	direction?: string | null;
	uiProfile?: string | null;
	scrollLock?: boolean | null;
}

function buildSurfaceCards(
	prefix: string,
	policySurface: SurfaceState | undefined,
	storeSurface: SurfaceState
): HTMLElement[] {
	const actions = formatList(
		policySurface?.allowedActions ?? storeSurface.allowedActions
	);
	const primary =
		policySurface?.primaryAction ?? storeSurface.primaryAction ?? null;
	const layout = policySurface?.layout ?? storeSurface.layout ?? null;
	const direction = policySurface?.direction ?? storeSurface.direction ?? null;
	const profile = policySurface?.uiProfile ?? storeSurface.uiProfile ?? null;
	const scrollLock =
		policySurface?.scrollLock ?? storeSurface.scrollLock ?? null;

	// Skip entirely if nothing is configured
	if (
		actions === '—' &&
		!primary &&
		!layout &&
		!direction &&
		!profile &&
		scrollLock === null
	) {
		return [];
	}

	const cards: HTMLElement[] = [createCard(`${prefix} Actions`, actions)];

	if (primary) {
		cards.push(createCard(`${prefix} Primary`, primary));
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
}

// ---------------------------------------------------------------------------
// Match trace
// ---------------------------------------------------------------------------

function createMatchTraceSection(options: {
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
		title: 'Match Trace',
		children: [
			div({
				style: {
					display: 'grid',
					gridTemplateColumns: '1fr',
					gap: '4px',
				},
				children: entries.map((entry) =>
					div({
						className: componentStyles.gridCard ?? '',
						style: {
							padding: '6px 10px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							gap: '10px',
						},
						children: [
							span({
								style: {
									fontSize: 'var(--c15t-devtools-font-size-xs)',
									color: 'var(--c15t-text-muted)',
									fontFamily: 'ui-monospace, monospace',
								},
								text: entry.step,
							}),
							span({
								style: {
									fontSize: 'var(--c15t-devtools-font-size-xs)',
									fontFamily: 'ui-monospace, monospace',
								},
								text: entry.result,
							}),
						],
					})
				),
			}),
			createHint(
				'region → country → default · fallback on geo failure · Simulate via Location tab'
			),
		],
	});
}

function buildTraceEntries(
	decision:
		| {
				policyId: string;
				matchedBy: 'region' | 'country' | 'default' | 'fallback';
				country: string | null;
				region: string | null;
		  }
		| undefined,
	policyId: string | undefined
): Array<{ step: string; result: string }> {
	if (!decision) {
		return [{ step: 'decision metadata', result: 'UNAVAILABLE' }];
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
			step: `region(${regionKey})`,
			result: matched === 'region' ? `MATCH → ${resolved}` : 'MISS',
		},
		{
			step: `country(${country})`,
			result:
				matched === 'country'
					? `MATCH → ${resolved}`
					: matched === 'region'
						? 'SKIPPED'
						: 'MISS',
		},
		{
			step: 'fallback(geo-fail)',
			result: matched === 'fallback' ? `MATCH → ${resolved}` : 'SKIPPED',
		},
		{
			step: 'default(catch-all)',
			result: matched === 'default' ? `MATCH → ${resolved}` : 'SKIPPED',
		},
	];
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function getModelLabel(model: string | undefined): string {
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
}

function getScopeModeLabel(mode: string | null | undefined): string {
	switch (mode) {
		case 'strict':
			return 'Strict';
		case 'permissive':
			return 'Permissive';
		default:
			return '—';
	}
}

function formatList(items: string[] | null | undefined): string {
	if (!items || items.length === 0) {
		return '—';
	}
	if (items.includes('*')) {
		return '* (all)';
	}
	return items.join(', ');
}

function formatProofSummary(
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
	if (proof.storeIp) parts.push('IP');
	if (proof.storeUserAgent) parts.push('UA');
	if (proof.storeLanguage) parts.push('Lang');
	return parts.length > 0 ? parts.join(', ') : 'none';
}

function formatFingerprint(fingerprint: string | undefined): string {
	if (!fingerprint) {
		return 'no fingerprint';
	}
	if (fingerprint.length <= 12) {
		return fingerprint;
	}
	return `${fingerprint.slice(0, 8)}…${fingerprint.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

function createCard(label: string, value: string): HTMLElement {
	return div({
		className: componentStyles.gridCard ?? '',
		style: {
			padding: '8px 10px',
			minHeight: 'auto',
			flexDirection: 'column',
			alignItems: 'flex-start',
			gap: '2px',
		},
		children: [
			span({
				style: {
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					color: 'var(--c15t-text-muted)',
				},
				text: label,
			}),
			span({
				style: {
					fontSize: 'var(--c15t-font-size-sm)',
					fontWeight: '500',
					fontFamily: 'ui-monospace, monospace',
				},
				text: value,
			}),
		],
	});
}

function createGrid(columns: number, children: HTMLElement[]): HTMLElement {
	return div({
		style: {
			display: 'grid',
			gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
			gap: 'var(--c15t-space-sm, 0.5rem)',
		},
		children,
	});
}

function createHint(text: string): HTMLElement {
	return span({
		className: componentStyles.overrideHint,
		text,
	});
}
