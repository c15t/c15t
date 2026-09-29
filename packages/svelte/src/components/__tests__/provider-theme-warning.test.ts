/**
 * The provider applies slots and `consentActions` from `theme`, but not
 * design tokens: those need `generateThemeCSS` output in the page. Passing
 * tokens without it used to do nothing, silently.
 */
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { MockInstance } from 'vitest';

import ThemeSwapFixture from '../../__tests__/fixtures/theme-swap-fixture.svelte';
import { testOffline } from '../../__tests__/test-offline';

const warningsAbout = (spy: MockInstance) =>
	spy.mock.calls.filter(([message]) =>
		String(message).includes('`theme` tokens')
	);

describe('ConsentManagerProvider theme tokens warning', () => {
	let warn: MockInstance;

	beforeEach(() => {
		warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	});

	afterEach(() => {
		warn.mockRestore();
		document.getElementById('c15t-theme')?.remove();
	});

	test('warns when theme tokens have no stylesheet on the page', async () => {
		render(ThemeSwapFixture, {
			mode: testOffline(),
			theme: { colors: { primary: '#146b56' } },
		});
		await tick();

		expect(warningsAbout(warn)).toHaveLength(1);
	});

	test('stays quiet when the page renders the theme stylesheet', async () => {
		const style = document.createElement('style');
		style.id = 'c15t-theme';
		document.head.append(style);

		render(ThemeSwapFixture, {
			mode: testOffline(),
			theme: { colors: { primary: '#146b56' } },
		});
		await tick();

		expect(warningsAbout(warn)).toHaveLength(0);
	});

	test('stays quiet for slots and consent actions, which the provider applies', async () => {
		render(ThemeSwapFixture, {
			mode: testOffline(),
			theme: {
				consentActions: { accept: { variant: 'primary' } },
				slots: { consentBannerCard: 'my-card' },
			},
		});
		await tick();

		expect(warningsAbout(warn)).toHaveLength(0);
	});
});
