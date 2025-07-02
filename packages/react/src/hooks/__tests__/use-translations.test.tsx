import type { Translations } from 'c15t';
import { beforeEach, describe, expect, test } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import {
	ConsentManagerProvider,
	clearConsentManagerCache,
} from '~/providers/consent-manager-provider';
import { useTranslations } from '../use-translations';

describe('useTranslations', () => {
	beforeEach(() => {
		// Clear consent manager caches to ensure clean state between tests
		clearConsentManagerCache();
	});

	test('returns English translations by default', async () => {
		const { result } = renderHook(() => useTranslations(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						react: {
							noStyle: false,
						},
					}}
				>
					{children}
				</ConsentManagerProvider>
			),
		});

		await new Promise((resolve) => setTimeout(resolve, 10));

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
		const { result } = renderHook(() => useTranslations(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						react: {
							noStyle: false,
						},
						translations: {
							defaultLanguage: 'de',
							disableAutoLanguageSwitch: true,
							translations: {
								de: {
									common: {
										acceptAll: 'German Accept All',
										rejectAll: 'German Reject All',
										customize: 'German Customize',
										save: 'German Save',
									},
									cookieBanner: {
										title: 'German Title',
										description: 'German Description',
									},
									consentManagerDialog: {
										title: 'German Dialog Title',
									},
									consentTypes: {
										necessary: {
											title: 'German Necessary',
											description: 'German Necessary Description',
										},
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

		await new Promise((resolve) => setTimeout(resolve, 10));

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
						title: 'Custom Cookie Settings',
						description: 'Custom Description',
					},
				} as Partial<Translations>,
			},
		};

		const { result } = renderHook(() => useTranslations(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						react: {
							noStyle: false,
						},
						translations: customTranslations,
					}}
				>
					{children}
				</ConsentManagerProvider>
			),
		});

		await new Promise((resolve) => setTimeout(resolve, 10));

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
		const { result } = renderHook(() => useTranslations(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						react: {
							noStyle: false,
						},
						translations: {
							defaultLanguage: 'fr', // Language that doesn't exist
						},
					}}
				>
					{children}
				</ConsentManagerProvider>
			),
		});

		await new Promise((resolve) => setTimeout(resolve, 10));

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
		const { result } = renderHook(() => useTranslations(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						react: {
							noStyle: false,
						},
						translations: {
							defaultLanguage: 'en',
							disableAutoLanguageSwitch: true,
							translations: {
								en: {
									common: {
										acceptAll: 'Custom English Accept All',
										rejectAll: 'Custom English Reject All',
										customize: 'Custom English Customize',
										save: 'Custom English Save',
									},
									cookieBanner: {
										title: 'Custom English Title',
										description: 'Custom English Description',
									},
									consentManagerDialog: {
										title: 'Custom English Dialog Title',
									},
									consentTypes: {
										necessary: {
											title: 'Custom English Necessary',
											description: 'Custom English Necessary Description',
										},
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

		await new Promise((resolve) => setTimeout(resolve, 20));

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
});
