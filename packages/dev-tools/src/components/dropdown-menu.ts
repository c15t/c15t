/**
 * Dropdown Menu Component
 * Shows a menu when clicking the floating button with options for DevTools and Preferences
 */

import { button, createSvgElement, div, span } from '../core/renderer';
import panelStyles from '../styles/panel.module.css';

// Icons - matches C15TIconOnly from @c15t/react
const DEVTOOLS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 446 445" aria-label="c15t">
  <path fill="currentColor" d="M223.178.313c39.064 0 70.732 31.668 70.732 70.732-.001 39.064-31.668 70.731-70.732 70.731-12.181 0-23.642-3.079-33.649-8.502l-55.689 55.689a70.267 70.267 0 0 1 5.574 13.441h167.531c8.695-29.217 35.762-50.523 67.804-50.523 39.064 0 70.731 31.668 70.731 70.732s-31.668 70.732-70.731 70.732c-32.042 0-59.108-21.306-67.803-50.523H139.413a70.417 70.417 0 0 1-7.888 17.396l54.046 54.046c10.893-6.851 23.786-10.815 37.605-10.815 39.064 0 70.732 31.669 70.732 70.733 0 39.064-31.668 70.731-70.732 70.731s-70.732-31.667-70.732-70.731c0-10.518 2.296-20.499 6.414-29.471l-57.78-57.78c-8.972 4.117-18.952 6.414-29.47 6.414-39.063 0-70.731-31.668-70.732-70.732 0-39.064 31.669-70.732 70.733-70.732 12.18 0 23.642 3.079 33.649 8.502l55.688-55.688c-5.423-10.007-8.502-21.469-8.502-33.65 0-39.064 31.668-70.733 70.732-70.733Zm0 343.555c-16.742 0-30.314 13.572-30.314 30.314 0 16.741 13.572 30.313 30.314 30.313s30.314-13.572 30.314-30.313c0-16.742-13.572-30.314-30.314-30.314ZM71.611 192.299c-16.742 0-30.315 13.572-30.315 30.314s13.573 30.314 30.315 30.314c16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314Zm303.138 0c-16.729 0-30.294 13.551-30.315 30.275l.001.039-.001.038c.021 16.725 13.586 30.276 30.315 30.276 16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314ZM223.178 40.73c-16.742 0-30.314 13.573-30.314 30.315s13.573 30.313 30.314 30.313c16.742 0 30.313-13.572 30.314-30.313 0-16.742-13.572-30.314-30.314-30.315Z"/>
</svg>`;

const PREFERENCES_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>`;

const EYE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>`;

export type CornerPosition =
	| 'bottom-right'
	| 'bottom-left'
	| 'top-right'
	| 'top-left';

export interface MenuItem {
	id: string;
	label: string;
	description?: string;
	icon?: string;
	/** Type of menu item - 'action' triggers onClick, 'toggle' shows a switch */
	type?: 'action' | 'toggle';
	/** For toggle items: whether the toggle is checked */
	checked?: boolean;
	onClick: () => void;
}

export interface DropdownMenuOptions {
	items: MenuItem[];
	position: CornerPosition;
	/** Reference element to position the menu relative to */
	referenceElement?: HTMLElement;
	onOpen?: () => void;
	onClose?: () => void;
}

export interface DropdownMenuInstance {
	element: HTMLElement;
	isOpen: () => boolean;
	open: () => void;
	close: () => void;
	toggle: () => void;
	updatePosition: (position: CornerPosition) => void;
	setReferenceElement: (element: HTMLElement) => void;
	/** Update a menu item's checked state */
	updateItemChecked: (itemId: string, checked: boolean) => void;
	destroy: () => void;
}

/**
 * Get menu position class based on corner
 */
function getMenuPositionClass(position: CornerPosition): string {
	switch (position) {
		case 'bottom-left':
			return panelStyles.dropdownMenuBottomLeft ?? '';
		case 'bottom-right':
			return panelStyles.dropdownMenuBottomRight ?? '';
		case 'top-left':
			return panelStyles.dropdownMenuTopLeft ?? '';
		case 'top-right':
			return panelStyles.dropdownMenuTopRight ?? '';
	}
}

/**
 * Creates a dropdown menu
 */
export function createDropdownMenu(
	options: DropdownMenuOptions
): DropdownMenuInstance {
	const { items, onOpen, onClose } = options;
	let isMenuOpen = false;
	let currentPosition = options.position;
	let referenceElement = options.referenceElement;

	// Create menu element
	const menu = div({
		className: `${panelStyles.dropdownMenu ?? ''} ${getMenuPositionClass(currentPosition)}`,
		role: 'menu',
		ariaLabel: 'c15t Options',
	});
	menu.dataset.state = 'closed';

	/**
	 * Position the menu based on reference element
	 */
	function positionMenu(): void {
		if (!referenceElement) {
			return;
		}

		const rect = referenceElement.getBoundingClientRect();
		const menuRect = menu.getBoundingClientRect();
		const gap = 8; // Gap between button and menu

		// Calculate position based on corner
		if (currentPosition.includes('bottom')) {
			// Menu appears above the button
			menu.style.bottom = `${window.innerHeight - rect.top + gap}px`;
			menu.style.top = '';
		} else {
			// Menu appears below the button
			menu.style.top = `${rect.bottom + gap}px`;
			menu.style.bottom = '';
		}

		if (currentPosition.includes('left')) {
			menu.style.left = `${rect.left}px`;
			menu.style.right = '';
		} else {
			menu.style.right = `${window.innerWidth - rect.right}px`;
			menu.style.left = '';
		}
	}

	// Track menu item elements for updates
	const menuItemElements = new Map<
		string,
		{ element: HTMLElement; toggleIndicator?: HTMLElement }
	>();

	// Create menu items
	for (const item of items) {
		const isToggle = item.type === 'toggle';

		const menuItem = button({
			className: panelStyles.menuItem ?? '',
			role: isToggle ? 'menuitemcheckbox' : 'menuitem',
			onClick: () => {
				item.onClick();
				// Don't close on toggle items
				if (!isToggle) {
					close();
				}
			},
		});

		if (isToggle) {
			menuItem.setAttribute('aria-checked', item.checked ? 'true' : 'false');
		}

		if (item.icon) {
			const iconWrapper = div({ className: panelStyles.menuItemIcon ?? '' });
			const iconSvg = createSvgElement(item.icon, { width: 20, height: 20 });
			iconWrapper.appendChild(iconSvg);
			menuItem.appendChild(iconWrapper);
		}

		const labelContainer = div({
			className: panelStyles.menuItemContent ?? '',
		});
		const label = span({
			className: panelStyles.menuItemLabel ?? '',
			text: item.label,
		});
		labelContainer.appendChild(label);

		if (item.description) {
			const description = div({
				className: panelStyles.menuItemDescription ?? '',
				text: item.description,
			});
			labelContainer.appendChild(description);
		}

		menuItem.appendChild(labelContainer);

		// Add toggle indicator for toggle items
		let toggleIndicator: HTMLElement | undefined;
		if (isToggle) {
			toggleIndicator = div({
				className: [
					panelStyles.menuItemToggle ?? '',
					item.checked ? (panelStyles.menuItemToggleChecked ?? '') : '',
				]
					.filter(Boolean)
					.join(' '),
			});
			const toggleTrack = div({
				className: panelStyles.menuItemToggleTrack ?? '',
			});
			const toggleThumb = div({
				className: panelStyles.menuItemToggleThumb ?? '',
			});
			toggleTrack.appendChild(toggleThumb);
			toggleIndicator.appendChild(toggleTrack);
			menuItem.appendChild(toggleIndicator);
		}

		menu.appendChild(menuItem);
		menuItemElements.set(item.id, { element: menuItem, toggleIndicator });
	}

	// Close handler for clicking outside
	function handleClickOutside(e: MouseEvent): void {
		if (!menu.contains(e.target as Node)) {
			close();
		}
	}

	// Escape key handler
	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') {
			close();
		}
	}

	function open(): void {
		if (isMenuOpen) {
			return;
		}
		isMenuOpen = true;

		// Position the menu before showing it
		positionMenu();

		menu.dataset.state = 'open';
		onOpen?.();

		// Add click outside listener after a short delay to avoid immediate close
		setTimeout(() => {
			document.addEventListener('click', handleClickOutside);
			document.addEventListener('keydown', handleKeydown);
		}, 10);
	}

	function close(): void {
		if (!isMenuOpen) {
			return;
		}
		isMenuOpen = false;
		menu.dataset.state = 'closed';
		onClose?.();
		document.removeEventListener('click', handleClickOutside);
		document.removeEventListener('keydown', handleKeydown);
	}

	function toggle(): void {
		if (isMenuOpen) {
			close();
		} else {
			open();
		}
	}

	function updatePosition(position: CornerPosition): void {
		// Remove old position class
		menu.classList.remove(
			panelStyles.dropdownMenuBottomLeft ?? '',
			panelStyles.dropdownMenuBottomRight ?? '',
			panelStyles.dropdownMenuTopLeft ?? '',
			panelStyles.dropdownMenuTopRight ?? ''
		);
		// Add new position class
		menu.classList.add(getMenuPositionClass(position));
		currentPosition = position;

		// Reposition if menu is open
		if (isMenuOpen) {
			positionMenu();
		}
	}

	function setReferenceElement(element: HTMLElement): void {
		referenceElement = element;
	}

	function destroy(): void {
		close();
	}

	function updateItemChecked(itemId: string, checked: boolean): void {
		const itemData = menuItemElements.get(itemId);
		if (!itemData) {
			return;
		}

		const { element, toggleIndicator } = itemData;
		element.setAttribute('aria-checked', checked ? 'true' : 'false');

		if (toggleIndicator) {
			if (checked) {
				toggleIndicator.classList.add(panelStyles.menuItemToggleChecked ?? '');
			} else {
				toggleIndicator.classList.remove(
					panelStyles.menuItemToggleChecked ?? ''
				);
			}
		}
	}

	return {
		element: menu,
		isOpen: () => isMenuOpen,
		open,
		close,
		toggle,
		updatePosition,
		setReferenceElement,
		updateItemChecked,
		destroy,
	};
}

/**
 * Check if PreferenceCenterTrigger exists on the page
 */
export function detectPreferenceCenterTrigger(): boolean {
	// Look for the PreferenceCenterTrigger by checking for elements with data attribute
	// or specific class names that the trigger uses
	const triggers = document.querySelectorAll(
		'[data-c15t-trigger], [aria-label*="privacy settings"]'
	);
	return triggers.length > 0;
}

/**
 * Get the preference center open function if available
 */
export function getPreferenceCenterOpener(): (() => void) | null {
	// Try to find the c15tStore and use it to open the preference center
	const win = window as unknown as Record<string, unknown>;
	const store = win.c15tStore as Record<string, unknown> | undefined;
	if (store && typeof store.getState === 'function') {
		const state = (store.getState as () => Record<string, unknown>)();
		if (typeof state.setIsPrivacyDialogOpen === 'function') {
			return () => {
				(state.setIsPrivacyDialogOpen as (value: boolean) => void)(true);
			};
		}
	}
	return null;
}

// Export icon constants for use in other components
export { DEVTOOLS_ICON, PREFERENCES_ICON, EYE_ICON };
