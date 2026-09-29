import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	getFocusableElements,
	getTextDirection,
	firstTabbable,
	tabbableElements,
	setupFocusTrap,
	setupScrollLock,
	setupTextDirection,
} from '../dom';

/** Flushes the trap's deferred (setTimeout 0) focus operations. */
const flushFocusTimers = function flushFocusTimers(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
};

test('focus trapping follows controls inside a shadow root and restores the opener', async () => {
	const host = document.createElement('div');
	const root = host.attachShadow({ mode: 'open' });
	const opener = document.createElement('button');
	const container = document.createElement('div');
	const first = document.createElement('button');
	const last = document.createElement('button');
	container.append(first, last);
	root.append(opener, container);
	document.body.append(host);
	opener.focus();
	const release = setupFocusTrap(container);
	await flushFocusTimers();
	first.focus();
	const forward = new KeyboardEvent('keydown', {
		bubbles: true,
		cancelable: true,
		composed: true,
		key: 'Tab',
	});
	first.dispatchEvent(forward);
	expect(forward.defaultPrevented).toBe(false);
	last.focus();
	last.dispatchEvent(
		new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			composed: true,
			key: 'Tab',
		})
	);
	expect(root.activeElement).toBe(first);
	release();
	await flushFocusTimers();
	expect(root.activeElement).toBe(opener);
	host.remove();
});

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
		// Farsi/Persian
		expect(getTextDirection('fa')).toBe('rtl');
		// Urdu
		expect(getTextDirection('ur')).toBe('rtl');
		// Pashto
		expect(getTextDirection('ps')).toBe('rtl');
		// Sindhi
		expect(getTextDirection('sd')).toBe('rtl');
		// Kurdish
		expect(getTextDirection('ku')).toBe('rtl');
		// Divehi
		expect(getTextDirection('dv')).toBe('rtl');
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
	const root = document.documentElement;
	const { body } = document;
	let pageStyle: HTMLStyleElement | null = null;

	/** jsdom has no layout; give the root a classic scrollbar of `width`. */
	const showRootScrollbar = (width: number) => {
		Object.defineProperty(root, 'clientWidth', {
			configurable: true,
			get: () => window.innerWidth - width,
		});
	};
	const supportScrollbarGutter = () => {
		vi.stubGlobal('CSS', {
			supports: (property: string) => property === 'scrollbar-gutter',
		});
	};
	const addPageStyle = (css: string) => {
		pageStyle = document.createElement('style');
		pageStyle.textContent = css;
		document.head.append(pageStyle);
	};

	afterEach(() => {
		root.removeAttribute('style');
		body.removeAttribute('style');
		pageStyle?.remove();
		pageStyle = null;
		Reflect.deleteProperty(root, 'clientWidth');
		vi.unstubAllGlobals();
	});

	test('hides body overflow when it controls the viewport, and restores it', () => {
		body.style.overflow = 'auto';
		const cleanup = setupScrollLock();
		expect(body.style.overflow).toBe('hidden');
		expect(root.style.overflow).toBe('');
		cleanup();
		expect(body.style.overflow).toBe('auto');
	});

	test('hides root overflow when the root sets its own, and restores it', () => {
		addPageStyle('html { overflow-y: scroll; }');
		root.style.overflowX = 'hidden';
		const cleanup = setupScrollLock();
		expect(root.style.overflow).toBe('hidden');
		expect(body.style.overflow).toBe('');
		cleanup();
		expect(root.style.overflowX).toBe('hidden');
		expect(root.style.overflowY).toBe('');
	});

	test('also hides body overflow when body is the scroll container', () => {
		addPageStyle('html { overflow: hidden; } body { overflow-y: auto; }');
		root.style.setProperty('overflow-y', 'hidden', 'important');
		const cleanup = setupScrollLock();
		expect(root.style.overflow).toBe('hidden');
		expect(body.style.overflow).toBe('hidden');
		cleanup();
		expect(root.style.getPropertyValue('overflow-y')).toBe('hidden');
		expect(root.style.getPropertyPriority('overflow-y')).toBe('important');
		expect(body.style.overflow).toBe('');
	});

	test('nested locks restore the page only when the last one releases', () => {
		body.style.overflow = 'auto';
		const first = setupScrollLock();
		const second = setupScrollLock();
		expect(body.style.overflow).toBe('hidden');

		first();
		expect(body.style.overflow).toBe('hidden');
		first();
		expect(body.style.overflow).toBe('hidden');

		second();
		expect(body.style.overflow).toBe('auto');
	});

	test('reserves the root scrollbar gutter instead of padding body', () => {
		supportScrollbarGutter();
		showRootScrollbar(15);
		body.style.paddingRight = '10px';
		const cleanup = setupScrollLock();
		expect(root.style.scrollbarGutter).toBe('stable');
		expect(body.style.paddingRight).toBe('10px');
		cleanup();
		expect(root.style.scrollbarGutter).toBe('');
	});

	test('restores an inline scrollbar gutter the page already had', () => {
		supportScrollbarGutter();
		showRootScrollbar(15);
		root.style.scrollbarGutter = 'auto';
		const cleanup = setupScrollLock();
		expect(root.style.scrollbarGutter).toBe('stable');
		cleanup();
		expect(root.style.scrollbarGutter).toBe('auto');
	});

	test('adds no gutter when the page shows no scrollbar', () => {
		supportScrollbarGutter();
		showRootScrollbar(0);
		const cleanup = setupScrollLock();
		expect(body.style.overflow).toBe('hidden');
		expect(root.style.scrollbarGutter).toBe('');
		expect(body.style.paddingRight).toBe('');
		cleanup();
	});

	test('keeps a stable gutter the page already reserves', () => {
		supportScrollbarGutter();
		showRootScrollbar(15);
		addPageStyle('html { scrollbar-gutter: stable both-edges; }');
		const cleanup = setupScrollLock();
		expect(root.style.scrollbarGutter).toBe('');
		cleanup();
	});

	test('pads body by the scrollbar width without scrollbar-gutter support', () => {
		showRootScrollbar(15);
		body.style.paddingRight = '10px';
		const cleanup = setupScrollLock();
		expect(body.style.paddingRight).toBe('15px');
		expect(root.style.scrollbarGutter).toBe('');
		cleanup();
		expect(body.style.paddingRight).toBe('10px');
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

	test('focuses the first tabbable element when asked to', async () => {
		const link = document.createElement('a');
		link.href = '#';
		const button = document.createElement('button');
		dialog.append(link, button);

		const release = setupFocusTrap(dialog, { initialFocus: 'first-tabbable' });
		await flushFocusTimers();

		expect(document.activeElement).toBe(link);
		release();
	});

	test('falls back to the container when nothing inside is tabbable', async () => {
		const label = document.createElement('p');
		label.textContent = 'Nothing to press';
		dialog.append(label);

		const release = setupFocusTrap(dialog, { initialFocus: 'first-tabbable' });
		await flushFocusTimers();

		expect(document.activeElement).toBe(dialog);
		release();
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

	const pressTab = function pressTab(shiftKey = false) {
		document.dispatchEvent(
			new KeyboardEvent('keydown', {
				bubbles: true,
				cancelable: true,
				key: 'Tab',
				shiftKey,
			})
		);
	};

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

describe('firstTabbable', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	const mount = function mount(html: string): HTMLElement {
		const container = document.createElement('div');
		container.innerHTML = html;
		document.body.appendChild(container);
		return container;
	};

	test('skips negative tabindex and controls a browser would not focus', () => {
		const container = mount(`
			<div tabindex="-2">Not tabbable</div>
			<fieldset disabled><button id="fieldset-disabled">No</button></fieldset>
			<div inert><button id="inert">No</button></div>
			<button id="yes">Yes</button>
		`);
		expect(firstTabbable(container)?.id).toBe('yes');
	});

	test('prefers the lowest positive tabindex over document order', () => {
		const container = mount(`
			<button id="natural">Natural</button>
			<button id="second" tabindex="2">Second</button>
			<button id="first" tabindex="1">First</button>
		`);
		expect(firstTabbable(container)?.id).toBe('first');
	});

	test('orders the whole list the way sequential Tab does', () => {
		const container = mount(`
			<button id="natural">Natural</button>
			<button id="second" tabindex="2">Second</button>
			<button id="first" tabindex="1">First</button>
			<button id="last">Last</button>
		`);
		expect(tabbableElements(container).map((element) => element.id)).toEqual([
			'first',
			'second',
			'natural',
			'last',
		]);
	});

	test('counts native stops that are not form controls', () => {
		const container = mount(`
			<details><summary id="summary">More</summary><p>Body</p></details>
			<button id="button">Button</button>
		`);
		expect(tabbableElements(container).map((element) => element.id)).toEqual([
			'summary',
			'button',
		]);
	});

	test('returns undefined when nothing is tabbable', () => {
		const container = mount('<p>Text only</p>');
		expect(firstTabbable(container)).toBeUndefined();
	});
});

describe('setupFocusTrap with positive tabindex', () => {
	let cleanup: (() => void) | undefined;

	afterEach(() => {
		cleanup?.();
		cleanup = undefined;
		document.body.innerHTML = '';
	});

	const pressTab = function pressTab(shiftKey = false) {
		document.dispatchEvent(
			new KeyboardEvent('keydown', {
				bubbles: true,
				cancelable: true,
				key: 'Tab',
				shiftKey,
			})
		);
	};

	test('steps through the dialog in sequential order instead of leaving it', async () => {
		document.body.innerHTML = `
			<button id="outside">Outside</button>
			<div id="dialog">
				<button id="natural">Natural</button>
				<button id="jump" tabindex="1">Jump</button>
			</div>
		`;
		const dialog = document.getElementById('dialog') as HTMLElement;
		cleanup = setupFocusTrap(dialog, { initialFocus: 'first-tabbable' });
		await flushFocusTimers();
		expect(document.activeElement?.id).toBe('jump');

		pressTab();
		expect(document.activeElement?.id).toBe('natural');
		pressTab();
		expect(document.activeElement?.id).toBe('jump');
		pressTab(true);
		expect(document.activeElement?.id).toBe('natural');
	});
});
