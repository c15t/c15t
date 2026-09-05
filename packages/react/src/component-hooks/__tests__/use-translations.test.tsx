import type { Translations } from '@c15t/core';
import { describe, expect, test } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import type { ComponentFixtureOptions as ConsentProviderOptions } from '~/__tests__/component-fixture-provider';
import { offline } from '~/transports/offline';

import { useTranslations } from '../use-translations';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

const createWrapper = function createWrapper(
	options: Partial<ConsentProviderOptions> = {}
) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<ConsentProvider
				options={{ mode: offline(), persistence: false, ...options }}
			>
				{children}
			</ConsentProvider>
		);
	};
};

describe('useTranslations', () => {
	test('returns English translations by default', async () => {
		const { result } = await renderHook(() => useTranslations(), {
			wrapper: createWrapper(),
		});

		await createDeferredPromise((resolve) => setTimeout(resolve, 10));

		expect(result.current.cookieBanner.title).toBe('We value your privacy');
		expect(result.current.cookieBanner.description).toBe(
			'This site uses cookies to improve your browsing experience, analyze site traffic, and show personalized content.'
		);
		expect(result.current.consentManagerDialog.title).toBe('Privacy Settings');
		expect(result.current.common.acceptAll).toBe('Accept All');
		expect(result.current.common.rejectAll).toBe('Reject All');
		expect(result.current.common.customize).toBe('Customize');
		expect(result.current.common.save).toBe('Save Settings');
		expect(result.current.consentTypes?.necessary?.title).toBe(
			'Strictly Necessary'
		);
	});

	test('returns German translations when German is selected via i18n', async () => {
		const { result } = await renderHook(() => useTranslations(), {
			wrapper: createWrapper({
				i18n: {
					detectBrowserLanguage: false,
					locale: 'de',
					messages: {
						de: {
							common: {
								acceptAll: 'German Accept All',
								customize: 'German Customize',
								rejectAll: 'German Reject All',
								save: 'German Save',
							},
							consentManagerDialog: {
								title: 'German Dialog Title',
							},
							consentTypes: {
								necessary: {
									description: 'German Necessary Description',
									title: 'German Necessary',
								},
							},
							cookieBanner: {
								description: 'German Description',
								title: 'German Title',
							},
						},
					},
				},
			}),
		});

		await createDeferredPromise((resolve) => setTimeout(resolve, 10));

		expect(result.current.cookieBanner.title).toBe('German Title');
		expect(result.current.cookieBanner.description).toBe('German Description');
		expect(result.current.consentManagerDialog.title).toBe(
			'German Dialog Title'
		);
		expect(result.current.common.acceptAll).toBe('German Accept All');
		expect(result.current.common.rejectAll).toBe('German Reject All');
		expect(result.current.common.customize).toBe('German Customize');
		expect(result.current.common.save).toBe('German Save');
		expect(result.current.consentTypes?.necessary?.title).toBe(
			'German Necessary'
		);
	});

	test('merges custom translations with defaults', async () => {
		const customTranslations = {
			translations: {
				en: {
					cookieBanner: {
						description: 'Custom Description',
						title: 'Custom Cookie Settings',
					},
				} as Partial<Translations>,
			},
		};

		const { result } = await renderHook(() => useTranslations(), {
			wrapper: createWrapper({
				i18n: { messages: customTranslations.translations },
			}),
		});

		await createDeferredPromise((resolve) => setTimeout(resolve, 10));

		// Custom translations should override defaults
		expect(result.current.cookieBanner.title).toBe('Custom Cookie Settings');
		expect(result.current.cookieBanner.description).toBe('Custom Description');

		// Other translations should fall back to defaults
		expect(result.current.consentManagerDialog.title).toBe('Privacy Settings');
		expect(result.current.common.acceptAll).toBe('Accept All');
		expect(result.current.common.rejectAll).toBe('Reject All');
		expect(result.current.common.customize).toBe('Customize');
		expect(result.current.common.save).toBe('Save Settings');
	});

	test('falls back to English when selected language has no messages', async () => {
		const { result } = await renderHook(() => useTranslations(), {
			wrapper: createWrapper({
				translations: {
					// Language that doesn't exist
					defaultLanguage: 'fr',
				},
			}),
		});

		await createDeferredPromise((resolve) => setTimeout(resolve, 10));

		// Should fall back to English translations
		expect(result.current.cookieBanner.title).toBe('We value your privacy');
		expect(result.current.consentManagerDialog.title).toBe('Privacy Settings');
		expect(result.current.common.acceptAll).toBe('Accept All');
		expect(result.current.common.rejectAll).toBe('Reject All');
		expect(result.current.common.customize).toBe('Customize');
		expect(result.current.common.save).toBe('Save Settings');
	});

	test('supports the i18n config shape', async () => {
		const { result } = await renderHook(() => useTranslations(), {
			wrapper: createWrapper({
				i18n: {
					detectBrowserLanguage: false,
					locale: 'de',
					messages: {
						de: {
							common: {
								acceptAll: 'Alles',
							},
							cookieBanner: {
								title: 'Neuer Titel',
							},
						},
					},
				},
			}),
		});

		await createDeferredPromise((resolve) => setTimeout(resolve, 10));

		expect(result.current.cookieBanner.title).toBe('Neuer Titel');
		expect(result.current.common.acceptAll).toBe('Alles');
	});
});
