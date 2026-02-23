import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTabs } from '../../components/tabs';
import tabStyles from '../../styles/tabs.module.css';

function createRect(width: number, height = 32): DOMRect {
	return {
		x: 0,
		y: 0,
		width,
		height,
		top: 0,
		left: 0,
		right: width,
		bottom: height,
		toJSON: () => ({}),
	} as DOMRect;
}

function getTab(root: HTMLElement, label: string): HTMLButtonElement {
	const tab = [
		...root.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
	].find((element) => element.textContent?.includes(label));
	if (!tab) {
		throw new Error(`Missing tab: ${label}`);
	}
	return tab;
}

function getOverflowItem(root: HTMLElement, label: string): HTMLButtonElement {
	const item = [
		...root.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'),
	].find((element) => element.textContent?.includes(label));
	if (!item) {
		throw new Error(`Missing overflow item: ${label}`);
	}
	return item;
}

describe('tabs component', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
			function getBoundingClientRect(): DOMRect {
				const role = this.getAttribute('role');
				if (role === 'tablist') {
					return createRect(420);
				}
				if (role === 'tab') {
					return createRect(78);
				}
				return createRect(40);
			}
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('keeps active consents visible in strip when IAB mode is enabled', async () => {
		const tabs = createTabs({
			activeTab: 'consents',
			onTabChange: vi.fn(),
			disabledTabs: [],
		});
		document.body.appendChild(tabs.element);
		await new Promise<void>((resolve) => {
			requestAnimationFrame(() => resolve());
		});

		const consentsTab = getTab(tabs.element, 'Consents');
		const iabTab = getTab(tabs.element, 'IAB');
		const iabOverflowItem = getOverflowItem(tabs.element, 'IAB');

		expect(consentsTab.getAttribute('aria-selected')).toBe('true');
		expect(consentsTab.tabIndex).toBe(0);
		expect(consentsTab.style.order).toBe('1');
		expect(consentsTab.classList.contains(tabStyles.tabHidden)).toBe(false);

		expect(iabTab.style.order).toBe('5');
		expect(iabTab.classList.contains(tabStyles.tabHidden)).toBe(true);
		expect(
			iabOverflowItem.classList.contains(tabStyles.overflowItemHidden)
		).toBe(false);
	});

	it('keeps active IAB in strip and sends Consents to overflow by default', async () => {
		const tabs = createTabs({
			activeTab: 'iab',
			onTabChange: vi.fn(),
			disabledTabs: [],
		});
		document.body.appendChild(tabs.element);
		await new Promise<void>((resolve) => {
			requestAnimationFrame(() => resolve());
		});

		const consentsTab = getTab(tabs.element, 'Consents');
		const iabTab = getTab(tabs.element, 'IAB');
		const consentsOverflowItem = getOverflowItem(tabs.element, 'Consents');

		expect(iabTab.getAttribute('aria-selected')).toBe('true');
		expect(iabTab.tabIndex).toBe(0);
		expect(iabTab.style.order).toBe('1');
		expect(iabTab.classList.contains(tabStyles.tabHidden)).toBe(false);

		expect(consentsTab.style.order).toBe('5');
		expect(consentsTab.classList.contains(tabStyles.tabHidden)).toBe(true);
		expect(
			consentsOverflowItem.classList.contains(tabStyles.overflowItemHidden)
		).toBe(false);
	});

	it('supports arrow key navigation across visible tabs', async () => {
		const onTabChange = vi.fn();
		const tabs = createTabs({
			activeTab: 'location',
			onTabChange,
			disabledTabs: ['iab'],
		});
		document.body.appendChild(tabs.element);
		await new Promise<void>((resolve) => {
			requestAnimationFrame(() => resolve());
		});

		const locationTab = getTab(tabs.element, 'Location');
		locationTab.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
		);

		expect(onTabChange).toHaveBeenCalledWith('consents');
		expect(getTab(tabs.element, 'Consents').getAttribute('aria-selected')).toBe(
			'true'
		);
	});

	it('opens overflow menu with keyboard and focuses first enabled hidden tab', async () => {
		const tabs = createTabs({
			activeTab: 'location',
			onTabChange: vi.fn(),
			disabledTabs: [],
		});
		document.body.appendChild(tabs.element);
		await new Promise<void>((resolve) => {
			requestAnimationFrame(() => resolve());
		});

		const overflowButton = tabs.element.querySelector<HTMLButtonElement>(
			'button[aria-label="More tabs"]'
		);
		if (!overflowButton) {
			throw new Error('Missing overflow button');
		}
		overflowButton.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
		);

		const hiddenItems = [
			...tabs.element.querySelectorAll<HTMLButtonElement>(
				'[role="menuitemradio"]'
			),
		].filter((item) => !item.classList.contains(tabStyles.overflowItemHidden));

		expect(overflowButton.getAttribute('aria-expanded')).toBe('true');
		expect(hiddenItems.length).toBeGreaterThan(0);
		expect(document.activeElement).toBe(hiddenItems[0]);
	});
});
