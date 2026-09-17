import { EXPERIMENT_STORAGE_KEY } from '@c15t/core';
import type { ConsentExperiment, ConsentKernel } from '@c15t/core';
import { render } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import ProviderOnlyFixture from './fixtures/provider-only-fixture.svelte';
import { testOffline } from './test-offline';

const experiment: ConsentExperiment = {
	id: 'banner-shape',
	variants: {
		bar: { prompt: { variant: 'bar' } },
		floating: { prompt: { variant: 'floating' } },
	},
};

const mount = function mount(overrides: Partial<ConsentExperiment> = {}) {
	let kernel: ConsentKernel | undefined;
	const result = render(ProviderOnlyFixture, {
		onKernel: (value: ConsentKernel) => {
			kernel = value;
		},
		options: {
			experiment: { ...experiment, ...overrides },
			mode: testOffline(),
			persistence: false,
		},
	});
	if (!kernel) {
		throw new Error('The provider did not expose its kernel');
	}
	return { kernel, unmount: result.unmount };
};

beforeEach(() => {
	localStorage.clear();
});
afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

test('built-in assignment lands in the snapshot on mount and is stored', async () => {
	const { kernel, unmount } = mount();
	try {
		await vi.waitFor(() =>
			expect(kernel.getSnapshot().experiment).toMatchObject({
				assignedBy: 'c15t',
				id: 'banner-shape',
			})
		);
		const { variant } = kernel.getSnapshot().experiment ?? {};
		expect(['bar', 'floating']).toContain(variant);
		expect(
			JSON.parse(localStorage.getItem(EXPERIMENT_STORAGE_KEY) ?? 'null')
		).toMatchObject({ id: 'banner-shape', variant });
	} finally {
		unmount();
	}
});

test('a host variant is known from the first snapshot', async () => {
	const { kernel, unmount } = mount({ variant: 'bar' });
	try {
		const expected = {
			acknowledgedDiagnostics: false,
			assignedBy: 'host',
			id: 'banner-shape',
			variant: 'bar',
		};
		expect(kernel.getServerSnapshot().experiment).toEqual(expected);
		await vi.waitFor(() =>
			expect(kernel.getSnapshot().experiment).toEqual(expected)
		);
	} finally {
		unmount();
	}
});
