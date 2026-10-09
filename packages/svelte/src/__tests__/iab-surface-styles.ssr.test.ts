import { css as iabDialogCSS } from '@c15t/ui/styles/sheets/iab-dialog';
import { css as iabFirstPaintCSS } from '@c15t/ui/styles/sheets/iab-first-paint';
import { render } from 'svelte/server';
import { describe, expect, test } from 'vitest';

import { injectSurfaceStyles } from '../lib/kit/surface-styles';
import Fixture from './fixtures/iab-surface-styles.svelte';
import { iabStyleOptions } from './iab-style-options';

const documentHTML = (head: string, body: string) =>
	injectSurfaceStyles(`<html><head>${head}</head><body>${body}</body></html>`);

describe('server-rendered IAB styles', () => {
	test('the banner names only its first-paint sheets and Kit writes them before hydration', () => {
		const { head, body } = render(Fixture, {
			props: { options: iabStyleOptions({ nonce: 'request-nonce' }) },
		});
		expect(body).toContain('data-testid="iab-consent-banner-card"');
		expect(head).toContain('c15t-first-paint c15t-iab-first-paint');
		const html = documentHTML(head, body);
		expect(html).toContain(
			`<style data-c15t-styles="c15t-iab-first-paint" nonce="request-nonce">${iabFirstPaintCSS}</style>`
		);
		expect(html).not.toContain('data-c15t-styles="c15t-iab-dialog"');
		expect(html.indexOf(iabFirstPaintCSS)).toBeLessThan(
			html.indexOf('</head>')
		);
		expect(injectSurfaceStyles(html)).toBe(html);
	});

	test('a standalone dialog names all the styles needed by its content', () => {
		const { head, body } = render(Fixture, {
			props: { banner: false, open: true, options: iabStyleOptions() },
		});
		expect(body).toContain('data-testid="iab-consent-dialog-card"');
		expect(head).toContain(
			'c15t-first-paint c15t-dialog c15t-primitives c15t-iab-first-paint c15t-iab-dialog'
		);
		const html = documentHTML(head, body);
		expect(html).toContain(`>${iabFirstPaintCSS}</style>`);
		expect(html).toContain(`>${iabDialogCSS}</style>`);
		expect(html.indexOf(iabDialogCSS)).toBeLessThan(html.indexOf('</head>'));
	});

	test.each(['styles', 'provider-no-style', 'component-no-style'] as const)(
		'%s leaves server IAB styles to the app',
		(option) => {
			const { head, body } = render(Fixture, {
				props: {
					banner: false,
					noStyle: option === 'component-no-style',
					open: true,
					options: iabStyleOptions({
						noStyle: option === 'provider-no-style',
						styles: option !== 'styles',
					}),
				},
			});
			expect(body).toContain('data-testid="iab-consent-dialog-card"');
			expect(documentHTML(head, body)).not.toContain('data-c15t-styles');
		}
	);
});
