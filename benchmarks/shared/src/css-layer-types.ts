import type {
	ConsentBannerProps,
	ConsentDialogProps,
	ConsentManagerProviderProps,
	Theme,
} from '@c15t/react';

export type CssLayerSurface = 'banner' | 'dialog';
export type CssLayerFixtureKind = 'baseline' | 'relay';
export type CssLayerEnvironmentId = 'tw3' | 'tw4' | 'no-tw';
export type CssLayerThemeByEnvironment = Partial<
	Record<CssLayerEnvironmentId, Theme>
>;

export interface CssLayerHighlight {
	label: string;
	value: string;
}

export interface CssLayerPageFrame {
	eyebrow: string;
	title: string;
	description: string;
	stageLabel: string;
	stageClassName?: string;
	shellClassName?: string;
	heroClassName?: string;
	highlights: CssLayerHighlight[];
}

export interface CssLayerSurfaceProps {
	banner?: Pick<
		ConsentBannerProps,
		'direction' | 'disableAnimation' | 'layout' | 'legalLinks' | 'primaryButton'
	>;
	dialog?: Pick<
		ConsentDialogProps,
		'disableAnimation' | 'hideBranding' | 'legalLinks' | 'showTrigger'
	>;
}

type ConsentManagerOptionFields = ConsentManagerProviderProps['options'];

export interface CssLayerProviderOptions {
	mode: 'offline';
	consentCategories?: ConsentManagerOptionFields['consentCategories'];
	legalLinks?: ConsentManagerOptionFields['legalLinks'];
	offlinePolicy?: ConsentManagerOptionFields['offlinePolicy'];
	store?: ConsentManagerOptionFields['store'];
	translations?: ConsentManagerOptionFields['translations'];
}

export interface CssLayerScenario {
	id: string;
	title: string;
	description: string;
	surface: CssLayerSurface;
	fixtureKind: CssLayerFixtureKind;
	providerOptions: CssLayerProviderOptions;
	theme: Theme;
	themeByEnvironment?: CssLayerThemeByEnvironment;
	pageFrame: CssLayerPageFrame;
	expectations: string[];
	surfaceProps: CssLayerSurfaceProps;
}

export interface CssLayerEnvironment {
	id: CssLayerEnvironmentId;
	label: string;
	port: number;
	description: string;
}
