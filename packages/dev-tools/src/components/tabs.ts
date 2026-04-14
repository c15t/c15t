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

const POLICY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  <path d="M9 12h6"></path>
  <path d="M12 9v6"></path>
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

const MORE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <circle cx="12" cy="5" r="1.75"></circle>
  <circle cx="12" cy="12" r="1.75"></circle>
  <circle cx="12" cy="19" r="1.75"></circle>
</svg>`;

interface TabConfig {
	id: DevToolsTab;
	label: string;
	icon: string;
}

const TABS: TabConfig[] = [
	{ id: 'location', label: 'Location', icon: LOCATION_ICON },
	{ id: 'policy', label: 'Policy', icon: POLICY_ICON },
	{ id: 'consents', label: 'Consents', icon: CONSENTS_ICON },
	{ id: 'scripts', label: 'Scripts', icon: SCRIPTS_ICON },
	{ id: 'iab', label: 'IAB', icon: IAB_ICON },
	{ id: 'actions', label: 'Actions', icon: ACTIONS_ICON },
	{ id: 'events', label: 'Events', icon: EVENTS_ICON },
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
	let isOverflowMenuOpen = false;
	let visibleTabIds: DevToolsTab[] = [];
	let hiddenTabIds: DevToolsTab[] = [];

	const tabButtons: Map<DevToolsTab, HTMLButtonElement> = new Map();
	const overflowButtons: Map<DevToolsTab, HTMLButtonElement> = new Map();

	// Create tab list wrapper
	const tabList = div({
		className: tabStyles.tabList,
	});

	// Main tabs strip
	const tabStrip = div({
		className: tabStyles.tabStrip,
		role: 'tablist',
		ariaLabel: 'DevTools tabs',
	});
	tabList.appendChild(tabStrip);

	// Overflow menu for quick tab access
	const overflowMenu = div({
		className: tabStyles.overflowMenu,
		role: 'menu',
		ariaLabel: 'All tabs',
	});
	overflowMenu.dataset.state = 'closed';

	const overflowButton = button({
		className: tabStyles.overflowButton,
		ariaLabel: 'More tabs',
		ariaExpanded: 'false',
		onClick: () => toggleOverflowMenu(),
		onKeyDown: (e: KeyboardEvent) => {
			if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				openOverflowMenu();
				focusFirstEnabledOverflowItem();
			}
		},
	});
	overflowButton.setAttribute('aria-haspopup', 'menu');
	const overflowIcon = div({ className: tabStyles.overflowButtonIcon });
	overflowIcon.appendChild(
		createSvgElement(MORE_ICON, { width: 14, height: 14 })
	);
	overflowButton.appendChild(overflowIcon);

	const overflowContainer = div({
		className: tabStyles.overflowContainer,
		children: [overflowButton, overflowMenu],
	});
	tabList.appendChild(overflowContainer);

	// Create tab buttons + overflow items
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
					closeOverflowMenu();
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
		tabStrip.appendChild(tabButton);

		const overflowItem = button({
			className: `${tabStyles.overflowItem} ${isActive ? tabStyles.overflowItemActive : ''} ${isDisabled ? tabStyles.overflowItemDisabled : ''}`,
			role: 'menuitemradio',
			ariaChecked: isActive ? 'true' : 'false',
			disabled: isDisabled,
			onClick: () => {
				if (!isDisabled) {
					setActiveTab(tab.id);
					onTabChange(tab.id);
					closeOverflowMenu();
					tabButtons.get(tab.id)?.focus();
				}
			},
			onKeyDown: (e: KeyboardEvent) => handleOverflowKeyDown(e, tab.id),
		});

		const overflowItemIcon = div({ className: tabStyles.overflowItemIcon });
		overflowItemIcon.appendChild(
			createSvgElement(tab.icon, { width: 14, height: 14 })
		);
		overflowItem.appendChild(overflowItemIcon);
		overflowItem.appendChild(document.createTextNode(tab.label));

		overflowButtons.set(tab.id, overflowItem);
		overflowMenu.appendChild(overflowItem);
	}

	function applyActiveState(tab: DevToolsTab): void {
		for (const [tabId, tabButton] of tabButtons) {
			const isActive = tabId === tab;
			if (tabStyles.tabActive) {
				tabButton.classList.toggle(tabStyles.tabActive, isActive);
			}
			tabButton.setAttribute('aria-selected', isActive ? 'true' : 'false');
			tabButton.tabIndex = isActive ? 0 : -1;
		}

		for (const [tabId, overflowItem] of overflowButtons) {
			const isActive = tabId === tab;
			if (tabStyles.overflowItemActive) {
				overflowItem.classList.toggle(tabStyles.overflowItemActive, isActive);
			}
			overflowItem.setAttribute('aria-checked', isActive ? 'true' : 'false');
		}
	}

	function updateVisibleTabs(): void {
		const allTabIds = TABS.map((t) => t.id);
		const iabEnabled = !disabledTabs.includes('iab');
		const preferredSecondTab: DevToolsTab = iabEnabled ? 'iab' : 'consents';
		const overflowSecondTab: DevToolsTab = iabEnabled ? 'consents' : 'iab';
		const showOverflowSecondTabInStrip = activeTab === overflowSecondTab;
		const stripSecondTab = showOverflowSecondTabInStrip
			? overflowSecondTab
			: preferredSecondTab;
		const forcedOverflowTab = showOverflowSecondTabInStrip
			? preferredSecondTab
			: overflowSecondTab;
		const layoutTabIds: DevToolsTab[] = [
			'location',
			'policy',
			stripSecondTab,
			'scripts',
			'actions',
			'events',
			forcedOverflowTab,
		];
		const forcedOverflowTabIds = new Set<DevToolsTab>();
		forcedOverflowTabIds.add(forcedOverflowTab);

		// Keep visual order deterministic by mode so IAB/Consents share slot 2.
		for (const [index, tabId] of layoutTabIds.entries()) {
			const tabButton = tabButtons.get(tabId);
			if (tabButton) {
				tabButton.style.order = String(index);
			}
			const overflowItem = overflowButtons.get(tabId);
			if (overflowItem) {
				overflowItem.style.order = String(index);
			}
		}

		// Unhide all tabs first so measurements are accurate.
		for (const tabId of allTabIds) {
			const tabButton = tabButtons.get(tabId);
			if (tabButton && tabStyles.tabHidden) {
				tabButton.classList.remove(tabStyles.tabHidden);
			}
		}

		// Ensure overflow is visible during measurement.
		if (tabStyles.overflowContainerHidden) {
			overflowContainer.classList.remove(tabStyles.overflowContainerHidden);
		}

		const stripGap = Number.parseFloat(getComputedStyle(tabStrip).gap || '0');

		const calculateVisibleTabs = (availableWidth: number): DevToolsTab[] => {
			if (availableWidth <= 0) {
				return [];
			}

			const nextVisible: DevToolsTab[] = [];
			let usedWidth = 0;

			for (const tabId of layoutTabIds) {
				if (forcedOverflowTabIds.has(tabId)) {
					continue;
				}

				const tabButton = tabButtons.get(tabId);
				if (!tabButton) {
					continue;
				}

				const width = tabButton.getBoundingClientRect().width;
				const nextUsed =
					nextVisible.length === 0 ? width : usedWidth + stripGap + width;

				if (nextUsed <= availableWidth) {
					nextVisible.push(tabId);
					usedWidth = nextUsed;
				} else {
					break;
				}
			}

			return nextVisible;
		};

		const measureStripWidth = () => tabStrip.getBoundingClientRect().width;
		const showOverflowContainer = () => {
			if (tabStyles.overflowContainerHidden) {
				overflowContainer.classList.remove(tabStyles.overflowContainerHidden);
			}
		};
		const hideOverflowContainer = () => {
			if (tabStyles.overflowContainerHidden) {
				overflowContainer.classList.add(tabStyles.overflowContainerHidden);
			}
		};

		const measureVisibleWidth = (tabIds: DevToolsTab[]) => {
			let width = 0;
			for (const [index, tabId] of tabIds.entries()) {
				const tabButton = tabButtons.get(tabId);
				if (!tabButton) {
					continue;
				}
				width += tabButton.getBoundingClientRect().width;
				if (index > 0) {
					width += stripGap;
				}
			}
			return width;
		};

		if (forcedOverflowTabIds.size === 0) {
			hideOverflowContainer();
			const visibleWithoutOverflow = calculateVisibleTabs(measureStripWidth());
			if (visibleWithoutOverflow.length === layoutTabIds.length) {
				visibleTabIds = visibleWithoutOverflow;
			} else {
				showOverflowContainer();
				visibleTabIds = calculateVisibleTabs(measureStripWidth());
			}
		} else {
			showOverflowContainer();
			const withOverflow = calculateVisibleTabs(measureStripWidth());
			visibleTabIds = withOverflow.length > 0 ? withOverflow : [activeTab];
		}

		if (
			!visibleTabIds.includes(activeTab) &&
			!disabledTabs.includes(activeTab)
		) {
			if (visibleTabIds.length > 0) {
				visibleTabIds[visibleTabIds.length - 1] = activeTab;
			} else {
				visibleTabIds = [activeTab];
			}
		}

		visibleTabIds = [...new Set(visibleTabIds)];

		const maxStripWidth = measureStripWidth();
		while (
			visibleTabIds.length > 1 &&
			measureVisibleWidth(visibleTabIds) > maxStripWidth + 0.5
		) {
			let removeIndex = visibleTabIds.length - 1;
			if (visibleTabIds[removeIndex] === activeTab) {
				removeIndex = Math.max(0, removeIndex - 1);
			}
			visibleTabIds.splice(removeIndex, 1);
		}

		hiddenTabIds = layoutTabIds.filter(
			(tabId) =>
				!visibleTabIds.includes(tabId) ||
				(forcedOverflowTabIds.has(tabId) && tabId !== activeTab)
		);

		for (const tabId of allTabIds) {
			const tabButton = tabButtons.get(tabId);
			if (!tabButton) {
				continue;
			}
			if (tabStyles.tabHidden) {
				tabButton.classList.toggle(
					tabStyles.tabHidden,
					hiddenTabIds.includes(tabId)
				);
			}
		}

		for (const tabId of allTabIds) {
			const overflowItem = overflowButtons.get(tabId);
			if (!overflowItem) {
				continue;
			}
			if (tabStyles.overflowItemHidden) {
				overflowItem.classList.toggle(
					tabStyles.overflowItemHidden,
					!hiddenTabIds.includes(tabId)
				);
			}
		}

		if (tabStyles.overflowContainerHidden) {
			overflowContainer.classList.toggle(
				tabStyles.overflowContainerHidden,
				hiddenTabIds.length === 0
			);
		}

		if (hiddenTabIds.length === 0) {
			closeOverflowMenu();
		}
	}

	function focusFirstEnabledOverflowItem(): void {
		const firstEnabled = hiddenTabIds.find(
			(tabId) => !disabledTabs.includes(tabId)
		);
		if (firstEnabled) {
			overflowButtons.get(firstEnabled)?.focus();
		}
	}

	function openOverflowMenu(): void {
		if (isOverflowMenuOpen || hiddenTabIds.length === 0) {
			return;
		}

		isOverflowMenuOpen = true;
		overflowMenu.dataset.state = 'open';
		overflowButton.setAttribute('aria-expanded', 'true');
		document.addEventListener('click', handleOutsideClick);
		document.addEventListener('keydown', handleEscapeKey);
	}

	function closeOverflowMenu(): void {
		if (!isOverflowMenuOpen) {
			return;
		}

		isOverflowMenuOpen = false;
		overflowMenu.dataset.state = 'closed';
		overflowButton.setAttribute('aria-expanded', 'false');
		document.removeEventListener('click', handleOutsideClick);
		document.removeEventListener('keydown', handleEscapeKey);
	}

	function toggleOverflowMenu(): void {
		if (isOverflowMenuOpen) {
			closeOverflowMenu();
		} else {
			openOverflowMenu();
		}
	}

	function handleOutsideClick(e: MouseEvent): void {
		if (!overflowContainer.contains(e.target as Node)) {
			closeOverflowMenu();
		}
	}

	function handleEscapeKey(e: KeyboardEvent): void {
		if (e.key === 'Escape') {
			closeOverflowMenu();
		}
	}

	/**
	 * Handle keyboard navigation (skips disabled tabs)
	 */
	function handleKeyDown(e: KeyboardEvent, currentTab: DevToolsTab): void {
		const enabledTabIds = visibleTabIds.filter(
			(tabId) => !disabledTabs.includes(tabId)
		);
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

	function handleOverflowKeyDown(
		e: KeyboardEvent,
		currentTab: DevToolsTab
	): void {
		const enabledTabIds = hiddenTabIds.filter(
			(tabId) => !disabledTabs.includes(tabId)
		);
		const currentIndex = enabledTabIds.indexOf(currentTab);

		if (e.key === 'Escape') {
			e.preventDefault();
			closeOverflowMenu();
			overflowButton.focus();
			return;
		}

		let newIndex = currentIndex;
		switch (e.key) {
			case 'ArrowDown':
				newIndex = (currentIndex + 1) % enabledTabIds.length;
				break;
			case 'ArrowUp':
				newIndex =
					currentIndex > 0 ? currentIndex - 1 : enabledTabIds.length - 1;
				break;
			default:
				return;
		}

		e.preventDefault();
		const newTab = enabledTabIds[newIndex];
		if (newTab) {
			overflowButtons.get(newTab)?.focus();
		}
	}

	/**
	 * Updates the active tab visually
	 */
	function setActiveTab(tab: DevToolsTab): void {
		activeTab = tab;
		applyActiveState(tab);
		updateVisibleTabs();
	}

	const handleWindowResize = () => {
		updateVisibleTabs();
	};

	let resizeObserver: ResizeObserver | null = null;
	if (typeof ResizeObserver !== 'undefined') {
		resizeObserver = new ResizeObserver(() => {
			updateVisibleTabs();
		});
		resizeObserver.observe(tabList);
	} else {
		window.addEventListener('resize', handleWindowResize);
	}

	// Set initial active state before tab measurements are available.
	applyActiveState(activeTab);
	requestAnimationFrame(() => {
		updateVisibleTabs();
	});

	return {
		element: tabList,

		setActiveTab,

		destroy: () => {
			closeOverflowMenu();
			if (resizeObserver) {
				resizeObserver.disconnect();
				resizeObserver = null;
			} else {
				window.removeEventListener('resize', handleWindowResize);
			}
			tabButtons.clear();
			overflowButtons.clear();
		},
	};
}
