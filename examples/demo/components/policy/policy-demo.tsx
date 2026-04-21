'use client';

import { iab } from '@c15t/iab';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentManagerProvider,
	policyPackPresets,
	type Theme,
	useConsentManager,
} from '@c15t/react';
import { IABConsentBanner, IABConsentDialog } from '@c15t/react/iab';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { createDemoScripts } from '../../lib/demo-scripts';
import {
	DEFAULT_DEMO_POLICY_EXAMPLE,
	demoI18nMessages,
} from '../../lib/policies';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DemoMode = 'offline' | 'hosted';

type LocationPreset = {
	id: string;
	label: string;
	country: string;
	region?: string;
	description: string;
};

type LocationPresetSection = {
	label: string;
	description: string;
	presets: LocationPreset[];
};

type DemoLanguageOption = {
	label: string;
	value?: string;
};

// ---------------------------------------------------------------------------
// Location presets
// ---------------------------------------------------------------------------

const locationPresetSections: LocationPresetSection[] = [
	{
		label: 'Built-in Presets',
		description: 'The defaults that ship with policy packs.',
		presets: [
			{
				id: 'preset-europe-opt-in',
				label: 'Europe Opt-In',
				country: 'GB',
				description: 'Shipped preset for Europe + UK opt-in banners',
			},
			{
				id: 'preset-europe-iab',
				label: 'Europe IAB',
				country: 'FR',
				description: 'Shipped preset for IAB TCF in Europe',
			},
			{
				id: 'preset-california-opt-in',
				label: 'California Opt-In',
				country: 'US',
				region: 'CA',
				description: 'Shipped preset for a compact California opt-in banner',
			},
			{
				id: 'preset-california-opt-out',
				label: 'California Opt-Out',
				country: 'US',
				region: 'CA',
				description: 'Shipped preset for California opt-out with no banner',
			},
			{
				id: 'preset-quebec-opt-in',
				label: 'Quebec Opt-In',
				country: 'CA',
				region: 'QC',
				description: 'Shipped preset for Quebec opt-in requirements',
			},
			{
				id: 'preset-world-no-banner',
				label: 'World No Banner',
				country: 'AU',
				description: 'Shipped preset for no-banner rest-of-world fallback',
			},
		],
	},
	{
		label: 'Custom Examples',
		description: 'Overrides that show how much policy packs can be shaped.',
		presets: [
			{
				id: 'custom-de-strict',
				label: 'Germany',
				country: 'DE',
				description: 'Strict opt-in with compact split-row actions',
			},
			{
				id: 'custom-fr-iab',
				label: 'France',
				country: 'FR',
				description: 'Country-specific IAB TCF policy',
			},
			{
				id: 'custom-es-split-stack',
				label: 'Spain',
				country: 'ES',
				description: 'Split-stack layout with customize on its own row',
			},
			{
				id: 'custom-br-growth',
				label: 'Brazil',
				country: 'BR',
				description: 'Custom opt-out flow with accept + customize only',
			},
			{
				id: 'custom-ca-do-not-sell',
				label: 'California CTA',
				country: 'US',
				region: 'CA',
				description:
					'Primary Accept All with a Do not sell/share opt-out and no customize',
			},
		],
	},
];

const locationPresets = locationPresetSections.flatMap(
	(section) => section.presets
);

const demoLanguageOptions: DemoLanguageOption[] = [
	{ label: 'Auto' },
	{ label: 'English', value: 'en' },
	{ label: 'French', value: 'fr' },
	{ label: 'German', value: 'de' },
	{ label: 'Spanish', value: 'es' },
	{ label: 'Portuguese', value: 'pt' },
	{ label: 'Chinese', value: 'zh' },
];

function getAllowedLanguagesForProfile(profile?: string): string[] {
	const activeProfile = profile ?? 'default';
	return Object.keys(
		demoI18nMessages[activeProfile]?.translations ?? {}
	).sort();
}

// ---------------------------------------------------------------------------
// Offline policy pack (same shape as the backend config in lib/policies.ts)
// ---------------------------------------------------------------------------

const offlinePoliciesByExample = {
	'custom-fr-iab': [
		{
			id: 'fr_iab',
			match: { countries: ['FR'] },
			i18n: { messageProfile: 'fr' },
			consent: { model: 'iab' as const, expiryDays: 180, categories: ['*'] },
			proof: { storeIp: true, storeUserAgent: true, storeLanguage: true },
		},
		policyPackPresets.worldNoBanner(),
	],
	'custom-de-strict': [
		{
			id: 'de_strict',
			match: { countries: ['DE'] },
			i18n: { messageProfile: 'eu' },
			consent: {
				model: 'opt-in' as const,
				expiryDays: 365,
				scopeMode: 'strict' as const,
				categories: ['necessary', 'functionality', 'measurement'],
			},
			ui: {
				mode: 'banner' as const,
				banner: {
					allowedActions: [
						'reject' as const,
						'accept' as const,
						'customize' as const,
					],
					layout: [
						['reject' as const, 'accept' as const],
						'customize' as const,
					],
					direction: 'row' as const,
					primaryActions: ['accept' as const, 'customize' as const],
					uiProfile: 'compact' as const,
				},
				dialog: {
					allowedActions: [
						'reject' as const,
						'accept' as const,
						'customize' as const,
					],
					layout: [
						['reject' as const, 'accept' as const],
						'customize' as const,
					],
					direction: 'row' as const,
					primaryActions: ['accept' as const, 'customize' as const],
					uiProfile: 'compact' as const,
				},
			},
			proof: { storeIp: true, storeUserAgent: true, storeLanguage: true },
		},
		policyPackPresets.worldNoBanner(),
	],
	'custom-es-split-stack': [
		{
			id: 'es_split_stack',
			match: { countries: ['ES'] },
			i18n: { messageProfile: 'default' },
			consent: {
				model: 'opt-in' as const,
				expiryDays: 180,
				categories: ['necessary', 'measurement', 'marketing'],
			},
			ui: {
				mode: 'banner' as const,
				banner: {
					allowedActions: [
						'reject' as const,
						'accept' as const,
						'customize' as const,
					],
					layout: [
						'customize' as const,
						['reject' as const, 'accept' as const],
					],
					direction: 'column' as const,
					primaryActions: ['accept' as const],
					uiProfile: 'balanced' as const,
				},
				dialog: {
					allowedActions: [
						'reject' as const,
						'accept' as const,
						'customize' as const,
					],
					layout: [
						'customize' as const,
						['reject' as const, 'accept' as const],
					],
					direction: 'column' as const,
					primaryActions: ['accept' as const],
					uiProfile: 'balanced' as const,
				},
			},
			proof: { storeIp: false, storeUserAgent: true, storeLanguage: true },
		},
		policyPackPresets.worldNoBanner(),
	],
	'custom-br-growth': [
		{
			id: 'br_growth',
			match: { countries: ['BR'] },
			i18n: { messageProfile: 'default' },
			consent: {
				model: 'opt-out' as const,
				expiryDays: 120,
				scopeMode: 'permissive' as const,
				categories: ['necessary', 'functionality', 'measurement', 'marketing'],
			},
			ui: {
				mode: 'banner' as const,
				banner: {
					allowedActions: ['accept' as const, 'customize' as const],
					layout: [['accept' as const], 'customize' as const],
					direction: 'row' as const,
					primaryActions: ['accept' as const],
					uiProfile: 'balanced' as const,
				},
				dialog: {
					allowedActions: ['accept' as const, 'customize' as const],
					layout: [['accept' as const], 'customize' as const],
					direction: 'row' as const,
					primaryActions: ['accept' as const],
					uiProfile: 'balanced' as const,
				},
			},
			proof: { storeIp: false, storeUserAgent: false, storeLanguage: true },
		},
		policyPackPresets.worldNoBanner(),
	],
	'custom-ca-do-not-sell': [
		{
			id: 'ca_do_not_sell',
			match: { regions: [{ country: 'US', region: 'CA' }] },
			i18n: { messageProfile: 'caSales' },
			consent: {
				model: 'opt-in' as const,
				expiryDays: 365,
				gpc: true,
				scopeMode: 'permissive' as const,
				categories: ['necessary', 'functionality', 'measurement', 'marketing'],
			},
			ui: {
				mode: 'banner' as const,
				banner: {
					allowedActions: ['accept' as const, 'reject' as const],
					layout: ['accept' as const, 'reject' as const],
					direction: 'column' as const,
					primaryActions: ['accept' as const],
					uiProfile: 'compact' as const,
				},
				dialog: {
					allowedActions: ['accept' as const, 'reject' as const],
					layout: ['accept' as const, 'reject' as const],
					direction: 'column' as const,
					primaryActions: ['accept' as const],
					uiProfile: 'compact' as const,
				},
			},
			proof: { storeIp: true, storeUserAgent: true, storeLanguage: true },
		},
		policyPackPresets.worldNoBanner(),
	],
	'preset-europe-opt-in': [
		{
			...policyPackPresets.europeOptIn(),
			i18n: { messageProfile: 'eu' },
		},
		policyPackPresets.worldNoBanner(),
	],
	'preset-europe-iab': [
		{
			...policyPackPresets.europeIab(),
			i18n: { messageProfile: 'fr' },
		},
		policyPackPresets.worldNoBanner(),
	],
	'preset-california-opt-in': [
		policyPackPresets.californiaOptIn(),
		policyPackPresets.worldNoBanner(),
	],
	'preset-california-opt-out': [
		policyPackPresets.californiaOptOut(),
		policyPackPresets.worldNoBanner(),
	],
	'preset-quebec-opt-in': [
		policyPackPresets.quebecOptIn(),
		policyPackPresets.worldNoBanner(),
	],
	'preset-world-no-banner': [policyPackPresets.worldNoBanner()],
} as const;

const policyDemoTheme: Theme = {
	consentActions: {
		default: {
			mode: 'stroke',
		},
		customize: {
			variant: 'primary',
		},
	},
	slots: {
		consentBannerTag: {
			style: {
				borderRadius: '0',
			},
		},
		consentDialogTag: {
			style: {
				borderRadius: '0',
			},
		},
		consentWidgetTag: {
			style: {
				borderRadius: '0',
			},
		},
		iabConsentBannerTag: {
			style: {
				borderRadius: '0',
			},
		},
		iabConsentDialogTag: {
			style: {
				borderRadius: '0',
			},
		},
	},
};

// ---------------------------------------------------------------------------
// Search param helpers
// ---------------------------------------------------------------------------

function parseSearchParams(searchParams: URLSearchParams): {
	example: string;
	mode: DemoMode;
	country: string;
	region: string;
} {
	const example = searchParams.get('example') ?? 'custom-de-strict';
	const mode = searchParams.get('mode') === 'hosted' ? 'hosted' : 'offline';
	const country = (searchParams.get('country') ?? 'DE').toUpperCase();
	const region = (searchParams.get('region') ?? '').toUpperCase();
	return { example, mode, country, region };
}

function buildSearchString(
	example: string,
	mode: DemoMode,
	country: string,
	region: string
): string {
	const params = new URLSearchParams();
	if (example && example !== 'custom-de-strict') params.set('example', example);
	if (mode !== 'offline') params.set('mode', mode);
	if (country) params.set('country', country);
	if (region) params.set('region', region);
	const str = params.toString();
	return str ? `?${str}` : '';
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
	return (
		<div className="space-y-2">
			<p className="label-pixel text-muted-foreground">{label}</p>
			<pre className="overflow-x-auto rounded-xl border border-border/80 bg-muted/20 p-3 font-mono text-[12px] leading-5 text-foreground/90">
				{JSON.stringify(value ?? null, null, 2)}
			</pre>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Runtime state panel
// ---------------------------------------------------------------------------

function RuntimeInfo({ demoMode }: { demoMode: DemoMode }) {
	const {
		activeUI,
		consentInfo,
		consents,
		iab,
		initConsentManager,
		lastBannerFetchData,
		locationInfo,
		model,
		policyCategories,
		policyScopeMode,
		resetConsents,
		setActiveUI,
		setLanguage,
		setOverrides,
		overrides,
		translationConfig,
		initDataSource,
	} = useConsentManager();

	const policy = lastBannerFetchData?.policy;
	const policyDecision = lastBannerFetchData?.policyDecision;
	const bannerUi = policy?.ui?.banner;
	const activeProfile = policy?.i18n?.messageProfile ?? 'default';
	const allowedLanguages = getAllowedLanguagesForProfile(
		policy?.i18n?.messageProfile
	);
	const requestedLanguage = overrides?.language ?? 'auto';
	const resolvedLanguage =
		lastBannerFetchData?.translations.language ??
		translationConfig.defaultLanguage ??
		'en';
	let layoutText = 'default';

	if (bannerUi?.layout) {
		layoutText = JSON.stringify(bannerUi.layout);
	}

	const policySummary = {
		id: policy?.id ?? null,
		model: model ?? null,
		mode: demoMode,
		matchedBy: policyDecision?.matchedBy ?? null,
		uiMode: policy?.ui?.mode ?? 'none',
		iabEnabled: iab?.config.enabled ?? false,
		source: initDataSource ?? null,
		location: {
			country: locationInfo?.countryCode ?? null,
			region: locationInfo?.regionCode ?? null,
		},
		scopeMode: policyScopeMode ?? null,
		categories: policyCategories ?? [],
		messageProfile: activeProfile,
		language: {
			resolved: resolvedLanguage,
			requested: requestedLanguage,
			allowed: allowedLanguages,
		},
		actionLayout: {
			layout: bannerUi?.layout ?? null,
			direction: bannerUi?.direction ?? null,
			uiProfile: bannerUi?.uiProfile ?? null,
		},
	};

	const runtimeState = {
		activeUI,
		hasSavedConsent: consentInfo != null,
		consents,
	};

	return (
		<div className="space-y-6">
			<div className="grid gap-3 text-sm sm:grid-cols-2">
				<div className="border-b border-border/70 pb-2">
					<p className="label-pixel text-muted-foreground">Policy</p>
					<p className="mt-1 font-mono text-xs">{policy?.id ?? 'no policy'}</p>
				</div>
				<div className="border-b border-border/70 pb-2">
					<p className="label-pixel text-muted-foreground">Model</p>
					<p className="mt-1 font-mono text-xs">{model ?? 'none'}</p>
				</div>
				<div className="border-b border-border/70 pb-2">
					<p className="label-pixel text-muted-foreground">Location</p>
					<p className="mt-1 font-mono text-xs">
						{locationInfo?.countryCode ?? '--'}
						{locationInfo?.regionCode ? `-${locationInfo.regionCode}` : ''}
					</p>
				</div>
				<div className="border-b border-border/70 pb-2">
					<p className="label-pixel text-muted-foreground">Source</p>
					<p className="mt-1 font-mono text-xs">
						{initDataSource ?? 'unknown'}
					</p>
				</div>
				<div className="border-b border-border/70 pb-2">
					<p className="label-pixel text-muted-foreground">Language</p>
					<p className="mt-1 font-mono text-xs">
						{resolvedLanguage}
						{requestedLanguage !== 'auto'
							? ` / requested ${requestedLanguage}`
							: ' / auto'}
					</p>
				</div>
				<div className="border-b border-border/70 pb-2">
					<p className="label-pixel text-muted-foreground">Layout</p>
					<p className="mt-1 font-mono text-xs">{layoutText}</p>
				</div>
			</div>

			<div className="space-y-2">
				<p className="label-pixel text-muted-foreground">Language</p>
				<div className="flex flex-wrap gap-2">
					{demoLanguageOptions.map((option) => {
						const isActive =
							(option.value ?? 'auto') === (overrides?.language ?? 'auto');
						return (
							<Button
								key={option.label}
								variant={isActive ? 'default' : 'outline'}
								size="sm"
								className="rounded-full"
								onClick={() => {
									if (!option.value) {
										void setOverrides({ language: undefined });
										return;
									}

									void setLanguage(option.value);
								}}
							>
								{option.label}
							</Button>
						);
					})}
				</div>
				<p className="text-xs text-muted-foreground">
					Allowed for this profile: {allowedLanguages.join(', ')}
				</p>
			</div>

			<div className="flex flex-wrap gap-2">
				<Button
					variant="outline"
					size="sm"
					className="rounded-full"
					onClick={() => setActiveUI('banner', { force: true })}
				>
					Show Banner
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="rounded-full"
					onClick={() => setActiveUI('dialog', { force: true })}
				>
					Show Dialog
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="rounded-full"
					onClick={() => setActiveUI('none')}
				>
					Hide UI
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className="rounded-full"
					onClick={() => {
						resetConsents();
						void initConsentManager();
					}}
				>
					Reset
				</Button>
			</div>

			<JsonBlock label="Resolved policy" value={policySummary} />
			<JsonBlock
				label="Runtime state"
				value={{
					...runtimeState,
					policyDecision,
				}}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PolicyDemo() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const {
		example,
		mode: demoMode,
		country,
		region,
	} = parseSearchParams(searchParams);

	const normalizedCountry = country.trim().toUpperCase();
	const normalizedRegion = region.trim().toUpperCase();
	const providerKey = `${demoMode}-${normalizedCountry}-${normalizedRegion}`;

	const navigate = useCallback(
		(
			nextExample: string,
			nextMode: DemoMode,
			nextCountry: string,
			nextRegion: string
		) => {
			const search = buildSearchString(
				nextExample,
				nextMode,
				nextCountry.trim().toUpperCase(),
				nextRegion.trim().toUpperCase()
			);
			router.replace(`${pathname}${search}`, { scroll: false });
		},
		[router, pathname]
	);

	const matchingPreset = useMemo(
		() =>
			locationPresets.find(
				(p) =>
					p.country === normalizedCountry &&
					(p.region ?? '') === normalizedRegion
			),
		[normalizedCountry, normalizedRegion]
	);

	const resolvedExample = useMemo(() => {
		if (Object.hasOwn(offlinePoliciesByExample, example)) {
			return example;
		}

		if (
			matchingPreset &&
			Object.hasOwn(offlinePoliciesByExample, matchingPreset.id)
		) {
			return matchingPreset.id;
		}

		return DEFAULT_DEMO_POLICY_EXAMPLE;
	}, [example, matchingPreset]);

	const activePreset = useMemo(
		() =>
			locationPresets.find((preset) => preset.id === resolvedExample) ??
			matchingPreset,
		[resolvedExample, matchingPreset]
	);

	const selectLocation = (preset: LocationPreset) => {
		navigate(preset.id, demoMode, preset.country, preset.region ?? '');
	};

	const overrides = useMemo(
		() => ({
			...(normalizedCountry ? { country: normalizedCountry } : {}),
			...(normalizedRegion ? { region: normalizedRegion } : {}),
		}),
		[normalizedCountry, normalizedRegion]
	);

	const categories: Array<
		'necessary' | 'functionality' | 'measurement' | 'marketing'
	> = ['necessary', 'functionality', 'measurement', 'marketing'];
	const iabConfig = iab({
		customVendors: [
			{
				id: 'demo-analytics',
				name: 'Demo Analytics',
				privacyPolicyUrl: 'https://example.com/privacy',
				purposes: [1, 8],
				dataCategories: [1, 2],
				usesCookies: true,
				cookieMaxAgeSeconds: 31536000,
				usesNonCookieAccess: false,
			},
		],
	});

	return (
		<main className="min-h-screen bg-background">
			<div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
				<header className="flex flex-col gap-6 border-b border-border/80 pb-8 lg:flex-row lg:items-end lg:justify-between">
					<div className="max-w-2xl space-y-3">
						<p className="label-pixel text-muted-foreground">
							c15t / example demo
						</p>
						<h1 className="max-w-[14ch] text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
							Policy-first consent flows.
						</h1>
						<p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
							Switch geography, policy source, and language. This page resolves
							the active policy, shows current consent state, and turns on IAB
							TCF 2.3 when the selected policy requires it.
						</p>
					</div>

					<nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
						<Link
							href="/policy-actions"
							className="underline-offset-4 transition hover:text-foreground hover:underline"
						>
							Policy actions
						</Link>
						<Link
							href="/terms"
							className="underline-offset-4 transition hover:text-foreground hover:underline"
						>
							Terms flow
						</Link>
						<a
							href="https://c15t.com/docs"
							target="_blank"
							rel="noreferrer"
							className="underline-offset-4 transition hover:text-foreground hover:underline"
						>
							Docs
						</a>
					</nav>
				</header>

				<ConsentManagerProvider
					key={providerKey}
					options={
						demoMode === 'hosted'
							? {
									mode: 'c15t',
									backendURL: `/api/self-host?example=${resolvedExample}`,
									consentCategories: categories,
									iab: iabConfig,
									overrides,
									scripts: createDemoScripts('demo-analytics'),
									theme: policyDemoTheme,
								}
							: {
									mode: 'offline',
									offlinePolicy: {
										i18n: {
											defaultProfile: 'default',
											messages: demoI18nMessages,
										},
										policyPacks: offlinePoliciesByExample[resolvedExample],
									},
									consentCategories: categories,
									iab: iabConfig,
									overrides,
									scripts: createDemoScripts('demo-analytics'),
									theme: policyDemoTheme,
								}
					}
				>
					<div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
						<section className="space-y-8">
							<div className="space-y-3">
								<p className="label-pixel text-muted-foreground">Mode</p>
								<div className="flex flex-wrap gap-2">
									<button
										type="button"
										onClick={() =>
											navigate(example, 'offline', country, region)
										}
										className={`rounded-full border px-4 py-2 text-sm transition ${
											demoMode === 'offline'
												? 'border-foreground bg-foreground text-background'
												: 'border-border text-foreground hover:border-foreground/40'
										}`}
									>
										Offline
									</button>
									<button
										type="button"
										onClick={() => navigate(example, 'hosted', country, region)}
										className={`rounded-full border px-4 py-2 text-sm transition ${
											demoMode === 'hosted'
												? 'border-foreground bg-foreground text-background'
												: 'border-border text-foreground hover:border-foreground/40'
										}`}
									>
										Hosted
									</button>
								</div>
								<p className="text-sm text-muted-foreground">
									{demoMode === 'hosted'
										? 'Hosted mode resolves policies through the self-hosted backend route.'
										: 'Offline mode runs the same scenarios from the local policy pack config.'}
								</p>
							</div>

							<div className="space-y-5">
								<div>
									<p className="label-pixel text-muted-foreground">Scenarios</p>
								</div>

								{locationPresetSections.map((section) => (
									<div key={section.label} className="space-y-3">
										<p className="text-sm font-medium">{section.label}</p>
										<div className="flex flex-wrap gap-2">
											{section.presets.map((preset) => {
												const isActive = preset.id === activePreset?.id;
												return (
													<button
														key={`${section.label}-${preset.label}`}
														type="button"
														onClick={() => selectLocation(preset)}
														className={`rounded-full border px-4 py-2 text-left text-sm transition ${
															isActive
																? 'border-foreground bg-foreground text-background'
																: 'border-border text-foreground hover:border-foreground/40'
														}`}
													>
														<span>{preset.label}</span>
														<span
															className={`ml-2 font-mono text-[11px] ${
																isActive
																	? 'text-background/70'
																	: 'text-muted-foreground'
															}`}
														>
															{preset.country}
															{preset.region ? `-${preset.region}` : ''}
														</span>
													</button>
												);
											})}
										</div>
									</div>
								))}
							</div>

							<div className="space-y-3">
								<p className="label-pixel text-muted-foreground">
									Manual override
								</p>
								<div className="flex flex-wrap items-end gap-3">
									<div className="space-y-1.5">
										<Label htmlFor="country" className="text-xs">
											Country
										</Label>
										<Input
											id="country"
											value={country}
											onChange={(e) =>
												navigate(example, demoMode, e.target.value, region)
											}
											placeholder="DE"
											maxLength={2}
											className="w-20 rounded-full border-border/80 font-mono shadow-none"
										/>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="region" className="text-xs">
											Region
										</Label>
										<Input
											id="region"
											value={region}
											onChange={(e) =>
												navigate(example, demoMode, country, e.target.value)
											}
											placeholder=""
											maxLength={3}
											className="w-20 rounded-full border-border/80 font-mono shadow-none"
										/>
									</div>
								</div>
							</div>
						</section>

						<section className="space-y-6 border-t border-border/80 pt-8 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
							<div className="space-y-2">
								<p className="label-pixel text-muted-foreground">
									Current scenario
								</p>
								<h2 className="text-2xl font-semibold tracking-tight">
									{activePreset?.label ?? 'Custom override'}
								</h2>
								<p className="text-sm leading-6 text-muted-foreground">
									{activePreset?.description ??
										'The policy is being resolved from the manual country and region override.'}
								</p>
							</div>

							<RuntimeInfo demoMode={demoMode} />
						</section>
					</div>

					<ConsentBanner />
					<IABConsentBanner />
					<IABConsentDialog />
					<ConsentDialog />
				</ConsentManagerProvider>
			</div>
		</main>
	);
}
