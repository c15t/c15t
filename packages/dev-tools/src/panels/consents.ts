/**
 * Consents Panel
 * Displays and manages consent state
 */

import type { ConsentStoreState } from 'c15t';
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
 * Renders the consents panel content
 */
export function renderConsentsPanel(
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
					padding: '24px',
					textAlign: 'center',
					color: 'var(--c15t-devtools-text-muted)',
					fontSize: 'var(--c15t-devtools-font-size-sm)',
				},
				text: 'No consents configured',
			})
		);
	} else {
		// Show IAB mode notice if applicable
		if (isIabMode) {
			const iabNotice = div({
				style: {
					padding: '8px 12px',
					margin: '0 0 8px',
					backgroundColor: 'var(--c15t-devtools-badge-info-bg)',
					borderRadius: '4px',
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					color: 'var(--c15t-devtools-badge-info)',
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
				checked: Boolean(value),
				disabled: isNecessary || isIabMode,
				ariaLabel: `Toggle ${displayName} consent`,
				onChange: (newValue) => onConsentChange(String(name), newValue),
			});

			// Create grid card with unsaved indicator (not shown in IAB mode)
			const card = createGridCard({
				title:
					formatConsentName(displayName) + (!isIabMode && !isSaved ? ' •' : ''),
				action: toggle,
			});

			gridCards.push(card);
		}

		// Create 2-column grid (no animation - updates frequently)
		const grid = createGrid({
			columns: 2,
			children: gridCards,
		});

		container.appendChild(grid);
	}

	// Footer with actions
	if (isIabMode) {
		// In IAB mode, only show reset button
		const footer = div({
			style: {
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'flex-end',
				padding: '12px 16px',
				marginTop: 'auto',
				borderTop: '1px solid var(--c15t-border)',
				backgroundColor: 'var(--c15t-surface)',
			},
			children: [
				createButton({
					text: 'Reset All',
					variant: 'danger',
					small: true,
					onClick: onReset,
				}),
			],
		});
		container.appendChild(footer);
		return;
	}

	const footer = div({
		style: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			padding: '12px 16px',
			marginTop: 'auto',
			borderTop: '1px solid var(--c15t-border)',
			backgroundColor: hasUnsavedChanges
				? 'var(--c15t-devtools-badge-warning-bg)'
				: 'var(--c15t-surface)',
		},
		children: [
			// Left side: quick actions
			div({
				style: {
					display: 'flex',
					gap: '6px',
				},
				children: [
					createButton({
						text: 'Accept',
						variant: 'primary',
						small: true,
						onClick: onAcceptAll,
					}),
					createButton({
						text: 'Reject',
						variant: 'default',
						small: true,
						onClick: onRejectAll,
					}),
					createButton({
						text: 'Reset',
						variant: 'danger',
						small: true,
						onClick: onReset,
					}),
				],
			}),
			// Right side: unsaved indicator or save button
			hasUnsavedChanges
				? div({
						style: {
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
						},
						children: [
							span({
								style: {
									fontSize: 'var(--c15t-devtools-font-size-xs)',
									color: 'var(--c15t-devtools-badge-warning)',
								},
								text: 'Unsaved',
							}),
							createButton({
								text: 'Save',
								variant: 'primary',
								small: true,
								onClick: onSave,
							}),
						],
					})
				: span({
						style: {
							fontSize: 'var(--c15t-devtools-font-size-xs)',
							color: 'var(--c15t-text-muted)',
						},
						text: 'No changes',
					}),
		],
	});
	container.appendChild(footer);
}

/**
 * Formats consent name for display
 */
function formatConsentName(name: string): string {
	return name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}
