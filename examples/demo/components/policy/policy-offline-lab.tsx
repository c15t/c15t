'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogTrigger,
	ConsentManagerProvider,
	IABConsentBanner,
	IABConsentDialog,
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

type PolicyPreset = 'auto' | 'opt-in' | 'silent' | 'iab';

const OFFLINE_OPT_IN_POLICY = {
	id: 'policy_demo_offline_opt_in_banner',
	model: 'opt-in' as const,
	consent: {
		expiryDays: 365,
		scopeMode: 'unmanaged' as const,
		purposeIds: ['*'],
	},
	ui: {
		mode: 'banner' as const,
		banner: {
			allowedActions: ['accept', 'reject', 'customize'] as const,
			primaryAction: 'accept' as const,
			actionOrder: ['accept', 'reject', 'customize'] as const,
			actionLayout: 'split' as const,
			uiProfile: 'balanced' as const,
		},
		dialog: {
			allowedActions: ['accept', 'reject', 'customize'] as const,
			primaryAction: 'accept' as const,
			actionOrder: ['accept', 'reject', 'customize'] as const,
			actionLayout: 'split' as const,
			uiProfile: 'balanced' as const,
		},
	},
};

const OFFLINE_NO_BANNER_POLICY = {
	id: 'policy_demo_offline_none',
	model: 'none' as const,
	ui: {
		mode: 'none' as const,
	},
};

const OFFLINE_IAB_POLICY = {
	id: 'policy_demo_offline_iab',
	model: 'iab' as const,
	consent: {
		expiryDays: 365,
		scopeMode: 'unmanaged' as const,
		purposeIds: ['*'],
	},
};

function RuntimeStatePanel() {
	const {
		activeUI,
		iab,
		initConsentManager,
		initDataSource,
		lastBannerFetchData,
		locationInfo,
		model,
		policyPurposeIds,
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
						<span className="text-muted-foreground">purposeIds:</span>{' '}
						{policyPurposeIds?.length ? policyPurposeIds.join(', ') : 'all'}
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
	const [policyPreset, setPolicyPreset] = useState<PolicyPreset>('auto');
	const [country, setCountry] = useState('GB');
	const [region, setRegion] = useState('');
	const [instanceNonce, setInstanceNonce] = useState(0);

	const normalizedCountry = country.trim().toUpperCase();
	const normalizedRegion = region.trim().toUpperCase();
	const providerKey = `${instanceNonce}-${iabEnabled}-${policyPreset}-${normalizedCountry}-${normalizedRegion}`;

	const offlinePolicy = useMemo(() => {
		switch (policyPreset) {
			case 'opt-in':
				return { policy: OFFLINE_OPT_IN_POLICY };
			case 'silent':
				return { policy: OFFLINE_NO_BANNER_POLICY };
			case 'iab':
				return { policy: OFFLINE_IAB_POLICY };
			default:
				return undefined;
		}
	}, [policyPreset]);

	return (
		<main className="min-h-screen bg-muted/30 py-12">
			<div className="container mx-auto max-w-6xl space-y-6 px-4">
				<div className="space-y-2">
					<h1 className="font-semibold text-3xl tracking-tight">
						Offline Policy Lab
					</h1>
					<p className="text-muted-foreground">
						Test offline runtime policy behavior without a backend policy pack.
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
							`auto` uses fallback defaults: opt-in banner, or IAB when IAB is
							enabled.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-wrap items-center gap-4">
							<div className="flex items-center gap-2">
								<Switch
									id="offline-iab-enabled"
									checked={iabEnabled}
									onCheckedChange={(checked) => setIabEnabled(Boolean(checked))}
								/>
								<Label htmlFor="offline-iab-enabled">Enable IAB</Label>
							</div>
							<Badge variant="secondary">current preset: {policyPreset}</Badge>
						</div>

						<div className="flex flex-wrap gap-2">
							<Button
								variant={policyPreset === 'auto' ? 'default' : 'outline'}
								onClick={() => setPolicyPreset('auto')}
							>
								Auto Fallback
							</Button>
							<Button
								variant={policyPreset === 'opt-in' ? 'default' : 'outline'}
								onClick={() => setPolicyPreset('opt-in')}
							>
								Opt-In Banner
							</Button>
							<Button
								variant={policyPreset === 'silent' ? 'default' : 'outline'}
								onClick={() => setPolicyPreset('silent')}
							>
								No Banner
							</Button>
							<Button
								variant={policyPreset === 'iab' ? 'default' : 'outline'}
								onClick={() => setPolicyPreset('iab')}
							>
								Force IAB Policy
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
							enabled: iabEnabled,
						},
						overrides: {
							...(normalizedCountry ? { country: normalizedCountry } : {}),
							...(normalizedRegion ? { region: normalizedRegion } : {}),
						},
						store: {
							offlinePolicy,
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
