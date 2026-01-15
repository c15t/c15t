import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
	getFocusableElements,
	getTextDirection,
	setupScrollLock,
	setupTextDirection,
} from '../dom';

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

	// Helper to make elements visible to the focusable check
	// jsdom doesn't render elements with actual dimensions, so we mock offsetWidth/offsetHeight
	const makeVisible = (element: HTMLElement) => {
		Object.defineProperty(element, 'offsetWidth', {
			value: 100,
			configurable: true,
		});
		Object.defineProperty(element, 'offsetHeight', {
			value: 50,
			configurable: true,
		});
	};

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	afterEach(() => {
		document.body.removeChild(container);
	});

	test('finds buttons when visible', () => {
		container.innerHTML = '<button>Click me</button>';
		const button = container.querySelector('button') as HTMLElement;
		makeVisible(button);
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(1);
		expect(elements[0]?.tagName).toBe('BUTTON');
	});

	test('finds links with href when visible', () => {
		container.innerHTML = '<a href="#">Link</a>';
		const link = container.querySelector('a') as HTMLElement;
		makeVisible(link);
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(1);
		expect(elements[0]?.tagName).toBe('A');
	});

	test('finds inputs when visible', () => {
		container.innerHTML = '<input type="text" />';
		const input = container.querySelector('input') as HTMLElement;
		makeVisible(input);
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(1);
		expect(elements[0]?.tagName).toBe('INPUT');
	});

	test('excludes disabled elements', () => {
		container.innerHTML = `
			<button id="enabled">Enabled</button>
			<button disabled>Disabled</button>
		`;
		const enabledButton = container.querySelector('#enabled') as HTMLElement;
		makeVisible(enabledButton);
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(1);
		expect(elements[0]?.id).toBe('enabled');
	});

	test('excludes elements with tabindex=-1', () => {
		container.innerHTML = `
			<button id="focusable">Focusable</button>
			<button tabindex="-1">Not focusable</button>
		`;
		const focusableButton = container.querySelector(
			'#focusable'
		) as HTMLElement;
		makeVisible(focusableButton);
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(1);
		expect(elements[0]?.id).toBe('focusable');
	});

	test('includes elements with positive tabindex when visible', () => {
		container.innerHTML = '<div tabindex="0">Focusable div</div>';
		const div = container.querySelector('div') as HTMLElement;
		makeVisible(div);
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
		// Make all elements visible
		const button = container.querySelector('button') as HTMLElement;
		const link = container.querySelector('a') as HTMLElement;
		const input = container.querySelector('input') as HTMLElement;
		const select = container.querySelector('select') as HTMLElement;
		const textarea = container.querySelector('textarea') as HTMLElement;
		[button, link, input, select, textarea].forEach(makeVisible);
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(5);
	});

	test('returns empty array for container with no focusable elements', () => {
		container.innerHTML = '<div>Just text</div><span>More text</span>';
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(0);
	});

	test('excludes invisible elements (offsetWidth/offsetHeight = 0)', () => {
		container.innerHTML = '<button>Invisible button</button>';
		// Don't call makeVisible - element has 0 dimensions by default in jsdom
		const elements = getFocusableElements(container);
		expect(elements).toHaveLength(0);
	});
});
