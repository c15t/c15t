/**
 * IAB Panel
 * Displays IAB TCF information including TC String, purposes, and vendors
 */

import type { ConsentStoreState } from 'c15t';
import {
	createBadge,
	createButton,
	createGrid,
	createGridCard,
	createSection,
} from '../components/ui';
import { clearElement, div, span } from '../core/renderer';

export interface IabPanelOptions {
	getState: () => ConsentStoreState | null;
}

/**
 * Renders the IAB panel content
 */
export function renderIabPanel(
	container: HTMLElement,
	options: IabPanelOptions
): void {
	const { getState } = options;

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

	// Check if IAB mode is configured
	if (state.model !== 'iab') {
		container.appendChild(
			div({
				style: {
					padding: '24px',
					textAlign: 'center',
					color: 'var(--c15t-text-muted)',
					fontSize: 'var(--c15t-devtools-font-size-sm)',
				},
				text: 'IAB TCF mode is not configured',
			})
		);
		return;
	}

	const iabState = state.iab;
	if (!iabState) {
		container.appendChild(
			div({
				style: {
					padding: '24px',
					textAlign: 'center',
					color: 'var(--c15t-text-muted)',
					fontSize: 'var(--c15t-devtools-font-size-sm)',
				},
				text: 'IAB state not available',
			})
		);
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

	// Purposes section
	const purposeConsents = iabState.purposeConsents || {};
	const gvl = iabState.gvl;
	const purposes = gvl?.purposes || {};

	const purposeEntries = Object.entries(purposeConsents);
	if (purposeEntries.length > 0) {
		const purposeCards: HTMLElement[] = [];

		for (const [purposeId, consent] of purposeEntries) {
			const purposeInfo = purposes[purposeId as unknown as number];
			const purposeName = purposeInfo?.name || `Purpose ${purposeId}`;

			const badge = createBadge({
				text: consent ? 'Consent' : 'Denied',
				variant: consent ? 'success' : 'error',
			});

			const card = createGridCard({
				title: `${purposeId}. ${truncateText(purposeName, 20)}`,
				action: badge,
			});

			purposeCards.push(card);
		}

		const purposesGrid = createGrid({
			columns: 2,
			children: purposeCards,
		});

		const purposesSection = createSection({
			title: `Purposes (${purposeEntries.length})`,
			children: [purposesGrid],
		});

		container.appendChild(purposesSection);
	}

	// Vendors section
	const vendorConsents = iabState.vendorConsents || {};
	const vendors = gvl?.vendors || {};

	const vendorEntries = Object.entries(vendorConsents);
	if (vendorEntries.length > 0) {
		const vendorList = div({
			style: {
				display: 'flex',
				flexDirection: 'column',
				gap: '4px',
				maxHeight: '200px',
				overflowY: 'auto',
				padding: '0 8px',
			},
		});

		for (const [vendorId, consent] of vendorEntries) {
			const vendorInfo = vendors[vendorId as unknown as number];
			const vendorName = vendorInfo?.name || `Vendor ${vendorId}`;

			const vendorItem = div({
				style: {
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '6px 8px',
					borderRadius: '4px',
					backgroundColor: 'var(--c15t-surface)',
					border: '1px solid var(--c15t-border)',
				},
				children: [
					span({
						style: {
							fontSize: 'var(--c15t-devtools-font-size-xs)',
							color: 'var(--c15t-text)',
						},
						text: `${vendorId}. ${truncateText(vendorName, 30)}`,
					}),
					createBadge({
						text: consent ? 'Consent' : 'Denied',
						variant: consent ? 'success' : 'error',
					}),
				],
			});

			vendorList.appendChild(vendorItem);
		}

		const vendorsSection = createSection({
			title: `Vendors (${vendorEntries.length})`,
			children: [vendorList],
		});

		container.appendChild(vendorsSection);
	}

	// Empty state if no purposes or vendors
	if (purposeEntries.length === 0 && vendorEntries.length === 0) {
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
}

/**
 * Truncates text to a maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}
	return text.slice(0, maxLength - 3) + '...';
}
