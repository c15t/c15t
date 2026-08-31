/**
 * IAB Panel
 * Displays IAB TCF information including TC String, purposes, and vendors
 */

import type { ConsentStoreState } from '@c15t/core';

import {
	createBadge,
	createButton,
	createDisconnectedState,
	createInput,
	createSection,
	createToggle,
} from '../components/ui';
import { clearElement, div, span } from '../core/renderer';

export interface IabPanelOptions {
	getState: () => ConsentStoreState | null;
	onSetPurposeConsent: (purposeId: number, value: boolean) => void;
	onSetVendorConsent: (vendorId: number | string, value: boolean) => void;
	onSetSpecialFeatureOptIn: (featureId: number, value: boolean) => void;
	onAcceptAll: () => void;
	onRejectAll: () => void;
	onSave: () => void;
	onReset: () => void;
}

const iabSearchByContainer = new WeakMap<HTMLElement, string>();

/**
 * Creates a purpose row item
 */
// oxlint-disable-next-line func-style -- Preserve declaration order, interface shape, and public compatibility.
function createPurposeRow(
	id: string,
	name: string,
	consent: boolean,
	onChange: (value: boolean) => void,
	ariaKind: 'purpose' | 'feature' = 'purpose'
): HTMLElement {
	return div({
		children: [
			span({
				style: {
					color: 'var(--c15t-text)',
					flex: '1',
					marginRight: '8px',

					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
				},
				text: `${id}. ${name}`,
				title: name,
			}),
			div({
				children: [
					createBadge({
						text: consent ? '✓' : '✕',
						variant: consent ? 'success' : 'error',
					}),
					createToggle({
						ariaLabel: `Toggle ${ariaKind} ${id}`,
						checked: consent,
						onChange,
					}),
				],

				style: {
					alignItems: 'center',
					display: 'flex',
					gap: '6px',
				},
			}),
		],
		style: {
			alignItems: 'center',
			borderBottom: '1px solid var(--c15t-border)',
			display: 'flex',
			fontSize: 'var(--c15t-devtools-font-size-xs)',
			justifyContent: 'space-between',
			padding: '4px 0',
		},
	});
}

/**
 * Truncates text to a maximum length with ellipsis
 */
const truncateText = function truncateText(
	text: string,
	maxLength: number
): string {
	if (text.length <= maxLength) {
		return text;
	}
	return `${text.slice(0, maxLength - 3)}...`;
};

/**
 * Creates a vendor row item
 */
const createVendorRow = function createVendorRow(
	id: string,
	name: string,
	consent: boolean,
	type: 'iab' | 'custom',
	onChange: (value: boolean) => void
): HTMLElement {
	return div({
		children: [
			div({
				children: [
					type === 'custom'
						? span({
								style: {
									backgroundColor: 'var(--c15t-devtools-badge-info-bg)',
									borderRadius: '2px',
									color: 'var(--c15t-devtools-badge-info)',
									flexShrink: '0',
									fontSize: '9px',
									padding: '1px 4px',
								},
								text: 'CUSTOM',
							})
						: null,
					span({
						style: {
							color: 'var(--c15t-text)',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
						},
						text: `${id}. ${truncateText(name, 25)}`,
						title: name,
					}),
				].filter(Boolean) as HTMLElement[],

				style: {
					alignItems: 'center',
					display: 'flex',
					flex: '1',
					gap: '6px',
					marginRight: '8px',
					overflow: 'hidden',
				},
			}),
			createBadge({
				text: consent ? '✓' : '✕',
				variant: consent ? 'success' : 'error',
			}),
			createToggle({
				ariaLabel: `Toggle vendor ${id}`,

				checked: consent,
				onChange,
			}),
		],
		style: {
			alignItems: 'center',
			borderBottom: '1px solid var(--c15t-border)',
			display: 'flex',
			fontSize: 'var(--c15t-devtools-font-size-xs)',
			justifyContent: 'space-between',
			padding: '4px 0',
		},
	});
};

/**
 * Renders the IAB panel content
 */
// oxlint-disable-next-line complexity, func-style -- Preserve control flow and declaration compatibility.
export function renderIabPanel(
	container: HTMLElement,
	options: IabPanelOptions
): void {
	const {
		getState,
		onSetPurposeConsent,
		onSetVendorConsent,
		onSetSpecialFeatureOptIn,
		onAcceptAll,
		onRejectAll,
		onSave,
		onReset,
	} = options;

	clearElement(container);

	const state = getState();

	if (!state) {
		container.appendChild(createDisconnectedState());
		return;
	}

	// Check if IAB mode is configured
	if (state.model !== 'iab') {
		container.appendChild(
			createDisconnectedState('IAB TCF mode is not configured')
		);
		return;
	}

	const iabState = state.iab;
	if (!iabState) {
		container.appendChild(createDisconnectedState('IAB state not available'));
		return;
	}

	// TC String section with Copy button in header
	const { tcString } = iabState;
	const tcStringSection = createSection({
		actions: tcString
			? [
					createButton({
						onClick: () => {
							navigator.clipboard.writeText(tcString);
						},

						small: true,
						text: 'Copy',
					}),
				]
			: [],
		children: [
			div({
				style: {
					backgroundColor: 'var(--c15t-surface-muted)',
					borderRadius: '4px',
					color: tcString ? 'var(--c15t-text)' : 'var(--c15t-text-muted)',

					fontFamily: 'monospace',
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					maxHeight: '80px',
					overflowY: 'auto',
					padding: '8px',
					wordBreak: 'break-all',
				},
				text: tcString || 'No TC String generated yet',
			}),
		],
		title: 'TC String',
	});

	container.appendChild(tcStringSection);

	const { gvl } = iabState;
	const searchQuery = iabSearchByContainer.get(container) ?? '';
	container.appendChild(
		createSection({
			children: [
				createInput({
					ariaLabel: 'Filter IAB purposes and vendors',
					onInput: (value) => {
						iabSearchByContainer.set(container, value.trim().toLowerCase());
						renderIabPanel(container, options);
					},

					placeholder: 'Filter purposes or vendors…',
					small: true,
					value: searchQuery,
				}),
			],
			title: 'Filter',
		})
	);

	// Purposes section - single column, scrollable
	const purposeConsents = iabState.purposeConsents || {};
	const purposes = gvl?.purposes || {};
	const purposeEntries = Object.entries(purposeConsents).filter(
		([purposeId]) => {
			if (!searchQuery) {
				return true;
			}
			const purposeInfo = purposes[purposeId as unknown as number];
			const purposeName = purposeInfo?.name || `Purpose ${purposeId}`;
			return `${purposeId} ${purposeName}`.toLowerCase().includes(searchQuery);
		}
	);

	if (purposeEntries.length > 0) {
		const purposeList = div({
			style: {
				display: 'flex',
				flexDirection: 'column',
				gap: '4px',
				maxHeight: '120px',
				overflowY: 'auto',
			},
		});

		for (const [purposeId, consent] of purposeEntries) {
			const purposeInfo = purposes[purposeId as unknown as number];
			const purposeName = purposeInfo?.name || `Purpose ${purposeId}`;

			purposeList.appendChild(
				createPurposeRow(purposeId, purposeName, Boolean(consent), (value) => {
					onSetPurposeConsent(Number(purposeId), value);
				})
			);
		}

		const purposesSection = createSection({
			children: [purposeList],
			title: `Purposes (${purposeEntries.length})`,
		});

		container.appendChild(purposesSection);
	}

	// Special Features section (specialFeatureOptIns)
	const specialFeatureOptIns = iabState.specialFeatureOptIns || {};
	const specialFeatures = gvl?.specialFeatures || {};
	const specialFeatureEntries = Object.entries(specialFeatureOptIns).filter(
		([featureId]) => {
			if (!searchQuery) {
				return true;
			}
			const featureInfo = specialFeatures[featureId as unknown as number];
			const featureName = featureInfo?.name || `Special Feature ${featureId}`;
			return `${featureId} ${featureName}`.toLowerCase().includes(searchQuery);
		}
	);

	if (specialFeatureEntries.length > 0) {
		const specialFeatureList = div({
			style: {
				display: 'flex',
				flexDirection: 'column',
				gap: '4px',
				maxHeight: '100px',
				overflowY: 'auto',
			},
		});

		for (const [featureId, optIn] of specialFeatureEntries) {
			const featureInfo = specialFeatures[featureId as unknown as number];
			const featureName = featureInfo?.name || `Special Feature ${featureId}`;

			specialFeatureList.appendChild(
				createPurposeRow(
					featureId,
					featureName,
					Boolean(optIn),
					(value) => {
						onSetSpecialFeatureOptIn(Number(featureId), value);
					},
					'feature'
				)
			);
		}

		const specialFeaturesSection = createSection({
			children: [specialFeatureList],
			title: `Special Features (${specialFeatureEntries.length})`,
		});

		container.appendChild(specialFeaturesSection);
	}

	// Vendors section - differentiate IAB vs Custom
	const vendorConsents = iabState.vendorConsents || {};
	const vendors = gvl?.vendors || {};
	const vendorEntries = Object.entries(vendorConsents).filter(([vendorId]) => {
		if (!searchQuery) {
			return true;
		}
		const vendorInfo = vendors[vendorId as unknown as number];
		const vendorName = vendorInfo?.name || `Vendor ${vendorId}`;
		return `${vendorId} ${vendorName}`.toLowerCase().includes(searchQuery);
	});

	// Separate IAB vendors (in GVL) from custom vendors
	const iabVendors: [string, boolean, string][] = [];
	const customVendors: [string, boolean, string][] = [];

	for (const [vendorId, consent] of vendorEntries) {
		const vendorInfo = vendors[vendorId as unknown as number];
		const vendorName = vendorInfo?.name || `Vendor ${vendorId}`;
		const isIabVendor = vendorInfo !== undefined;

		if (isIabVendor) {
			iabVendors.push([vendorId, Boolean(consent), vendorName]);
		} else {
			customVendors.push([vendorId, Boolean(consent), vendorName]);
		}
	}

	// IAB Vendors
	if (iabVendors.length > 0) {
		const vendorList = div({
			style: {
				display: 'flex',
				flexDirection: 'column',
				gap: '4px',
				maxHeight: '120px',
				overflowY: 'auto',
			},
		});

		for (const [vendorId, consent, vendorName] of iabVendors) {
			vendorList.appendChild(
				createVendorRow(vendorId, vendorName, consent, 'iab', (value) => {
					onSetVendorConsent(Number(vendorId), value);
				})
			);
		}

		const vendorsSection = createSection({
			children: [vendorList],
			title: `IAB Vendors (${iabVendors.length})`,
		});

		container.appendChild(vendorsSection);
	}

	// Custom Vendors
	if (customVendors.length > 0) {
		const customVendorList = div({
			style: {
				display: 'flex',
				flexDirection: 'column',
				gap: '4px',
				maxHeight: '100px',
				overflowY: 'auto',
			},
		});

		for (const [vendorId, consent, vendorName] of customVendors) {
			customVendorList.appendChild(
				createVendorRow(vendorId, vendorName, consent, 'custom', (value) => {
					onSetVendorConsent(vendorId, value);
				})
			);
		}

		const customVendorsSection = createSection({
			children: [customVendorList],
			title: `Custom Vendors (${customVendors.length})`,
		});

		container.appendChild(customVendorsSection);
	}

	// Empty state if no purposes or vendors
	if (
		purposeEntries.length === 0 &&
		specialFeatureEntries.length === 0 &&
		vendorEntries.length === 0
	) {
		container.appendChild(
			div({
				style: {
					color: 'var(--c15t-text-muted)',
					fontSize: 'var(--c15t-devtools-font-size-sm)',
					padding: '16px',
					textAlign: 'center',
				},
				text: 'No purposes or vendors configured',
			})
		);
	}

	// Footer with reset button
	const footer = div({
		children: [
			div({
				children: [
					createButton({
						onClick: onAcceptAll,

						small: true,
						text: 'Accept All',
						variant: 'primary',
					}),
					createButton({
						onClick: onRejectAll,

						small: true,
						text: 'Reject All',
					}),
					createButton({
						onClick: onSave,

						small: true,
						text: 'Save',
						variant: 'primary',
					}),
				],

				style: {
					display: 'flex',
					gap: '6px',
				},
			}),
			createButton({
				onClick: onReset,

				small: true,
				text: 'Reset',
				variant: 'danger',
			}),
		],
		style: {
			alignItems: 'center',
			backgroundColor: 'var(--c15t-surface)',
			borderTop: '1px solid var(--c15t-border)',
			display: 'flex',
			justifyContent: 'space-between',
			marginTop: 'auto',
			padding: '12px 16px',
		},
	});
	container.appendChild(footer);
}
