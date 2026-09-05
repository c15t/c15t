/**
 * Expanded component file generators
 * Generates separate files in consent-manager/ directory:
 * - provider.tsx (client provider wrapper)
 * - consent-banner.tsx (compound components)
 * - consent-dialog.tsx (compound component dialog)
 * - theme.ts (theme preset)
 *
 * Parameterized by FrameworkConfig so it can be reused across
 * Next.js App Router, TanStack Start, and other RSC frameworks.
 */

import type { ExpandedTheme } from '../../prompts/expanded-theme';
import { DEVTOOLS_COMPONENT, generateDevToolsImport } from './devtools';
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
export const generateExpandedProviderTemplate =
	function generateExpandedProviderTemplate({
		enableSSR,
		enableDevTools,
		optionsText,
		framework,
	}: GenerateExpandedProviderOptions): string {
		let propsInterface: string;
		let propsDestructure: string;
		let typeImports: string;

		if (enableSSR) {
			propsInterface = `\ninterface Props {
	children: ReactNode;
	config: KernelConfig;
}\n`;
			propsDestructure = '{ children, config }: Props';
			typeImports = `import type { KernelConfig } from '${framework.importSource}';`;
		} else {
			propsInterface = `\ninterface Props {
	children: ReactNode;
}\n`;
			propsDestructure = '{ children }: Props';
			typeImports = '';
		}

		const ssrDataOption = enableSSR ? '\n\t\t\t\tprefetch: config,' : '';
		const devToolsImport = enableDevTools
			? generateDevToolsImport(framework.devToolsImportSource)
			: '';
		const reactNodeImport = "import type { ReactNode } from 'react';\n";
		const modeImport = ['custom', 'hosted', 'offline'].find((name) =>
			optionsText.includes(`${name}(`)
		);

		return `'use client';

${reactNodeImport}import { ConsentProvider${modeImport ? `, ${modeImport}` : ''} } from '${framework.importSource}';
${typeImports}
${devToolsImport}import ConsentBanner from './consent-banner';
import ConsentDialog from './consent-dialog';
import { components, theme } from './theme';
${propsInterface}
/**
 * Client-side consent manager provider with compound components.
 * @see https://c15t.com/docs/frameworks/${framework.docsSlug}/quickstart
 */
export default function ConsentManagerClient(${propsDestructure}) {
	return (
		<ConsentProvider
			options={{
				${optionsText}${ssrDataOption}
				theme,
				components,
				// Add your scripts here:
				// scripts: [
				//   googleTagManager({ id: 'GTM-XXXXXX' }),
				// ],${enableSSR ? '' : "\n\t\t\t\t// Shows banner during development. Remove for production.\n\t\t\t\toverrides: { country: 'DE' },"}
			}}
		>
			<ConsentBanner />
			<ConsentDialog />
			${enableDevTools ? DEVTOOLS_COMPONENT : ''}
			{children}
		</ConsentProvider>
	);
}
`;
	};

/**
 * Generates the consent-dialog.tsx component using compound components
 *
 * @param framework - Framework-specific configuration
 * @returns The complete consent dialog file content
 */
export const generateExpandedConsentDialogTemplate =
	function generateExpandedConsentDialogTemplate(
		framework: FrameworkConfig
	): string {
		return `'use client';

import { useState } from 'react';
import { ConsentDialog, ConsentWidget } from '${framework.consentDialogImport}';

/**
 * Consent dialog using compound components.
 * @see https://c15t.com/docs/frameworks/${framework.docsSlug}/components/consent-dialog
 */
export default function () {
	const [openItem, setOpenItem] = useState('');

	return (
		<ConsentDialog.Root>
			<ConsentDialog.Card>
				<ConsentDialog.Header>
					<ConsentDialog.HeaderTitle />
					<ConsentDialog.HeaderDescription />
				</ConsentDialog.Header>
				<ConsentDialog.Content>
					<ConsentWidget.Root>
						<ConsentWidget.Accordion
							type="single"
							value={openItem}
							onValueChange={(value) => {
								setOpenItem(Array.isArray(value) ? (value[0] ?? '') : (value ?? ''));
							}}
						>
							<ConsentWidget.AccordionItems />
						</ConsentWidget.Accordion>
						{/* Pass renderAction to customize mapping. Stock c15t buttons render by default. */}
						<ConsentWidget.PolicyActions />
					</ConsentWidget.Root>
				</ConsentDialog.Content>
				<ConsentDialog.Footer />
			</ConsentDialog.Card>
		</ConsentDialog.Root>
	);
}
`;
	};

/**
 * Generates the consent-banner.tsx component using compound components
 *
 * @param framework - Framework-specific configuration
 * @returns The complete cookie banner file content
 */
export const generateExpandedConsentBannerTemplate =
	function generateExpandedConsentBannerTemplate(
		framework: FrameworkConfig
	): string {
		return `'use client';

import { ConsentBanner } from '${framework.consentBannerImport}';

/**
 * Consent banner using compound components.
 * @see https://c15t.com/docs/frameworks/${framework.docsSlug}/components/consent-banner
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
				{/* Pass renderAction to customize mapping. Stock c15t buttons render by default. */}
				<ConsentBanner.PolicyActions />
			</ConsentBanner.Card>
		</ConsentBanner.Root>
	);
}
`;
	};

const generateMinimalTheme = function generateMinimalTheme(
	framework: FrameworkConfig
): string {
	return `import type { ReactComponentSlots, Theme } from '${framework.themeTypesImportSource}';

/**
 * Minimal Theme
 *
 * A clean, light theme with subtle grays and refined typography.
 * Uses standard CSS (no Tailwind dependency).
 *
 * Customize the colors, typography, and components below to match your design.
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
};

export const components: ReactComponentSlots = {
	banner: {
		card: {
			style: {
				border: '1px solid var(--c15t-border)',
				boxShadow: 'var(--c15t-shadow-sm)',
			},
		},
	},
	dialog: {
		card: {
			style: {
				border: '1px solid var(--c15t-border)',
				boxShadow: 'var(--c15t-shadow-lg)',
			},
		},
	},
	button: {
		primary: {
			style: {
				borderRadius: 'var(--c15t-radius-sm)',
				boxShadow: 'none',
				fontWeight: 500,
			},
		},
		secondary: {
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
};

const generateTailwindTheme = function generateTailwindTheme(
	framework: FrameworkConfig
): string {
	return `import type { ReactComponentSlots, Theme } from '${framework.themeTypesImportSource}';

/**
 * Tailwind Theme
 *
 * Uses standard Tailwind colors (Slate/Blue) with backdrop blur effects.
 * This theme works well with Tailwind CSS projects.
 *
 * Customize the colors, typography, and components below to match your design.
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
};

export const components: ReactComponentSlots = {
	banner: {
		card: {
			className:
				'border border-slate-200 bg-white/95 backdrop-blur-sm shadow-md',
		},
		title: { className: 'text-slate-900 font-semibold' },
	},
	dialog: {
		card: {
			className:
				'border border-slate-200 bg-white/95 backdrop-blur-md shadow-xl',
		},
	},
	button: {
		primary: {
			className:
				'bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors',
		},
		secondary: {
			className:
				'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors',
		},
	},
	description: { banner: { className: 'text-slate-500' } },
};
`;
};

const generateDarkTheme = function generateDarkTheme(
	framework: FrameworkConfig
): string {
	return `import type { ReactComponentSlots, Theme } from '${framework.themeTypesImportSource}';

/**
 * Dark Mode Theme
 *
 * High contrast black and white theme.
 * Stays dark regardless of system preference.
 * Uses standard CSS (no Tailwind dependency).
 *
 * Customize the colors, typography, and components below to match your design.
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
};

export const components: ReactComponentSlots = {
	banner: {
		card: {
			style: {
				backgroundColor: '#000000',
				border: '1px solid #333333',
				boxShadow: 'none',
			},
		},
	},
	dialog: {
		card: {
			style: {
				backgroundColor: '#000000',
				border: '1px solid #333333',
				boxShadow: '0 0 0 1px #333333, 0 8px 40px rgba(0,0,0,0.5)',
			},
		},
	},
	button: {
		primary: {
			style: {
				backgroundColor: '#ffffff',
				color: '#000000',
				border: '1px solid #ffffff',
				boxShadow: 'none',
				fontWeight: 500,
			},
		},
		secondary: {
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
};

/**
 * Generates the theme.ts file with the selected theme preset
 *
 * @param theme - The selected theme preset
 * @param framework - Framework-specific configuration
 * @returns The complete theme file content
 */
export const generateExpandedThemeTemplate =
	function generateExpandedThemeTemplate(
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
	};
