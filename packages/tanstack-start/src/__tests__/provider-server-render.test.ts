/**
 * In the browser, a hosted `ConsentProvider` with nothing prefetched sends
 * `/init` from its first render. A server render must not: the request
 * belongs to the visitor's browser, and a server has no runtime to apply
 * the answer to.
 */
import { hosted } from '@c15t/core';
import { ConsentProvider } from '@c15t/react/provider';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { expect, test, vi } from 'vitest';

test('a server render of a hosted provider sends no /init', () => {
	const fetch = vi.fn();
	const html = renderToString(
		createElement(
			ConsentProvider,
			{
				options: {
					mode: hosted({ fetch, url: 'https://consent.example/api/c15t' }),
				},
			},
			createElement('main', null, 'Shell')
		)
	);
	expect(html).toContain('Shell');
	expect(fetch).not.toHaveBeenCalled();
});
