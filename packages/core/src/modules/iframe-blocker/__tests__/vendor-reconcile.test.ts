/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
	choiceRecords,
	NOW,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import { createIframeBlocker } from '../index';
import { buildReconcilePass, reconcileIframe } from '../reconcile';

beforeEach(() => {
	document.body.innerHTML = '';
});
afterEach(() => {
	document.body.innerHTML = '';
});

const makeIframe = (attrs: Record<string, string>) => {
	const iframe = document.createElement('iframe');
	for (const [key, value] of Object.entries(attrs)) {
		iframe.setAttribute(key, value);
	}
	document.body.appendChild(iframe);
	return iframe;
};

const kernelFor = (denied: string[]) =>
	createConsentKernel({
		initialRecords: {
			...choiceRecords({ marketing: true }),
			vendorChoice: { confirmedAt: NOW - 1, denied, version: 1 },
		},
		now: NOW,
	});

describe('iframe data-vendor', () => {
	test('a denied vendor removes src even when the category is granted', () => {
		const iframe = makeIframe({
			'data-category': 'marketing',
			'data-vendor': 'youtube',
			src: 'https://www.youtube.com/embed/x',
		});
		reconcileIframe(
			iframe,
			buildReconcilePass(kernelFor(['youtube']).getSnapshot())
		);
		expect(iframe.getAttribute('src')).toBeNull();
		expect(iframe.getAttribute('data-src')).toBe(
			'https://www.youtube.com/embed/x'
		);
	});

	test('an unknown vendor does not throw and is granted', () => {
		const iframe = makeIframe({
			'data-category': 'marketing',
			'data-src': 'https://www.youtube.com/embed/x',
			'data-vendor': 'never-declared',
		});
		expect(() =>
			reconcileIframe(iframe, buildReconcilePass(kernelFor([]).getSnapshot()))
		).not.toThrow();
		expect(iframe.getAttribute('src')).toBe('https://www.youtube.com/embed/x');
	});

	test('an iframe with only data-vendor is gated on the vendor alone', () => {
		const denied = makeIframe({
			'data-vendor': 'youtube',
			src: 'https://www.youtube.com/embed/x',
		});
		reconcileIframe(
			denied,
			buildReconcilePass(kernelFor(['youtube']).getSnapshot())
		);
		expect(denied.getAttribute('src')).toBeNull();

		const granted = makeIframe({
			'data-src': 'https://www.youtube.com/embed/y',
			'data-vendor': 'youtube',
		});
		reconcileIframe(granted, buildReconcilePass(kernelFor([]).getSnapshot()));
		expect(granted.getAttribute('src')).toBe('https://www.youtube.com/embed/y');
	});

	test('removing the last gate from a paused iframe restores its source', () => {
		const kernel = kernelFor(['youtube']);
		const iframe = makeIframe({
			'data-vendor': 'youtube',
			src: 'https://www.youtube.com/embed/x',
		});
		const blocker = createIframeBlocker({ kernel });
		expect(iframe.getAttribute('src')).toBeNull();
		iframe.removeAttribute('data-vendor');
		reconcileIframe(iframe, buildReconcilePass(kernel.getSnapshot()));
		expect(iframe.getAttribute('src')).toBe('https://www.youtube.com/embed/x');
		expect(iframe.getAttribute('data-src')).toBeNull();
		blocker.dispose();
		kernel.dispose();
	});

	test('an iframe that was never gated is left alone', () => {
		const iframe = makeIframe({ 'data-src': 'https://example.com/lazy' });
		reconcileIframe(iframe, buildReconcilePass(kernelFor([]).getSnapshot()));
		expect(iframe.getAttribute('src')).toBeNull();
		expect(iframe.getAttribute('data-src')).toBe('https://example.com/lazy');
	});

	test("a denied iframe with only an author's data-src is not marked as paused", () => {
		const iframe = makeIframe({
			'data-src': 'https://www.youtube.com/embed/lazy',
			'data-vendor': 'youtube',
		});
		const pass = buildReconcilePass(kernelFor(['youtube']).getSnapshot());
		reconcileIframe(iframe, pass);
		iframe.removeAttribute('data-vendor');
		reconcileIframe(iframe, pass);
		// The blocker never moved a source, so removing the gate starts nothing.
		expect(iframe.getAttribute('src')).toBeNull();
	});

	test('the blocker re-scans when the vendor choice changes', () => {
		const kernel = kernelFor([]);
		const iframe = makeIframe({
			'data-category': 'marketing',
			'data-vendor': 'youtube',
			src: 'https://www.youtube.com/embed/x',
		});
		const blocker = createIframeBlocker({ kernel });
		expect(iframe.getAttribute('src')).toBe('https://www.youtube.com/embed/x');
		kernel.hydrate({
			now: NOW,
			vendorChoice: { confirmedAt: NOW - 1, denied: ['youtube'], version: 1 },
		});
		expect(iframe.getAttribute('src')).toBeNull();
		kernel.hydrate({ now: NOW, vendorChoice: null });
		expect(iframe.getAttribute('src')).toBe('https://www.youtube.com/embed/x');
		blocker.dispose();
		kernel.dispose();
	});

	test('the blocker re-scans when a denied vendor becomes disabled', () => {
		const kernel = kernelFor(['youtube']);
		const iframe = makeIframe({
			'data-category': 'marketing',
			'data-vendor': 'youtube',
			src: 'https://www.youtube.com/embed/x',
		});
		const blocker = createIframeBlocker({ kernel });
		expect(iframe.getAttribute('src')).toBeNull();
		// Declaring the vendor `disabled` lifts its stored denial at the gate.
		kernel.set.vendors({
			declared: [
				{
					category: 'marketing',
					disabled: true,
					id: 'youtube',
					presentable: false,
					source: 'config',
				},
			],
		});
		expect(iframe.getAttribute('src')).toBe('https://www.youtube.com/embed/x');
		blocker.dispose();
		kernel.dispose();
	});
});
