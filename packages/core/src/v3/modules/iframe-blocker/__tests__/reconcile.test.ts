/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createConsentKernel } from '../../../kernel';
import {
	buildReconcilePass,
	determineCategory,
	reconcileIframe,
} from '../reconcile';

beforeEach(() => {
	document.body.innerHTML = '';
});

afterEach(() => {
	document.body.innerHTML = '';
});

function makeIframe(attrs: Record<string, string> = {}): HTMLIFrameElement {
	const iframe = document.createElement('iframe');
	for (const [k, v] of Object.entries(attrs)) iframe.setAttribute(k, v);
	document.body.appendChild(iframe);
	return iframe;
}

describe('determineCategory', () => {
	test('returns undefined when data-category is absent', () => {
		const iframe = makeIframe();
		expect(determineCategory(iframe)).toBeUndefined();
	});

	test('returns the category when valid', () => {
		const iframe = makeIframe({ 'data-category': 'marketing' });
		expect(determineCategory(iframe)).toBe('marketing');
	});

	test('throws on invalid category', () => {
		const iframe = makeIframe({ 'data-category': 'totally-fake' });
		expect(() => determineCategory(iframe)).toThrow(/invalid data-category/);
	});
});

describe('reconcileIframe', () => {
	test('promotes data-src to src when consent granted', () => {
		const snap = createConsentKernel({
			initialConsents: { marketing: true },
		}).getSnapshot();
		const iframe = makeIframe({
			'data-category': 'marketing',
			'data-src': 'https://example.com/embed',
		});
		reconcileIframe(iframe, buildReconcilePass(snap));
		expect(iframe.getAttribute('src')).toBe('https://example.com/embed');
		expect(iframe.getAttribute('data-src')).toBeNull();
	});

	test('removes src when consent revoked', () => {
		const snap = createConsentKernel().getSnapshot();
		const iframe = makeIframe({
			'data-category': 'marketing',
			src: 'https://example.com/embed',
		});
		reconcileIframe(iframe, buildReconcilePass(snap));
		expect(iframe.getAttribute('src')).toBeNull();
	});

	test('is a no-op when iframe has no data-category', () => {
		const snap = createConsentKernel().getSnapshot();
		const iframe = makeIframe({ src: 'https://example.com/embed' });
		reconcileIframe(iframe, buildReconcilePass(snap));
		expect(iframe.getAttribute('src')).toBe('https://example.com/embed');
	});

	test('does not overwrite existing src when consent granted', () => {
		const snap = createConsentKernel({
			initialConsents: { marketing: true },
		}).getSnapshot();
		const iframe = makeIframe({
			'data-category': 'marketing',
			src: 'https://example.com/already',
			'data-src': 'https://example.com/queued',
		});
		reconcileIframe(iframe, buildReconcilePass(snap));
		expect(iframe.getAttribute('src')).toBe('https://example.com/already');
		expect(iframe.getAttribute('data-src')).toBe('https://example.com/queued');
	});
});
