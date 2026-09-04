/**
 * Location Panel
 * Displays and manages location/language overrides
 */

import type { ConsentSnapshot } from '@c15t/core';

import {
	createButton,
	createDisconnectedState,
	createGrid,
	createSection,
} from '../components/ui';
import { clearElement, div, input, select, span } from '../core/renderer';
import type { SelectOption } from '../core/renderer';

import componentStyles from '../styles/components.module.css';

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
	getState: () => ConsentSnapshot | null;
	onApplyOverrides: (overrides: OverridePayload) => void | Promise<void>;
	onClearOverrides: () => void | Promise<void>;
}

/**
 * Creates an override input field
 */
const createOverrideInput = function createOverrideInput(options: {
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
		control: inputField,
		element: div({
			children: [
				span({
					className: componentStyles.overrideLabel,
					text: label,
				}),
				inputField,
			],

			className: componentStyles.overrideField,
		}),
	};
};

/**
 * Creates an override select field
 */
const createOverrideSelect = function createOverrideSelect(options: {
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
		control: selectField,
		element: div({
			children: [
				span({
					className: componentStyles.overrideLabel,
					text: label,
				}),
				selectField,
			],

			className: componentStyles.overrideField,
		}),
	};
};

const normalizeAlphaCode = function normalizeAlphaCode(
	value: string
): string | undefined {
	const normalized = value.trim().toUpperCase();
	return normalized || undefined;
};

const normalizeLanguageCode = function normalizeLanguageCode(
	value: string
): string | undefined {
	const normalized = value.trim();
	return normalized || undefined;
};

const normalizeOverrideDraft = function normalizeOverrideDraft(
	draft: OverrideDraft
): OverridePayload {
	return {
		country: normalizeAlphaCode(draft.country),
		gpc:
			// oxlint-disable-next-line no-nested-ternary -- Preserve established branch order and control flow.
			draft.gpc === 'true' ? true : draft.gpc === 'false' ? false : undefined,
		language: normalizeLanguageCode(draft.language),
		region: normalizeAlphaCode(draft.region),
	};
};

const getDraftFromOverrides = function getDraftFromOverrides(
	overrides: OverridePayload | undefined
): OverrideDraft {
	return {
		country: overrides?.country ?? '',
		gpc:
			// oxlint-disable-next-line no-nested-ternary -- Preserve established branch order and control flow.
			overrides?.gpc === true
				? 'true'
				: overrides?.gpc === false
					? 'false'
					: '',
		language: overrides?.language ?? '',
		region: overrides?.region ?? '',
	};
};

const overridesEqual = function overridesEqual(
	a: OverridePayload,
	b: OverridePayload
): boolean {
	return (
		a.country === b.country &&
		a.region === b.region &&
		a.language === b.language &&
		a.gpc === b.gpc
	);
};

const hasOverridesValue = function hasOverridesValue(
	overrides: OverridePayload
): boolean {
	return Boolean(
		overrides.country ||
		overrides.region ||
		overrides.language ||
		overrides.gpc !== undefined
	);
};

/**
 * Creates a compact info card for grid layouts
 */
const createCompactInfoCard = function createCompactInfoCard(
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

/**
 * Gets a short label for the consent model
 */
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

/**
 * Returns a label showing the effective GPC state.
 * Override takes precedence over the browser signal.
 */
const getEffectiveGpcLabel = function getEffectiveGpcLabel(
	gpcOverride: boolean | undefined
): string {
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
};

/**
 * GPC override options for the select dropdown
 */
const GPC_OPTIONS: SelectOption[] = [
	{ label: '-- Browser Default --', value: '' },
	{ label: 'Force On (Simulated)', value: 'true' },
	{ label: 'Force Off (Simulated)', value: 'false' },
];

/**
 * Common country codes for consent testing
 */
const COUNTRY_OPTIONS: SelectOption[] = [
	{ label: '-- Select --', value: '' },
	{ label: 'US - United States', value: 'US' },
	{ label: 'CA - Canada', value: 'CA' },
	{ label: 'GB - United Kingdom', value: 'GB' },
	{ label: 'DE - Germany', value: 'DE' },
	{ label: 'FR - France', value: 'FR' },
	{ label: 'IT - Italy', value: 'IT' },
	{ label: 'ES - Spain', value: 'ES' },
	{ label: 'NL - Netherlands', value: 'NL' },
	{ label: 'BE - Belgium', value: 'BE' },
	{ label: 'AT - Austria', value: 'AT' },
	{ label: 'CH - Switzerland', value: 'CH' },
	{ label: 'PL - Poland', value: 'PL' },
	{ label: 'SE - Sweden', value: 'SE' },
	{ label: 'NO - Norway', value: 'NO' },
	{ label: 'DK - Denmark', value: 'DK' },
	{ label: 'FI - Finland', value: 'FI' },
	{ label: 'IE - Ireland', value: 'IE' },
	{ label: 'PT - Portugal', value: 'PT' },
	{ label: 'AU - Australia', value: 'AU' },
	{ label: 'NZ - New Zealand', value: 'NZ' },
	{ label: 'JP - Japan', value: 'JP' },
	{ label: 'BR - Brazil', value: 'BR' },
	{ label: 'MX - Mexico', value: 'MX' },
	{ label: 'IN - India', value: 'IN' },
	{ label: 'CN - China', value: 'CN' },
	{ label: 'KR - South Korea', value: 'KR' },
	{ label: 'SG - Singapore', value: 'SG' },
	{ label: 'HK - Hong Kong', value: 'HK' },
	{ label: 'ZA - South Africa', value: 'ZA' },
];

const createActivePolicySummarySection =
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
					matchedBy: 'region' | 'country' | 'default' | 'fallback';
					country: string | null;
					region: string | null;
			  }
			| undefined;
		policySnapshotToken: string | undefined;
	}): HTMLElement {
		const { policy, policyDecision, policySnapshotToken } = options;

		if (!policy && !policyDecision) {
			return createSection({
				children: [
					div({
						style: {
							color: 'var(--c15t-text-muted)',

							fontSize: 'var(--c15t-devtools-font-size-sm)',
							padding: '10px 12px',
						},
						text: 'No active policy matched.',
					}),
				],
				title: 'Active Policy',
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
			children: [
				div({
					children: cards,

					style: {
						display: 'grid',
						gap: 'var(--c15t-space-sm, 0.5rem)',
						gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
					},
				}),
				span({
					className: componentStyles.overrideHint,
					text: 'Open the Policy tab for full policy-pack diagnostics.',
				}),
			],
			title: 'Active Policy',
		});
	};

/**
 * Renders the location panel content
 */
// oxlint-disable-next-line func-style -- Preserve declaration order, interface shape, and public compatibility.
export function renderLocationPanel(
	container: HTMLElement,
	options: LocationPanelOptions
): void {
	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let updateFormState: () => void;

	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let setDraftValues: (draft: OverrideDraft) => void;

	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let getDraftOverrides: () => OverridePayload;

	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let clearDraftAndOverrides: () => Promise<void>;

	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let applyDraft: () => Promise<void>;

	const { getState, onApplyOverrides, onClearOverrides } = options;

	clearElement(container);

	const state = getState();

	if (!state) {
		container.appendChild(createDisconnectedState());
		return;
	}

	const { location, overrides, translations } = state;
	const activePolicy = state.policy ?? undefined;
	const policyDecision = state.policyDecision ?? undefined;

	// Current location as a compact grid
	const gridItems = [
		createCompactInfoCard('Country', location?.countryCode || '—'),
		createCompactInfoCard('Region', location?.regionCode || '—'),
		createCompactInfoCard('Language', translations?.language || '—'),
		createCompactInfoCard('Jurisdiction', policyDecision?.jurisdiction || '—'),
	];

	// Add GPC status - shows effective state (override takes precedence)
	gridItems.push(
		createCompactInfoCard('GPC', getEffectiveGpcLabel(overrides.gpc))
	);

	// Add consent model if set
	if (state.model) {
		gridItems.push(createCompactInfoCard('Model', getModelLabel(state.model)));
	}

	const locationGrid = createGrid({
		children: gridItems,
		columns: 3,
	});

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
		disabled: true,
		onClick: () => {
			void applyDraft();
		},
		small: true,
		text: 'Apply',
		variant: 'primary',
	});

	const revertButton = createButton({
		disabled: true,
		onClick: () => {
			setDraftValues(getDraftFromOverrides(appliedOverrides));
			updateFormState();
		},
		small: true,
		text: 'Revert',
	});

	const clearButton = createButton({
		onClick: () => {
			void clearDraftAndOverrides();
		},
		small: true,
		text: 'Clear',
	});

	const overrideFieldsGrid = div({
		children: [
			countryField.element,
			regionField.element,
			languageField.element,
			gpcField.element,
		],
		style: {
			display: 'grid',
			gap: '8px 10px',
			gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
		},
	});

	const overrideSection = createSection({
		children: [
			overrideFieldsGrid,
			span({
				className: componentStyles.overrideHint,
				text: 'GPC override only affects opt-out or unregulated jurisdictions.',
			}),
			div({
				children: [
					div({
						children: [revertButton, applyButton, clearButton],

						className: componentStyles.overrideActionButtons,
					}),
					formStatus,
				],

				className: componentStyles.overrideActions,
			}),
		],
		title: 'Override Settings',
	});

	container.appendChild(overrideSection);
	container.appendChild(locationGrid);

	container.appendChild(
		createActivePolicySummarySection({
			policy: activePolicy,
			policyDecision,
			policySnapshotToken: state.policySnapshotToken ?? undefined,
		})
	);

	applyDraft = async (): Promise<void> => {
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
	};

	clearDraftAndOverrides = async (): Promise<void> => {
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
	};

	getDraftOverrides = (): OverridePayload =>
		normalizeOverrideDraft({
			country: countryField.control.value,
			gpc: gpcField.control.value as GpcOverrideSelect,

			language: languageField.control.value,
			region: regionField.control.value,
		});

	setDraftValues = (draft: OverrideDraft): void => {
		countryField.control.value = draft.country;
		regionField.control.value = draft.region;
		languageField.control.value = draft.language;
		gpcField.control.value = draft.gpc;
	};

	updateFormState = (): void => {
		const draftOverrides = getDraftOverrides();
		const hasDraftChanges = !overridesEqual(draftOverrides, appliedOverrides);

		applyButton.disabled = !hasDraftChanges || isSubmitting;
		revertButton.disabled = !hasDraftChanges || isSubmitting;
		clearButton.disabled = isSubmitting;

		// oxlint-disable-next-line no-nested-ternary -- Preserve established branch order and control flow.
		formStatus.textContent = isSubmitting
			? 'Applying...'
			: // oxlint-disable-next-line no-nested-ternary -- Preserve established branch order and control flow.
				hasDraftChanges
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
	};

	countryField.control.addEventListener('change', updateFormState);
	regionField.control.addEventListener('input', updateFormState);
	languageField.control.addEventListener('input', updateFormState);
	gpcField.control.addEventListener('change', updateFormState);

	updateFormState();
}
