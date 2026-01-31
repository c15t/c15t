/**
 * Tabs Component
 * Tab navigation with accessible keyboard support
 */

import { button, createSvgElement, div } from '../core/renderer';
import type { DevToolsTab } from '../core/state-manager';
import tabStyles from '../styles/tabs.module.css';

// Tab icons
const CONSENTS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
</svg>`;

const LOCATION_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"></circle>
  <line x1="2" y1="12" x2="22" y2="12"></line>
  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
</svg>`;

const SCRIPTS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="16 18 22 12 16 6"></polyline>
  <polyline points="8 6 2 12 8 18"></polyline>
</svg>`;

const ACTIONS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
  <circle cx="12" cy="12" r="3"></circle>
</svg>`;

const IAB_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  <path d="m9 12 2 2 4-4"></path>
</svg>`;

const EVENTS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 20h9"></path>
  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
</svg>`;

interface TabConfig {
	id: DevToolsTab;
	label: string;
	icon: string;
}

const TABS: TabConfig[] = [
	{ id: 'location', label: 'Location', icon: LOCATION_ICON },
	{ id: 'consents', label: 'Consents', icon: CONSENTS_ICON },
	{ id: 'scripts', label: 'Scripts', icon: SCRIPTS_ICON },
	{ id: 'iab', label: 'IAB', icon: IAB_ICON },
	{ id: 'events', label: 'Events', icon: EVENTS_ICON },
	{ id: 'actions', label: 'Actions', icon: ACTIONS_ICON },
];

export interface TabsOptions {
	activeTab: DevToolsTab;
	onTabChange: (tab: DevToolsTab) => void;
	/** Tabs that should be disabled/greyed out */
	disabledTabs?: DevToolsTab[];
}

export interface TabsInstance {
	element: HTMLElement;
	setActiveTab: (tab: DevToolsTab) => void;
	destroy: () => void;
}

/**
 * Creates a tabs component
 */
export function createTabs(options: TabsOptions): TabsInstance {
	const { onTabChange, disabledTabs = [] } = options;
	let activeTab = options.activeTab;

	const tabButtons: Map<DevToolsTab, HTMLButtonElement> = new Map();

	// Create tab list
	const tabList = div({
		className: tabStyles.tabList,
		role: 'tablist',
		ariaLabel: 'DevTools tabs',
	});

	// Create tab buttons
	for (const tab of TABS) {
		const isActive = tab.id === activeTab;
		const isDisabled = disabledTabs.includes(tab.id);

		const tabButton = button({
			className: `${tabStyles.tab} ${isActive ? tabStyles.tabActive : ''} ${isDisabled ? tabStyles.tabDisabled : ''}`,
			role: 'tab',
			ariaSelected: isActive ? 'true' : 'false',
			ariaControls: `panel-${tab.id}`,
			ariaDisabled: isDisabled ? 'true' : undefined,
			tabIndex: isActive ? 0 : -1,
			disabled: isDisabled,
			onClick: () => {
				if (!isDisabled) {
					setActiveTab(tab.id);
					onTabChange(tab.id);
				}
			},
			onKeyDown: (e: KeyboardEvent) => handleKeyDown(e, tab.id),
		});

		// Add icon
		const iconWrapper = div({ className: tabStyles.tabIcon });
		iconWrapper.appendChild(
			createSvgElement(tab.icon, { width: 14, height: 14 })
		);
		tabButton.appendChild(iconWrapper);

		// Add label
		tabButton.appendChild(document.createTextNode(tab.label));

		tabButtons.set(tab.id, tabButton);
		tabList.appendChild(tabButton);
	}

	/**
	 * Handle keyboard navigation (skips disabled tabs)
	 */
	function handleKeyDown(e: KeyboardEvent, currentTab: DevToolsTab): void {
		const tabIds = TABS.map((t) => t.id);
		const enabledTabIds = tabIds.filter((id) => !disabledTabs.includes(id));
		const currentIndex = enabledTabIds.indexOf(currentTab);
		let newIndex = currentIndex;

		switch (e.key) {
			case 'ArrowLeft':
				newIndex =
					currentIndex > 0 ? currentIndex - 1 : enabledTabIds.length - 1;
				break;
			case 'ArrowRight':
				newIndex =
					currentIndex < enabledTabIds.length - 1 ? currentIndex + 1 : 0;
				break;
			case 'Home':
				newIndex = 0;
				break;
			case 'End':
				newIndex = enabledTabIds.length - 1;
				break;
			default:
				return;
		}

		e.preventDefault();
		const newTab = enabledTabIds[newIndex];
		if (newTab) {
			setActiveTab(newTab);
			onTabChange(newTab);
			tabButtons.get(newTab)?.focus();
		}
	}

	/**
	 * Updates the active tab visually
	 */
	function setActiveTab(tab: DevToolsTab): void {
		activeTab = tab;

		for (const [tabId, tabButton] of tabButtons) {
			const isActive = tabId === tab;
			if (tabStyles.tabActive) {
				tabButton.classList.toggle(tabStyles.tabActive, isActive);
			}
			tabButton.setAttribute('aria-selected', isActive ? 'true' : 'false');
			tabButton.tabIndex = isActive ? 0 : -1;
		}
	}

	return {
		element: tabList,

		setActiveTab,

		destroy: () => {
			tabButtons.clear();
		},
	};
}
