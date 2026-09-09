import { describe, expect, test } from 'vitest';

import { serializeConsentDom, isConsentElementVisible } from './ssr-dom';

const dom = (markup: string) => {
	const root = document.createElement('div');
	root.innerHTML = markup;
	return root;
};
describe('Svelte SSR evidence normalization', () => {
	test('ignores hydration comments and portal parent location only', () => {
		const content =
			'<div data-testid="consent-banner-root"><!--[--><button data-action="accept">Accept</button><!--]--></div>';
		expect(serializeConsentDom(dom(content))).toBe(
			serializeConsentDom(
				dom(`<section>${content.replaceAll(/<!--.*?-->/gu, '')}</section>`)
			)
		);
	});
	test.each([
		'<button data-action="reject">Accept</button>',
		'<button data-action="accept">Different</button>',
		'<button data-action="accept" hidden>Accept</button>',
	])('retains action, text and visibility changes: %s', (changed) => {
		expect(
			serializeConsentDom(
				dom(`<div data-testid="consent-banner-root">${changed}</div>`)
			)
		).not.toBe(
			serializeConsentDom(
				dom(
					'<div data-testid="consent-banner-root"><button data-action="accept">Accept</button></div>'
				)
			)
		);
	});
	test('visibility evidence includes hidden ancestors and computed CSS', () => {
		const root = dom(
			'<section><div data-testid="consent-banner-root">Prompt</div></section>'
		);
		document.body.append(root);
		const prompt = root.querySelector('[data-testid="consent-banner-root"]');
		expect(isConsentElementVisible(prompt)).toBe(true);
		root.style.display = 'none';
		expect(isConsentElementVisible(prompt)).toBe(false);
		root.style.display = '';
		const style = document.createElement('style');
		style.textContent = '.hidden-prompt { opacity: 0; }';
		document.head.append(style);
		root.className = 'hidden-prompt';
		expect(isConsentElementVisible(prompt)).toBe(false);
		root.className = '';
		root.hidden = true;
		expect(isConsentElementVisible(prompt)).toBe(false);
		root.remove();
		style.remove();
	});
});
