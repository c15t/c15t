/**
 * Tests for translation resolution through the consent context.
 *
 * Mirrors: packages/react/src/hooks/__tests__/use-translations.test.tsx
 */

import { custom } from '@c15t/core';
import type { KernelTranslations, Translations } from '@c15t/core';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { enTranslations } from '@c15t/translations';
import { render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, test } from 'vitest';

import ContextConsumerFixture from '../../__tests__/fixtures/context-consumer-fixture.svelte';
import { TEST_OPT_IN_RULE, testOffline } from '../../__tests__/test-offline';

const backendEnglish = {
	language: 'en',
	translations: {
		...enTranslations,
		cookieBanner: {
			...enTranslations.cookieBanner,
			description: 'Backend description',
			title: 'Backend title',
		},
	},
} as KernelTranslations;

const matchedResolution = () =>
	resolvePolicyRules({
		countryCode: null,
		regionCode: null,
		rules: [TEST_OPT_IN_RULE],
	});

const appTitle = {
	messages: {
		en: { cookieBanner: { title: 'App title' } } as Partial<Translations>,
	},
};

describe('Translations', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('returns English translations by default', async () => {
		render(ContextConsumerFixture, {
			options: {
				mode: testOffline(),
			},
		});

		await waitFor(() => {
			expect(screen.getByTestId('translation-banner-title')).toHaveTextContent(
				'We value your privacy'
			);
			expect(
				screen.getByTestId('translation-banner-description')
			).toHaveTextContent(
				'This site uses cookies to improve your browsing experience, analyze site traffic, and show personalized content.'
			);
			expect(screen.getByTestId('translation-dialog-title')).toHaveTextContent(
				'Privacy Settings'
			);
			expect(screen.getByTestId('translation-accept-all')).toHaveTextContent(
				'Accept All'
			);
			expect(screen.getByTestId('translation-reject-all')).toHaveTextContent(
				'Reject All'
			);
			expect(screen.getByTestId('translation-customize')).toHaveTextContent(
				'Customize'
			);
			expect(screen.getByTestId('translation-save')).toHaveTextContent(
				'Save Settings'
			);
			expect(
				screen.getByTestId('translation-necessary-title')
			).toHaveTextContent('Strictly Necessary');
		});
	});

	test('returns German translations when German is selected', async () => {
		render(ContextConsumerFixture, {
			options: {
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
				mode: testOffline(),
			},
		});

		await waitFor(() => {
			expect(screen.getByTestId('translation-banner-title')).toHaveTextContent(
				'German Title'
			);
			expect(
				screen.getByTestId('translation-banner-description')
			).toHaveTextContent('German Description');
			expect(screen.getByTestId('translation-dialog-title')).toHaveTextContent(
				'German Dialog Title'
			);
			expect(screen.getByTestId('translation-accept-all')).toHaveTextContent(
				'German Accept All'
			);
			expect(screen.getByTestId('translation-reject-all')).toHaveTextContent(
				'German Reject All'
			);
			expect(screen.getByTestId('translation-customize')).toHaveTextContent(
				'German Customize'
			);
			expect(screen.getByTestId('translation-save')).toHaveTextContent(
				'German Save'
			);
			expect(
				screen.getByTestId('translation-necessary-title')
			).toHaveTextContent('German Necessary');
		});
	});

	test('merges custom translations with defaults', async () => {
		render(ContextConsumerFixture, {
			options: {
				i18n: {
					messages: {
						en: {
							cookieBanner: {
								description: 'Custom Description',

								title: 'Custom Cookie Settings',
							},
						} as Partial<Translations>,
					},
				},
				mode: testOffline(),
			},
		});

		await waitFor(() => {
			// Custom translations should override defaults
			expect(screen.getByTestId('translation-banner-title')).toHaveTextContent(
				'Custom Cookie Settings'
			);
			expect(
				screen.getByTestId('translation-banner-description')
			).toHaveTextContent('Custom Description');

			// Other translations should fall back to defaults
			expect(screen.getByTestId('translation-dialog-title')).toHaveTextContent(
				'Privacy Settings'
			);
			expect(screen.getByTestId('translation-accept-all')).toHaveTextContent(
				'Accept All'
			);
			expect(screen.getByTestId('translation-reject-all')).toHaveTextContent(
				'Reject All'
			);
			expect(screen.getByTestId('translation-customize')).toHaveTextContent(
				'Customize'
			);
			expect(screen.getByTestId('translation-save')).toHaveTextContent(
				'Save Settings'
			);
		});
	});

	test('falls back to English when selected language is not available', async () => {
		render(ContextConsumerFixture, {
			options: {
				i18n: {
					detectBrowserLanguage: false,
					// Language with no messages provided
					locale: 'fr',
					messages: {},
				},
				mode: testOffline(),
			},
		});

		await waitFor(() => {
			expect(screen.getByTestId('translation-banner-title')).toHaveTextContent(
				'We value your privacy'
			);
			expect(screen.getByTestId('translation-dialog-title')).toHaveTextContent(
				'Privacy Settings'
			);
			expect(screen.getByTestId('translation-accept-all')).toHaveTextContent(
				'Accept All'
			);
		});
	});

	test('Custom English overrides default English', async () => {
		render(ContextConsumerFixture, {
			options: {
				i18n: {
					detectBrowserLanguage: false,
					locale: 'en',
					messages: {
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
				mode: testOffline(),
			},
		});

		await waitFor(() => {
			expect(screen.getByTestId('translation-accept-all')).toHaveTextContent(
				'Custom English Accept All'
			);
			expect(screen.getByTestId('translation-reject-all')).toHaveTextContent(
				'Custom English Reject All'
			);
			expect(screen.getByTestId('translation-customize')).toHaveTextContent(
				'Custom English Customize'
			);
			expect(screen.getByTestId('translation-save')).toHaveTextContent(
				'Custom English Save'
			);
			expect(screen.getByTestId('translation-banner-title')).toHaveTextContent(
				'Custom English Title'
			);
			expect(
				screen.getByTestId('translation-banner-description')
			).toHaveTextContent('Custom English Description');
			expect(screen.getByTestId('translation-dialog-title')).toHaveTextContent(
				'Custom English Dialog Title'
			);
			expect(
				screen.getByTestId('translation-necessary-title')
			).toHaveTextContent('Custom English Necessary');
		});
	});

	test('supports the new i18n config shape', async () => {
		render(ContextConsumerFixture, {
			options: {
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
				mode: testOffline(),
			},
		});

		await waitFor(() => {
			expect(screen.getByTestId('translation-banner-title')).toHaveTextContent(
				'Neuer Titel'
			);
			expect(screen.getByTestId('translation-accept-all')).toHaveTextContent(
				'Alles'
			);
		});
	});

	test('an app override survives hosted init translations for the same language', async () => {
		render(ContextConsumerFixture, {
			options: {
				i18n: appTitle,
				mode: custom({
					init: () =>
						Promise.resolve({
							policyResolution: writePolicyResolutionWire(matchedResolution()),
							translations: backendEnglish,
						}),
				}),
			},
		});

		await waitFor(() => {
			expect(
				screen.getByTestId('translation-banner-description')
			).toHaveTextContent('Backend description');
		});
		expect(screen.getByTestId('translation-banner-title')).toHaveTextContent(
			'App title'
		);
	});

	test('an app override survives a SvelteKit prefetch for the same language', () => {
		render(ContextConsumerFixture, {
			options: {
				i18n: appTitle,
				mode: testOffline(),
				prefetch: {
					initialPolicyResolution: matchedResolution(),
					initialTranslations: backendEnglish,
				},
			},
		});

		expect(screen.getByTestId('translation-banner-title')).toHaveTextContent(
			'App title'
		);
		expect(
			screen.getByTestId('translation-banner-description')
		).toHaveTextContent('Backend description');
	});
});
