/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { choiceRecords } from '../../../__tests__/fixtures/kernel-fixtures';
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

const makeIframe = function makeIframe(
	attrs: Record<string, string> = {}
): HTMLIFrameElement {
	const iframe = document.createElement('iframe');
	for (const [k, v] of Object.entries(attrs)) {
		iframe.setAttribute(k, v);
	}
	document.body.appendChild(iframe);
	return iframe;
};

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
		expect(() => determineCategory(iframe)).toThrow(/invalid data-category/u);
	});
});

describe('reconcileIframe', () => {
	test('promotes data-src to src when consent granted', () => {
		const snap = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true }),
		}).getSnapshot();
		const iframe = makeIframe({
			'data-category': 'marketing',
			'data-src': 'https://example.com/embed',
		});
		reconcileIframe(iframe, buildReconcilePass(snap));
		expect(iframe.getAttribute('src')).toBe('https://example.com/embed');
		expect(iframe.getAttribute('data-src')).toBeNull();
	});

	test.each([
		// oxlint-disable-next-line no-script-url -- Exercise rejection of executable URLs.
		'javascript:parent.__iframeProbe = true;void 0',
		// oxlint-disable-next-line no-script-url -- Exercise rejection of mixed-case executable URLs.
		'JaVaScRiPt:parent.__iframeProbe = true;void 0',
		' \t\njavascript:parent.__iframeProbe = true;void 0',
		'java\tscript:parent.__iframeProbe = true;void 0',
		'java\nscript:parent.__iframeProbe = true;void 0',
		'java\rscript:parent.__iframeProbe = true;void 0',
		'data:text/html,<script>parent.__iframeProbe = true</script>',
		'blob:https://example.com/untrusted',
		'about:blank',
		'https://[invalid',
	])('keeps unsafe or malformed data-src blocked: %j', (dataSrc) => {
		const snap = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true }),
		}).getSnapshot();
		const iframe = makeIframe({
			'data-category': 'marketing',
			'data-src': dataSrc,
		});
		reconcileIframe(iframe, buildReconcilePass(snap));
		expect(iframe.getAttribute('src')).toBeNull();
		expect(iframe.getAttribute('data-src')).toBe(dataSrc);
	});

	test.each([
		['https://example.com/embed', 'https://example.com/embed'],
		['http://example.com/embed', 'http://example.com/embed'],
		['//example.com/embed', 'https://example.com/embed'],
		['/embed', 'https://site.example/embed'],
		['../embed', 'https://site.example/embed'],
		['embed', 'https://site.example/content/embed'],
	])(
		'resolves HTTP(S) data-src against the iframe document: %s',
		(dataSrc, expected) => {
			const ownerDocument = document.implementation.createHTMLDocument();
			const base = ownerDocument.createElement('base');
			base.href = 'https://site.example/content/';
			ownerDocument.head.appendChild(base);
			// oxlint-disable-next-line iframe-missing-sandbox -- Detached DOM fixture for URL resolution, not React.createElement.
			const iframe = ownerDocument.createElement('iframe');
			iframe.setAttribute('data-category', 'marketing');
			iframe.setAttribute('data-src', dataSrc);
			const snap = createConsentKernel({
				initialRecords: choiceRecords({ marketing: true }),
			}).getSnapshot();
			reconcileIframe(iframe, buildReconcilePass(snap));
			expect(iframe.src).toBe(expected);
			expect(iframe.getAttribute('data-src')).toBeNull();
		}
	);

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
			initialRecords: choiceRecords({ marketing: true }),
		}).getSnapshot();
		const iframe = makeIframe({
			'data-category': 'marketing',
			'data-src': 'https://example.com/queued',
			src: 'https://example.com/already',
		});
		reconcileIframe(iframe, buildReconcilePass(snap));
		expect(iframe.getAttribute('src')).toBe('https://example.com/already');
		expect(iframe.getAttribute('data-src')).toBe('https://example.com/queued');
	});
});
