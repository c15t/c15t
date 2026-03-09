/**
 * Policy Panel
 * Displays detailed runtime policy-pack diagnostics from /init
 */

import type { ConsentStoreState } from 'c15t';
import {
	createButton,
	createDisconnectedState,
	createSection,
} from '../components/ui';
import { clearElement, div, input, select, span } from '../core/renderer';
import componentStyles from '../styles/components.module.css';
import { formatInitSource } from '../utils/init-source';

interface PolicySimulationPayload {
	country?: string;
	region?: string;
	language?: string;
}

export interface PolicyPanelOptions {
	getState: () => ConsentStoreState | null;
	onRunSimulation?: (payload: PolicySimulationPayload) => void | Promise<void>;
	onResetSimulation?: () => void | Promise<void>;
}

/**
 * Renders the policy panel content
 */
export function renderPolicyPanel(
	container: HTMLElement,
	options: PolicyPanelOptions
): void {
	const { getState, onRunSimulation, onResetSimulation } = options;
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
					span({
						className: componentStyles.overrideHint,
						text: `Init Source: ${initSource}`,
					}),
				],
			})
		);
	} else {
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
				'Category Scope',
				formatCategoryScope(
					state.policyCategories ?? activePolicy?.consent?.categories
				)
			),
			createCompactInfoCard(
				'Preselected',
				formatCategoryScope(activePolicy?.consent?.preselectedCategories)
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
				activePolicy?.ui?.banner?.uiProfile ??
					state.policyBannerUiProfile ??
					'—'
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
				activePolicy?.ui?.dialog?.uiProfile ??
					state.policyDialogUiProfile ??
					'—'
			),
			createCompactInfoCard(
				'I18n Profile',
				activePolicy?.i18n?.messageProfile ??
					activePolicy?.i18n?.language ??
					'—'
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
			createCompactInfoCard('Init Source', initSource),
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

	container.appendChild(
		createReasonTraceSection({
			policyDecision,
			jurisdiction: initData?.jurisdiction ?? null,
			policyId: activePolicy?.id ?? policyDecision?.policyId,
		})
	);
	container.appendChild(
		createSimulationSection({
			overrides: state.overrides,
			onRunSimulation,
			onResetSimulation,
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

function formatCategoryScope(categories: string[] | null | undefined): string {
	if (!categories || categories.length === 0) {
		return '—';
	}
	if (categories.includes('*')) {
		return '*';
	}
	return categories.join(', ');
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

function createReasonTraceSection(options: {
	policyDecision:
		| {
				policyId: string;
				matchedBy: 'region' | 'country' | 'jurisdiction' | 'default';
				country: string | null;
				region: string | null;
				jurisdiction: string;
		  }
		| undefined;
	jurisdiction: string | null;
	policyId: string | undefined;
}): HTMLElement {
	const { policyDecision, jurisdiction, policyId } = options;
	const traceEntries = buildReasonTraceEntries({
		policyDecision,
		jurisdiction,
		policyId,
	});

	return createSection({
		title: 'Policy Reason Trace',
		children: [
			div({
				style: {
					display: 'grid',
					gridTemplateColumns: '1fr',
					gap: '6px',
				},
				children: traceEntries.map((entry) =>
					div({
						className: componentStyles.gridCard ?? '',
						style: {
							padding: '8px 10px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							gap: '10px',
						},
						children: [
							span({
								style: {
									fontSize: 'var(--c15t-devtools-font-size-sm)',
									color: 'var(--c15t-text-muted)',
									fontFamily: 'ui-monospace, monospace',
								},
								text: entry.step,
							}),
							span({
								style: {
									fontSize: 'var(--c15t-devtools-font-size-xs)',
									fontWeight: '600',
									fontFamily: 'ui-monospace, monospace',
								},
								text: entry.result,
							}),
						],
					})
				),
			}),
			span({
				className: componentStyles.overrideHint,
				text: 'Trace order is fixed: region -> country -> jurisdiction -> default.',
			}),
		],
	});
}

function buildReasonTraceEntries(options: {
	policyDecision:
		| {
				policyId: string;
				matchedBy: 'region' | 'country' | 'jurisdiction' | 'default';
				country: string | null;
				region: string | null;
				jurisdiction: string;
		  }
		| undefined;
	jurisdiction: string | null;
	policyId: string | undefined;
}): Array<{ step: string; result: string }> {
	const { policyDecision, jurisdiction, policyId } = options;
	if (!policyDecision) {
		return [
			{
				step: 'decision metadata',
				result: 'UNAVAILABLE',
			},
		];
	}

	const country = policyDecision.country ?? 'n/a';
	const region = policyDecision.region ?? 'n/a';
	const regionKey =
		policyDecision.country && policyDecision.region
			? `${policyDecision.country}-${policyDecision.region}`
			: 'n/a';
	const effectiveJurisdiction =
		policyDecision.jurisdiction ?? jurisdiction ?? 'n/a';
	const resolvedPolicy = policyId ?? policyDecision.policyId ?? 'unknown';
	const matchedBy = policyDecision.matchedBy;

	const didMatch = (step: typeof matchedBy): boolean => matchedBy === step;

	return [
		{
			step: `region(${regionKey})`,
			result: didMatch('region') ? `MATCH -> ${resolvedPolicy}` : 'MISS',
		},
		{
			step: `country(${country})`,
			result: didMatch('country') ? `MATCH -> ${resolvedPolicy}` : 'MISS',
		},
		{
			step: `jurisdiction(${effectiveJurisdiction})`,
			result: didMatch('jurisdiction') ? `MATCH -> ${resolvedPolicy}` : 'MISS',
		},
		{
			step: `default(fallback)`,
			result: didMatch('default') ? `MATCH -> ${resolvedPolicy}` : 'SKIPPED',
		},
	];
}

function createSimulationSection(options: {
	overrides: ConsentStoreState['overrides'];
	onRunSimulation?: (payload: PolicySimulationPayload) => void | Promise<void>;
	onResetSimulation?: () => void | Promise<void>;
}): HTMLElement {
	const { overrides, onRunSimulation, onResetSimulation } = options;

	const countryField = select({
		className:
			`${componentStyles.input ?? ''} ${componentStyles.inputSmall ?? ''}`.trim(),
		options: COUNTRY_OPTIONS,
		selectedValue: overrides?.country ?? '',
	});

	const regionField = input({
		className:
			`${componentStyles.input ?? ''} ${componentStyles.inputSmall ?? ''}`.trim(),
		placeholder: 'e.g., CA, NY, BE',
		value: overrides?.region ?? '',
	}) as HTMLInputElement;

	const languageField = input({
		className:
			`${componentStyles.input ?? ''} ${componentStyles.inputSmall ?? ''}`.trim(),
		placeholder: 'e.g., en, de, fr',
		value: overrides?.language ?? '',
	}) as HTMLInputElement;

	const status = span({
		className: componentStyles.overrideHint,
		text: 'Run simulation to apply temporary overrides + refetch /init.',
	});

	const runButton = createButton({
		text: 'Run Simulation',
		variant: 'primary',
		small: true,
		onClick: () => {
			void runSimulation();
		},
	});

	const resetButton = createButton({
		text: 'Reset',
		small: true,
		onClick: () => {
			void resetSimulation();
		},
	});

	async function runSimulation(): Promise<void> {
		if (!onRunSimulation) {
			status.textContent = 'Simulation action is unavailable.';
			return;
		}

		runButton.disabled = true;
		resetButton.disabled = true;
		status.textContent = 'Simulating...';

		const payload: PolicySimulationPayload = {
			country: normalizeAlphaCode(countryField.value),
			region: normalizeAlphaCode(regionField.value),
			language: normalizeLanguageCode(languageField.value),
		};

		try {
			await onRunSimulation(payload);
			status.textContent = hasSimulationPayload(payload)
				? 'Simulation applied. Policy tab now reflects the simulated /init result.'
				: 'Simulation ran with no overrides.';
		} catch {
			status.textContent = 'Simulation failed. Check network/backend logs.';
		} finally {
			runButton.disabled = false;
			resetButton.disabled = false;
		}
	}

	async function resetSimulation(): Promise<void> {
		if (!onResetSimulation) {
			status.textContent = 'Reset action is unavailable.';
			return;
		}

		runButton.disabled = true;
		resetButton.disabled = true;
		status.textContent = 'Resetting simulation...';
		try {
			await onResetSimulation();
			countryField.value = '';
			regionField.value = '';
			languageField.value = '';
			status.textContent = 'Simulation reset. Runtime overrides cleared.';
		} catch {
			status.textContent = 'Reset failed. Check network/backend logs.';
		} finally {
			runButton.disabled = false;
			resetButton.disabled = false;
		}
	}

	return createSection({
		title: 'Policy Simulation',
		children: [
			div({
				style: {
					display: 'grid',
					gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
					gap: '8px',
				},
				children: [
					createSimulationField('Country', countryField),
					createSimulationField('Region', regionField),
					createSimulationField('Language', languageField),
				],
			}),
			div({
				className: componentStyles.overrideActionButtons,
				children: [runButton, resetButton],
			}),
			status,
		],
	});
}

function createSimulationField(
	labelText: string,
	control: HTMLElement
): HTMLElement {
	return div({
		className: componentStyles.overrideField,
		children: [
			span({
				className: componentStyles.overrideLabel,
				text: labelText,
			}),
			control,
		],
	});
}

function normalizeAlphaCode(value: string): string | undefined {
	const normalized = value.trim().toUpperCase();
	return normalized || undefined;
}

function normalizeLanguageCode(value: string): string | undefined {
	const normalized = value.trim();
	return normalized || undefined;
}

function hasSimulationPayload(payload: PolicySimulationPayload): boolean {
	return Boolean(payload.country || payload.region || payload.language);
}

const COUNTRY_OPTIONS = [
	{ value: '', label: '-- Select --' },
	{ value: 'US', label: 'US - United States' },
	{ value: 'CA', label: 'CA - Canada' },
	{ value: 'GB', label: 'GB - United Kingdom' },
	{ value: 'DE', label: 'DE - Germany' },
	{ value: 'FR', label: 'FR - France' },
	{ value: 'IT', label: 'IT - Italy' },
	{ value: 'ES', label: 'ES - Spain' },
	{ value: 'NL', label: 'NL - Netherlands' },
	{ value: 'BE', label: 'BE - Belgium' },
	{ value: 'AU', label: 'AU - Australia' },
	{ value: 'JP', label: 'JP - Japan' },
	{ value: 'BR', label: 'BR - Brazil' },
	{ value: 'IN', label: 'IN - India' },
];

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
