import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
	getFocusableElements,
	getTextDirection,
	setupFocusTrap,
	setupScrollLock,
	setupTextDirection,
} from '../dom';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

function createDeferredPromise<Value>(
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
}

/** Flushes the trap's deferred (setTimeout 0) focus operations. */
function flushFocusTimers(): Promise<void> {
	return createDeferredPromise((resolve) => setTimeout(resolve, 0));
}

describe('getTextDirection', () => {
	test('returns ltr for undefined language', () => {
		expect(getTextDirection(undefined)).toBe('ltr');
	});

	test('returns ltr for English', () => {
		expect(getTextDirection('en')).toBe('ltr');
		expect(getTextDirection('en-US')).toBe('ltr');
		expect(getTextDirection('en-GB')).toBe('ltr');
	});

	test('returns ltr for common LTR languages', () => {
		expect(getTextDirection('de')).toBe('ltr');
		expect(getTextDirection('fr')).toBe('ltr');
		expect(getTextDirection('es')).toBe('ltr');
		expect(getTextDirection('ja')).toBe('ltr');
		expect(getTextDirection('zh')).toBe('ltr');
	});

	test('returns rtl for Arabic', () => {
		expect(getTextDirection('ar')).toBe('rtl');
		expect(getTextDirection('ar-SA')).toBe('rtl');
	});

	test('returns rtl for Hebrew', () => {
		expect(getTextDirection('he')).toBe('rtl');
		expect(getTextDirection('he-IL')).toBe('rtl');
	});

	test('returns rtl for other RTL languages', () => {
		expect(getTextDirection('fa')).toBe('rtl'); // Farsi/Persian
		expect(getTextDirection('ur')).toBe('rtl'); // Urdu
		expect(getTextDirection('ps')).toBe('rtl'); // Pashto
		expect(getTextDirection('sd')).toBe('rtl'); // Sindhi
		expect(getTextDirection('ku')).toBe('rtl'); // Kurdish
		expect(getTextDirection('dv')).toBe('rtl'); // Divehi
	});

	test('handles case insensitively', () => {
		expect(getTextDirection('AR')).toBe('rtl');
		expect(getTextDirection('Ar-SA')).toBe('rtl');
	});
});

describe('setupTextDirection', () => {
	beforeEach(() => {
		document.body.classList.remove('c15t-rtl');
	});

	afterEach(() => {
		document.body.classList.remove('c15t-rtl');
	});

	test('adds c15t-rtl class for RTL language', () => {
		setupTextDirection('ar');
		expect(document.body.classList.contains('c15t-rtl')).toBe(true);
	});

	test('removes c15t-rtl class for LTR language', () => {
		document.body.classList.add('c15t-rtl');
		setupTextDirection('en');
		expect(document.body.classList.contains('c15t-rtl')).toBe(false);
	});

	test('cleanup function removes c15t-rtl class', () => {
		const cleanup = setupTextDirection('ar');
		expect(document.body.classList.contains('c15t-rtl')).toBe(true);
		cleanup();
		expect(document.body.classList.contains('c15t-rtl')).toBe(false);
	});
});

describe('setupScrollLock', () => {
	const originalOverflow = document.body.style.overflow;
	const originalPaddingRight = document.body.style.paddingRight;

	afterEach(() => {
		document.body.style.overflow = originalOverflow;
		document.body.style.paddingRight = originalPaddingRight;
	});

	test('sets overflow to hidden', () => {
		setupScrollLock();
		expect(document.body.style.overflow).toBe('hidden');
	});

	test('cleanup restores original overflow', () => {
		document.body.style.overflow = 'auto';
		const cleanup = setupScrollLock();
		expect(document.body.style.overflow).toBe('hidden');
		cleanup();
		expect(document.body.style.overflow).toBe('auto');
	});

	test('cleanup restores original paddingRight', () => {
		document.body.style.paddingRight = '10px';
		const cleanup = setupScrollLock();
		cleanup();
		expect(document.body.style.paddingRight).toBe('10px');
	});
});

describe('getFocusableElements', () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	afterEach(() => {
		document.body.removeChild(container);
	});

	test('finds buttons when visible', () => {
		container.innerHTML = '<button>Click me</button>';
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(1);
		expect(elements[0]?.tagName).toBe('BUTTON');
	});

	test('finds links with href when visible', () => {
		container.innerHTML = '<a href="#">Link</a>';
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(1);
		expect(elements[0]?.tagName).toBe('A');
	});

	test('finds inputs when visible', () => {
		container.innerHTML = '<input type="text" />';
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(1);
		expect(elements[0]?.tagName).toBe('INPUT');
	});

	test('excludes disabled elements', () => {
		container.innerHTML = `
			<button id="enabled">Enabled</button>
			<button disabled>Disabled</button>
		`;
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(1);
		expect(elements[0]?.id).toBe('enabled');
	});

	test('excludes elements with tabindex=-1', () => {
		container.innerHTML = `
			<button id="focusable">Focusable</button>
			<button id="not-focusable" tabindex="-1">Not focusable</button>
		`;
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(1);
		expect(elements[0]?.id).toBe('focusable');
	});

	test('excludes tabindex=-1 buttons in roving tabindex pattern (tabs)', () => {
		container.innerHTML = `
			<button id="active-tab" tabindex="0" role="tab">Tab 1</button>
			<button id="inactive-tab-1" tabindex="-1" role="tab">Tab 2</button>
			<button id="inactive-tab-2" tabindex="-1" role="tab">Tab 3</button>
			<div id="panel" tabindex="0" role="tabpanel">Content</div>
		`;
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(2);
		expect(elements[0]?.id).toBe('active-tab');
		expect(elements[1]?.id).toBe('panel');
	});

	test('includes elements with positive tabindex when visible', () => {
		container.innerHTML = '<div tabindex="0">Focusable div</div>';
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(1);
	});

	test('finds multiple focusable elements when visible', () => {
		container.innerHTML = `
			<button>Button 1</button>
			<a href="#">Link</a>
			<input type="text" />
			<select><option>Option</option></select>
			<textarea></textarea>
		`;
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(5);
	});

	test('returns empty array for container with no focusable elements', () => {
		container.innerHTML = '<div>Just text</div><span>More text</span>';
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(0);
	});

	test('excludes elements inside hidden ancestors in the fallback branch', () => {
		container.innerHTML = '<div hidden><button>Hidden button</button></div>';
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(0);
	});

	test('excludes inline display none elements in the fallback branch', () => {
		container.innerHTML =
			'<button style="display: none">Hidden button</button>';
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(0);
	});

	test('does not require layout dimensions in the fallback branch', () => {
		container.innerHTML = '<button>Dimensionless button</button>';
		const button = container.querySelector('button') as HTMLElement;
		expect(button.offsetWidth).toBe(0);
		expect(button.offsetHeight).toBe(0);
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(1);
		expect(elements[0]).toBe(button);
	});
});

describe('setupFocusTrap focus restore', () => {
	let dialog: HTMLDivElement;

	beforeEach(() => {
		dialog = document.createElement('div');
		document.body.appendChild(dialog);
	});

	afterEach(() => {
		document.body.innerHTML = '';
	});

	test('restores focus to the opener when it stays mounted', async () => {
		const trigger = document.createElement('button');
		document.body.appendChild(trigger);
		trigger.focus();

		const cleanup = setupFocusTrap(dialog);
		await flushFocusTimers();
		expect(document.activeElement).toBe(dialog);

		cleanup();
		await flushFocusTimers();
		expect(document.activeElement).toBe(trigger);
	});

	test('does not steal focus already moved inside the trap before initial focus runs', async () => {
		const button = document.createElement('button');
		dialog.appendChild(button);

		setupFocusTrap(dialog);
		button.focus();
		await flushFocusTimers();

		expect(document.activeElement).toBe(button);
	});

	test('restores focus to a re-rendered opener matched by data-testid', async () => {
		const trigger = document.createElement('button');
		trigger.setAttribute('data-testid', 'consent-dialog-trigger');
		document.body.appendChild(trigger);
		trigger.focus();

		const cleanup = setupFocusTrap(dialog);
		await flushFocusTimers();

		// The opener unmounts while the dialog is open (activeUI switches),
		// then re-renders as a brand new node when the dialog closes.
		trigger.remove();
		const remounted = document.createElement('button');
		remounted.setAttribute('data-testid', 'consent-dialog-trigger');
		document.body.appendChild(remounted);

		cleanup();
		await flushFocusTimers();
		expect(document.activeElement).toBe(remounted);
	});

	test('restores focus when the opener unmounts before trap setup runs', async () => {
		const trigger = document.createElement('button');
		trigger.setAttribute('data-testid', 'consent-dialog-trigger');
		document.body.appendChild(trigger);
		trigger.focus();
		trigger.remove();

		const cleanup = setupFocusTrap(dialog);
		await flushFocusTimers();

		const remounted = document.createElement('button');
		remounted.setAttribute('data-testid', 'consent-dialog-trigger');
		document.body.appendChild(remounted);

		cleanup();
		await flushFocusTimers();
		expect(document.activeElement).toBe(remounted);
	});

	test('restores focus to a re-rendered opener matched by id', async () => {
		const trigger = document.createElement('button');
		trigger.id = 'privacy-settings';
		document.body.appendChild(trigger);
		trigger.focus();

		const cleanup = setupFocusTrap(dialog);
		await flushFocusTimers();

		trigger.remove();
		const remounted = document.createElement('button');
		remounted.id = 'privacy-settings';
		document.body.appendChild(remounted);

		cleanup();
		await flushFocusTimers();
		expect(document.activeElement).toBe(remounted);
	});

	test('leaves focus alone when the opener is gone with no equivalent', async () => {
		const trigger = document.createElement('button');
		document.body.appendChild(trigger);
		trigger.focus();

		const cleanup = setupFocusTrap(dialog);
		await flushFocusTimers();

		trigger.remove();
		dialog.remove();
		cleanup();
		await flushFocusTimers();
		expect(document.activeElement).toBe(document.body);
	});
});

describe('setupFocusTrap tab wrapping', () => {
	let dialog: HTMLDivElement;
	let first: HTMLButtonElement;
	let last: HTMLButtonElement;
	let outside: HTMLButtonElement;
	let cleanup: (() => void) | undefined;

	function pressTab(shiftKey = false) {
		document.dispatchEvent(
			new KeyboardEvent('keydown', {
				bubbles: true,
				cancelable: true,
				key: 'Tab',
				shiftKey,
			})
		);
	}

	beforeEach(() => {
		outside = document.createElement('button');
		dialog = document.createElement('div');
		first = document.createElement('button');
		last = document.createElement('button');
		dialog.append(first, last);
		document.body.append(outside, dialog);
	});

	afterEach(() => {
		cleanup?.();
		cleanup = undefined;
		document.body.innerHTML = '';
	});

	test('Shift+Tab from the focused container wraps to the last focusable', async () => {
		cleanup = setupFocusTrap(dialog);
		await flushFocusTimers();
		expect(document.activeElement).toBe(dialog);

		pressTab(true);
		expect(document.activeElement).toBe(last);
	});

	test('Shift+Tab from the first focusable wraps to the last', async () => {
		cleanup = setupFocusTrap(dialog);
		await flushFocusTimers();

		first.focus();
		pressTab(true);
		expect(document.activeElement).toBe(last);
	});

	test('Tab from the last focusable wraps to the first', async () => {
		cleanup = setupFocusTrap(dialog);
		await flushFocusTimers();

		last.focus();
		pressTab();
		expect(document.activeElement).toBe(first);
	});

	test('Tab pulls focus back inside when it escaped the trap', async () => {
		cleanup = setupFocusTrap(dialog);
		await flushFocusTimers();

		outside.focus();
		pressTab();
		expect(document.activeElement).toBe(first);

		outside.focus();
		pressTab(true);
		expect(document.activeElement).toBe(last);
	});
});

describe('getFocusableElements fallback ancestor visibility', () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	afterEach(() => {
		container.remove();
	});

	test('excludes elements inside inline display:none ancestors', () => {
		container.innerHTML =
			'<div style="display: none"><button>Hidden child</button></div>';
		expect(getFocusableElements(container)).toHaveLength(0);
	});
});
