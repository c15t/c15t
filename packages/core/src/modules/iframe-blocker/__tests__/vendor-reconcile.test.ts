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

/** The slugs these tests deny, declared so the gate honors the denial. */
const declaredVendors = (ids: readonly string[]) => ({
	declared: ids.map((id) => ({
		category: 'marketing' as const,
		id,
		presentable: false,
		source: 'script' as const,
	})),
	listVersion: null,
});

const kernelFor = (denied: string[]) =>
	createConsentKernel({
		initialRecords: {
			...choiceRecords({ marketing: true }),
			vendorChoice: { confirmedAt: NOW - 1, denied, version: 1 },
		},
		initialVendors: declaredVendors(denied),
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

	test('a vendor-only iframe holds a stored denial for a slug nothing declares yet', () => {
		// Cold start: the denial was stored on an earlier visit, the backend
		// declares the vendor, and its init has not arrived. The frame has no
		// category to fall back to, so the denial holds until it does.
		const kernel = createConsentKernel({
			initialRecords: {
				...choiceRecords({ marketing: true }),
				vendorChoice: { confirmedAt: NOW - 1, denied: ['youtube'], version: 1 },
			},
			now: NOW,
		});
		const iframe = makeIframe({
			'data-vendor': 'youtube',
			src: 'https://www.youtube.com/embed/x',
		});
		const blocker = createIframeBlocker({ kernel });
		expect(kernel.getSnapshot().vendors).toBeNull();
		expect(iframe.getAttribute('src')).toBeNull();
		expect(iframe.getAttribute('data-src')).toBe(
			'https://www.youtube.com/embed/x'
		);
		// Lifting the denial restores it, so the hold is the denial and not
		// the missing declaration.
		kernel.hydrate({ now: NOW, vendorChoice: null });
		expect(iframe.getAttribute('src')).toBe('https://www.youtube.com/embed/x');
		blocker.dispose();
		kernel.dispose();
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

	test('a denied iframe with no source at all is not marked as paused', () => {
		const iframe = makeIframe({ 'data-vendor': 'youtube' });
		const pass = buildReconcilePass(kernelFor(['youtube']).getSnapshot());
		reconcileIframe(iframe, pass);
		iframe.removeAttribute('data-vendor');
		// The author adds their own lazy source after the gate is gone. The
		// blocker never moved anything, so it must not promote it.
		iframe.setAttribute('data-src', 'https://www.youtube.com/embed/late');
		reconcileIframe(iframe, pass);
		expect(iframe.getAttribute('src')).toBeNull();
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

	test('the blocker declares the slug a frame names so a stored denial gates it before init', () => {
		// The backend declares youtube, but its init has not arrived yet: only
		// the stored denial and the frame exist.
		const kernel = createConsentKernel({
			initialRecords: {
				...choiceRecords({ marketing: true }),
				vendorChoice: { confirmedAt: NOW - 1, denied: ['youtube'], version: 1 },
			},
			now: NOW,
		});
		const iframe = makeIframe({
			'data-category': 'marketing',
			'data-vendor': 'youtube',
			src: 'https://www.youtube.com/embed/x',
		});
		const blocker = createIframeBlocker({ kernel });
		expect(
			kernel.getSnapshot().vendors?.declared.map((v) => [v.id, v.source])
		).toEqual([['youtube', 'script']]);
		expect(iframe.getAttribute('src')).toBeNull();
		blocker.dispose();
		kernel.dispose();
	});

	test('a frame that changes its slug or leaves the page takes its declaration with it', () => {
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true }),
			now: NOW,
		});
		const iframe = makeIframe({
			'data-category': 'marketing',
			'data-vendor': 'youtube',
			src: 'https://www.youtube.com/embed/x',
		});
		const blocker = createIframeBlocker({ kernel });
		const declared = () =>
			kernel.getSnapshot().vendors?.declared.map((v) => [v.id, v.category]) ??
			[];
		expect(declared()).toEqual([['youtube', 'marketing']]);
		// The SPA repoints the frame: the old pair must not linger as an
		// owner that a narrowed bulk save would still reason about.
		iframe.setAttribute('data-vendor', 'vimeo');
		blocker.processAllIframes();
		expect(declared()).toEqual([['vimeo', 'marketing']]);
		iframe.setAttribute('data-category', 'measurement');
		blocker.processAllIframes();
		expect(declared()).toEqual([['vimeo', 'measurement']]);
		// Gone from the page, gone from the declaration.
		iframe.remove();
		blocker.processAllIframes();
		expect(kernel.getSnapshot().vendors).toBeNull();
		blocker.dispose();
		kernel.dispose();
	});

	test('a manual pass drops a connected frame that lost its gate attributes', () => {
		// No observer under `disableAutomaticBlocking`, so the manual pass is
		// the only sweep. Its selector skips a frame with neither attribute,
		// and the frame is still on the page; the declaration must go anyway.
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true }),
			now: NOW,
		});
		const iframe = makeIframe({
			'data-category': 'marketing',
			'data-vendor': 'youtube',
			src: 'https://www.youtube.com/embed/x',
		});
		const blocker = createIframeBlocker({
			disableAutomaticBlocking: true,
			kernel,
		});
		blocker.processAllIframes();
		expect(kernel.getSnapshot().vendors?.declared.map((v) => v.id)).toEqual([
			'youtube',
		]);
		iframe.removeAttribute('data-vendor');
		iframe.removeAttribute('data-category');
		blocker.processAllIframes();
		expect(kernel.getSnapshot().vendors).toBeNull();
		blocker.dispose();
		kernel.dispose();
	});

	test('the observer drops a removed frame and disposing the blocker drops the rest', async () => {
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true }),
			now: NOW,
		});
		const first = makeIframe({
			'data-category': 'marketing',
			'data-vendor': 'youtube',
			src: 'https://www.youtube.com/embed/x',
		});
		const second = makeIframe({
			'data-category': 'marketing',
			'data-vendor': 'vimeo',
			src: 'https://player.vimeo.com/video/x',
		});
		const blocker = createIframeBlocker({ kernel });
		const ids = () =>
			kernel.getSnapshot().vendors?.declared.map((v) => v.id) ?? [];
		expect(ids()).toEqual(['vimeo', 'youtube']);
		first.remove();
		// jsdom delivers mutation records on a microtask.
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(ids()).toEqual(['vimeo']);
		blocker.dispose();
		expect(kernel.getSnapshot().vendors).toBeNull();
		second.remove();
		kernel.dispose();
	});

	test('the blocker re-scans when the vendor choice changes', () => {
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true }),
			initialVendors: declaredVendors(['youtube']),
			now: NOW,
		});
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
