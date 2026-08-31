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
	{ icon: LOCATION_ICON, id: 'location', label: 'Location' },
	{ icon: POLICY_ICON, id: 'policy', label: 'Policy' },
	{ icon: CONSENTS_ICON, id: 'consents', label: 'Consents' },
	{ icon: SCRIPTS_ICON, id: 'scripts', label: 'Scripts' },
	{ icon: IAB_ICON, id: 'iab', label: 'IAB' },
	{ icon: ACTIONS_ICON, id: 'actions', label: 'Actions' },
	{ icon: EVENTS_ICON, id: 'events', label: 'Events' },
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
export const createTabs = function createTabs(
	options: TabsOptions
): TabsInstance {
	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let setActiveTab: (tab: DevToolsTab) => void;

	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let handleOverflowKeyDown: (
		e: KeyboardEvent,
		currentTab: DevToolsTab
	) => void;

	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let handleKeyDown: (e: KeyboardEvent, currentTab: DevToolsTab) => void;

	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let handleEscapeKey: (e: KeyboardEvent) => void;

	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let handleOutsideClick: (e: MouseEvent) => void;

	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let toggleOverflowMenu: () => void;

	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let closeOverflowMenu: () => void;

	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let openOverflowMenu: () => void;

	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let focusFirstEnabledOverflowItem: () => void;

	const { onTabChange, disabledTabs = [] } = options;
	let { activeTab } = options;
	let isOverflowMenuOpen = false;
	let visibleTabIds: DevToolsTab[] = [];
	let hiddenTabIds: DevToolsTab[] = [];

	const tabButtons = new Map<DevToolsTab, HTMLButtonElement>();
	const overflowButtons = new Map<DevToolsTab, HTMLButtonElement>();

	const createTabClickHandler =
		(tabId: DevToolsTab, isDisabled: boolean) => () => {
			if (!isDisabled) {
				closeOverflowMenu();
				setActiveTab(tabId);
				onTabChange(tabId);
			}
		};

	const createTabKeyDownHandler =
		(tabId: DevToolsTab) => (e: KeyboardEvent) => {
			handleKeyDown(e, tabId);
		};

	const createOverflowClickHandler =
		(tabId: DevToolsTab, isDisabled: boolean) => () => {
			if (!isDisabled) {
				setActiveTab(tabId);
				onTabChange(tabId);
				closeOverflowMenu();
				tabButtons.get(tabId)?.focus();
			}
		};

	const createOverflowKeyDownHandler =
		(tabId: DevToolsTab) => (e: KeyboardEvent) => {
			handleOverflowKeyDown(e, tabId);
		};

	// Create tab list wrapper
	const tabList = div({
		className: tabStyles.tabList,
	});

	// Main tabs strip
	const tabStrip = div({
		ariaLabel: 'DevTools tabs',
		className: tabStyles.tabStrip,
		role: 'tablist',
	});
	tabList.appendChild(tabStrip);

	// Overflow menu for quick tab access
	const overflowMenu = div({
		ariaLabel: 'All tabs',
		className: tabStyles.overflowMenu,
		role: 'menu',
	});
	overflowMenu.dataset.state = 'closed';

	const overflowButton = button({
		ariaExpanded: 'false',
		ariaLabel: 'More tabs',
		className: tabStyles.overflowButton,
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
		createSvgElement(MORE_ICON, { height: 14, width: 14 })
	);
	overflowButton.appendChild(overflowIcon);

	const overflowContainer = div({
		children: [overflowButton, overflowMenu],
		className: tabStyles.overflowContainer,
	});
	tabList.appendChild(overflowContainer);

	// Create tab buttons + overflow items
	for (const tab of TABS) {
		const tabId = tab.id;
		const tabIcon = tab.icon;
		const tabLabel = tab.label;
		const isActive = tabId === activeTab;
		const isDisabled = disabledTabs.includes(tabId);

		const tabButton = button({
			ariaControls: `panel-${tabId}`,
			ariaDisabled: isDisabled ? 'true' : undefined,
			ariaSelected: isActive ? 'true' : 'false',
			className: `${tabStyles.tab} ${isActive ? tabStyles.tabActive : ''} ${isDisabled ? tabStyles.tabDisabled : ''}`,
			disabled: isDisabled,
			onClick: createTabClickHandler(tabId, isDisabled),
			onKeyDown: createTabKeyDownHandler(tabId),
			role: 'tab',
			tabIndex: isActive ? 0 : -1,
		});

		// Add icon
		const iconWrapper = div({ className: tabStyles.tabIcon });
		iconWrapper.appendChild(
			createSvgElement(tabIcon, { height: 14, width: 14 })
		);
		tabButton.appendChild(iconWrapper);

		// Add label
		tabButton.appendChild(document.createTextNode(tabLabel));

		tabButtons.set(tabId, tabButton);
		tabStrip.appendChild(tabButton);

		const overflowItem = button({
			ariaChecked: isActive ? 'true' : 'false',
			className: `${tabStyles.overflowItem} ${isActive ? tabStyles.overflowItemActive : ''} ${isDisabled ? tabStyles.overflowItemDisabled : ''}`,
			disabled: isDisabled,
			onClick: createOverflowClickHandler(tabId, isDisabled),
			onKeyDown: createOverflowKeyDownHandler(tabId),
			role: 'menuitemradio',
		});

		const overflowItemIcon = div({ className: tabStyles.overflowItemIcon });
		overflowItemIcon.appendChild(
			createSvgElement(tabIcon, { height: 14, width: 14 })
		);
		overflowItem.appendChild(overflowItemIcon);
		overflowItem.appendChild(document.createTextNode(tabLabel));

		overflowButtons.set(tabId, overflowItem);
		overflowMenu.appendChild(overflowItem);
	}

	const applyActiveState = function applyActiveState(tab: DevToolsTab): void {
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
	};

	// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
	const updateVisibleTabs = function updateVisibleTabs(): void {
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

				const { width } = tabButton.getBoundingClientRect();
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
	};

	focusFirstEnabledOverflowItem = (): void => {
		const firstEnabled = hiddenTabIds.find(
			(tabId) => !disabledTabs.includes(tabId)
		);
		if (firstEnabled) {
			overflowButtons.get(firstEnabled)?.focus();
		}
	};

	openOverflowMenu = (): void => {
		if (isOverflowMenuOpen || hiddenTabIds.length === 0) {
			return;
		}

		isOverflowMenuOpen = true;
		overflowMenu.dataset.state = 'open';
		overflowButton.setAttribute('aria-expanded', 'true');
		document.addEventListener('click', handleOutsideClick);
		document.addEventListener('keydown', handleEscapeKey);
	};

	closeOverflowMenu = (): void => {
		if (!isOverflowMenuOpen) {
			return;
		}

		isOverflowMenuOpen = false;
		overflowMenu.dataset.state = 'closed';
		overflowButton.setAttribute('aria-expanded', 'false');
		document.removeEventListener('click', handleOutsideClick);
		document.removeEventListener('keydown', handleEscapeKey);
	};

	toggleOverflowMenu = (): void => {
		if (isOverflowMenuOpen) {
			closeOverflowMenu();
		} else {
			openOverflowMenu();
		}
	};

	handleOutsideClick = (e: MouseEvent): void => {
		if (!overflowContainer.contains(e.target as Node)) {
			closeOverflowMenu();
		}
	};

	handleEscapeKey = (e: KeyboardEvent): void => {
		if (e.key === 'Escape') {
			closeOverflowMenu();
		}
	};

	/**
	 * Handle keyboard navigation (skips disabled tabs)
	 */
	handleKeyDown = (e: KeyboardEvent, currentTab: DevToolsTab): void => {
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
	};

	handleOverflowKeyDown = (e: KeyboardEvent, currentTab: DevToolsTab): void => {
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
	};

	/**
	 * Updates the active tab visually
	 */
	setActiveTab = (tab: DevToolsTab): void => {
		activeTab = tab;
		applyActiveState(tab);
		updateVisibleTabs();
	};

	const handleWindowResize = () => {
		updateVisibleTabs();
	};

	let resizeObserver: ResizeObserver | null = null;
	if (typeof ResizeObserver === 'undefined') {
		window.addEventListener('resize', handleWindowResize);
	} else {
		resizeObserver = new ResizeObserver(() => {
			updateVisibleTabs();
		});
		resizeObserver.observe(tabList);
	}

	// Set initial active state before tab measurements are available.
	applyActiveState(activeTab);
	requestAnimationFrame(() => {
		updateVisibleTabs();
	});

	return {
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

		element: tabList,

		setActiveTab,
	};
};
