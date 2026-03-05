/**
 * Policy Panel
 * Displays detailed runtime policy-pack diagnostics from /init
 */

import type { ConsentStoreState } from 'c15t';
import { createDisconnectedState, createSection } from '../components/ui';
import { clearElement, div, span } from '../core/renderer';
import componentStyles from '../styles/components.module.css';

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

	if (!activePolicy && !policyDecision) {
		container.appendChild(
			createSection({
				title: 'Policy Pack',
				children: [
					div({
						style: {
							padding: '10px 12px',
							fontSize: 'var(--c15t-devtools-font-size-sm)',
							color: 'var(--c15t-text-muted)',
						},
						text: 'No active policy matched for this request.',
					}),
				],
			})
		);
		return;
	}

	const cards = [
		createCompactInfoCard(
			'Policy ID',
			activePolicy?.id ?? policyDecision?.policyId ?? '—'
		),
		createCompactInfoCard('Matched By', policyDecision?.matchedBy ?? '—'),
		createCompactInfoCard(
			'Fingerprint',
			formatShortFingerprint(policyDecision?.fingerprint)
		),
		createCompactInfoCard('Model', getModelLabel(activePolicy?.model)),
		createCompactInfoCard(
			'Scope Mode',
			getScopeModeLabel(
				activePolicy?.consent?.scopeMode ?? state.policyScopeMode
			)
		),
		createCompactInfoCard(
			'Purpose Scope',
			formatPurposeScope(
				state.policyPurposeIds ?? activePolicy?.consent?.purposeIds
			)
		),
		createCompactInfoCard('UI Mode', activePolicy?.ui?.mode ?? '—'),
		createCompactInfoCard(
			'Banner Actions',
			formatPolicyActions(
				activePolicy?.ui?.banner?.allowedActions ??
					state.policyBannerAllowedActions
			)
		),
		createCompactInfoCard(
			'Banner Primary',
			activePolicy?.ui?.banner?.primaryAction ??
				state.policyBannerPrimaryAction ??
				'—'
		),
		createCompactInfoCard(
			'Banner Order',
			formatPolicyActions(
				activePolicy?.ui?.banner?.actionOrder ??
					state.policyBannerActionOrder ??
					null
			)
		),
		createCompactInfoCard(
			'Banner Layout',
			activePolicy?.ui?.banner?.actionLayout ??
				state.policyBannerActionLayout ??
				'—'
		),
		createCompactInfoCard(
			'Banner Profile',
			activePolicy?.ui?.banner?.uiProfile ?? state.policyBannerUiProfile ?? '—'
		),
		createCompactInfoCard(
			'Dialog Actions',
			formatPolicyActions(
				activePolicy?.ui?.dialog?.allowedActions ??
					state.policyDialogAllowedActions
			)
		),
		createCompactInfoCard(
			'Dialog Primary',
			activePolicy?.ui?.dialog?.primaryAction ??
				state.policyDialogPrimaryAction ??
				'—'
		),
		createCompactInfoCard(
			'Dialog Order',
			formatPolicyActions(
				activePolicy?.ui?.dialog?.actionOrder ??
					state.policyDialogActionOrder ??
					null
			)
		),
		createCompactInfoCard(
			'Dialog Layout',
			activePolicy?.ui?.dialog?.actionLayout ??
				state.policyDialogActionLayout ??
				'—'
		),
		createCompactInfoCard(
			'Dialog Profile',
			activePolicy?.ui?.dialog?.uiProfile ?? state.policyDialogUiProfile ?? '—'
		),
		createCompactInfoCard(
			'I18n Profile',
			activePolicy?.i18n?.messageProfile ?? activePolicy?.i18n?.language ?? '—'
		),
		createCompactInfoCard(
			'Expiry',
			typeof activePolicy?.consent?.expiryDays === 'number'
				? `${activePolicy.consent.expiryDays} days`
				: '—'
		),
		createCompactInfoCard('Proof', formatProofSummary(activePolicy?.proof)),
		createCompactInfoCard(
			'Snapshot Token',
			initData?.policySnapshotToken ? 'present' : 'missing'
		),
	];

	container.appendChild(
		createSection({
			title: 'Policy Pack',
			children: [
				div({
					style: {
						display: 'grid',
						gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
						gap: 'var(--c15t-space-sm, 0.5rem)',
					},
					children: cards,
				}),
				span({
					className: componentStyles.overrideHint,
					text: 'Source: /init runtime policy + store-normalized policy fields.',
				}),
			],
		})
	);
}

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
		case 'unmanaged':
			return 'Unmanaged';
		default:
			return '—';
	}
}

function formatPolicyActions(actions: string[] | null | undefined): string {
	if (!actions || actions.length === 0) {
		return '—';
	}
	return actions.join(', ');
}

function formatPurposeScope(purposeIds: string[] | null | undefined): string {
	if (!purposeIds || purposeIds.length === 0) {
		return '—';
	}
	if (purposeIds.includes('*')) {
		return '*';
	}
	return purposeIds.join(', ');
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
	return `IP:${proof.storeIp ? 'on' : 'off'} UA:${proof.storeUserAgent ? 'on' : 'off'} Lang:${proof.storeLanguage ? 'on' : 'off'}`;
}

function formatShortFingerprint(fingerprint: string | undefined): string {
	if (!fingerprint) {
		return '—';
	}
	if (fingerprint.length <= 18) {
		return fingerprint;
	}
	return `${fingerprint.slice(0, 10)}…${fingerprint.slice(-6)}`;
}

function createCompactInfoCard(label: string, value: string): HTMLElement {
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
