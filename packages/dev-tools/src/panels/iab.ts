/**
 * IAB Panel
 * Displays IAB TCF information including TC String, purposes, and vendors
 */

import type { ConsentStoreState } from 'c15t';
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
 * Renders the IAB panel content
 */
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
	const tcString = iabState.tcString;
	const tcStringSection = createSection({
		title: 'TC String',
		actions: tcString
			? [
					createButton({
						text: 'Copy',
						small: true,
						onClick: () => {
							navigator.clipboard.writeText(tcString);
						},
					}),
				]
			: [],
		children: [
			div({
				style: {
					padding: '8px',
					backgroundColor: 'var(--c15t-surface-muted)',
					borderRadius: '4px',
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					fontFamily: 'monospace',
					wordBreak: 'break-all',
					maxHeight: '80px',
					overflowY: 'auto',
					color: tcString ? 'var(--c15t-text)' : 'var(--c15t-text-muted)',
				},
				text: tcString || 'No TC String generated yet',
			}),
		],
	});

	container.appendChild(tcStringSection);

	const gvl = iabState.gvl;
	const searchQuery = iabSearchByContainer.get(container) ?? '';
	container.appendChild(
		createSection({
			title: 'Filter',
			children: [
				createInput({
					value: searchQuery,
					placeholder: 'Filter purposes or vendors…',
					ariaLabel: 'Filter IAB purposes and vendors',
					small: true,
					onInput: (value) => {
						iabSearchByContainer.set(container, value.trim().toLowerCase());
						renderIabPanel(container, options);
					},
				}),
			],
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
			title: `Purposes (${purposeEntries.length})`,
			children: [purposeList],
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
			title: `Special Features (${specialFeatureEntries.length})`,
			children: [specialFeatureList],
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
	const iabVendors: Array<[string, boolean, string]> = [];
	const customVendors: Array<[string, boolean, string]> = [];

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
			title: `IAB Vendors (${iabVendors.length})`,
			children: [vendorList],
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
			title: `Custom Vendors (${customVendors.length})`,
			children: [customVendorList],
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
					padding: '16px',
					textAlign: 'center',
					color: 'var(--c15t-text-muted)',
					fontSize: 'var(--c15t-devtools-font-size-sm)',
				},
				text: 'No purposes or vendors configured',
			})
		);
	}

	// Footer with reset button
	const footer = div({
		style: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			padding: '12px 16px',
			marginTop: 'auto',
			borderTop: '1px solid var(--c15t-border)',
			backgroundColor: 'var(--c15t-surface)',
		},
		children: [
			div({
				style: {
					display: 'flex',
					gap: '6px',
				},
				children: [
					createButton({
						text: 'Accept All',
						variant: 'primary',
						small: true,
						onClick: onAcceptAll,
					}),
					createButton({
						text: 'Reject All',
						small: true,
						onClick: onRejectAll,
					}),
					createButton({
						text: 'Save',
						variant: 'primary',
						small: true,
						onClick: onSave,
					}),
				],
			}),
			createButton({
				text: 'Reset',
				variant: 'danger',
				small: true,
				onClick: onReset,
			}),
		],
	});
	container.appendChild(footer);
}

/**
 * Creates a purpose row item
 */
function createPurposeRow(
	id: string,
	name: string,
	consent: boolean,
	onChange: (value: boolean) => void,
	ariaKind: 'purpose' | 'feature' = 'purpose'
): HTMLElement {
	return div({
		style: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			padding: '4px 0',
			fontSize: 'var(--c15t-devtools-font-size-xs)',
			borderBottom: '1px solid var(--c15t-border)',
		},
		children: [
			span({
				style: {
					color: 'var(--c15t-text)',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
					flex: '1',
					marginRight: '8px',
				},
				text: `${id}. ${name}`,
				title: name,
			}),
			div({
				style: {
					display: 'flex',
					alignItems: 'center',
					gap: '6px',
				},
				children: [
					createBadge({
						text: consent ? '✓' : '✕',
						variant: consent ? 'success' : 'error',
					}),
					createToggle({
						checked: consent,
						onChange,
						ariaLabel: `Toggle ${ariaKind} ${id}`,
					}),
				],
			}),
		],
	});
}

/**
 * Creates a vendor row item
 */
function createVendorRow(
	id: string,
	name: string,
	consent: boolean,
	type: 'iab' | 'custom',
	onChange: (value: boolean) => void
): HTMLElement {
	return div({
		style: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			padding: '4px 0',
			fontSize: 'var(--c15t-devtools-font-size-xs)',
			borderBottom: '1px solid var(--c15t-border)',
		},
		children: [
			div({
				style: {
					display: 'flex',
					alignItems: 'center',
					gap: '6px',
					overflow: 'hidden',
					flex: '1',
					marginRight: '8px',
				},
				children: [
					type === 'custom'
						? span({
								style: {
									fontSize: '9px',
									padding: '1px 4px',
									backgroundColor: 'var(--c15t-devtools-badge-info-bg)',
									color: 'var(--c15t-devtools-badge-info)',
									borderRadius: '2px',
									flexShrink: '0',
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
			}),
			createBadge({
				text: consent ? '✓' : '✕',
				variant: consent ? 'success' : 'error',
			}),
			createToggle({
				checked: consent,
				onChange,
				ariaLabel: `Toggle vendor ${id}`,
			}),
		],
	});
}

/**
 * Truncates text to a maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}
	return `${text.slice(0, maxLength - 3)}...`;
}
