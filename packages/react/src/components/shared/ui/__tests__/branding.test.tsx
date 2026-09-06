import { defaultTranslationConfig } from '@c15t/core';
import type { ComponentProps, ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { useConsentManager } from '~/component-hooks/use-consent-manager';
import { ConsentDialogFooter } from '~/components/consent-dialog/atoms/card';
import { ConsentProvider } from '~/provider';
import { offline } from '~/transports/offline';

import { BrandingCompactLogo, BrandingLink } from '../branding';

type ConsentManagerState = ReturnType<typeof useConsentManager>;

const createMockState = function createMockState(
	overrides: Partial<ConsentManagerState> = {}
): ConsentManagerState {
	return {
		activeUI: 'dialog',
		branding: 'c15t',
		consentCategories: [
			'necessary',
			'functionality',
			'experience',
			'marketing',
			'measurement',
		],
		consentInfo: null,
		consentTypes: [],
		consents: {
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
		},
		getDisplayedConsents: vi.fn(() => []),
		has: vi.fn(),
		hasConsented: vi.fn(),
		model: 'opt-in',
		policyBanner: {},
		policyCategories: null,
		policyDialog: {},
		policyScopeMode: null,
		saveConsents: vi.fn().mockResolvedValue(undefined),
		selectedConsents: {
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
		},
		setActiveUI: vi.fn(),
		setConsent: vi.fn(),
		setSelectedConsent: vi.fn(),
		translationConfig: defaultTranslationConfig,
		...overrides,
	} as unknown as ConsentManagerState;
};

const createConsentTree = function createConsentTree(
	ui: ReactElement,
	stateOverrides: Partial<ConsentManagerState> = {},
	providerOverrides: Partial<
		ComponentProps<typeof ConsentProvider>['options']
	> = {}
) {
	const state = createMockState(stateOverrides);

	return (
		<ConsentProvider
			options={{
				components: providerOverrides.components,
				mode: offline(),
				persistence: false,
				prefetch: {
					initialBranding: state.branding,
					initialConsents: state.consents,
					initialPolicy: {
						consent: {
							categories: state.consentCategories,
							scopeMode: state.policyScopeMode ?? 'permissive',
						},
						id: 'branding-test-policy',
						model: state.model ?? 'opt-in',
						ui: {
							banner: state.policyBanner,
							dialog: state.policyDialog,
							mode: state.activeUI === 'dialog' ? 'dialog' : 'banner',
						},
					},
					initialTranslations: {
						language: state.translationConfig.defaultLanguage,
						translations:
							state.translationConfig.translations[
								state.translationConfig.defaultLanguage
							] ?? state.translationConfig.translations.en,
					},
				},
				theme: providerOverrides.theme,
			}}
		>
			{ui}
		</ConsentProvider>
	);
};

const renderWithConsentState = async function renderWithConsentState(
	...args: Parameters<typeof createConsentTree>
) {
	await render(createConsentTree(...args));
};

describe('BrandingLink', () => {
	test('maps deprecated consent branding to the INTH tag treatment', async () => {
		await renderWithConsentState(
			<BrandingLink
				hideBranding={false}
				variant="banner-tag"
				data-testid="branding-link"
			/>,
			{ branding: 'consent' }
		);

		await vi.waitFor(() => {
			const link = document.querySelector(
				'[data-testid="branding-link"]'
			) as HTMLAnchorElement | null;
			expect(link).toBeInTheDocument();
			expect(link).toHaveAttribute('data-branding', 'inth');
			expect(link).toHaveAttribute('data-variant', 'banner-tag');
			expect(link?.href).toContain('inth.com');
		});
	});

	test('renders the branding copy from translations and preserves LTR wordmark', async () => {
		await renderWithConsentState(
			<BrandingLink
				hideBranding={false}
				variant="banner-tag"
				data-testid="branding-link"
			/>,
			{
				translationConfig: {
					defaultLanguage: 'he',
					translations: {
						...defaultTranslationConfig.translations,
						he: {
							...defaultTranslationConfig.translations.en,
							common: {
								...defaultTranslationConfig.translations.en.common,
								securedBy: 'מאובטח על ידי',
							},
						},
					},
				},
			}
		);

		await vi.waitFor(() => {
			const link = document.querySelector(
				'[data-testid="branding-link"]'
			) as HTMLAnchorElement | null;
			expect(link).toBeInTheDocument();
			expect(link).not.toHaveAttribute('dir');
			expect(link).toHaveTextContent('מאובטח על ידי');
			expect(link?.querySelector('[dir="ltr"]')).toBeInTheDocument();
		});
	});

	test('uses the dialog tag variant in the default dialog footer', async () => {
		await renderWithConsentState(<ConsentDialogFooter hideBranding={false} />, {
			branding: 'inth',
		});

		await vi.waitFor(() => {
			const link = document.querySelector(
				'[data-testid="consent-dialog-branding"]'
			);
			expect(link).toBeInTheDocument();
			expect(link).toHaveAttribute('data-branding', 'inth');
			expect(link).toHaveAttribute('data-variant', 'dialog-tag');
		});
	});

	test('applies theme slot styles to branding tags', async () => {
		await renderWithConsentState(
			<BrandingLink
				hideBranding={false}
				variant="banner-tag"
				slotContext="banner"
				data-testid="branding-link"
			/>,
			{},
			{
				components: {
					tag: {
						banner: {
							className: 'branding-theme-marker',
						},
					},
				},
			}
		);

		await vi.waitFor(() => {
			const link = document.querySelector(
				'[data-testid="branding-link"]'
			) as HTMLAnchorElement | null;
			expect(link).toBeInTheDocument();
			expect(link?.className).toContain('branding-theme-marker');
		});
	});

	test('wraps the INTH full logo in the shared LTR wordmark container', async () => {
		await renderWithConsentState(
			<BrandingLink
				hideBranding={false}
				variant="banner-tag"
				data-testid="branding-link"
			/>,
			{ branding: 'inth' }
		);

		await vi.waitFor(() => {
			const link = document.querySelector(
				'[data-testid="branding-link"]'
			) as HTMLAnchorElement | null;
			const wordmark = link?.querySelector('[dir="ltr"]');
			expect(wordmark).toBeInTheDocument();
			expect(wordmark?.querySelector('svg')).toBeInTheDocument();
		});
	});

	test('wraps the c15t full logo mark in the shared wordmark container', async () => {
		await renderWithConsentState(
			<BrandingLink
				hideBranding={false}
				variant="banner-tag"
				data-testid="branding-link"
			/>
		);

		await vi.waitFor(() => {
			const link = document.querySelector(
				'[data-testid="branding-link"]'
			) as HTMLAnchorElement | null;
			const wordmark = link?.querySelector('[dir="ltr"]');
			const mark = wordmark?.querySelector('[class*="brandingC15TMark"]');
			expect(wordmark).toBeInTheDocument();
			expect(mark).toBeInTheDocument();
			expect(mark?.querySelector('svg')).toBeInTheDocument();
			expect(wordmark).toHaveTextContent('c15t');
		});
	});

	test('adds the referral hostname only after hydration', async () => {
		// The server has no `window`. If the hydration render produced a
		// different href than the server markup, React would log an attribute
		// mismatch and leave the server value in place, so the referral
		// parameter has to wait for hydration.
		const markup = renderToString(
			createConsentTree(
				<BrandingLink
					hideBranding={false}
					variant="banner-tag"
					data-testid="branding-link"
				/>
			)
		);
		expect(markup).toContain('href="https://c15t.com"');
		expect(markup).not.toContain('?ref=');

		await renderWithConsentState(
			<BrandingLink
				hideBranding={false}
				variant="banner-tag"
				data-testid="branding-link"
			/>
		);

		await vi.waitFor(() => {
			const link = document.querySelector('[data-testid="branding-link"]');
			expect(link).toHaveAttribute(
				'href',
				`https://c15t.com?ref=${window.location.hostname}`
			);
		});
	});

	test('hides branding when disabled', async () => {
		await renderWithConsentState(
			<BrandingLink
				hideBranding
				variant="banner-tag"
				data-testid="branding-link"
			/>,
			{ branding: 'inth' }
		);

		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-testid="branding-link"]')
			).not.toBeInTheDocument();
		});
	});
});

describe('BrandingCompactLogo', () => {
	test('renders the INTH compact mark for the deprecated consent alias', async () => {
		render(
			<BrandingCompactLogo
				branding="consent"
				data-testid="branding-icon"
			/>
		);

		await vi.waitFor(() => {
			const title = document.querySelector(
				'[data-testid="branding-icon"] title'
			);
			expect(title).toBeInTheDocument();
			expect(title?.textContent).toBe('INTH');
		});
	});
});
