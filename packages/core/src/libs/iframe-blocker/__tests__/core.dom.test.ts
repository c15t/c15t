/**
 * Regression tests for the iframe blocker against a real DOM and
 * MutationObserver: one unreadable node or invalid iframe must not stop
 * other consent-gated iframes from being blocked.
 *
 * @vitest-environment jsdom
 */

import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import type { ConsentState } from '../../../types';
import {
	createIframeBlocker,
	processAllIframes,
	setupIframeObserver,
} from '../core';

const consents: ConsentState = {
	necessary: true,
	functionality: false,
	experience: false,
	marketing: false,
	measurement: false,
};

function createIframe(category: string): HTMLIFrameElement {
	const iframe = document.createElement('iframe');
	iframe.setAttribute('data-category', category);
	iframe.setAttribute('src', 'about:blank');
	return iframe;
}

/**
 * Stands in for a node page script isn't allowed to read. Firefox throws
 * this error for some nodes added by extensions or browser features.
 */
function createUnreadableNode(): HTMLDivElement {
	const node = document.createElement('div');
	Object.defineProperty(node, 'nodeType', {
		get() {
			throw new Error('Permission denied to access property "nodeType"');
		},
	});
	return node;
}

async function flushMutations(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('iframe blocker resilience', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;
	const cleanups: Array<() => void> = [];

	beforeAll(() => {
		// jsdom resolves the base URL lazily, when the first iframe is attached,
		// by walking the whole tree. That walk would read the unreadable node
		// and throw inside jsdom rather than c15t. Resolve and cache it now.
		void document.baseURI;
	});

	beforeEach(() => {
		document.body.innerHTML = '';
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	});

	afterEach(() => {
		for (const cleanup of cleanups.splice(0)) {
			cleanup();
		}
		warnSpy.mockRestore();
	});

	const observers = [
		{
			name: 'createIframeBlocker',
			start: () => {
				const blocker = createIframeBlocker({}, consents);
				cleanups.push(blocker.destroy);
			},
		},
		{
			name: 'setupIframeObserver',
			start: () => {
				const observer = setupIframeObserver(() => consents);
				cleanups.push(() => observer.disconnect());
			},
		},
	];

	describe.each(observers)('$name observer', ({ start }) => {
		it('blocks iframes added in the same batch as an unreadable node', async () => {
			start();
			const iframe = createIframe('marketing');

			document.body.append(createUnreadableNode(), iframe);
			await flushMutations();

			expect(iframe.getAttribute('src')).toBeNull();
		});

		it('blocks an invalid-category iframe and the iframes added with it', async () => {
			start();
			const invalid = createIframe('bogus');
			const iframe = createIframe('marketing');

			document.body.append(invalid, iframe);
			await flushMutations();

			expect(invalid.getAttribute('src')).toBeNull();
			expect(iframe.getAttribute('src')).toBeNull();
			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('invalid data-category "bogus"')
			);
		});
	});

	describe('initial scan', () => {
		it('processAllIframes blocks an invalid-category iframe and the iframes after it', () => {
			const invalid = createIframe('bogus');
			const iframe = createIframe('marketing');
			document.body.append(invalid, iframe);

			expect(() => processAllIframes(consents)).not.toThrow();
			expect(invalid.getAttribute('src')).toBeNull();
			expect(iframe.getAttribute('src')).toBeNull();
		});

		it('createIframeBlocker blocks an invalid-category iframe and the iframes after it', () => {
			const invalid = createIframe('bogus');
			const iframe = createIframe('marketing');
			document.body.append(invalid, iframe);

			const blocker = createIframeBlocker({}, consents);
			cleanups.push(blocker.destroy);

			expect(invalid.getAttribute('src')).toBeNull();
			expect(iframe.getAttribute('src')).toBeNull();
		});
	});
});
