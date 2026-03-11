'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogTrigger,
	ConsentManagerProvider,
	IABConsentBanner,
	IABConsentDialog,
	policyPackPresets,
	useConsentManager,
} from '@c15t/react';
import { Cloud, Globe, Laptop, MapPin, RotateCcw } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DemoMode = 'offline' | 'hosted';

type LocationPreset = {
	label: string;
	country: string;
	region?: string;
	description: string;
};

// ---------------------------------------------------------------------------
// Location presets
// ---------------------------------------------------------------------------

const locationPresets: LocationPreset[] = [
	{
		label: 'Germany',
		country: 'DE',
		description: 'Custom strict opt-in policy',
	},
	{
		label: 'France',
		country: 'FR',
		description: 'Custom IAB TCF policy',
	},
	{
		label: 'United Kingdom',
		country: 'GB',
		description: 'Preset Europe opt-in',
	},
	{
		label: 'California',
		country: 'US',
		region: 'CA',
		description: 'Preset opt-out (no banner)',
	},
	{
		label: 'Australia',
		country: 'AU',
		description: 'Default fallback (no banner)',
	},
];

// ---------------------------------------------------------------------------
// Offline policy pack (same shape as the backend config in lib/policies.ts)
// ---------------------------------------------------------------------------

const offlinePolicies = [
	{
		id: 'fr_iab',
		match: { countries: ['FR'] },
		consent: { model: 'iab' as const, expiryDays: 180, categories: ['*'] },
		proof: { storeIp: true, storeUserAgent: true, storeLanguage: true },
	},
	{
		id: 'de_strict',
		match: { countries: ['DE'] },
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
				primaryAction: 'customize' as const,
				uiProfile: 'compact' as const,
			},
			dialog: {
				allowedActions: [
					'reject' as const,
					'accept' as const,
					'customize' as const,
				],
				primaryAction: 'customize' as const,
				uiProfile: 'compact' as const,
			},
		},
		proof: { storeIp: true, storeUserAgent: true, storeLanguage: true },
	},
	policyPackPresets.europeOptIn(),
	policyPackPresets.californiaOptOut(),
	policyPackPresets.worldNoBanner(),
];

// ---------------------------------------------------------------------------
// Search param helpers
// ---------------------------------------------------------------------------

function parseSearchParams(searchParams: URLSearchParams): {
	mode: DemoMode;
	country: string;
	region: string;
} {
	const mode = searchParams.get('mode') === 'hosted' ? 'hosted' : 'offline';
	const country = (searchParams.get('country') ?? 'DE').toUpperCase();
	const region = (searchParams.get('region') ?? '').toUpperCase();
	return { mode, country, region };
}

function buildSearchString(
	mode: DemoMode,
	country: string,
	region: string
): string {
	const params = new URLSearchParams();
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
		initDataSource,
	} = useConsentManager();

	const policy = lastBannerFetchData?.policy;
	const policyDecision = lastBannerFetchData?.policyDecision;

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

	const { mode: demoMode, country, region } = parseSearchParams(searchParams);

	const normalizedCountry = country.trim().toUpperCase();
	const normalizedRegion = region.trim().toUpperCase();
	const providerKey = `${demoMode}-${normalizedCountry}-${normalizedRegion}`;

	const navigate = useCallback(
		(nextMode: DemoMode, nextCountry: string, nextRegion: string) => {
			const search = buildSearchString(
				nextMode,
				nextCountry.trim().toUpperCase(),
				nextRegion.trim().toUpperCase()
			);
			router.replace(`${pathname}${search}`, { scroll: false });
		},
		[router, pathname]
	);

	const activePreset = useMemo(
		() =>
			locationPresets.find(
				(p) =>
					p.country === normalizedCountry &&
					(p.region ?? '') === normalizedRegion
			),
		[normalizedCountry, normalizedRegion]
	);

	const selectLocation = (preset: LocationPreset) => {
		navigate(demoMode, preset.country, preset.region ?? '');
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
	const iab = {
		enabled: true,
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
	};

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
						location. Pick a region below to see the resolved policy and consent
						UI.
					</p>
				</div>

				{/* Mode toggle + Location picker */}
				<div className="space-y-4 rounded-xl border bg-background p-5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 text-sm font-medium">
							<Globe className="h-4 w-4 text-muted-foreground" />
							Visitor Location
						</div>

						{/* Mode toggle */}
						<div className="flex items-center gap-1 rounded-lg border p-0.5">
							<button
								type="button"
								onClick={() => navigate('offline', country, region)}
								className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
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
								onClick={() => navigate('hosted', country, region)}
								className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
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
						{locationPresets.map((preset) => {
							const isActive =
								preset.country === normalizedCountry &&
								(preset.region ?? '') === normalizedRegion;
							return (
								<button
									key={preset.label}
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

					<div className="flex items-end gap-3">
						<div className="space-y-1.5">
							<Label htmlFor="country" className="text-xs">
								Country
							</Label>
							<Input
								id="country"
								value={country}
								onChange={(e) => navigate(demoMode, e.target.value, region)}
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
								onChange={(e) => navigate(demoMode, country, e.target.value)}
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
									backendURL: '/api/self-host',
									consentCategories: categories,
									iab,
									overrides,
								}
							: {
									mode: 'offline',
									offlinePolicy: { policyPacks: offlinePolicies },
									consentCategories: categories,
									iab,
									overrides,
								}
					}
				>
					<div className="space-y-4 rounded-xl border bg-background p-5">
						<div className="flex items-center gap-2 text-sm font-medium">
							Resolved Policy
							{activePreset && (
								<span className="text-muted-foreground font-normal">
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
