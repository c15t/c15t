import { custom } from '@c15t/core';
import { render } from '@testing-library/svelte';
import { afterEach, describe, expect, test } from 'vitest';

import type { ConsentManagerOptions } from '../lib/types';
import Fixture from './fixtures/notice-banner-fixture.svelte';
import { policyFixture } from './policy-fixture';

/**
 * The stock surfaces insert the sheets they use into `<head>`, once per
 * page, so an app that imports no stylesheet still gets styled surfaces.
 */

const sheets = () =>
	[
		...document.head.querySelectorAll<HTMLStyleElement>(
			'style[data-c15t-styles]'
		),
	].map((element) => element.dataset.c15tStyles);

const renderFixture = (options: Partial<ConsentManagerOptions> = {}) =>
	render(Fixture, {
		capture: () => {},
		options: {
			disableAnimation: true,
			mode: custom({}),
			persistence: false,
			prefetch: policyFixture(),
			...options,
		},
	});

afterEach(() => {
	for (const element of document.head.querySelectorAll(
		'style[data-c15t-styles]'
	)) {
		element.remove();
	}
});

describe('surface styles', () => {
	test('the banner adds the first-paint sheet and the dialog its own, once each', () => {
		renderFixture({ nonce: 'test-nonce' });
		renderFixture();

		expect(
			document.querySelector('[data-testid="consent-banner-root"]')
		).not.toBeNull();
		// The fixture renders the dialog component too, whose code carries
		// the dialog and primitive sheets.
		expect(sheets()).toEqual([
			'c15t-first-paint',
			'c15t-dialog',
			'c15t-primitives',
		]);
		expect(
			document.head.querySelector<HTMLStyleElement>('style[data-c15t-styles]')
				?.nonce
		).toBe('test-nonce');
	});

	test('without a nonce option, takes the nonce SvelteKit put on the page', () => {
		const script = document.createElement('script');
		script.nonce = 'kit-nonce';
		document.body.append(script);
		renderFixture();
		script.remove();

		const nonces = [
			...document.head.querySelectorAll<HTMLStyleElement>(
				'style[data-c15t-styles]'
			),
		].map((element) => element.nonce);
		expect(nonces).toEqual(['kit-nonce', 'kit-nonce', 'kit-nonce']);
	});

	test('adds nothing with `styles: false` or `noStyle`', () => {
		renderFixture({ styles: false });
		renderFixture({ noStyle: true });

		expect(
			document.querySelector('[data-testid="consent-banner-root"]')
		).not.toBeNull();
		expect(sheets()).toEqual([]);
	});
});
