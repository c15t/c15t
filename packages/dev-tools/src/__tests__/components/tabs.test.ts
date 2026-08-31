import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTabs } from '../../components/tabs';

import tabStyles from '../../styles/tabs.module.css';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const _createDeferredPromise = function _createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

const createVoidDeferredPromise = function createVoidDeferredPromise(
	run: (
		resolve: () => void,
		reject: DeferredPromise<undefined>['reject']
	) => void
): Promise<void> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<undefined>();
	run(() => deferred.resolve(undefined), deferred.reject);
	return deferred.promise;
};

const createRect = function createRect(width: number, height = 32): DOMRect {
	return {
		bottom: height,
		height,
		left: 0,
		right: width,
		toJSON: () => ({}),
		top: 0,
		width,
		x: 0,
		y: 0,
	} as DOMRect;
};

const getTab = function getTab(
	root: HTMLElement,
	label: string
): HTMLButtonElement {
	const tab = [
		...root.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
	].find((element) => element.textContent?.includes(label));
	if (!tab) {
		throw new Error(`Missing tab: ${label}`);
	}
	return tab;
};

const getOverflowItem = function getOverflowItem(
	root: HTMLElement,
	label: string
): HTMLButtonElement {
	const item = [
		...root.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'),
	].find((element) => element.textContent?.includes(label));
	if (!item) {
		throw new Error(`Missing overflow item: ${label}`);
	}
	return item;
};

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
			disabledTabs: [],
			onTabChange: vi.fn(),
		});
		document.body.appendChild(tabs.element);
		await createVoidDeferredPromise((resolve) => {
			requestAnimationFrame(() => resolve());
		});

		const consentsTab = getTab(tabs.element, 'Consents');
		const iabTab = getTab(tabs.element, 'IAB');
		const iabOverflowItem = getOverflowItem(tabs.element, 'IAB');

		expect(consentsTab.getAttribute('aria-selected')).toBe('true');
		expect(consentsTab.tabIndex).toBe(0);
		expect(consentsTab.style.order).toBe('2');
		expect(consentsTab.classList.contains(tabStyles.tabHidden)).toBe(false);

		expect(iabTab.style.order).toBe('6');
		expect(iabTab.classList.contains(tabStyles.tabHidden)).toBe(true);
		expect(
			iabOverflowItem.classList.contains(tabStyles.overflowItemHidden)
		).toBe(false);
	});

	it('keeps active IAB in strip and sends Consents to overflow by default', async () => {
		const tabs = createTabs({
			activeTab: 'iab',
			disabledTabs: [],
			onTabChange: vi.fn(),
		});
		document.body.appendChild(tabs.element);
		await createVoidDeferredPromise((resolve) => {
			requestAnimationFrame(() => resolve());
		});

		const consentsTab = getTab(tabs.element, 'Consents');
		const iabTab = getTab(tabs.element, 'IAB');
		const consentsOverflowItem = getOverflowItem(tabs.element, 'Consents');

		expect(iabTab.getAttribute('aria-selected')).toBe('true');
		expect(iabTab.tabIndex).toBe(0);
		expect(iabTab.style.order).toBe('2');
		expect(iabTab.classList.contains(tabStyles.tabHidden)).toBe(false);

		expect(consentsTab.style.order).toBe('6');
		expect(consentsTab.classList.contains(tabStyles.tabHidden)).toBe(true);
		expect(
			consentsOverflowItem.classList.contains(tabStyles.overflowItemHidden)
		).toBe(false);
	});

	it('supports arrow key navigation across visible tabs', async () => {
		const onTabChange = vi.fn();
		const tabs = createTabs({
			activeTab: 'location',
			disabledTabs: ['iab'],
			onTabChange,
		});
		document.body.appendChild(tabs.element);
		await createVoidDeferredPromise((resolve) => {
			requestAnimationFrame(() => resolve());
		});

		const locationTab = getTab(tabs.element, 'Location');
		locationTab.dispatchEvent(
			new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' })
		);

		expect(onTabChange).toHaveBeenCalledWith('policy');
		expect(getTab(tabs.element, 'Policy').getAttribute('aria-selected')).toBe(
			'true'
		);
	});

	it('opens overflow menu with keyboard and focuses first enabled hidden tab', async () => {
		const tabs = createTabs({
			activeTab: 'location',
			disabledTabs: [],
			onTabChange: vi.fn(),
		});
		document.body.appendChild(tabs.element);
		await createVoidDeferredPromise((resolve) => {
			requestAnimationFrame(() => resolve());
		});

		const overflowButton = tabs.element.querySelector<HTMLButtonElement>(
			'button[aria-label="More tabs"]'
		);
		if (!overflowButton) {
			throw new Error('Missing overflow button');
		}
		overflowButton.dispatchEvent(
			new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' })
		);

		const hiddenItems = [
			...tabs.element.querySelectorAll<HTMLButtonElement>(
				'[role="menuitemradio"]'
			),
		].filter((item) => !item.classList.contains(tabStyles.overflowItemHidden));

		expect(overflowButton.getAttribute('aria-expanded')).toBe('true');
		expect(hiddenItems.length).toBeGreaterThan(0);
		expect(hiddenItems).toContain(document.activeElement as HTMLButtonElement);
		const orderedHiddenItems = [...hiddenItems].sort(
			(a, b) => Number(a.style.order) - Number(b.style.order)
		);
		expect(document.activeElement).toBe(orderedHiddenItems[0]);
	});
});
