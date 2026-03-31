'use client';

import { iab } from '@c15t/iab';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogTrigger,
	ConsentManagerProvider,
	policyPackPresets,
	type Theme,
	useConsentManager,
} from '@c15t/react';
import { IABConsentBanner, IABConsentDialog } from '@c15t/react/iab';
import { Cloud, Globe, Laptop, MapPin, RotateCcw } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import {
	DEFAULT_DEMO_POLICY_EXAMPLE,
	demoI18nMessages,
} from '../../lib/policies';
import { Badge } from '../ui/badge';
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
					primaryAction: 'customize' as const,
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
					primaryAction: 'customize' as const,
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
					primaryAction: 'accept' as const,
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
					primaryAction: 'accept' as const,
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
					primaryAction: 'accept' as const,
					uiProfile: 'balanced' as const,
				},
				dialog: {
					allowedActions: ['accept' as const, 'customize' as const],
					layout: [['accept' as const], 'customize' as const],
					direction: 'row' as const,
					primaryAction: 'accept' as const,
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
					primaryAction: 'accept' as const,
					uiProfile: 'compact' as const,
				},
				dialog: {
					allowedActions: ['accept' as const, 'reject' as const],
					layout: ['accept' as const, 'reject' as const],
					direction: 'column' as const,
					primaryAction: 'accept' as const,
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

// ---------------------------------------------------------------------------
// Runtime state panel
// ---------------------------------------------------------------------------

function RuntimeInfo({ demoMode }: { demoMode: DemoMode }) {
	const {
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

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-1.5">
				<Badge variant="outline" className="font-mono text-xs">
					{policy?.id ?? 'no policy'}
				</Badge>
				<Badge variant="secondary" className="text-xs">
					{model ?? 'none'}
				</Badge>
				<Badge variant="secondary" className="text-xs">
					matched: {policyDecision?.matchedBy ?? 'n/a'}
				</Badge>
				{policy?.ui?.mode && policy.ui.mode !== 'none' && (
					<Badge variant="secondary" className="text-xs">
						ui: {policy.ui.mode}
					</Badge>
				)}
				{iab?.config.enabled && (
					<Badge variant="secondary" className="text-xs">
						IAB
					</Badge>
				)}
				<Badge
					variant={demoMode === 'hosted' ? 'default' : 'outline'}
					className="text-xs"
				>
					{demoMode === 'hosted' ? 'hosted' : 'offline'}
				</Badge>
			</div>

			<div className="grid gap-3 text-sm sm:grid-cols-2">
				<div>
					<span className="text-muted-foreground text-xs">Location</span>
					<p className="font-mono text-sm">
						{locationInfo?.countryCode ?? '--'}
						{locationInfo?.regionCode ? `-${locationInfo.regionCode}` : ''}
					</p>
				</div>
				<div>
					<span className="text-muted-foreground text-xs">Scope</span>
					<p className="font-mono text-sm">{policyScopeMode ?? 'permissive'}</p>
				</div>
				<div>
					<span className="text-muted-foreground text-xs">Source</span>
					<p className="font-mono text-sm">{initDataSource ?? 'unknown'}</p>
				</div>
				<div>
					<span className="text-muted-foreground text-xs">Categories</span>
					<p className="font-mono text-sm">
						{policyCategories?.length ? policyCategories.join(', ') : 'all'}
					</p>
				</div>
				<div>
					<span className="text-muted-foreground text-xs">Action Layout</span>
					<p className="font-mono text-sm">{layoutText}</p>
				</div>
				<div>
					<span className="text-muted-foreground text-xs">Direction</span>
					<p className="font-mono text-sm">{bannerUi?.direction ?? 'row'}</p>
				</div>
				<div>
					<span className="text-muted-foreground text-xs">Message Profile</span>
					<p className="font-mono text-sm">{activeProfile}</p>
				</div>
				<div>
					<span className="text-muted-foreground text-xs">Language</span>
					<p className="font-mono text-sm">
						{resolvedLanguage}
						{requestedLanguage !== 'auto'
							? ` (requested ${requestedLanguage})`
							: ' (auto)'}
					</p>
				</div>
			</div>

			<div className="space-y-2 rounded-lg border bg-muted/30 p-3">
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="font-medium text-sm">Language fallback test</p>
						<p className="text-muted-foreground text-xs">
							Hosted and offline policy-pack modes now use the same
							profile-aware i18n rules. Try Chinese on a Europe location to
							verify it falls back inside that profile instead of expanding to
							another locale.
						</p>
					</div>
					<Badge variant="outline" className="font-mono text-xs">
						allowed: {allowedLanguages.join(', ')}
					</Badge>
				</div>

				<div className="flex flex-wrap gap-2">
					{demoLanguageOptions.map((option) => {
						const isActive =
							(option.value ?? 'auto') === (overrides?.language ?? 'auto');
						return (
							<Button
								key={option.label}
								variant={isActive ? 'default' : 'outline'}
								size="sm"
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
			</div>

			<div className="space-y-2 rounded-lg border bg-muted/30 p-3">
				<p className="font-medium text-sm">UI policy + theme demo</p>
				<p className="text-muted-foreground text-xs">
					This demo now uses grouped policy layouts with
					<code className="mx-1 text-xs">
						[['reject', 'accept'], 'customize']
					</code>
					and theme-level button styling via
					<code className="mx-1 text-xs">theme.consentActions</code>.
				</p>
			</div>

			<div className="flex flex-wrap gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => setActiveUI('banner', { force: true })}
				>
					Show Banner
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setActiveUI('dialog', { force: true })}
				>
					Show Dialog
				</Button>
				<Button variant="outline" size="sm" onClick={() => setActiveUI('none')}>
					Hide UI
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => {
						resetConsents();
						void initConsentManager();
					}}
				>
					<RotateCcw className="mr-1.5 h-3.5 w-3.5" />
					Reset
				</Button>
			</div>
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
		<main className="min-h-screen bg-muted/30 py-12">
			<div className="container mx-auto max-w-3xl space-y-8 px-4">
				{/* Header */}
				<div>
					<h1 className="font-semibold text-3xl tracking-tight">
						Policy Packs
					</h1>
					<p className="mt-2 text-muted-foreground">
						See how c15t resolves different consent experiences based on visitor
						location. Force request languages below to see which locales each
						policy profile will actually return.
					</p>
				</div>

				{/* Mode toggle + Location picker */}
				<div className="space-y-4 rounded-xl border bg-background p-5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 font-medium text-sm">
							<Globe className="h-4 w-4 text-muted-foreground" />
							Visitor Location
						</div>

						{/* Mode toggle */}
						<div className="flex items-center gap-1 rounded-lg border p-0.5">
							<button
								type="button"
								onClick={() => navigate(example, 'offline', country, region)}
								className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-xs transition-all ${
									demoMode === 'offline'
										? 'bg-foreground text-background'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<Laptop className="h-3.5 w-3.5" />
								Offline
							</button>
							<button
								type="button"
								onClick={() => navigate(example, 'hosted', country, region)}
								className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-xs transition-all ${
									demoMode === 'hosted'
										? 'bg-foreground text-background'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<Cloud className="h-3.5 w-3.5" />
								Hosted
							</button>
						</div>
					</div>

					{demoMode === 'hosted' && (
						<p className="text-muted-foreground text-xs">
							Resolving via <code className="text-xs">/api/self-host/init</code>{' '}
							— policies come from the backend config.
						</p>
					)}

					<div className="flex flex-wrap gap-2">
						<div className="w-full space-y-4">
							{locationPresetSections.map((section) => (
								<div key={section.label} className="space-y-2">
									<div>
										<p className="font-medium text-sm">{section.label}</p>
										<p className="text-muted-foreground text-xs">
											{section.description}
										</p>
									</div>
									<div className="flex flex-wrap gap-2">
										{section.presets.map((preset) => {
											const isActive = preset.id === activePreset?.id;
											return (
												<button
													key={`${section.label}-${preset.label}`}
													type="button"
													onClick={() => selectLocation(preset)}
													className={`group relative rounded-lg border px-3 py-2 text-left text-sm transition-all ${
														isActive
															? 'border-foreground bg-foreground text-background'
															: 'hover:border-foreground/30 hover:bg-muted/50'
													}`}
												>
													<div className="flex items-center gap-2">
														<MapPin className="h-3.5 w-3.5" />
														<span className="font-medium">{preset.label}</span>
														<span
															className={`font-mono text-xs ${isActive ? 'text-background/70' : 'text-muted-foreground'}`}
														>
															{preset.country}
															{preset.region ? `-${preset.region}` : ''}
														</span>
													</div>
													<p
														className={`mt-0.5 text-xs ${isActive ? 'text-background/70' : 'text-muted-foreground'}`}
													>
														{preset.description}
													</p>
												</button>
											);
										})}
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="flex items-end gap-3">
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
								className="w-20 font-mono"
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
								className="w-20 font-mono"
							/>
						</div>
					</div>
				</div>

				{/* Resolved policy + consent UI */}
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
									theme: policyDemoTheme,
								}
					}
				>
					<div className="space-y-4 rounded-xl border bg-background p-5">
						<div className="flex items-center gap-2 font-medium text-sm">
							Resolved Policy
							{activePreset && (
								<span className="font-normal text-muted-foreground">
									for {activePreset.label}
								</span>
							)}
						</div>
						<RuntimeInfo demoMode={demoMode} />
					</div>

					<ConsentBanner />
					<IABConsentBanner />
					<IABConsentDialog />
					<ConsentDialogTrigger />
					<ConsentDialog />
				</ConsentManagerProvider>
			</div>
		</main>
	);
}
