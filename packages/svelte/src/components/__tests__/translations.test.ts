/**
 * Tests for translation resolution through the consent context.
 *
 * Mirrors: packages/react/src/hooks/__tests__/use-translations.test.tsx
 */

import { render, screen, waitFor } from '@testing-library/svelte';
import type { Translations } from 'c15t';
import { clearConsentRuntimeCache } from 'c15t';
import { beforeEach, describe, expect, test } from 'vitest';
import ContextConsumerFixture from '../../__tests__/fixtures/context-consumer-fixture.svelte';

describe('Translations', () => {
	beforeEach(() => {
		clearConsentRuntimeCache();
		window.localStorage.clear();
	});

	test('returns English translations by default', async () => {
		render(ContextConsumerFixture, {
			options: {
				mode: 'offline',
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
				mode: 'offline',
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
				mode: 'offline',
				translations: {
					translations: {
						en: {
							cookieBanner: {
								title: 'Custom Cookie Settings',
								description: 'Custom Description',
							},
						} as Partial<Translations>,
					},
				},
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
				mode: 'offline',
				translations: {
					defaultLanguage: 'fr', // Language that doesn't exist
				},
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
				mode: 'offline',
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
				mode: 'offline',
				i18n: {
					locale: 'de',
					detectBrowserLanguage: false,
					messages: {
						de: {
							cookieBanner: {
								title: 'Neuer Titel',
							},
							common: {
								acceptAll: 'Alles',
							},
						},
					},
				},
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

	test('prefers i18n over legacy translations when both are provided', async () => {
		render(ContextConsumerFixture, {
			options: {
				mode: 'offline',
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
				i18n: {
					locale: 'fr',
					detectBrowserLanguage: false,
					messages: {
						fr: {
							cookieBanner: {
								title: 'Nouveau Titre',
							},
						},
					},
				},
			},
		});

		await waitFor(() => {
			expect(screen.getByTestId('translation-banner-title')).toHaveTextContent(
				'Nouveau Titre'
			);
		});
	});
});
