/**
 * Changing the consent language at runtime loads copy in that language,
 * through `useSetLanguage()` in any mode and through `overrides.language`
 * in offline mode. A language a server prefetch detected from
 * `Accept-Language` does not switch offline copy.
 */
import type { ConsentKernel, InitContext, KernelConfig } from '@c15t/core';
import { writePolicyResolutionWire } from '@c15t/schema/types';
import { useContext, useEffect } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { KernelContext } from '../context';
import { ConsentProvider, custom, offline, useSetLanguage } from '../index';
import type { ConsentProviderOptions } from '../provider';
import { policyFixture } from './policy-fixture';

const messages = {
	de: { cookieBanner: { title: 'Datenschutz' } },
	en: { cookieBanner: { title: 'Privacy' } },
};

let kernel: ConsentKernel;
let setLanguage: (code: string) => void;

const Capture = () => {
	const value = useContext(KernelContext);
	const set = useSetLanguage();
	useEffect(() => {
		if (value) {
			kernel = value;
		}
		setLanguage = set;
	}, [value, set]);
	return null;
};

const renderProvider = async function renderProvider(
	options: Omit<ConsentProviderOptions, 'persistence'>
) {
	const screen = await render(
		<ConsentProvider options={{ ...options, persistence: false }}>
			<Capture />
		</ConsentProvider>
	);
	await vi.waitFor(() =>
		expect(kernel.getSnapshot().policyPending).toBe(false)
	);
	return screen;
};

const title = () =>
	kernel.getSnapshot().translations?.translations.cookieBanner.title;

afterEach(() => vi.restoreAllMocks());

describe('useSetLanguage', () => {
	test('runs init with the new language', async () => {
		const init = vi.fn((ctx: InitContext) =>
			Promise.resolve({
				policyResolution: writePolicyResolutionWire(
					policyFixture().initialPolicyResolution
				),
				translations: {
					language: ctx.overrides.language ?? 'en',
					translations: {
						cookieBanner: { title: `title-${ctx.overrides.language ?? 'en'}` },
					} as never,
				},
			})
		);
		await renderProvider({ mode: custom({ init }) });
		await vi.waitFor(() => expect(init).toHaveBeenCalledTimes(1));

		setLanguage('fr');

		await vi.waitFor(() => expect(init).toHaveBeenCalledTimes(2));
		expect(init.mock.calls[1]?.[0].overrides.language).toBe('fr');
		await vi.waitFor(() => expect(title()).toBe('title-fr'));
		expect(kernel.getSnapshot().translations?.language).toBe('fr');
	});

	test('setting the current language again runs no init', async () => {
		const init = vi.fn(() =>
			Promise.resolve({
				policyResolution: writePolicyResolutionWire(
					policyFixture().initialPolicyResolution
				),
			})
		);
		await renderProvider({ mode: custom({ init }) });
		setLanguage('de');
		await vi.waitFor(() => expect(init).toHaveBeenCalledTimes(2));

		setLanguage('de');
		await new Promise((resolve) => {
			setTimeout(resolve, 20);
		});

		expect(init).toHaveBeenCalledTimes(2);
	});

	test('a disabled provider stores the language without running init', async () => {
		const init = vi.fn(() =>
			Promise.resolve({
				policyResolution: writePolicyResolutionWire(
					policyFixture().initialPolicyResolution
				),
			})
		);
		await render(
			<ConsentProvider
				options={{ enabled: false, mode: custom({ init }), persistence: false }}
			>
				<Capture />
			</ConsentProvider>
		);
		await vi.waitFor(() => expect(kernel).toBeDefined());

		setLanguage('de');
		await new Promise((resolve) => {
			setTimeout(resolve, 20);
		});

		expect(init).not.toHaveBeenCalled();
		expect(kernel.getSnapshot().overrides.language).toBe('de');
		expect(kernel.getSnapshot().policyRule.id).toBe('disabled');
	});
});

describe('offline() language', () => {
	test('useSetLanguage switches to the copy for that language', async () => {
		await renderProvider({ i18n: { messages }, mode: offline() });
		expect(title()).toBe('Privacy');

		setLanguage('de');

		await vi.waitFor(() => expect(title()).toBe('Datenschutz'));
		expect(kernel.getSnapshot().translations?.language).toBe('de');
	});

	test('a language with no copy keeps the default copy', async () => {
		await renderProvider({ i18n: { messages }, mode: offline() });
		setLanguage('de');
		await vi.waitFor(() => expect(title()).toBe('Datenschutz'));

		setLanguage('fi');

		await vi.waitFor(() => expect(title()).toBe('Privacy'));
		expect(kernel.getSnapshot().translations?.language).toBe('en');
	});

	test('overrides.language picks the copy for that language', async () => {
		await renderProvider({
			i18n: { messages },
			mode: offline(),
			overrides: { language: 'de' },
		});

		await vi.waitFor(() => expect(title()).toBe('Datenschutz'));
	});

	const acceptLanguagePrefetch = (): KernelConfig => ({
		initialOverrides: { language: 'de' },
	});

	test('an Accept-Language prefetch does not switch the copy', async () => {
		await renderProvider({
			i18n: { messages },
			mode: offline(),
			prefetch: acceptLanguagePrefetch(),
		});

		expect(kernel.getSnapshot().overrides.language).toBe('de');
		expect(title()).toBe('Privacy');
	});

	test('a pending Accept-Language prefetch does not switch the copy', async () => {
		await renderProvider({
			i18n: { messages },
			mode: offline(),
			prefetch: Promise.resolve(acceptLanguagePrefetch()),
		});

		expect(kernel.getSnapshot().overrides.language).toBe('de');
		expect(title()).toBe('Privacy');

		// A later init for another reason keeps the startup copy too.
		kernel.set.overrides({ country: 'FR' });
		await kernel.commands.init();
		expect(title()).toBe('Privacy');
	});

	test('after an Accept-Language prefetch, a chosen language still switches', async () => {
		await renderProvider({
			i18n: {
				messages: {
					...messages,
					fr: { cookieBanner: { title: 'Confidentialité' } },
				},
			},
			mode: offline(),
			prefetch: acceptLanguagePrefetch(),
		});

		setLanguage('fr');

		await vi.waitFor(() => expect(title()).toBe('Confidentialité'));
	});
});
