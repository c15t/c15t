import type { CssLayerScenario, CssLayerSurface } from './css-layer-types';

const sharedProviderOptions = {
	mode: 'offline',
	legalLinks: {
		privacyPolicy: {
			href: '/legal/privacy',
		},
		termsOfService: {
			href: '/legal/terms',
		},
	},
} as const;

const relayBannerTailwindSlots = {
	consentBanner: 'css-layer-relay-banner-shell',
	consentBannerCard:
		'css-layer-relay-card rounded-[2rem] border-4 border-slate-950/90 bg-white/95 shadow-[0_28px_90px_rgba(15,23,42,0.28)] backdrop-blur-sm',
	consentBannerHeader: 'css-layer-relay-header gap-5 md:max-w-[44rem]',
	consentBannerTitle:
		'css-layer-relay-title text-[1.9rem] font-black tracking-[-0.05em] text-slate-950 md:text-[2.2rem]',
	consentBannerDescription:
		'css-layer-relay-description text-[0.98rem] leading-7 text-slate-700 [&_a]:font-semibold [&_a]:text-sky-700 [&_a]:underline',
	consentBannerFooter:
		'css-layer-relay-footer gap-4 border-t border-slate-200/80 pt-5 md:items-center',
	consentBannerFooterSubGroup: 'css-layer-relay-footer-group gap-3 md:gap-4',
	buttonPrimary:
		'css-layer-relay-button-primary bg-slate-950 px-6 py-3 text-sm font-semibold tracking-[0.02em] text-white hover:bg-slate-800',
	buttonSecondary:
		'css-layer-relay-button-secondary border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100',
} as const;

const relayBannerPlainSlots = {
	consentBanner: 'css-layer-relay-banner-shell',
	consentBannerCard: 'css-layer-relay-card',
	consentBannerHeader: 'css-layer-relay-header',
	consentBannerTitle: 'css-layer-relay-title',
	consentBannerDescription: 'css-layer-relay-description',
	consentBannerFooter: 'css-layer-relay-footer',
	consentBannerFooterSubGroup: 'css-layer-relay-footer-group',
	buttonPrimary: 'css-layer-relay-button-primary',
	buttonSecondary: 'css-layer-relay-button-secondary',
} as const;

const relayDialogTailwindSlots = {
	consentDialogCard:
		'css-layer-relay-dialog-card rounded-[2rem] border-4 border-slate-950/90 bg-white/96 shadow-[0_34px_110px_rgba(15,23,42,0.28)] backdrop-blur-sm',
	consentDialogHeader:
		'css-layer-relay-dialog-header gap-5 border-b border-slate-200/70 pb-5',
	consentDialogTitle:
		'css-layer-relay-dialog-title text-[1.85rem] font-black tracking-[-0.05em] text-slate-950',
	consentDialogDescription:
		'css-layer-relay-dialog-description text-[0.98rem] leading-7 text-slate-700',
	consentDialogContent: 'css-layer-relay-dialog-content pt-2',
	consentDialogFooter:
		'css-layer-relay-dialog-footer border-t border-slate-200/70 pt-5',
	consentWidget:
		'css-layer-relay-widget rounded-[1.5rem] border border-slate-200/80 bg-white/70 p-2',
	consentWidgetAccordion:
		'css-layer-relay-accordion rounded-[1.4rem] border border-slate-200 bg-white/90 p-2 shadow-[0_10px_35px_rgba(15,23,42,0.08)]',
	buttonPrimary:
		'css-layer-relay-button-primary bg-slate-950 px-6 py-3 text-sm font-semibold tracking-[0.02em] text-white hover:bg-slate-800',
	buttonSecondary:
		'css-layer-relay-button-secondary border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100',
} as const;

const relayDialogPlainSlots = {
	consentDialogCard: 'css-layer-relay-dialog-card',
	consentDialogHeader: 'css-layer-relay-dialog-header',
	consentDialogTitle: 'css-layer-relay-dialog-title',
	consentDialogDescription: 'css-layer-relay-dialog-description',
	consentDialogContent: 'css-layer-relay-dialog-content',
	consentDialogFooter: 'css-layer-relay-dialog-footer',
	consentWidget: 'css-layer-relay-widget',
	consentWidgetAccordion: 'css-layer-relay-accordion',
	buttonPrimary: 'css-layer-relay-button-primary',
	buttonSecondary: 'css-layer-relay-button-secondary',
} as const;

export const cssLayerScenarios = [
	{
		id: 'banner-baseline',
		title: 'Baseline Banner',
		description:
			'Stock banner rendering with a light brand token pass. Use this first to separate wiring issues from layer-order regressions.',
		surface: 'banner',
		fixtureKind: 'baseline',
		providerOptions: {
			...sharedProviderOptions,
			translations: {
				defaultLanguage: 'en',
				disableAutoLanguageSwitch: true,
				translations: {
					en: {
						cookieBanner: {
							title: 'Baseline privacy controls',
							description:
								'This route keeps the setup intentionally light. Review default banner structure, button alignment, and legal-link placement before moving to the relay fixture.',
						},
					},
				},
			},
		},
		theme: {
			colors: {
				primary: '#0f172a',
				primaryHover: '#1e293b',
				surface: '#ffffff',
				surfaceHover: '#f8fafc',
				border: '#d9e2ec',
				borderHover: '#cbd5e1',
				text: '#0f172a',
				textMuted: '#475569',
				textOnPrimary: '#ffffff',
			},
			radius: {
				lg: '1rem',
			},
			shadows: {
				lg: '0 18px 48px rgba(15, 23, 42, 0.18)',
			},
		},
		pageFrame: {
			eyebrow: 'Manual CSS Layer Review',
			title: 'Baseline banner sanity check',
			description:
				'This screen intentionally stays close to stock c15t. If layout or component chrome is already off here, the problem is not a relay-style override clash.',
			stageLabel:
				'Expected: default banner chrome with only token-level brand tuning.',
			shellClassName:
				'css-layer-shell mx-auto max-w-6xl px-6 py-10 lg:px-8 lg:py-12',
			heroClassName: 'css-layer-hero lg:grid-cols-[minmax(0,1.25fr)_22rem]',
			stageClassName:
				'css-layer-stage border-slate-200/80 bg-white/70 shadow-[0_22px_70px_rgba(15,23,42,0.12)]',
			highlights: [
				{
					label: 'Banner chrome',
					value: 'Default spacing, radius, and footer structure still intact',
				},
				{
					label: 'Buttons',
					value:
						'Primary and secondary actions keep stock sizing and alignment',
				},
				{
					label: 'Links',
					value: 'Legal links remain legible and inside the description block',
				},
			],
		},
		expectations: [
			'Card padding, footer gap, and title hierarchy should look like stock c15t.',
			'No local utility class should be needed to understand this render.',
			'Use this page as the control when relay-style overrides start drifting.',
		],
		surfaceProps: {
			banner: {
				disableAnimation: true,
				legalLinks: ['privacyPolicy', 'termsOfService'],
			},
		},
	},
	{
		id: 'banner-relay',
		title: 'Relay Banner Stress Test',
		description:
			'Local relay-style banner that mixes theme tokens, semantic slot classes, and utility-heavy overrides to expose merge and layer ordering issues.',
		surface: 'banner',
		fixtureKind: 'relay',
		providerOptions: {
			...sharedProviderOptions,
			translations: {
				defaultLanguage: 'en',
				disableAutoLanguageSwitch: true,
				translations: {
					en: {
						cookieBanner: {
							title: 'Control how Relay uses analytics and personalization',
							description:
								'Relay uses cookies and SDK storage to personalize journeys, protect session continuity, and measure delivery quality. Choose the data paths you want enabled before continuing.',
						},
					},
				},
			},
		},
		theme: {
			colors: {
				primary: '#0f172a',
				primaryHover: '#111827',
				surface: '#fff8ef',
				surfaceHover: '#fff1dc',
				border: '#cbd5e1',
				borderHover: '#94a3b8',
				text: '#0f172a',
				textMuted: '#475569',
				textOnPrimary: '#ffffff',
			},
			radius: {
				lg: '2rem',
			},
			shadows: {
				lg: '0 28px 90px rgba(15, 23, 42, 0.26)',
			},
			slots: relayBannerTailwindSlots,
		},
		themeByEnvironment: {
			'no-tw': {
				colors: {
					primary: '#0f172a',
					primaryHover: '#111827',
					surface: '#fff8ef',
					surfaceHover: '#fff1dc',
					border: '#cbd5e1',
					borderHover: '#94a3b8',
					text: '#0f172a',
					textMuted: '#475569',
					textOnPrimary: '#ffffff',
				},
				radius: {
					lg: '2rem',
				},
				shadows: {
					lg: '0 28px 90px rgba(15, 23, 42, 0.26)',
				},
				slots: relayBannerPlainSlots,
			},
		},
		pageFrame: {
			eyebrow: 'Relay Fixture',
			title: 'Banner layout with utility-heavy slot overrides',
			description:
				'This page intentionally puts pressure on class merging. Title, description links, footer group spacing, and button treatment all come from the slot/theme layer rather than bespoke markup.',
			stageLabel:
				'Expected: utility-driven title color, pill buttons, heavier card shell, and grouped footer spacing all survive.',
			shellClassName:
				'css-layer-shell mx-auto max-w-6xl px-6 py-10 lg:px-8 lg:py-12',
			heroClassName:
				'css-layer-hero lg:grid-cols-[minmax(0,1.35fr)_24rem] lg:gap-10',
			stageClassName:
				'css-layer-stage css-layer-relay-stage border-slate-300/70 bg-[radial-gradient(circle_at_top,_rgba(255,247,237,0.95),_rgba(241,245,249,0.92))] shadow-[0_30px_90px_rgba(15,23,42,0.18)]',
			highlights: [
				{
					label: 'Title override',
					value:
						'Heavy utility typography should win over the stock banner title style',
				},
				{
					label: 'Footer grouping',
					value:
						'Group gap, divider rhythm, and button ordering should stay intact',
				},
				{
					label: 'Button chrome',
					value:
						'Pill buttons, padding, and hover shells should not collapse back to defaults',
				},
			],
		},
		expectations: [
			'Title should render dark, oversized, and tightly tracked instead of falling back to stock typography.',
			'Primary and secondary buttons should present as rounded pills with custom padding.',
			'Footer grouping and card shell need to stay visually close across Tailwind 3, Tailwind 4, and plain CSS.',
		],
		surfaceProps: {
			banner: {
				disableAnimation: true,
				layout: [['customize'], ['reject', 'accept']],
				legalLinks: ['privacyPolicy', 'termsOfService'],
				primaryButton: ['accept'],
			},
		},
	},
	{
		id: 'dialog-relay',
		title: 'Relay Dialog Stress Test',
		description:
			'Relay-style preference center with dialog slots, widget slots, and switch tokens applied together. Use this to inspect overlay, card, accordion, and toggle behavior.',
		surface: 'dialog',
		fixtureKind: 'relay',
		providerOptions: {
			...sharedProviderOptions,
			translations: {
				defaultLanguage: 'en',
				disableAutoLanguageSwitch: true,
				translations: {
					en: {
						consentManagerDialog: {
							title: 'Review Relay consent categories',
							description:
								'Adjust the controls below to tune analytics, delivery optimization, and experience layers before you continue through Relay.',
						},
					},
				},
			},
		},
		theme: {
			colors: {
				primary: '#0f172a',
				primaryHover: '#111827',
				surface: '#fffaf4',
				surfaceHover: '#fff1df',
				border: '#cbd5e1',
				borderHover: '#94a3b8',
				text: '#0f172a',
				textMuted: '#475569',
				textOnPrimary: '#ffffff',
				switchTrack: '#dbe4f3',
				switchTrackActive: '#0f172a',
				switchThumb: '#ffffff',
			},
			radius: {
				lg: '2rem',
			},
			shadows: {
				lg: '0 34px 110px rgba(15, 23, 42, 0.28)',
			},
			slots: relayDialogTailwindSlots,
		},
		themeByEnvironment: {
			'no-tw': {
				colors: {
					primary: '#0f172a',
					primaryHover: '#111827',
					surface: '#fffaf4',
					surfaceHover: '#fff1df',
					border: '#cbd5e1',
					borderHover: '#94a3b8',
					text: '#0f172a',
					textMuted: '#475569',
					textOnPrimary: '#ffffff',
					switchTrack: '#dbe4f3',
					switchTrackActive: '#0f172a',
					switchThumb: '#ffffff',
				},
				radius: {
					lg: '2rem',
				},
				shadows: {
					lg: '0 34px 110px rgba(15, 23, 42, 0.28)',
				},
				slots: relayDialogPlainSlots,
			},
		},
		pageFrame: {
			eyebrow: 'Relay Fixture',
			title: 'Dialog overlay with widget and switch token checks',
			description:
				'The dialog preview pushes card chrome, accordion styling, and switch token resolution at the same time so overlay-specific layer issues are easier to spot.',
			stageLabel:
				'Expected: relay card styling survives, widget accordion looks branded, and switch tracks use the dark custom active color.',
			shellClassName:
				'css-layer-shell mx-auto max-w-6xl px-6 py-10 lg:px-8 lg:py-12',
			heroClassName:
				'css-layer-hero lg:grid-cols-[minmax(0,1.35fr)_24rem] lg:gap-10',
			stageClassName:
				'css-layer-stage css-layer-dialog-stage border-slate-300/70 bg-[radial-gradient(circle_at_top,_rgba(255,250,244,0.96),_rgba(241,245,249,0.94))] shadow-[0_30px_90px_rgba(15,23,42,0.18)]',
			highlights: [
				{
					label: 'Dialog shell',
					value:
						'Card border, radius, and title hierarchy should match the relay banner family',
				},
				{
					label: 'Widget chrome',
					value: 'Accordion wrappers must keep the branded panel styling',
				},
				{
					label: 'Switch tokens',
					value:
						'Active and inactive tracks should pick up the custom theme colors',
				},
			],
		},
		expectations: [
			'Dialog card styling should remain close to the relay banner treatment instead of collapsing to defaults.',
			'Accordion wrappers need the rounded, bordered shell from the slot override.',
			'Switch tracks should pick up the custom token values without extra CSS overrides.',
		],
		surfaceProps: {
			dialog: {
				disableAnimation: true,
				hideBranding: false,
				legalLinks: ['privacyPolicy', 'termsOfService'],
			},
		},
	},
] as const satisfies readonly CssLayerScenario[];

export const cssLayerScenarioSurfaces = [
	'banner',
	'dialog',
] as const satisfies readonly CssLayerSurface[];

export function getCssLayerScenario(
	surface: CssLayerSurface,
	fixtureKind: string
): CssLayerScenario | undefined {
	return cssLayerScenarios.find(
		(scenario) =>
			scenario.surface === surface && scenario.fixtureKind === fixtureKind
	);
}

export function listCssLayerScenarios(surface?: CssLayerSurface) {
	return cssLayerScenarios.filter((scenario) =>
		surface ? scenario.surface === surface : true
	);
}
