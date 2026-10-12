/**
 * The server render of an `iab` policy under a provider without `iab`
 * throws the same error the browser does, so a SvelteKit page fails
 * instead of shipping no consent UI.
 */
import { MINIMAL_GVL } from '@c15t/conformance/fixtures/gvl';
import { custom } from '@c15t/core';
import type { GlobalVendorList } from '@c15t/core';
import { render } from 'svelte/server';
import { describe, expect, test } from 'vitest';

import type { ConsentManagerOptions } from '../lib/types';
import BannerFixture from './fixtures/banner-fixture.svelte';
import { policyFixture } from './policy-fixture';

const GVL = MINIMAL_GVL as unknown as GlobalVendorList;

const options = (iab?: ConsentManagerOptions['iab']): ConsentManagerOptions =>
	({
		iab,
		mode: custom({}),
		persistence: false,
		prefetch: {
			...policyFixture({}, { categories: ['marketing'], model: 'iab' }),
			initialIab: { cmpId: 28, enabled: true, gvl: GVL },
		},
	}) as ConsentManagerOptions;

describe('the server render of an `iab` policy', () => {
	test('throws without `iab`', () => {
		// `render()` produces the HTML when `body` is read.
		expect(
			() => render(BannerFixture, { props: { options: options() } }).body
		).toThrow(
			"c15t: this visitor's policy uses IAB TCF, but `iab` is not set."
		);
	});

	test('renders with `iab`', () => {
		expect(
			() =>
				render(BannerFixture, { props: { options: options({ cmpId: 28 }) } })
					.body
		).not.toThrow();
	});
});
