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
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

type PolicyPreset =
	| 'auto'
	| 'default-pack'
	| 'california'
	| 'quebec'
	| 'iab-europe'
	| 'empty';

function RuntimeStatePanel() {
	const {
		activeUI,
		iab,
		initConsentManager,
		initDataSource,
		lastBannerFetchData,
		locationInfo,
		model,
		policyCategories,
		policyScopeMode,
		resetConsents,
		setActiveUI,
	} = useConsentManager();

	const policy = lastBannerFetchData?.policy;
	const policyDecision = lastBannerFetchData?.policyDecision;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Resolved Offline Runtime</CardTitle>
				<CardDescription>
					Inspect the runtime values coming from offline mode.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-wrap gap-2">
					<Badge variant="secondary">model: {model ?? 'none'}</Badge>
					<Badge variant="secondary">activeUI: {activeUI}</Badge>
					<Badge variant="secondary">
						source: {initDataSource ?? 'unknown'}
					</Badge>
					<Badge variant="secondary">
						iab: {iab?.config.enabled ? 'enabled' : 'disabled'}
					</Badge>
					<Badge variant="secondary">
						location:{' '}
						{locationInfo
							? `${locationInfo.countryCode ?? '--'}-${locationInfo.regionCode ?? '--'}`
							: 'unknown'}
					</Badge>
				</div>

				<div className="grid gap-2 text-sm sm:grid-cols-2">
					<div>
						<span className="text-muted-foreground">policy.id:</span>{' '}
						{policy?.id ?? 'none'}
					</div>
					<div>
						<span className="text-muted-foreground">matchedBy:</span>{' '}
						{policyDecision?.matchedBy ?? 'n/a'}
					</div>
					<div>
						<span className="text-muted-foreground">ui.mode:</span>{' '}
						{policy?.ui?.mode ?? 'none'}
					</div>
					<div>
						<span className="text-muted-foreground">scopeMode:</span>{' '}
						{policyScopeMode ?? 'unmanaged'}
					</div>
					<div className="sm:col-span-2">
						<span className="text-muted-foreground">categories:</span>{' '}
						{policyCategories?.length ? policyCategories.join(', ') : 'all'}
					</div>
				</div>

				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						onClick={() => setActiveUI('banner', { force: true })}
					>
						Force Banner
					</Button>
					<Button
						variant="outline"
						onClick={() => setActiveUI('dialog', { force: true })}
					>
						Force Dialog
					</Button>
					<Button variant="outline" onClick={() => setActiveUI('none')}>
						Hide UI
					</Button>
					<Button
						variant="secondary"
						onClick={() => {
							resetConsents();
							void initConsentManager();
						}}
					>
						Reset + Reload
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

export function PolicyOfflineLab() {
	const [iabEnabled, setIabEnabled] = useState(false);
	const [policyPreset, setPolicyPreset] =
		useState<PolicyPreset>('default-pack');
	const [country, setCountry] = useState('GB');
	const [region, setRegion] = useState('');
	const [instanceNonce, setInstanceNonce] = useState(0);

	const normalizedCountry = country.trim().toUpperCase();
	const normalizedRegion = region.trim().toUpperCase();
	const effectiveIabEnabled = iabEnabled || policyPreset === 'iab-europe';
	const providerKey = `${instanceNonce}-${effectiveIabEnabled}-${policyPreset}-${normalizedCountry}-${normalizedRegion}`;

	const policyPacks = useMemo(() => {
		switch (policyPreset) {
			case 'default-pack':
				return [
					policyPackPresets.europeOptIn(),
					policyPackPresets.californiaOptOut(),
					policyPackPresets.worldNoBanner(),
				];
			case 'california':
				return [policyPackPresets.californiaOptOut()];
			case 'quebec':
				return [policyPackPresets.quebecOptIn()];
			case 'iab-europe':
				return [policyPackPresets.europeIab()];
			case 'empty':
				return [];
			default:
				return undefined;
		}
	}, [policyPreset]);

	const presetDescription = useMemo(() => {
		switch (policyPreset) {
			case 'default-pack':
				return 'Uses the surfaced default pack: Europe opt-in + California opt-out.';
			case 'california':
				return 'Applies only the California opt-out policy pack.';
			case 'quebec':
				return 'Applies only the Quebec opt-in policy pack.';
			case 'iab-europe':
				return 'Applies the dedicated IAB TCF 2.3 pack for GDPR and UK GDPR regions.';
			case 'empty':
				return 'Explicit empty pack. Offline mode resolves to no banner.';
			default:
				return 'No explicit policy packs. Offline mode falls back to the default opt-in banner.';
		}
	}, [policyPreset]);

	return (
		<main className="min-h-screen bg-muted/30 py-12">
			<div className="container mx-auto max-w-6xl space-y-6 px-4">
				<div className="space-y-2">
					<h1 className="font-semibold text-3xl tracking-tight">
						Offline Policy Packs
					</h1>
					<p className="text-muted-foreground">
						Test the shared offline policy-pack behavior using the same presets
						exported for hosted mode.
					</p>
					<div className="flex flex-wrap gap-2 text-sm">
						<Link
							href="/policy"
							className="rounded-md border px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
						>
							Hosted Policy Workspace
						</Link>
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Offline Controls</CardTitle>
						<CardDescription>
							The provider now accepts top-level `policyPacks`. No pack uses the
							offline opt-in fallback. Empty or unmatched packs resolve to no
							banner.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-wrap items-center gap-4">
							<div className="flex items-center gap-2">
								<Switch
									id="offline-iab-enabled"
									checked={effectiveIabEnabled}
									onCheckedChange={(checked) => setIabEnabled(Boolean(checked))}
								/>
								<Label htmlFor="offline-iab-enabled">Enable IAB fallback</Label>
							</div>
							<Badge variant="secondary">current preset: {policyPreset}</Badge>
						</div>
						<p className="text-muted-foreground text-sm">{presetDescription}</p>

						<div className="flex flex-wrap gap-2">
							<Button
								variant={
									policyPreset === 'default-pack' ? 'default' : 'outline'
								}
								onClick={() => setPolicyPreset('default-pack')}
							>
								Default Pack
							</Button>
							<Button
								variant={policyPreset === 'quebec' ? 'default' : 'outline'}
								onClick={() => setPolicyPreset('quebec')}
							>
								Quebec Opt-In
							</Button>
							<Button
								variant={policyPreset === 'california' ? 'default' : 'outline'}
								onClick={() => setPolicyPreset('california')}
							>
								California Opt-Out
							</Button>
							<Button
								variant={policyPreset === 'iab-europe' ? 'default' : 'outline'}
								onClick={() => setPolicyPreset('iab-europe')}
							>
								Europe IAB
							</Button>
							<Button
								variant={policyPreset === 'empty' ? 'default' : 'outline'}
								onClick={() => setPolicyPreset('empty')}
							>
								Empty Pack
							</Button>
							<Button
								variant={policyPreset === 'auto' ? 'default' : 'outline'}
								onClick={() => setPolicyPreset('auto')}
							>
								Auto Fallback
							</Button>
						</div>

						<div className="flex flex-wrap gap-2">
							<Button
								variant="secondary"
								onClick={() => {
									setCountry('GB');
									setRegion('');
								}}
							>
								UK
							</Button>
							<Button
								variant="secondary"
								onClick={() => {
									setCountry('CA');
									setRegion('QC');
								}}
							>
								Quebec
							</Button>
							<Button
								variant="secondary"
								onClick={() => {
									setCountry('US');
									setRegion('CA');
								}}
							>
								California
							</Button>
							<Button
								variant="secondary"
								onClick={() => {
									setCountry('JP');
									setRegion('');
								}}
							>
								No Match
							</Button>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="offline-country">Country</Label>
								<Input
									id="offline-country"
									value={country}
									onChange={(event) => setCountry(event.target.value)}
									placeholder="GB"
									maxLength={2}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="offline-region">Region (optional)</Label>
								<Input
									id="offline-region"
									value={region}
									onChange={(event) => setRegion(event.target.value)}
									placeholder="CA"
								/>
							</div>
						</div>

						<Button onClick={() => setInstanceNonce((current) => current + 1)}>
							Recreate Offline Provider
						</Button>
					</CardContent>
				</Card>

				<ConsentManagerProvider
					key={providerKey}
					options={{
						mode: 'offline',
						consentCategories: ['necessary', 'functionality', 'measurement'],
						iab: {
							enabled: effectiveIabEnabled,
						},
						policyPacks,
						overrides: {
							...(normalizedCountry ? { country: normalizedCountry } : {}),
							...(normalizedRegion ? { region: normalizedRegion } : {}),
						},
					}}
				>
					<RuntimeStatePanel />
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
