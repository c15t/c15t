/**
 * The consent manager's chunk stays out of the page load: it loads once the
 * page has gone quiet while the banner is shown, at once on intent (hover,
 * focus or touch on Customize), and when the dialog opens.
 */
import type { InitOutput } from '@c15t/schema/types';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Component } from 'vue';
import { defineComponent, h } from 'vue';

import type { RuntimeConsentConfig } from '../runtime/kernel';

// Each import of the manager's module, and the idle preloads the page
// scheduled, run on demand instead of once the page goes quiet. The
// scheduler has its own tests in @c15t/ui.
const loads = { idle: [] as (() => void)[], manager: 0 };
const scheduleIdle = (task: () => void) => {
	loads.idle.push(task);
	return () => {
		loads.idle = loads.idle.filter((scheduled) => scheduled !== task);
	};
};
const mockManager = () => {
	loads.manager += 1;
	return {
		__esModule: true,
		default: defineComponent({
			render: () => h('div', { 'data-testid': 'consent-manager-stub' }),
		}),
	};
};
const initFixture: InitOutput = {
	branding: 'c15t',
	location: { countryCode: 'DE', regionCode: null },
	policyResolution: writePolicyResolutionWire(
		resolvePolicyRules({
			countryCode: null,
			regionCode: null,
			rules: [
				{
					categories: ['measurement'],
					id: 'policy_gdpr',
					match: { fallback: true },
					model: 'opt-in',
					prompt: 'choice',
					scopeMode: 'strict',
				},
			],
		})
	),
	policySnapshotToken: 'token_gdpr',
	translations: {
		language: 'en',
		translations: {
			cookieBanner: {
				description: 'Pick how c15t may use cookies.',
				title: 'Cookie choices',
			},
		},
	},
} as InitOutput;

const config: RuntimeConsentConfig = {
	backendURL: 'https://consent.example',
	consentCategories: ['necessary', 'measurement'],
	disableAnimation: true,
	domain: 'consent.example',
};

const byTestId = (testId: string) =>
	document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

const waitFor = async function waitFor(check: () => unknown) {
	for (let attempt = 0; attempt < 300 && !check(); attempt += 1) {
		// oxlint-disable-next-line no-await-in-loop -- Polling in order.
		await flushPromises();
		// oxlint-disable-next-line no-await-in-loop -- Polling in order.
		await new Promise((resolve) => {
			setTimeout(resolve, 10);
		});
	}
	return check();
};

const settle = async () => {
	await flushPromises();
	await new Promise((resolve) => {
		setTimeout(resolve, 20);
	});
	await flushPromises();
};

const runIdle = () => {
	const pending = loads.idle;
	loads.idle = [];
	for (const task of pending) {
		task();
	}
};

// A fresh module graph per test, so each test sees its own first import of
// the manager. The plugin and roots must come from the same graph.
const roots = {
	ConsentRoot: async () =>
		(await import('../runtime/components/root.vue')).default as Component,
	'Nuxt ConsentRoot': async () =>
		(await import('../runtime/components/nuxt-root.vue')).default as Component,
};

const mountRoot = async (name: keyof typeof roots) => {
	const { c15tVue } = await import('../index');
	const { resetIdleDialogPrefetchForTests } =
		await import('../runtime/components/lazy-surfaces');
	resetIdleDialogPrefetchForTests({ scheduleIdle });
	const Root = await roots[name]();
	const wrapper = mount(Root, {
		attachTo: document.body,
		global: { plugins: [[c15tVue, config]] },
	});
	expect(
		await waitFor(() => byTestId('consent-banner-customize-button'))
	).toBeTruthy();
	return wrapper;
};

beforeEach(() => {
	loads.idle = [];
	loads.manager = 0;
	vi.resetModules();
	// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is when the root loads this module. The factory counts loads and returns a stub, so the test needs no manager setup.
	vi.doMock('../runtime/components/manager.vue', mockManager);
	vi.stubGlobal(
		'fetch',
		vi.fn(
			() =>
				new Response(JSON.stringify(initFixture), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				})
		)
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
	document.body.innerHTML = '';
	window.localStorage.clear();
	document.cookie.split(';').forEach((cookie) => {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	});
});

// Each test evaluates the runtime afresh.
vi.setConfig({ testTimeout: 30_000 });

describe.each(Object.keys(roots) as (keyof typeof roots)[])('%s', (Root) => {
	test('does not load the manager during the page load', async () => {
		const wrapper = await mountRoot(Root);
		try {
			await settle();
			expect(loads.manager).toBe(0);
			expect(loads.idle).toHaveLength(1);
		} finally {
			wrapper.unmount();
		}
	});

	test('loads the manager in idle time while the banner is shown', async () => {
		const wrapper = await mountRoot(Root);
		try {
			await waitFor(() => loads.idle.length > 0);
			runIdle();
			await settle();
			expect(loads.manager).toBe(1);
		} finally {
			wrapper.unmount();
		}
	});

	test('skips the idle load when the banner closed first', async () => {
		const wrapper = await mountRoot(Root);
		try {
			await waitFor(() => loads.idle.length > 0);
			byTestId('consent-banner-accept-button')?.click();
			await waitFor(() => !byTestId('consent-banner-customize-button'));
			runIdle();
			await settle();
			expect(loads.manager).toBe(0);
		} finally {
			wrapper.unmount();
		}
	});

	test.each([
		// jsdom has no PointerEvent; the listener reads only the type.
		['hovered', () => new MouseEvent('pointerover', { bubbles: true })],
		['focused', () => new FocusEvent('focusin', { bubbles: true })],
	])('loads the manager when Customize is %s', async (_, createEvent) => {
		const wrapper = await mountRoot(Root);
		try {
			byTestId('consent-banner-accept-button')?.dispatchEvent(
				new MouseEvent('pointerover', { bubbles: true })
			);
			await settle();
			expect(loads.manager).toBe(0);

			byTestId('consent-banner-customize-button')?.dispatchEvent(createEvent());
			await settle();
			expect(loads.manager).toBe(1);
		} finally {
			wrapper.unmount();
		}
	});

	test('opens the manager before any preload ran', async () => {
		const wrapper = await mountRoot(Root);
		try {
			byTestId('consent-banner-customize-button')?.click();
			expect(
				await waitFor(() => byTestId('consent-manager-stub'))
			).toBeTruthy();
			expect(loads.manager).toBe(1);
		} finally {
			wrapper.unmount();
		}
	});
});
