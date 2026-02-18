/**
 * Location Panel
 * Displays and manages location/language overrides
 */

import type { ConsentStoreState } from 'c15t';
import { createButton, createGrid, createSection } from '../components/ui';
import {
	clearElement,
	div,
	input,
	type SelectOption,
	select,
	span,
} from '../core/renderer';
import componentStyles from '../styles/components.module.css';

export interface LocationPanelOptions {
	getState: () => ConsentStoreState | null;
	onSetOverrides: (overrides: {
		country?: string;
		region?: string;
		language?: string;
	}) => void;
	onClearOverrides: () => void;
	onSetGpcOverride: (value: boolean | undefined) => void;
}

/**
 * Renders the location panel content
 */
export function renderLocationPanel(
	container: HTMLElement,
	options: LocationPanelOptions
): void {
	const { getState, onSetOverrides, onClearOverrides, onSetGpcOverride } =
		options;

	clearElement(container);

	const state = getState();

	if (!state) {
		container.appendChild(
			div({
				style: {
					padding: '24px',
					textAlign: 'center',
					color: 'var(--c15t-text-muted)',
					fontSize: 'var(--c15t-devtools-font-size-sm)',
				},
				text: 'Store not connected',
			})
		);
		return;
	}

	const locationInfo = state.locationInfo;
	const overrides = state.overrides;
	const translationConfig = state.translationConfig;

	// Current location as a compact grid
	const gridItems = [
		createCompactInfoCard('Country', locationInfo?.countryCode || '—'),
		createCompactInfoCard('Region', locationInfo?.regionCode || '—'),
		createCompactInfoCard('Jurisdiction', locationInfo?.jurisdiction || '—'),
		createCompactInfoCard(
			'Language',
			translationConfig?.defaultLanguage || '—'
		),
	];

	// Add GPC status — shows effective state (override takes precedence)
	gridItems.push(
		createCompactInfoCard('GPC', getEffectiveGpcLabel(overrides?.gpc))
	);

	// Add consent model if set
	if (state.model) {
		gridItems.push(createCompactInfoCard('Model', getModelLabel(state.model)));
	}

	const locationGrid = createGrid({
		columns: 2,
		children: gridItems,
	});

	container.appendChild(locationGrid);

	// Override section
	const overrideSection = createSection({
		title: 'Override Settings',
		actions: [
			createButton({
				text: 'Clear',
				small: true,
				onClick: onClearOverrides,
			}),
		],
		children: [
			createOverrideSelect({
				label: 'Country',
				selectOptions: COUNTRY_OPTIONS,
				value: overrides?.country || '',
				onChange: (value) => onSetOverrides({ country: value || undefined }),
			}),
			createOverrideInput({
				label: 'Region',
				placeholder: 'e.g., CA, NY, BE',
				value: overrides?.region || '',
				onChange: (value) => onSetOverrides({ region: value || undefined }),
			}),
			createOverrideInput({
				label: 'Language',
				placeholder: 'e.g., de, fr, en',
				value: overrides?.language || '',
				onChange: (value) => onSetOverrides({ language: value || undefined }),
			}),
			createOverrideSelect({
				label: 'GPC',
				selectOptions: GPC_OPTIONS,
				value:
					overrides?.gpc === true
						? 'true'
						: overrides?.gpc === false
							? 'false'
							: '',
				onChange: (value) => {
					if (value === 'true') {
						onSetGpcOverride(true);
					} else if (value === 'false') {
						onSetGpcOverride(false);
					} else {
						onSetGpcOverride(undefined);
					}
				},
			}),
			div({
				style: {
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					color: 'var(--c15t-devtools-text-muted)',
					fontStyle: 'italic',
					paddingLeft: '68px',
				},
				text: 'GPC override only affects opt-out or unregulated jurisdictions',
			}),
		],
	});

	container.appendChild(overrideSection);

	// Active overrides indicator
	const hasOverrides =
		overrides &&
		(overrides.country ||
			overrides.region ||
			overrides.language ||
			overrides.gpc !== undefined);

	if (hasOverrides) {
		container.appendChild(
			div({
				style: {
					padding: '8px 16px',
					backgroundColor: 'var(--c15t-devtools-badge-info-bg)',
					color: 'var(--c15t-devtools-badge-info)',
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					borderTop: '1px solid var(--c15t-devtools-border)',
				},
				text: 'Overrides are active. This may affect consent behavior.',
			})
		);
	}
}

/**
 * Creates an override input field
 */
function createOverrideInput(options: {
	label: string;
	placeholder: string;
	value: string;
	onChange: (value: string) => void;
}): HTMLElement {
	const { label, placeholder, value, onChange } = options;

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	const inputField = input({
		className:
			`${componentStyles.input ?? ''} ${componentStyles.inputSmall ?? ''}`.trim(),
		placeholder,
		value,
		onInput: (e: Event) => {
			const target = e.target as HTMLInputElement;

			// Debounce the onChange callback
			if (debounceTimer) {
				clearTimeout(debounceTimer);
			}

			debounceTimer = setTimeout(() => {
				onChange(target.value);
			}, 500);
		},
	}) as HTMLInputElement;

	return div({
		style: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: '8px',
			marginBottom: '8px',
		},
		children: [
			div({
				style: {
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					color: 'var(--c15t-devtools-text-muted)',
					minWidth: '60px',
				},
				text: label,
			}),
			div({
				style: { flex: '1' },
				children: [inputField],
			}),
		],
	});
}

/**
 * Creates an override select field
 */
function createOverrideSelect(options: {
	label: string;
	selectOptions: SelectOption[];
	value: string;
	onChange: (value: string) => void;
}): HTMLElement {
	const { label, selectOptions, value, onChange } = options;

	const selectField = select({
		className:
			`${componentStyles.input ?? ''} ${componentStyles.inputSmall ?? ''}`.trim(),
		options: selectOptions,
		selectedValue: value,
		onChange: (e: Event) => {
			const target = e.target as HTMLSelectElement;
			onChange(target.value);
		},
	});

	return div({
		style: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: '8px',
			marginBottom: '8px',
		},
		children: [
			div({
				style: {
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					color: 'var(--c15t-devtools-text-muted)',
					minWidth: '60px',
				},
				text: label,
			}),
			div({
				style: { flex: '1' },
				children: [selectField],
			}),
		],
	});
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
	// No override — read real browser signal
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

/**
 * Creates a compact info card for grid layouts
 */
function createCompactInfoCard(label: string, value: string): HTMLElement {
	return div({
		className: componentStyles.gridCard ?? '',
		style: {
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
