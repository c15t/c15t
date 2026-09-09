/**
 * Tests for @c15t/core/modules/iframe-blocker.
 *
 * Verifies feature parity with v2:
 * - iframes without data-category are untouched
 * - data-src → src move on consent granted
 * - src cleared on consent revoked
 * - newly-added iframes processed via MutationObserver
 * - invalid data-category throws
 * - dispose disconnects observer + kernel subscription
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { choiceRecords } from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../index';
import { createIframeBlocker } from '../index';

interface StubIframe {
	tagName: 'IFRAME';
	nodeType: 1;
	attributes: Map<string, string>;
	getAttribute: (key: string) => string | null;
	setAttribute: (key: string, value: string) => void;
	removeAttribute: (key: string) => void;
	querySelectorAll: (selector: string) => StubIframe[];
}

interface StubBody {
	children: StubIframe[];
	observers: ((mutations: unknown[]) => void)[];
}

const createStubIframe = function createStubIframe(
	category?: string,
	src?: string,
	dataSrc?: string
): StubIframe {
	const attrs = new Map<string, string>();
	if (category) {
		attrs.set('data-category', category);
	}
	if (src) {
		attrs.set('src', src);
	}
	if (dataSrc) {
		attrs.set('data-src', dataSrc);
	}
	return {
		attributes: attrs,
		getAttribute(key) {
			return attrs.get(key) ?? null;
		},
		nodeType: 1,
		querySelectorAll() {
			return [];
		},
		removeAttribute(key) {
			attrs.delete(key);
		},
		setAttribute(key, value) {
			attrs.set(key, value);
		},
		tagName: 'IFRAME',
	};
};

let body: StubBody;
let observerCallbacks: ((mutations: unknown[]) => void)[] = [];

const dispatchAdded = function dispatchAdded(node: StubIframe): void {
	const mutation = {
		addedNodes: [node],
		type: 'childList',
	};
	for (const observerHandler of observerCallbacks) {
		observerHandler([mutation]);
	}
};

beforeEach(() => {
	observerCallbacks = [];
	body = {
		children: [],
		observers: [],
	};
	const doc = {
		body,
		querySelectorAll: (_selector: string) => body.children,
	};
	vi.stubGlobal('document', doc);
	vi.stubGlobal(
		'MutationObserver',
		class StubObserver {
			handler: (mutations: unknown[]) => void;
			constructor(handler: (mutations: unknown[]) => void) {
				this.handler = handler;
				observerCallbacks.push(handler);
			}
			// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
			observe() {}
			disconnect() {
				observerCallbacks = observerCallbacks.filter(
					(handler) => handler !== this.handler
				);
			}
			// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
			takeRecords() {
				return [];
			}
		}
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('iframe-blocker: initial scan', () => {
	test('iframes without data-category are left alone', () => {
		const iframe = createStubIframe(undefined, 'https://example.com/');
		body.children.push(iframe);

		const kernel = createConsentKernel();
		createIframeBlocker({ kernel });
		expect(iframe.getAttribute('src')).toBe('https://example.com/');
	});

	test('consented + data-src → moves to src', () => {
		const iframe = createStubIframe(
			'marketing',
			undefined,
			'https://example.com/'
		);
		body.children.push(iframe);

		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true }),
		});
		createIframeBlocker({ kernel });

		expect(iframe.getAttribute('src')).toBe('https://example.com/');
		expect(iframe.getAttribute('data-src')).toBeNull();
	});

	test('not consented + src → removes src', () => {
		const iframe = createStubIframe('marketing', 'https://example.com/');
		body.children.push(iframe);

		const kernel = createConsentKernel();
		createIframeBlocker({ kernel });

		expect(iframe.getAttribute('src')).toBeNull();
	});
});

describe('iframe-blocker: reacts to consent changes', () => {
	test('revoke clears src', () => {
		const iframe = createStubIframe('marketing', 'https://example.com/');
		body.children.push(iframe);
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true }),
		});

		createIframeBlocker({ kernel });
		expect(iframe.getAttribute('src')).toBe('https://example.com/');

		void kernel.commands.save({ marketing: false });
		expect(iframe.getAttribute('src')).toBeNull();
	});

	test('grant restores src from data-src', () => {
		const iframe = createStubIframe(
			'marketing',
			undefined,
			'https://example.com/'
		);
		body.children.push(iframe);
		const kernel = createConsentKernel();

		createIframeBlocker({ kernel });
		// initial pass clears data-src (actually leaves it since not consented)
		expect(iframe.getAttribute('src')).toBeNull();
		expect(iframe.getAttribute('data-src')).toBe('https://example.com/');

		void kernel.commands.save({ marketing: true });
		expect(iframe.getAttribute('src')).toBe('https://example.com/');
	});
});

describe('iframe-blocker: MutationObserver processes new iframes', () => {
	test('dynamically added iframe is blocked if consent missing', () => {
		const kernel = createConsentKernel();
		createIframeBlocker({ kernel });

		const iframe = createStubIframe('marketing', 'https://late.example.com/');
		dispatchAdded(iframe);

		expect(iframe.getAttribute('src')).toBeNull();
	});

	test('dynamically added iframe is allowed if consent granted', () => {
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true }),
		});
		createIframeBlocker({ kernel });

		const iframe = createStubIframe(
			'marketing',
			undefined,
			'https://late.example.com/'
		);
		dispatchAdded(iframe);

		expect(iframe.getAttribute('src')).toBe('https://late.example.com/');
	});
});

describe('iframe-blocker: validation', () => {
	test('throws on invalid data-category', () => {
		const iframe = createStubIframe('bogus', 'https://example.com/');
		body.children.push(iframe);

		const kernel = createConsentKernel();
		expect(() => createIframeBlocker({ kernel })).toThrow(
			/invalid data-category/u
		);
	});
});

describe('iframe-blocker: dispose', () => {
	test('disconnects observer and kernel subscription', () => {
		const iframe = createStubIframe('marketing', 'https://example.com/');
		body.children.push(iframe);
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true }),
		});

		const blocker = createIframeBlocker({ kernel });
		expect(iframe.getAttribute('src')).toBe('https://example.com/');

		blocker.dispose();

		// Post-dispose consent changes should not process iframes.
		iframe.setAttribute('src', 'https://example.com/');
		void kernel.commands.save({ marketing: false });
		expect(iframe.getAttribute('src')).toBe('https://example.com/');
	});

	test('observer callback list is cleared', () => {
		const kernel = createConsentKernel();
		const blocker = createIframeBlocker({ kernel });
		expect(observerCallbacks).toHaveLength(1);
		blocker.dispose();
		expect(observerCallbacks).toHaveLength(0);
	});
});

describe('iframe-blocker: disableAutomaticBlocking', () => {
	test('skips initial scan and observer', () => {
		const iframe = createStubIframe('marketing', 'https://example.com/');
		body.children.push(iframe);

		const kernel = createConsentKernel();
		createIframeBlocker({ disableAutomaticBlocking: true, kernel });

		// Initial scan didn't run → src is untouched.
		expect(iframe.getAttribute('src')).toBe('https://example.com/');
	});

	test('processAllIframes() still runs manually', () => {
		const iframe = createStubIframe('marketing', 'https://example.com/');
		body.children.push(iframe);

		const kernel = createConsentKernel();
		const blocker = createIframeBlocker({
			disableAutomaticBlocking: true,
			kernel,
		});

		blocker.processAllIframes();
		expect(iframe.getAttribute('src')).toBeNull();
	});
});
