import type { Translations } from '@c15t/core';
import { beforeEach, describe, expect, test } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/v3/providers/consent-manager-provider';

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

describe('useTranslations', () => {
	beforeEach(() => {
		// Clear consent manager caches to ensure clean state between tests
		clearConsentRuntimeCache();
	});

	test('returns English translations by default', async () => {
		const { result } = await renderHook(() => useTranslations(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						noStyle: false,
					}}
				>
					{children}
				</ConsentManagerProvider>
			),
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

	test('returns German translations instead of English when German is selected', async () => {
		const { result } = await renderHook(() => useTranslations(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						noStyle: false,
						translations: {
							defaultLanguage: 'de',
							disableAutoLanguageSwitch: true,
							translations: {
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
					}}
				>
					{children}
				</ConsentManagerProvider>
			),
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
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						noStyle: false,
						translations: customTranslations,
					}}
				>
					{children}
				</ConsentManagerProvider>
			),
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

	test('falls back to English when selected language is not available', async () => {
		const { result } = await renderHook(() => useTranslations(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						noStyle: false,
						translations: {
							// Language that doesn't exist
							defaultLanguage: 'fr',
						},
					}}
				>
					{children}
				</ConsentManagerProvider>
			),
		});

		await createDeferredPromise((resolve) => setTimeout(resolve, 10));

		// Should fall back to English translations
		expect(result.current.cookieBanner.title).toBe('We value your privacy');
		expect(result.current.cookieBanner.description).toBe(
			'This site uses cookies to improve your browsing experience, analyze site traffic, and show personalized content.'
		);
		expect(result.current.consentManagerDialog.title).toBe('Privacy Settings');
		expect(result.current.common.acceptAll).toBe('Accept All');
		expect(result.current.common.rejectAll).toBe('Reject All');
		expect(result.current.common.customize).toBe('Customize');
		expect(result.current.common.save).toBe('Save Settings');
	});

	test('Custom English instead of English when German is selected', async () => {
		const { result } = await renderHook(() => useTranslations(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						noStyle: false,
						translations: {
							defaultLanguage: 'en',
							disableAutoLanguageSwitch: true,
							translations: {
								en: {
									common: {
										acceptAll: 'Custom English Accept All',
										customize: 'Custom English Customize',
										rejectAll: 'Custom English Reject All',
										save: 'Custom English Save',
									},
									consentManagerDialog: {
										title: 'Custom English Dialog Title',
									},
									consentTypes: {
										necessary: {
											description: 'Custom English Necessary Description',
											title: 'Custom English Necessary',
										},
									},
									cookieBanner: {
										description: 'Custom English Description',
										title: 'Custom English Title',
									},
								},
							},
						},
					}}
				>
					{children}
				</ConsentManagerProvider>
			),
		});

		await createDeferredPromise((resolve) => setTimeout(resolve, 20));

		expect(result.current.common.acceptAll).toBe('Custom English Accept All');
		expect(result.current.common.rejectAll).toBe('Custom English Reject All');
		expect(result.current.common.customize).toBe('Custom English Customize');
		expect(result.current.common.save).toBe('Custom English Save');
		expect(result.current.cookieBanner.title).toBe('Custom English Title');
		expect(result.current.cookieBanner.description).toBe(
			'Custom English Description'
		);
		expect(result.current.consentManagerDialog.title).toBe(
			'Custom English Dialog Title'
		);
		expect(result.current.consentTypes?.necessary?.title).toBe(
			'Custom English Necessary'
		);
	});

	test('supports the new i18n config shape', async () => {
		const { result } = await renderHook(() => useTranslations(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
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
						mode: 'offline',
						noStyle: false,
					}}
				>
					{children}
				</ConsentManagerProvider>
			),
		});

		await createDeferredPromise((resolve) => setTimeout(resolve, 10));

		expect(result.current.cookieBanner.title).toBe('Neuer Titel');
		expect(result.current.common.acceptAll).toBe('Alles');
	});

	test('prefers i18n over legacy translations when both are provided', async () => {
		const { result } = await renderHook(() => useTranslations(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						i18n: {
							detectBrowserLanguage: false,
							locale: 'fr',
							messages: {
								fr: {
									cookieBanner: {
										title: 'Nouveau Titre',
									},
								},
							},
						},
						mode: 'offline',
						noStyle: false,
						translations: {
							defaultLanguage: 'en',
							translations: {
								en: {
									cookieBanner: {
										title: 'Legacy Title',
									},
								},
							},
						},
					}}
				>
					{children}
				</ConsentManagerProvider>
			),
		});

		await createDeferredPromise((resolve) => setTimeout(resolve, 10));

		expect(result.current.cookieBanner.title).toBe('Nouveau Titre');
	});
});
