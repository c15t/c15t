import type { ConsentStoreState } from 'c15t';
import { defaultTranslationConfig } from 'c15t';
import type { ReactElement } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsentDialogFooter } from '~/components/consent-dialog/atoms/card';
import { ConsentStateContext } from '~/context/consent-manager-context';
import { GlobalThemeContext } from '~/context/theme-context';
import { BrandingCompactLogo, BrandingLink } from '../branding';

function createMockState(
	overrides: Partial<ConsentStoreState> = {}
): ConsentStoreState {
	return {
		activeUI: 'dialog',
		model: 'opt-in',
		translationConfig: defaultTranslationConfig,
		branding: 'c15t',
		consents: {
			necessary: true,
			functionality: false,
			experience: false,
			marketing: false,
			measurement: false,
		},
		selectedConsents: {
			necessary: true,
			functionality: false,
			experience: false,
			marketing: false,
			measurement: false,
		},
		consentInfo: null,
		consentCategories: [
			'necessary',
			'functionality',
			'experience',
			'marketing',
			'measurement',
		],
		consentTypes: [],
		policyCategories: null,
		policyScopeMode: null,
		policyBanner: {},
		policyDialog: {},
		saveConsents: vi.fn().mockResolvedValue(undefined),
		setConsent: vi.fn(),
		setSelectedConsent: vi.fn(),
		setActiveUI: vi.fn(),
		has: vi.fn(),
		hasConsented: vi.fn(),
		getDisplayedConsents: vi.fn(() => []),
		...overrides,
	} as unknown as ConsentStoreState;
}

async function renderWithConsentState(
	ui: ReactElement,
	stateOverrides: Partial<ConsentStoreState> = {},
	themeOverrides: {
		theme?: {
			slots?: Record<string, string>;
		};
	} = {}
) {
	const state = createMockState(stateOverrides);

	await render(
		<GlobalThemeContext.Provider value={themeOverrides}>
			<ConsentStateContext.Provider
				value={{
					state,
					store: {
						getState: () => state,
						subscribe: () => () => undefined,
						setState: () => undefined,
					},
					manager: null,
				}}
			>
				{ui}
			</ConsentStateContext.Provider>
		</GlobalThemeContext.Provider>
	);
}

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
				themeKey="consentBannerTag"
				data-testid="branding-link"
			/>,
			{},
			{
				theme: {
					slots: {
						consentBannerTag: 'branding-theme-marker',
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
			<BrandingCompactLogo branding="consent" data-testid="branding-icon" />
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
