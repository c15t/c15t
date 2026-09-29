/**
 * @vitest-environment jsdom
 */
import { afterEach, expect, test } from 'vitest';

import {
	choiceRecords,
	NOW,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import { createIframeBlocker } from '../index';

afterEach(() => {
	document.body.innerHTML = '';
});

/** Resolves after pending MutationObserver callbacks have run. */
const flushMutations = function flushMutations(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
};

/**
 * Replace `<body>` with a new element, the way client routers such as
 * Astro's ClientRouter and Turbo swap in the next page.
 */
const swapBody = function swapBody(html: string): void {
	const incoming = document.implementation.createHTMLDocument();
	incoming.body.innerHTML = html;
	document.body.replaceWith(document.importNode(incoming.body, true));
};

test('gates iframes in a <body> that replaced the original', async () => {
	const kernel = createConsentKernel({
		initialRecords: choiceRecords({ marketing: true }),
		now: NOW,
	});
	const blocker = createIframeBlocker({ kernel });

	swapBody(
		[
			'<iframe data-category="marketing" data-src="https://embed.example/granted"></iframe>',
			'<iframe data-category="measurement" src="https://embed.example/denied"></iframe>',
		].join('')
	);
	await flushMutations();

	const [granted, denied] = Array.from(document.querySelectorAll('iframe'));
	expect(granted?.getAttribute('src')).toBe('https://embed.example/granted');
	expect(denied?.hasAttribute('src')).toBe(false);

	// Frames added to the new body later are gated too.
	document.body.insertAdjacentHTML(
		'beforeend',
		'<iframe data-category="measurement" src="https://embed.example/late"></iframe>'
	);
	await flushMutations();
	expect(document.querySelectorAll('iframe')[2]?.hasAttribute('src')).toBe(
		false
	);

	blocker.dispose();
	kernel.dispose();
});
