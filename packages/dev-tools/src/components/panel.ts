/**
 * Panel Component
 * Main DevTools panel with header, content area, and footer
 * Supports unified mode with dropdown menu when PreferenceCenterTrigger is present
 */

import { createDraggable } from '../core/draggable';
import type { DraggableInstance } from '../core/draggable';
import {
	button,
	clearElement,
	createPortal,
	createSvgElement,
	div,
	span,
} from '../core/renderer';
import type { DevToolsPosition, StateManager } from '../core/state-manager';
import { DEFAULT_KERNEL_NAMESPACE } from '../core/store-connector';
import type { StoreConnector } from '../core/store-connector';
import {
	detectPreferenceTrigger,
	getPreferenceCenterOpener,
	setPreferenceTriggerVisibility,
} from '../utils/preference-trigger';
import { version } from '../version';
import {
	createDropdownMenu,
	DEVTOOLS_ICON,
	EYE_ICON,
	PREFERENCES_ICON,
} from './dropdown-menu';
import type { DropdownMenuInstance } from './dropdown-menu';

import animationStyles from '../styles/animations.module.css';
import panelStyles from '../styles/panel.module.css';

// SVG Icons - matches C15TIconOnly from @c15t/react
const LOGO_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 446 445" aria-label="c15t">
  <path fill="currentColor" d="M223.178.313c39.064 0 70.732 31.668 70.732 70.732-.001 39.064-31.668 70.731-70.732 70.731-12.181 0-23.642-3.079-33.649-8.502l-55.689 55.689a70.267 70.267 0 0 1 5.574 13.441h167.531c8.695-29.217 35.762-50.523 67.804-50.523 39.064 0 70.731 31.668 70.731 70.732s-31.668 70.732-70.731 70.732c-32.042 0-59.108-21.306-67.803-50.523H139.413a70.417 70.417 0 0 1-7.888 17.396l54.046 54.046c10.893-6.851 23.786-10.815 37.605-10.815 39.064 0 70.732 31.669 70.732 70.733 0 39.064-31.668 70.731-70.732 70.731s-70.732-31.667-70.732-70.731c0-10.518 2.296-20.499 6.414-29.471l-57.78-57.78c-8.972 4.117-18.952 6.414-29.47 6.414-39.063 0-70.731-31.668-70.732-70.732 0-39.064 31.669-70.732 70.733-70.732 12.18 0 23.642 3.079 33.649 8.502l55.688-55.688c-5.423-10.007-8.502-21.469-8.502-33.65 0-39.064 31.668-70.733 70.732-70.733Zm0 343.555c-16.742 0-30.314 13.572-30.314 30.314 0 16.741 13.572 30.313 30.314 30.313s30.314-13.572 30.314-30.313c0-16.742-13.572-30.314-30.314-30.314ZM71.611 192.299c-16.742 0-30.315 13.572-30.315 30.314s13.573 30.314 30.315 30.314c16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314Zm303.138 0c-16.729 0-30.294 13.551-30.315 30.275l.001.039-.001.038c.021 16.725 13.586 30.276 30.315 30.276 16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314ZM223.178 40.73c-16.742 0-30.314 13.573-30.314 30.315s13.573 30.313 30.314 30.313c16.742 0 30.313-13.572 30.314-30.313 0-16.742-13.572-30.314-30.314-30.315Z"/>
</svg>`;

const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`;

const WARNING_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
  <line x1="12" y1="9" x2="12" y2="13"></line>
  <line x1="12" y1="17" x2="12.01" y2="17"></line>
</svg>`;

/**
 * Get position class name
 */
const getPositionClass = function getPositionClass(
	position: DevToolsPosition
): string {
	// oxlint-disable-next-line default-case -- Preserve established branch order and control flow.
	switch (position) {
		case 'bottom-right':
			return panelStyles.positionBottomRight ?? '';
		case 'bottom-left':
			return panelStyles.positionBottomLeft ?? '';
		case 'top-right':
			return panelStyles.positionTopRight ?? '';
		case 'top-left':
			return panelStyles.positionTopLeft ?? '';
	}
};

const formatRetryDelay = function formatRetryDelay(
	delayMs: number | null
): string {
	if (delayMs === null) {
		return 'n/a';
	}
	if (delayMs < 1000) {
		return `${delayMs}ms`;
	}
	return `${(delayMs / 1000).toFixed(1)}s`;
};

export interface PanelOptions {
	stateManager: StateManager;
	storeConnector: StoreConnector;
	onRenderContent: (container: HTMLElement) => void;
	namespace?: string;
	/**
	 * Enable unified mode with dropdown menu when PreferenceCenterTrigger is detected
	 * @default true
	 */
	enableUnifiedMode?: boolean;
}

export interface PanelInstance {
	element: HTMLElement;
	floatingButton: HTMLElement;
	update: () => void;
	destroy: () => void;
}

/**
 * Creates the main panel component
 */
// oxlint-disable-next-line func-style -- Preserve declaration order, interface shape, and public compatibility.
export function createPanel(options: PanelOptions): PanelInstance {
	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let closePanel: () => void;

	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let renderErrorState: (container: HTMLElement) => void;

	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let updateFooter: () => void;

	const {
		stateManager,
		storeConnector,
		onRenderContent,
		namespace = DEFAULT_KERNEL_NAMESPACE,
		enableUnifiedMode = true,
	} = options;

	let removePortal: (() => void) | null = null;
	let isAnimatingOut = false;
	let draggable: DraggableInstance | null = null;
	let dropdownMenu: DropdownMenuInstance | null = null;
	let hasPreferenceTrigger = false;
	let useUnifiedMode = false;
	// Start with trigger hidden when DevTools is present - developer can toggle it on if needed
	let preferenceTriggerVisible = false;

	// Toggle preference trigger visibility (wraps utility with local state management)
	const updatePreferenceTriggerVisibility =
		function updatePreferenceTriggerVisibility(visible: boolean): void {
			preferenceTriggerVisible = visible;
			// Use utility for DOM manipulation
			setPreferenceTriggerVisibility(visible);
			// Update the menu item checked state
			if (dropdownMenu) {
				dropdownMenu.updateItemChecked('toggle-trigger', visible);
			}
		};

	// Create container
	const container = div({
		className: panelStyles.container,
		dataset: { c15tDevtools: 'true' },
	});

	// Create floating button
	// Note: Position is handled by the draggable, not CSS classes
	// Animation is disabled to avoid transform breaking fixed positioning
	const floatingButton = button({
		ariaLabel: 'Open c15t Options',
		// onClick is handled by the draggable to distinguish click from drag

		className: panelStyles.floatingButton ?? '',
	});

	// Check if unified mode should be enabled
	const checkUnifiedMode = function checkUnifiedMode(): void {
		if (!enableUnifiedMode) {
			useUnifiedMode = false;
			return;
		}

		// Detect if preference trigger exists
		hasPreferenceTrigger = detectPreferenceTrigger();
		const preferenceCenterOpener = getPreferenceCenterOpener(namespace);

		// Use unified mode if we have both the preference trigger and can open the preference center
		useUnifiedMode = hasPreferenceTrigger && preferenceCenterOpener !== null;

		if (useUnifiedMode && !dropdownMenu) {
			// Create dropdown menu with options
			dropdownMenu = createDropdownMenu({
				items: [
					{
						description: 'View and manage consents',
						icon: DEVTOOLS_ICON,
						id: 'devtools',
						label: 'DevTools',
						onClick: () => {
							stateManager.setOpen(true);
						},
					},
					{
						description: 'Open privacy settings',
						icon: PREFERENCES_ICON,
						id: 'preferences',
						label: 'Preferences',
						onClick: () => {
							const opener = getPreferenceCenterOpener(namespace);
							if (opener) {
								opener();
							}
						},
					},
					{
						checked: preferenceTriggerVisible,
						description: 'Show preference button',
						icon: EYE_ICON,
						id: 'toggle-trigger',
						label: 'Show Trigger',
						onClick: () => {
							updatePreferenceTriggerVisibility(!preferenceTriggerVisible);
						},

						type: 'toggle',
					},
				],
				onClose: () => {
					floatingButton.ariaLabel = 'Open c15t Options';
				},
				onOpen: () => {
					floatingButton.ariaLabel = 'Close c15t Options';
				},
				position: draggable?.getCorner() ?? stateManager.getState().position,
				referenceElement: floatingButton,
			});

			// Add menu to container (will be positioned via JS)
			container.appendChild(dropdownMenu.element);

			// Auto-hide the preference trigger in unified mode for cleaner DX
			updatePreferenceTriggerVisibility(false);
		}

		// Update button label based on mode
		floatingButton.ariaLabel = useUnifiedMode
			? 'Open c15t Options'
			: 'Open c15t DevTools';
	};

	// Create draggable instance for the button wrapper
	draggable = createDraggable({
		defaultPosition: stateManager.getState().position,
		onDragEnd: (wasDragged) => {
			// Only handle click if it wasn't a drag
			if (!wasDragged) {
				if (useUnifiedMode && dropdownMenu) {
					// Toggle the dropdown menu
					dropdownMenu.toggle();
				} else {
					// Directly toggle DevTools
					stateManager.toggle();
				}
			}
		},
		onPositionChange: (position) => {
			stateManager.setPosition(position);
			// Update menu position when button moves
			if (dropdownMenu) {
				dropdownMenu.updatePosition(position);
			}
		},
		persistPosition: true,
	});

	// Add icon to button (wrapped for hardware acceleration)
	const iconWrapper = div({ className: panelStyles.floatingButtonIcon });
	const logoSvg = createSvgElement(LOGO_ICON, { height: 24, width: 24 });
	iconWrapper.appendChild(logoSvg);
	floatingButton.appendChild(iconWrapper);

	// Attach draggable to button
	draggable.attach(floatingButton);

	// Check for unified mode after a short delay to allow the page to fully render
	setTimeout(checkUnifiedMode, 100);

	// Create panel elements
	let panelElement: HTMLElement | null = null;
	let backdropElement: HTMLElement | null = null;
	let contentContainer: HTMLElement | null = null;
	let footerElement: HTMLElement | null = null;

	/**
	 * Creates the panel structure
	 */
	// oxlint-disable-next-line func-style -- Preserve declaration order, interface shape, and public compatibility.
	function createPanelElement(): HTMLElement {
		// Use the draggable's current corner for panel positioning
		const corner = draggable?.getCorner() ?? stateManager.getState().position;
		const positionClass = getPositionClass(corner);

		// Create panel
		const panel = div({
			ariaLabel: 'c15t DevTools',
			className: `${panelStyles.panel} ${positionClass} ${animationStyles.animateEnter}`,
			role: 'dialog',
		});

		// Header
		const header = div({
			children: [
				div({
					children: [
						(() => {
							const logoWrapper = div({ className: panelStyles.headerLogo });
							logoWrapper.appendChild(
								createSvgElement(LOGO_ICON, { height: 20, width: 20 })
							);
							return logoWrapper;
						})(),
						span({ text: 'c15t DevTools' }),
					],

					className: panelStyles.headerTitle,
				}),
				button({
					ariaLabel: 'Close DevTools',
					children: [
						(() => {
							const iconWrap = div({ className: panelStyles.closeButtonIcon });
							iconWrap.appendChild(
								createSvgElement(CLOSE_ICON, { height: 16, width: 16 })
							);
							return iconWrap;
						})(),
					],

					className: panelStyles.closeButton,
					onClick: () => closePanel(),
				}),
			],
			className: panelStyles.header,
		});

		// Content
		contentContainer = div({ className: panelStyles.content });

		// Footer (reactive — updated via updateFooter)
		footerElement = div({ className: panelStyles.footer });
		updateFooter();

		panel.appendChild(header);
		panel.appendChild(contentContainer);
		panel.appendChild(footerElement);

		// Render content
		if (storeConnector.isConnected()) {
			onRenderContent(contentContainer);
		} else {
			renderErrorState(contentContainer);
		}

		return panel;
	}

	/**
	 * Updates the footer to reflect connection and loading state
	 */
	updateFooter = (): void => {
		if (!footerElement) {
			return;
		}
		clearElement(footerElement);

		const isConnected = storeConnector.isConnected();
		const storeState = storeConnector.getState();
		const isLoading = storeState?.policyProvisional ?? false;
		const diagnostics = storeConnector.getDiagnostics();
		const policyLabel = storeState?.policy?.id ?? 'none';

		const statusChildren: HTMLElement[] = [
			span({
				className: `${panelStyles.statusDot} ${isConnected ? panelStyles.statusConnected : panelStyles.statusDisconnected}`,
			}),
			span({
				text: isConnected ? 'Connected' : 'Disconnected',
			}),
		];

		if (isLoading) {
			statusChildren.push(
				span({
					className: panelStyles.footerMeta,
					text: '\u00b7 Fetching /init\u2026',
				})
			);
		} else if (!isConnected) {
			statusChildren.push(
				span({
					className: panelStyles.footerMeta,
					text: `· ${diagnostics.namespace} · retry ${diagnostics.reconnectAttempts} · next ${formatRetryDelay(diagnostics.nextRetryInMs)}`,
				})
			);
		}
		if (isConnected) {
			statusChildren.push(
				span({
					className: panelStyles.footerMeta,
					text: `· Policy: ${policyLabel}`,
				})
			);
		}

		footerElement.appendChild(
			div({
				children: statusChildren,
				className: panelStyles.footerStatus,
			})
		);

		if (!isConnected) {
			footerElement.appendChild(
				button({
					className: panelStyles.inlineActionButton,
					onClick: () => {
						storeConnector.retryConnection();
					},
					text: 'Retry',
				})
			);
		}

		footerElement.appendChild(span({ text: `v${version}` }));
	};

	/**
	 * Renders error state when store is not connected
	 */
	renderErrorState = (containerLocal: HTMLElement): void => {
		clearElement(containerLocal);
		const diagnostics = storeConnector.getDiagnostics();

		const errorState = div({
			children: [
				(() => {
					const iconWrap = div({ className: panelStyles.errorIcon });
					iconWrap.appendChild(
						createSvgElement(WARNING_ICON, { height: 48, width: 48 })
					);
					return iconWrap;
				})(),
				div({
					className: panelStyles.errorTitle,
					text: 'Kernel Not Found',
				}),
				div({
					className: panelStyles.errorMessage,
					text: `No consent kernel found. Pass \`kernel\` to the devtools or expose it on window.${namespace}.`,
				}),
				div({
					className: panelStyles.errorMessage,
					style: {
						fontSize: 'var(--c15t-devtools-font-size-xs)',
						marginTop: '4px',
					},
					text: `Namespace: ${diagnostics.namespace} · Retries: ${diagnostics.reconnectAttempts} · Next retry: ${formatRetryDelay(diagnostics.nextRetryInMs)}`,
				}),
				diagnostics.lastError
					? div({
							className: panelStyles.errorMessage,
							style: {
								color: 'var(--c15t-text-muted)',
								fontSize: 'var(--c15t-devtools-font-size-xs)',
								marginTop: '4px',
							},
							text: `Last error: ${diagnostics.lastError}`,
						})
					: null,
				button({
					className: panelStyles.inlineActionButton,
					onClick: () => {
						storeConnector.retryConnection();
					},

					text: 'Retry Connection',
				}),
			],
			className: panelStyles.errorState,
		});

		containerLocal.appendChild(errorState);
	};

	/**
	 * Opens the panel
	 */
	const openPanel = function openPanel(): void {
		if (panelElement || isAnimatingOut) {
			return;
		}

		// Hide floating button
		floatingButton.style.display = 'none';

		// Create backdrop
		backdropElement = div({
			className: `${panelStyles.backdrop} ${animationStyles.animateFadeIn}`,
			onClick: () => closePanel(),
		});

		// Create panel
		panelElement = createPanelElement();

		// Add to container
		container.appendChild(backdropElement);
		container.appendChild(panelElement);
	};

	/**
	 * Closes the panel with animation
	 */
	closePanel = (): void => {
		if (!panelElement || isAnimatingOut) {
			return;
		}

		isAnimatingOut = true;

		// Add exit animations
		if (backdropElement) {
			if (animationStyles.animateFadeIn) {
				backdropElement.classList.remove(animationStyles.animateFadeIn);
			}
			if (animationStyles.animateFadeOut) {
				backdropElement.classList.add(animationStyles.animateFadeOut);
			}
		}

		if (animationStyles.animateEnter) {
			panelElement.classList.remove(animationStyles.animateEnter);
		}
		if (animationStyles.animateExit) {
			panelElement.classList.add(animationStyles.animateExit);
		}

		// Wait for animation to complete
		panelElement.addEventListener(
			'animationend',
			() => {
				if (backdropElement) {
					backdropElement.remove();
					backdropElement = null;
				}
				if (panelElement) {
					panelElement.remove();
					panelElement = null;
				}
				contentContainer = null;
				footerElement = null;
				isAnimatingOut = false;

				// Show floating button
				floatingButton.style.display = '';

				// Update state
				stateManager.setOpen(false);
			},
			{ once: true }
		);
	};

	/**
	 * Updates the panel based on state changes
	 */
	const update = function update(): void {
		const state = stateManager.getState();

		// Position is now handled by the draggable, no need to update classes
		// The draggable will apply inline styles for positioning

		// Handle open/close
		if (state.isOpen && !panelElement && !isAnimatingOut) {
			openPanel();
		} else if (!state.isOpen && panelElement && !isAnimatingOut) {
			closePanel();
		}

		// Update content if panel is open and connected
		if (contentContainer && storeConnector.isConnected()) {
			onRenderContent(contentContainer);
		}
	};

	// Subscribe to state changes
	const unsubscribeState = stateManager.subscribe(() => {
		update();
	});

	// Subscribe to store changes
	const unsubscribeStore = storeConnector.subscribe(() => {
		updateFooter();
		if (contentContainer) {
			if (storeConnector.isConnected()) {
				onRenderContent(contentContainer);
			} else {
				renderErrorState(contentContainer);
			}
		}
	});
	const unsubscribeDiagnostics = storeConnector.subscribeDiagnostics(() => {
		updateFooter();
		if (contentContainer && !storeConnector.isConnected()) {
			renderErrorState(contentContainer);
		}
	});

	// Add floating button to container
	container.appendChild(floatingButton);

	// Create portal
	removePortal = createPortal(container);

	return {
		destroy: () => {
			unsubscribeState();
			unsubscribeStore();
			unsubscribeDiagnostics();

			if (dropdownMenu) {
				dropdownMenu.destroy();
				dropdownMenu = null;
			}

			if (draggable) {
				draggable.destroy();
				draggable = null;
			}

			if (removePortal) {
				removePortal();
				removePortal = null;
			}
		},
		element: container,
		floatingButton,
		update,
	};
}
