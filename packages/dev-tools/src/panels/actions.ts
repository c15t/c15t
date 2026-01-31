/**
 * Actions Panel
 * Quick actions for developers
 */

import type { ConsentStoreState } from 'c15t';
import { createButton, createGrid } from '../components/ui';
import { clearElement, createSvgElement, div, span } from '../core/renderer';
import componentStyles from '../styles/components.module.css';

// Icons
const REFRESH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
  <path d="M21 3v5h-5"></path>
  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
  <path d="M8 16H3v5"></path>
</svg>`;

const TRASH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 6h18"></path>
  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
</svg>`;

const COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
</svg>`;

const EYE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
  <circle cx="12" cy="12" r="3"></circle>
</svg>`;

const SETTINGS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
  <circle cx="12" cy="12" r="3"></circle>
</svg>`;

const TERMINAL_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="4 17 10 11 4 5"></polyline>
  <line x1="12" y1="19" x2="20" y2="19"></line>
</svg>`;

export interface ActionsPanelOptions {
	getState: () => ConsentStoreState | null;
	onResetConsents: () => void;
	onRefetchBanner: () => void;
	onShowBanner: () => void;
	onOpenPreferences: () => void;
	onCopyState: () => void;
}

/**
 * Renders the actions panel content
 */
export function renderActionsPanel(
	container: HTMLElement,
	options: ActionsPanelOptions
): void {
	const {
		getState,
		onResetConsents,
		onRefetchBanner,
		onShowBanner,
		onOpenPreferences,
		onCopyState,
	} = options;

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

	// Action cards in a 2-column grid
	const actionCards = [
		createActionCard({
			icon: EYE_ICON,
			label: 'Show Banner',
			onClick: onShowBanner,
		}),
		createActionCard({
			icon: SETTINGS_ICON,
			label: 'Preferences',
			onClick: onOpenPreferences,
		}),
		createActionCard({
			icon: REFRESH_ICON,
			label: 'Re-fetch',
			onClick: onRefetchBanner,
		}),
		createActionCard({
			icon: COPY_ICON,
			label: 'Copy State',
			onClick: onCopyState,
		}),
	];

	const grid = createGrid({
		columns: 2,
		children: actionCards,
	});

	container.appendChild(grid);

	// Danger zone - reset button
	const dangerZone = div({
		style: {
			padding: '12px 16px',
			borderTop: '1px solid var(--c15t-border)',
		},
		children: [
			createButton({
				text: 'Reset All Consents',
				icon: TRASH_ICON,
				variant: 'danger',
				onClick: onResetConsents,
			}),
		],
	});

	container.appendChild(dangerZone);

	// Console API section
	const consoleSection = div({
		style: {
			padding: '12px 16px',
			borderTop: '1px solid var(--c15t-border)',
		},
		children: [
			div({
				style: {
					display: 'flex',
					alignItems: 'center',
					gap: '6px',
					marginBottom: '8px',
				},
				children: [
					createIconWrapper(TERMINAL_ICON, 14),
					span({
						style: {
							fontSize: 'var(--c15t-devtools-font-size-xs)',
							fontWeight: '600',
							color: 'var(--c15t-text)',
						},
						text: 'Console API',
					}),
				],
			}),
			div({
				style: {
					display: 'flex',
					flexDirection: 'column',
					gap: '4px',
					padding: '8px',
					borderRadius: 'var(--c15t-radius-md)',
					backgroundColor: 'var(--c15t-surface-muted)',
					fontFamily:
						'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
					fontSize: '11px',
					color: 'var(--c15t-text-muted)',
				},
				children: [
					span({ text: `window.${getNamespace(state)}.getState()` }),
					span({ text: 'window.__c15tDevTools.open()' }),
				],
			}),
		],
	});

	container.appendChild(consoleSection);
}

/**
 * Creates an action card with icon and label
 */
function createActionCard(options: {
	icon: string;
	label: string;
	onClick: () => void;
}): HTMLElement {
	const { icon, label, onClick } = options;

	const card = div({
		className: componentStyles.gridCard ?? '',
		style: {
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			gap: '6px',
			padding: '16px 8px',
			cursor: 'pointer',
			transition:
				'background-color var(--c15t-duration-fast) var(--c15t-easing)',
		},
		children: [
			createIconWrapper(icon, 20),
			span({
				style: {
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					fontWeight: '500',
					color: 'var(--c15t-text)',
					textAlign: 'center',
				},
				text: label,
			}),
		],
	});

	card.addEventListener('click', onClick);
	card.addEventListener('mouseenter', () => {
		card.style.backgroundColor = 'var(--c15t-surface-hover)';
	});
	card.addEventListener('mouseleave', () => {
		card.style.backgroundColor = '';
	});

	return card;
}

/**
 * Creates an icon wrapper element
 */
function createIconWrapper(icon: string, size: number): HTMLElement {
	const wrapper = div({
		style: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			color: 'var(--c15t-text-muted)',
		},
	});
	wrapper.appendChild(createSvgElement(icon, { width: size, height: size }));
	return wrapper;
}

/**
 * Gets the namespace from the store config
 */
function getNamespace(state: ConsentStoreState): string {
	return (state.config?.meta?.namespace as string) || 'c15tStore';
}
