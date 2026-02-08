/**
 * Expanded component file generators
 * Generates separate files in consent-manager/ directory:
 * - provider.tsx (client provider wrapper)
 * - consent-banner.tsx (compound components)
 * - preference-center.tsx (compound component dialog)
 * - theme.ts (theme preset)
 *
 * Parameterized by FrameworkConfig so it can be reused across
 * Next.js App Router, TanStack Start, and other RSC frameworks.
 */

import type { ExpandedTheme } from '../../prompts/expanded-theme';
import type { FrameworkConfig } from './framework-config';

interface GenerateExpandedProviderOptions {
	enableSSR: boolean;
	enableDevTools: boolean;
	optionsText: string;
	framework: FrameworkConfig;
}

/**
 * Generates the client-side consent-manager/provider.tsx template
 *
 * @param options - Template generation options
 * @returns The complete client provider file content
 */
export function generateExpandedProviderTemplate({
	enableSSR,
	enableDevTools,
	optionsText,
	framework,
}: GenerateExpandedProviderOptions): string {
	const propsInterface = enableSSR
		? `interface Props {
	children: ReactNode;
	ssrData?: InitialDataPromise;
}`
		: `interface Props {
	children: ReactNode;
}`;

	const propsDestructure = enableSSR
		? '{ children, ssrData }: Props'
		: '{ children }: Props';

	const typeImports = enableSSR
		? `import type { InitialDataPromise } from '${framework.importSource}';`
		: '';

	const ssrDataOption = enableSSR ? '\n\t\t\t\tssrData,' : '';
	const devToolsImport = enableDevTools
		? "import { C15TDevTools } from '@c15t/dev-tools/react';\n"
		: '';

	return `'use client';

import type { ReactNode } from 'react';
import { ConsentManagerProvider } from '${framework.importSource}';
${typeImports}
${devToolsImport}import ConsentBanner from './consent-banner';
import PreferenceCenter from './preference-center';
import { theme } from './theme';

${propsInterface}

/**
 * Client-side consent manager provider with expanded components
 *
 * This component handles:
 * - Consent state management
 * - Cookie banner display (using compound components)
 * - Preference center dialog (using compound components)${enableSSR ? '\n * - SSR data hydration' : ''}
 *
 * Customize the appearance by editing:
 * - ./consent-banner.tsx - Banner layout and structure
 * - ./preference-center.tsx - Dialog layout and structure
 * - ./theme.ts - Colors, typography, and styling
 *
 * @see https://c15t.com/docs/frameworks/${framework.docsSlug}/customization
 */
export default function ConsentManagerClient(${propsDestructure}) {
	return (
		<ConsentManagerProvider
			options={{
				${optionsText}${ssrDataOption}
				theme,
				// Add your scripts here:
				// scripts: [
				//   googleTagManager({ id: 'GTM-XXXXXX' }),
				// ],
				// Add your callbacks here:
				// callbacks: {
				//   onConsentSet: (response) => console.log('Consent updated:', response),
				// },
			}}
		>
			<ConsentBanner />
			<PreferenceCenter />
			${enableDevTools ? "<C15TDevTools disabled={process.env.NODE_ENV === 'production'} />" : ''}
			{children}
		</ConsentManagerProvider>
	);
}
`;
}

/**
 * Generates the preference-center.tsx component using compound components
 *
 * @param framework - Framework-specific configuration
 * @returns The complete preference center file content
 */
export function generateExpandedPreferenceCenterTemplate(
	framework: FrameworkConfig
): string {
	return `'use client';

import { ConsentWidget } from '${framework.importSource}';
import { ConsentDialog } from '${framework.consentDialogImport}';

/**
 * Consent preference center using compound components
 *
 * This component uses compound components for full control over the dialog structure.
 * You can rearrange, remove, or add new elements as needed.
 *
 * Available components:
 * - ConsentDialog.Root - Container that handles visibility and animations
 * - ConsentDialog.Overlay - Background overlay
 * - ConsentDialog.Card - The dialog card styling wrapper
 * - ConsentDialog.Header - Container for title and description
 * - ConsentDialog.HeaderTitle - The dialog title text
 * - ConsentDialog.HeaderDescription - Description text
 * - ConsentDialog.Content - Main content area
 * - ConsentDialog.Footer - Container for action buttons
 * - ConsentWidget - The consent categories/purposes widget
 *
 * @see https://c15t.com/docs/frameworks/${framework.docsSlug}/consent-dialog
 */
export default function () {
	return (
		<ConsentDialog.Root>
			<ConsentDialog.Card>
				<ConsentDialog.Header>
					<ConsentDialog.HeaderTitle />
					<ConsentDialog.HeaderDescription />
				</ConsentDialog.Header>
				<ConsentDialog.Content>
					<ConsentWidget />
				</ConsentDialog.Content>
				<ConsentDialog.Footer />
			</ConsentDialog.Card>
		</ConsentDialog.Root>
	);
}
`;
}

/**
 * Generates the consent-banner.tsx component using compound components
 *
 * @param framework - Framework-specific configuration
 * @returns The complete cookie banner file content
 */
export function generateExpandedConsentBannerTemplate(
	framework: FrameworkConfig
): string {
	return `'use client';

import { ConsentBanner } from '${framework.consentBannerImport}';

/**
 * Cookie consent banner using compound components
 *
 * This component uses compound components for full control over the banner structure.
 * You can rearrange, remove, or add new elements as needed.
 *
 * Available components:
 * - ConsentBanner.Root - Container that handles visibility and animations
 * - ConsentBanner.Card - The banner card styling wrapper
 * - ConsentBanner.Header - Container for title and description
 * - ConsentBanner.Title - The banner title text
 * - ConsentBanner.Description - Description text with optional legal links
 * - ConsentBanner.Footer - Container for buttons
 * - ConsentBanner.FooterSubGroup - Groups buttons together
 * - ConsentBanner.AcceptButton - Accept all button
 * - ConsentBanner.RejectButton - Reject all button
 * - ConsentBanner.CustomizeButton - Opens preferences dialog
 *
 * @see https://c15t.com/docs/frameworks/${framework.docsSlug}/consent-banner
 */
export default function () {
	return (
		<ConsentBanner.Root>
			<ConsentBanner.Card>
				<ConsentBanner.Header>
					<ConsentBanner.Title />
					<ConsentBanner.Description
						legalLinks={['privacyPolicy', 'termsOfService']}
					/>
				</ConsentBanner.Header>
				<ConsentBanner.Footer>
					<ConsentBanner.FooterSubGroup>
						<ConsentBanner.RejectButton />
						<ConsentBanner.AcceptButton />
					</ConsentBanner.FooterSubGroup>
					<ConsentBanner.CustomizeButton />
				</ConsentBanner.Footer>
			</ConsentBanner.Card>
		</ConsentBanner.Root>
	);
}
`;
}

/**
 * Generates the theme.ts file with the selected theme preset
 *
 * @param theme - The selected theme preset
 * @param framework - Framework-specific configuration
 * @returns The complete theme file content
 */
export function generateExpandedThemeTemplate(
	theme: ExpandedTheme,
	framework: FrameworkConfig
): string {
	switch (theme) {
		case 'tailwind':
			return generateTailwindTheme(framework);
		case 'minimal':
			return generateMinimalTheme(framework);
		case 'dark':
			return generateDarkTheme(framework);
		default:
			return generateTailwindTheme(framework);
	}
}

function generateTailwindTheme(framework: FrameworkConfig): string {
	return `import type { Theme } from '${framework.importSource}';

/**
 * Tailwind Theme
 *
 * Uses standard Tailwind colors (Slate/Blue) with backdrop blur effects.
 * This theme works well with Tailwind CSS projects.
 *
 * Customize the colors, typography, and slots below to match your design.
 *
 * @see https://c15t.com/docs/customization/theming
 */
export const theme: Theme = {
	colors: {
		primary: '#3b82f6', // blue-500
		primaryHover: '#2563eb', // blue-600
		surface: '#ffffff',
		surfaceHover: '#f8fafc', // slate-50
		border: '#e2e8f0', // slate-200
		borderHover: '#cbd5e1', // slate-300
		text: '#0f172a', // slate-900
		textMuted: '#64748b', // slate-500
		textOnPrimary: '#ffffff',
		switchTrack: '#e2e8f0',
		switchTrackActive: '#3b82f6',
		switchThumb: '#ffffff',
	},
	typography: {
		fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
	},
	radius: {
		sm: '0.125rem',
		md: '0.375rem',
		lg: '0.5rem',
		full: '9999px',
	},
	slots: {
		bannerCard:
			'border border-slate-200 bg-white/95 backdrop-blur-sm shadow-md',
		dialogCard:
			'border border-slate-200 bg-white/95 backdrop-blur-md shadow-xl',
		buttonPrimary:
			'bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors',
		buttonSecondary:
			'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors',
		bannerTitle: 'text-slate-900 font-semibold',
		bannerDescription: 'text-slate-500',
	},
};
`;
}

function generateMinimalTheme(framework: FrameworkConfig): string {
	return `import type { Theme } from '${framework.importSource}';

/**
 * Minimal Theme
 *
 * A clean, light theme with subtle grays and refined typography.
 * Uses standard CSS (no Tailwind dependency).
 *
 * Customize the colors, typography, and slots below to match your design.
 *
 * @see https://c15t.com/docs/customization/theming
 */
export const theme: Theme = {
	colors: {
		primary: '#18181b',
		primaryHover: '#27272a',
		surface: '#ffffff',
		surfaceHover: '#fafafa',
		border: '#e4e4e7',
		borderHover: '#d4d4d8',
		text: '#18181b',
		textMuted: '#71717a',
		textOnPrimary: '#ffffff',
		switchTrack: '#d4d4d8',
		switchTrackActive: '#18181b',
		switchThumb: '#ffffff',
	},
	dark: {
		primary: '#fafafa',
		primaryHover: '#e4e4e7',
		surface: '#0a0a0a',
		surfaceHover: '#171717',
		border: '#27272a',
		borderHover: '#3f3f46',
		text: '#fafafa',
		textMuted: '#a1a1aa',
		textOnPrimary: '#09090b',
	},
	typography: {
		fontFamily: 'var(--font-inter), system-ui, sans-serif',
		fontSize: {
			sm: '0.8125rem',
			base: '0.875rem',
			lg: '1rem',
		},
		fontWeight: {
			normal: 400,
			medium: 500,
			semibold: 500,
		},
		lineHeight: {
			tight: '1.3',
			normal: '1.5',
			relaxed: '1.7',
		},
	},
	radius: {
		sm: '0.25rem',
		md: '0.375rem',
		lg: '0.5rem',
		full: '9999px',
	},
	shadows: {
		sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
		md: '0 2px 8px rgba(0, 0, 0, 0.06)',
		lg: '0 4px 16px rgba(0, 0, 0, 0.08)',
	},
	slots: {
		bannerCard: {
			style: {
				border: '1px solid var(--c15t-border)',
				boxShadow: 'var(--c15t-shadow-sm)',
			},
		},
		dialogCard: {
			style: {
				border: '1px solid var(--c15t-border)',
				boxShadow: 'var(--c15t-shadow-lg)',
			},
		},
		buttonPrimary: {
			style: {
				borderRadius: 'var(--c15t-radius-sm)',
				boxShadow: 'none',
				fontWeight: 500,
			},
		},
		buttonSecondary: {
			style: {
				borderRadius: 'var(--c15t-radius-sm)',
				backgroundColor: 'transparent',
				border: '1px solid var(--c15t-border)',
				color: 'var(--c15t-text-muted)',
				boxShadow: 'none',
				fontWeight: 500,
			},
		},
	},
};
`;
}

function generateDarkTheme(framework: FrameworkConfig): string {
	return `import type { Theme } from '${framework.importSource}';

/**
 * Dark Mode Theme
 *
 * High contrast black and white theme (Vercel-style).
 * Stays dark regardless of system preference.
 * Uses standard CSS (no Tailwind dependency).
 *
 * Customize the colors, typography, and slots below to match your design.
 *
 * @see https://c15t.com/docs/customization/theming
 */
export const theme: Theme = {
	colors: {
		// Define dark colors as the default to enforce dark mode
		primary: '#ffffff',
		primaryHover: '#ededed',
		surface: '#000000',
		surfaceHover: '#111111',
		border: '#333333',
		borderHover: '#444444',
		text: '#ffffff',
		textMuted: '#888888',
		textOnPrimary: '#000000',
		switchTrack: '#333333',
		switchTrackActive: '#ffffff',
		switchThumb: '#000000',
	},
	// No 'dark' overrides needed as the base IS dark
	typography: {
		fontFamily: 'var(--font-inter), system-ui, sans-serif',
		fontSize: {
			sm: '0.8125rem',
			base: '0.875rem',
			lg: '1rem',
		},
		fontWeight: {
			normal: 400,
			medium: 500,
			semibold: 600,
		},
	},
	radius: {
		sm: '0.25rem',
		md: '0.375rem',
		lg: '0.5rem',
		full: '9999px',
	},
	shadows: {
		sm: '0 1px 2px rgba(255, 255, 255, 0.1)',
		md: '0 4px 8px rgba(0, 0, 0, 0.5)',
		lg: '0 8px 16px rgba(0, 0, 0, 0.5)',
	},
	slots: {
		bannerCard: {
			style: {
				backgroundColor: '#000000',
				border: '1px solid #333333',
				boxShadow: 'none',
			},
		},
		dialogCard: {
			style: {
				backgroundColor: '#000000',
				border: '1px solid #333333',
				boxShadow: '0 0 0 1px #333333, 0 8px 40px rgba(0,0,0,0.5)',
			},
		},
		buttonPrimary: {
			style: {
				backgroundColor: '#ffffff',
				color: '#000000',
				border: '1px solid #ffffff',
				boxShadow: 'none',
				fontWeight: 500,
			},
		},
		buttonSecondary: {
			style: {
				backgroundColor: '#000000',
				border: '1px solid #333333',
				color: '#888888',
				boxShadow: 'none',
				fontWeight: 500,
			},
		},
	},
};
`;
}
