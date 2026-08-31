/**
 * Consents Panel
 * Displays and manages consent state
 */

import type { ConsentStoreState } from '@c15t/core';

import {
	createButton,
	createDisconnectedState,
	createGrid,
	createGridCard,
	createToggle,
} from '../components/ui';
import { clearElement, div, span } from '../core/renderer';

export interface ConsentsPanelOptions {
	getState: () => ConsentStoreState | null;
	onConsentChange: (name: string, value: boolean) => void;
	onSave: () => void;
	onAcceptAll: () => void;
	onRejectAll: () => void;
	onReset: () => void;
}

/**
 * Formats consent name for display
 */
const formatConsentName = function formatConsentName(name: string): string {
	return name.replace(/_/gu, ' ').replace(/\b\w/gu, (l) => l.toUpperCase());
};

/**
 * Renders the consents panel content
 */
export const renderConsentsPanel = function renderConsentsPanel(
	container: HTMLElement,
	options: ConsentsPanelOptions
): void {
	const {
		getState,
		onConsentChange,
		onSave,
		onAcceptAll,
		onRejectAll,
		onReset,
	} = options;

	clearElement(container);

	const state = getState();

	if (!state) {
		container.appendChild(createDisconnectedState());
		return;
	}

	// Check if we're in IAB mode - consents are managed differently
	const isIabMode = state.model === 'iab';

	// Get consent values - use savedConsents as the base, with selectedConsents for pending changes
	const savedConsents = (state.consents || {}) as Record<string, boolean>;
	const selectedConsents = (state.selectedConsents || {}) as Record<
		string,
		boolean
	>;

	// Merge consents: start with saved, overlay with selected
	// This ensures we show current values even if selectedConsents is empty
	const displayConsents: Record<string, boolean> = { ...savedConsents };
	for (const [key, value] of Object.entries(selectedConsents)) {
		displayConsents[key] = value;
	}

	// Check for unsaved changes (not applicable in IAB mode)
	const hasUnsavedChanges =
		!isIabMode &&
		Object.entries(displayConsents).some(
			([key, value]) => savedConsents[key] !== value
		);

	// Consent items - use displayConsents for current toggle state
	const consentTypes = state.consentTypes || [];

	// Create a map for looking up consent type info
	const consentTypeMap = new Map<
		string,
		{ name: string; description?: string }
	>(
		consentTypes.map((ct: { name: string; description?: string }) => [
			ct.name,
			ct,
		])
	);

	// Consent grid - show displayConsents (merged state with pending changes)
	const consentEntries = Object.entries(displayConsents);

	if (consentEntries.length === 0) {
		container.appendChild(
			div({
				style: {
					color: 'var(--c15t-devtools-text-muted)',
					fontSize: 'var(--c15t-devtools-font-size-sm)',
					padding: '24px',
					textAlign: 'center',
				},
				text: 'No consents configured',
			})
		);
	} else {
		// Show IAB mode notice if applicable
		if (isIabMode) {
			const iabNotice = div({
				style: {
					backgroundColor: 'var(--c15t-devtools-badge-info-bg)',
					borderRadius: '4px',
					color: 'var(--c15t-devtools-badge-info)',
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					margin: '0 0 8px',
					padding: '8px 12px',
				},
				text: 'IAB TCF mode: Consents are managed via the IAB framework',
			});
			container.appendChild(iabNotice);
		}

		// Build grid cards for each consent
		const gridCards: HTMLElement[] = [];

		for (const [name, value] of consentEntries) {
			const consentType = consentTypeMap.get(name);
			const isNecessary = name === 'necessary';
			const displayName = consentType?.name || name;
			// Check if this consent has unsaved changes
			const isSaved = savedConsents[name] === value;

			// Create toggle - disabled in IAB mode or for necessary consents
			const toggle = createToggle({
				ariaLabel: `Toggle ${displayName} consent`,
				checked: Boolean(value),
				disabled: isNecessary || isIabMode,
				onChange: (newValue) => onConsentChange(String(name), newValue),
			});

			// Create grid card with unsaved indicator (not shown in IAB mode)
			const card = createGridCard({
				action: toggle,
				title:
					formatConsentName(displayName) + (!isIabMode && !isSaved ? ' •' : ''),
			});

			gridCards.push(card);
		}

		// Create 2-column grid (no animation - updates frequently)
		const grid = createGrid({
			children: gridCards,
			columns: 2,
		});

		container.appendChild(grid);
	}

	// Footer with actions
	if (isIabMode) {
		// In IAB mode, only show reset button
		const footer = div({
			children: [
				createButton({
					onClick: onReset,
					small: true,
					text: 'Reset All',
					variant: 'danger',
				}),
			],
			style: {
				alignItems: 'center',
				backgroundColor: 'var(--c15t-surface)',
				borderTop: '1px solid var(--c15t-border)',
				display: 'flex',
				justifyContent: 'flex-end',
				marginTop: 'auto',
				padding: '12px 16px',
			},
		});
		container.appendChild(footer);
		return;
	}

	const footer = div({
		children: [
			// Left side: quick actions
			div({
				children: [
					createButton({
						onClick: onAcceptAll,
						small: true,
						text: 'Accept',
						variant: 'primary',
					}),
					createButton({
						onClick: onRejectAll,
						small: true,
						text: 'Reject',
						variant: 'default',
					}),
					createButton({
						onClick: onReset,
						small: true,
						text: 'Reset',
						variant: 'danger',
					}),
				],

				style: {
					display: 'flex',
					gap: '6px',
				},
			}),
			// Right side: unsaved indicator or save button
			hasUnsavedChanges
				? div({
						children: [
							span({
								style: {
									color: 'var(--c15t-devtools-badge-warning)',
									fontSize: 'var(--c15t-devtools-font-size-xs)',
								},
								text: 'Unsaved',
							}),
							createButton({
								onClick: onSave,
								small: true,
								text: 'Save',
								variant: 'primary',
							}),
						],

						style: {
							alignItems: 'center',
							display: 'flex',
							gap: '8px',
						},
					})
				: span({
						style: {
							color: 'var(--c15t-text-muted)',
							fontSize: 'var(--c15t-devtools-font-size-xs)',
						},
						text: 'No changes',
					}),
		],
		style: {
			alignItems: 'center',
			backgroundColor: hasUnsavedChanges
				? 'var(--c15t-devtools-badge-warning-bg)'
				: 'var(--c15t-surface)',
			borderTop: '1px solid var(--c15t-border)',
			display: 'flex',
			justifyContent: 'space-between',
			marginTop: 'auto',
			padding: '12px 16px',
		},
	});
	container.appendChild(footer);
};
