/**
 * Location Panel
 * Displays and manages location/language overrides
 */

import type { ConsentStoreState } from 'c15t';
import {
	createButton,
	createDisconnectedState,
	createGrid,
	createSection,
} from '../components/ui';
import {
	clearElement,
	div,
	input,
	type SelectOption,
	select,
	span,
} from '../core/renderer';
import componentStyles from '../styles/components.module.css';
import { formatInitSource } from '../utils/init-source';

interface OverridePayload {
	country?: string;
	region?: string;
	language?: string;
	gpc?: boolean;
}

type GpcOverrideSelect = '' | 'true' | 'false';

interface OverrideDraft {
	country: string;
	region: string;
	language: string;
	gpc: GpcOverrideSelect;
}

interface OverrideField<T extends HTMLInputElement | HTMLSelectElement> {
	element: HTMLElement;
	control: T;
}

export interface LocationPanelOptions {
	getState: () => ConsentStoreState | null;
	onApplyOverrides: (overrides: OverridePayload) => void | Promise<void>;
	onClearOverrides: () => void | Promise<void>;
}

/**
 * Renders the location panel content
 */
export function renderLocationPanel(
	container: HTMLElement,
	options: LocationPanelOptions
): void {
	const { getState, onApplyOverrides, onClearOverrides } = options;

	clearElement(container);

	const state = getState();

	if (!state) {
		container.appendChild(createDisconnectedState());
		return;
	}

	const locationInfo = state.locationInfo;
	const overrides = state.overrides;
	const translationConfig = state.translationConfig;
	const initData = state.lastBannerFetchData;
	const activePolicy = initData?.policy;
	const policyDecision = initData?.policyDecision;
	const initSource = formatInitSource(
		state.initDataSource,
		state.initDataSourceDetail
	);

	// Current location as a compact grid
	const gridItems = [
		createCompactInfoCard('Country', locationInfo?.countryCode || '—'),
		createCompactInfoCard('Region', locationInfo?.regionCode || '—'),
		createCompactInfoCard('Jurisdiction', locationInfo?.jurisdiction || '—'),
		createCompactInfoCard(
			'Language',
			translationConfig?.defaultLanguage || '—'
		),
		createCompactInfoCard('Init Source', initSource),
	];

	// Add GPC status - shows effective state (override takes precedence)
	gridItems.push(
		createCompactInfoCard('GPC', getEffectiveGpcLabel(overrides?.gpc))
	);

	// Add consent model if set
	if (state.model) {
		gridItems.push(createCompactInfoCard('Model', getModelLabel(state.model)));
	}

	const locationGrid = createGrid({
		columns: 3,
		children: gridItems,
	});

	container.appendChild(locationGrid);

	container.appendChild(
		createActivePolicySummarySection({
			policy: activePolicy,
			policyDecision,
			policySnapshotToken: initData?.policySnapshotToken,
		})
	);

	const initialDraft = getDraftFromOverrides(overrides);
	let appliedOverrides = normalizeOverrideDraft(initialDraft);
	let isSubmitting = false;

	const countryField = createOverrideSelect({
		label: 'Country',
		selectOptions: COUNTRY_OPTIONS,
		value: initialDraft.country,
	});

	const regionField = createOverrideInput({
		label: 'Region',
		placeholder: 'e.g., CA, NY, BE',
		value: initialDraft.region,
	});

	const languageField = createOverrideInput({
		label: 'Language',
		placeholder: 'e.g., de, fr, en-US',
		value: initialDraft.language,
	});

	const gpcField = createOverrideSelect({
		label: 'GPC',
		selectOptions: GPC_OPTIONS,
		value: initialDraft.gpc,
	});

	const formStatus = span({
		className: componentStyles.overrideStatus,
		text: 'In sync',
	});

	const applyButton = createButton({
		text: 'Apply',
		variant: 'primary',
		small: true,
		disabled: true,
		onClick: () => {
			void applyDraft();
		},
	});

	const revertButton = createButton({
		text: 'Revert',
		small: true,
		disabled: true,
		onClick: () => {
			setDraftValues(getDraftFromOverrides(appliedOverrides));
			updateFormState();
		},
	});

	const clearButton = createButton({
		text: 'Clear',
		small: true,
		onClick: () => {
			void clearDraftAndOverrides();
		},
	});

	const overrideFieldsGrid = div({
		style: {
			display: 'grid',
			gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
			gap: '8px 10px',
		},
		children: [
			countryField.element,
			regionField.element,
			languageField.element,
			gpcField.element,
		],
	});

	const overrideSection = createSection({
		title: 'Override Settings',
		children: [
			overrideFieldsGrid,
			span({
				className: componentStyles.overrideHint,
				text: 'GPC override only affects opt-out or unregulated jurisdictions.',
			}),
			div({
				className: componentStyles.overrideActions,
				children: [
					div({
						className: componentStyles.overrideActionButtons,
						children: [revertButton, applyButton, clearButton],
					}),
					formStatus,
				],
			}),
		],
	});

	container.appendChild(overrideSection);

	countryField.control.addEventListener('change', updateFormState);
	regionField.control.addEventListener('input', updateFormState);
	languageField.control.addEventListener('input', updateFormState);
	gpcField.control.addEventListener('change', updateFormState);

	updateFormState();

	async function applyDraft(): Promise<void> {
		if (isSubmitting) {
			return;
		}

		const draftOverrides = getDraftOverrides();
		if (overridesEqual(draftOverrides, appliedOverrides)) {
			return;
		}

		isSubmitting = true;
		updateFormState();

		try {
			await onApplyOverrides(draftOverrides);
			appliedOverrides = draftOverrides;
		} finally {
			isSubmitting = false;
			updateFormState();
		}
	}

	async function clearDraftAndOverrides(): Promise<void> {
		if (isSubmitting) {
			return;
		}

		isSubmitting = true;
		updateFormState();

		try {
			await onClearOverrides();
			appliedOverrides = {};
			setDraftValues(getDraftFromOverrides(undefined));
		} finally {
			isSubmitting = false;
			updateFormState();
		}
	}

	function getDraftOverrides(): OverridePayload {
		return normalizeOverrideDraft({
			country: countryField.control.value,
			region: regionField.control.value,
			language: languageField.control.value,
			gpc: gpcField.control.value as GpcOverrideSelect,
		});
	}

	function setDraftValues(draft: OverrideDraft): void {
		countryField.control.value = draft.country;
		regionField.control.value = draft.region;
		languageField.control.value = draft.language;
		gpcField.control.value = draft.gpc;
	}

	function updateFormState(): void {
		const draftOverrides = getDraftOverrides();
		const hasDraftChanges = !overridesEqual(draftOverrides, appliedOverrides);

		applyButton.disabled = !hasDraftChanges || isSubmitting;
		revertButton.disabled = !hasDraftChanges || isSubmitting;
		clearButton.disabled = isSubmitting;

		formStatus.textContent = isSubmitting
			? 'Applying...'
			: hasDraftChanges
				? 'Unsaved changes'
				: hasOverridesValue(appliedOverrides)
					? 'Overrides active'
					: 'No overrides';
		if (componentStyles.overrideStatusDirty) {
			formStatus.classList.toggle(
				componentStyles.overrideStatusDirty,
				!isSubmitting && hasDraftChanges
			);
		}
	}
}

/**
 * Creates an override input field
 */
function createOverrideInput(options: {
	label: string;
	placeholder: string;
	value: string;
}): OverrideField<HTMLInputElement> {
	const { label, placeholder, value } = options;

	const inputField = input({
		className:
			`${componentStyles.input ?? ''} ${componentStyles.inputSmall ?? ''}`.trim(),
		placeholder,
		value,
	}) as HTMLInputElement;

	return {
		element: div({
			className: componentStyles.overrideField,
			children: [
				span({
					className: componentStyles.overrideLabel,
					text: label,
				}),
				inputField,
			],
		}),
		control: inputField,
	};
}

/**
 * Creates an override select field
 */
function createOverrideSelect(options: {
	label: string;
	selectOptions: SelectOption[];
	value: string;
}): OverrideField<HTMLSelectElement> {
	const { label, selectOptions, value } = options;

	const selectField = select({
		className:
			`${componentStyles.input ?? ''} ${componentStyles.inputSmall ?? ''}`.trim(),
		options: selectOptions,
		selectedValue: value,
	});

	return {
		element: div({
			className: componentStyles.overrideField,
			children: [
				span({
					className: componentStyles.overrideLabel,
					text: label,
				}),
				selectField,
			],
		}),
		control: selectField,
	};
}

function getDraftFromOverrides(
	overrides: OverridePayload | undefined
): OverrideDraft {
	return {
		country: overrides?.country ?? '',
		region: overrides?.region ?? '',
		language: overrides?.language ?? '',
		gpc:
			overrides?.gpc === true
				? 'true'
				: overrides?.gpc === false
					? 'false'
					: '',
	};
}

function normalizeOverrideDraft(draft: OverrideDraft): OverridePayload {
	return {
		country: normalizeAlphaCode(draft.country),
		region: normalizeAlphaCode(draft.region),
		language: normalizeLanguageCode(draft.language),
		gpc:
			draft.gpc === 'true' ? true : draft.gpc === 'false' ? false : undefined,
	};
}

function normalizeAlphaCode(value: string): string | undefined {
	const normalized = value.trim().toUpperCase();
	return normalized || undefined;
}

function normalizeLanguageCode(value: string): string | undefined {
	const normalized = value.trim();
	return normalized || undefined;
}

function overridesEqual(a: OverridePayload, b: OverridePayload): boolean {
	return (
		a.country === b.country &&
		a.region === b.region &&
		a.language === b.language &&
		a.gpc === b.gpc
	);
}

function hasOverridesValue(overrides: OverridePayload): boolean {
	return Boolean(
		overrides.country ||
			overrides.region ||
			overrides.language ||
			overrides.gpc !== undefined
	);
}

/**
 * Common country codes for consent testing
 */
const COUNTRY_OPTIONS: SelectOption[] = [
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
	{ value: 'AT', label: 'AT - Austria' },
	{ value: 'CH', label: 'CH - Switzerland' },
	{ value: 'PL', label: 'PL - Poland' },
	{ value: 'SE', label: 'SE - Sweden' },
	{ value: 'NO', label: 'NO - Norway' },
	{ value: 'DK', label: 'DK - Denmark' },
	{ value: 'FI', label: 'FI - Finland' },
	{ value: 'IE', label: 'IE - Ireland' },
	{ value: 'PT', label: 'PT - Portugal' },
	{ value: 'AU', label: 'AU - Australia' },
	{ value: 'NZ', label: 'NZ - New Zealand' },
	{ value: 'JP', label: 'JP - Japan' },
	{ value: 'BR', label: 'BR - Brazil' },
	{ value: 'MX', label: 'MX - Mexico' },
	{ value: 'IN', label: 'IN - India' },
	{ value: 'CN', label: 'CN - China' },
	{ value: 'KR', label: 'KR - South Korea' },
	{ value: 'SG', label: 'SG - Singapore' },
	{ value: 'HK', label: 'HK - Hong Kong' },
	{ value: 'ZA', label: 'ZA - South Africa' },
];

/**
 * GPC override options for the select dropdown
 */
const GPC_OPTIONS: SelectOption[] = [
	{ value: '', label: '-- Browser Default --' },
	{ value: 'true', label: 'Force On (Simulated)' },
	{ value: 'false', label: 'Force Off (Simulated)' },
];

/**
 * Returns a label showing the effective GPC state.
 * Override takes precedence over the browser signal.
 */
function getEffectiveGpcLabel(gpcOverride: boolean | undefined): string {
	if (gpcOverride === true) {
		return 'On (Override)';
	}
	if (gpcOverride === false) {
		return 'Off (Override)';
	}
	// No override - read real browser signal
	if (typeof window === 'undefined' || typeof navigator === 'undefined') {
		return 'Unknown';
	}
	try {
		const nav = navigator as Navigator & {
			globalPrivacyControl?: boolean | string;
		};
		const value = nav.globalPrivacyControl;
		return value === true || value === '1' ? 'Active' : 'Inactive';
	} catch {
		return 'Unknown';
	}
}

/**
 * Gets a short label for the consent model
 */
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

function createActivePolicySummarySection(options: {
	policy:
		| {
				id: string;
		  }
		| undefined;
	policyDecision:
		| {
				policyId: string;
				fingerprint: string;
				matchedBy: 'region' | 'country' | 'jurisdiction' | 'default';
				country: string | null;
				region: string | null;
				jurisdiction: string;
		  }
		| undefined;
	policySnapshotToken: string | undefined;
}): HTMLElement {
	const { policy, policyDecision, policySnapshotToken } = options;

	if (!policy && !policyDecision) {
		return createSection({
			title: 'Active Policy',
			children: [
				div({
					style: {
						padding: '10px 12px',
						fontSize: 'var(--c15t-devtools-font-size-sm)',
						color: 'var(--c15t-text-muted)',
					},
					text: 'No active policy matched.',
				}),
			],
		});
	}

	const cards = [
		createCompactInfoCard(
			'Policy ID',
			policy?.id ?? policyDecision?.policyId ?? '—'
		),
		createCompactInfoCard('Matched By', policyDecision?.matchedBy ?? '—'),
		createCompactInfoCard(
			'Snapshot Token',
			policySnapshotToken ? 'present' : 'missing'
		),
	];

	return createSection({
		title: 'Active Policy',
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
				text: 'Open the Policy tab for full policy-pack diagnostics.',
			}),
		],
	});
}

/**
 * Creates a compact info card for grid layouts
 */
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
