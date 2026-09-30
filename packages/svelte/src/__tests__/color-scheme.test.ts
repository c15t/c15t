import { custom } from '@c15t/core';
import { render } from '@testing-library/svelte';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { ConsentManagerOptions } from '../lib/types';
import Fixture from './fixtures/color-scheme-fixture.svelte';
import { policyFixture } from './policy-fixture';

const root = document.documentElement;
const isDark = () => root.classList.contains('c15t-dark');

const renderWith = (colorScheme?: ConsentManagerOptions['colorScheme']) => {
	const options = {
		mode: custom({}),
		persistence: false,
		prefetch: policyFixture(),
	} as ConsentManagerOptions;
	if (colorScheme !== undefined) {
		options.colorScheme = colorScheme;
	}
	return render(Fixture, { options });
};

/** A `prefers-color-scheme` query that reports `dark`. */
const stubSystemDark = (dark: boolean) =>
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({
			addEventListener: () => undefined,
			matches: dark,
			removeEventListener: () => undefined,
		}))
	);

afterEach(() => {
	vi.unstubAllGlobals();
	root.className = '';
});

describe('ConsentManagerProvider colorScheme', () => {
	test('unset mirrors a .dark class on <html>, as React and Vue do', async () => {
		stubSystemDark(false);
		root.classList.add('dark');
		const result = renderWith();
		await vi.waitFor(() => expect(isDark()).toBe(true));

		root.classList.remove('dark');
		await vi.waitFor(() => expect(isDark()).toBe(false));
		result.unmount();
	});

	test('unset mirrors .dark where matchMedia is missing', async () => {
		vi.stubGlobal('matchMedia', undefined);
		root.classList.add('dark');
		const result = renderWith();
		await vi.waitFor(() => expect(isDark()).toBe(true));
		result.unmount();
	});

	test('null leaves c15t-dark to the site', async () => {
		stubSystemDark(true);
		root.classList.add('dark');
		const result = renderWith(null);
		await new Promise((resolve) => {
			setTimeout(resolve, 20);
		});
		expect(isDark()).toBe(false);
		result.unmount();
	});

	test('system follows prefers-color-scheme', async () => {
		stubSystemDark(true);
		const result = renderWith('system');
		await vi.waitFor(() => expect(isDark()).toBe(true));
		result.unmount();
	});
});
