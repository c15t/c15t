'use client';

import { iab } from '@c15t/iab';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentManagerProvider,
} from '@c15t/react';
import { IABConsentBanner, IABConsentDialog } from '@c15t/react/iab';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { createDemoScripts } from '../../lib/demo-scripts';
import {
	DEFAULT_SCENARIO_ID,
	DEMO_CMP_ID,
	DEMO_CUSTOM_VENDORS,
	DEMO_IAB_VENDOR_IDS,
	DEMO_SCENARIO_HEADER,
	demoI18nMessages,
	demoScenarios,
	getScenarioById,
	getScenarioPolicyPacks,
} from '../../lib/scenarios';
import { cn } from '../../lib/utils';
import {
	ThemeSwitcherButton,
	useThemePreset,
} from '../consent-manager/theme-switcher';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { VideoDemo } from '../video-demo';
import { LiveStatus } from './live-status';

const HOSTED_BACKEND_URL = 'https://c15t-demo-consent-io.inth.app';

const CONSENT_CATEGORIES = [
	'necessary',
	'functionality',
	'measurement',
	'marketing',
] as const;

type DemoMode = 'offline' | 'hosted';

interface ConsentDemoProps {
	/**
	 * Which backend the hosted mode talks to.
	 * - `hosted`: the shared consent.io demo instance (sales-facing default)
	 * - `self-host`: this app's own /api/self-host route (development only)
	 */
	backend?: 'hosted' | 'self-host';
}

interface DemoParams {
	scenarioId: string;
	mode: DemoMode;
	country: string;
	region: string;
}

function parseParams(searchParams: URLSearchParams): DemoParams {
	const scenarioId =
		searchParams.get('scenario') ??
		searchParams.get('example') ?? // legacy links
		DEFAULT_SCENARIO_ID;
	const scenario = getScenarioById(scenarioId);
	const mode: DemoMode =
		searchParams.get('mode') === 'hosted' ? 'hosted' : 'offline';
	const country = (
		searchParams.get('country') ?? scenario.country
	).toUpperCase();
	const region = (
		searchParams.get('region') ??
		scenario.region ??
		''
	).toUpperCase();

	return { scenarioId: scenario.id, mode, country, region };
}

function buildSearch(params: DemoParams): string {
	const next = new URLSearchParams();
	const scenario = getScenarioById(params.scenarioId);

	if (params.scenarioId !== DEFAULT_SCENARIO_ID) {
		next.set('scenario', params.scenarioId);
	}
	if (params.mode !== 'offline') {
		next.set('mode', params.mode);
	}
	// Only keep explicit location overrides that differ from the scenario.
	if (params.country && params.country !== scenario.country) {
		next.set('country', params.country);
	}
	if (params.region && params.region !== (scenario.region ?? '')) {
		next.set('region', params.region);
	}

	const search = next.toString();
	return search ? `?${search}` : '';
}

export function ConsentDemo({ backend = 'hosted' }: ConsentDemoProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { theme: presetTheme, mounted: themeMounted } = useThemePreset();

	const params = parseParams(searchParams);
	const scenario = getScenarioById(params.scenarioId);
	const isSelfHost = backend === 'self-host';
	const hostedLabel = isSelfHost ? 'Self-hosted' : 'Hosted';

	const navigate = useCallback(
		(next: Partial<DemoParams>) => {
			const merged: DemoParams = { ...params, ...next };
			router.replace(`${pathname}${buildSearch(merged)}`, { scroll: false });
		},
		[router, pathname, params]
	);

	const selectScenario = useCallback(
		(id: string) => {
			const nextScenario = getScenarioById(id);
			navigate({
				scenarioId: nextScenario.id,
				country: nextScenario.country,
				region: nextScenario.region ?? '',
			});
		},
		[navigate]
	);

	const iabConfig = useMemo(
		() =>
			iab({
				// Offline mode has no server to supply a CMP ID, so the client
				// config must provide one. Matches the self-host backend.
				cmpId: DEMO_CMP_ID,
				vendors: DEMO_IAB_VENDOR_IDS,
				customVendors: DEMO_CUSTOM_VENDORS,
			}),
		[]
	);

	const overrides = useMemo(
		() => ({
			...(params.country ? { country: params.country } : {}),
			...(params.region ? { region: params.region } : {}),
		}),
		[params.country, params.region]
	);

	// Remount the provider whenever the simulated environment changes so the
	// consent manager re-initializes from scratch.
	const providerKey = `${backend}-${params.mode}-${params.scenarioId}-${params.country}-${params.region}`;

	// Use the default theme during SSR/hydration to avoid mismatches, then
	// switch to the visitor's preset. The IAB banner keeps its default
	// center-of-page placement, but clicks pass through the backdrop so the
	// demo controls stay usable while it is open.
	const activeTheme = themeMounted ? presetTheme : undefined;
	const demoTheme = useMemo(
		() => ({
			...(activeTheme ?? {}),
			slots: {
				...(activeTheme?.slots ?? {}),
				iabConsentBanner: {
					style: { pointerEvents: 'none' },
				},
				iabConsentBannerCard: {
					style: { pointerEvents: 'auto' },
				},
			},
		}),
		[activeTheme]
	);

	const sharedOptions = {
		consentCategories: [...CONSENT_CATEGORIES],
		iab: iabConfig,
		overrides,
		scripts: createDemoScripts('demo-analytics'),
		theme: demoTheme,
	};

	const providerOptions =
		params.mode === 'hosted'
			? {
					mode: 'c15t' as const,
					backendURL: isSelfHost ? '/api/self-host' : HOSTED_BACKEND_URL,
					...(isSelfHost
						? { headers: { [DEMO_SCENARIO_HEADER]: params.scenarioId } }
						: {}),
					...sharedOptions,
				}
			: {
					mode: 'offline' as const,
					offlinePolicy: {
						i18n: {
							defaultProfile: 'default',
							messages: demoI18nMessages,
						},
						policyPacks: getScenarioPolicyPacks(params.scenarioId),
					},
					...sharedOptions,
				};

	return (
		<main className="min-h-screen bg-background">
			<div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
				<header className="flex flex-wrap items-center justify-between gap-4 border-border/80 border-b pb-6">
					<div className="space-y-1">
						<h1 className="font-semibold text-xl tracking-tight">
							c15t demo{isSelfHost ? ' — self-hosted backend' : ''}
						</h1>
						<p className="text-muted-foreground text-sm">
							Pick a scenario to see which policy resolves and the banner it
							produces.
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
						<a
							href="https://c15t.com/docs"
							target="_blank"
							rel="noreferrer"
							className="underline-offset-4 transition hover:text-foreground hover:underline"
						>
							Docs
						</a>
						<ThemeSwitcherButton />
					</div>
				</header>

				<ConsentManagerProvider key={providerKey} options={providerOptions}>
					<div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
						<section className="space-y-8">
							{/* Mode */}
							<div className="space-y-3">
								<p className="label-pixel text-muted-foreground">Mode</p>
								<div className="flex flex-wrap gap-2">
									<PillButton
										active={params.mode === 'offline'}
										onClick={() => navigate({ mode: 'offline' })}
									>
										Offline
									</PillButton>
									<PillButton
										active={params.mode === 'hosted'}
										onClick={() => navigate({ mode: 'hosted' })}
									>
										{hostedLabel}
									</PillButton>
								</div>
								<p className="text-muted-foreground text-sm">
									{params.mode === 'offline'
										? 'Offline mode simulates the selected scenario locally — no backend required.'
										: isSelfHost
											? 'Policies resolve through this app’s /api/self-host route using the selected scenario.'
											: 'Connected to a hosted consent.io instance. Policies come from that instance’s configuration, so scenario packs below only apply in offline mode.'}
								</p>
							</div>

							{/* Scenarios */}
							<div className="space-y-5">
								<ScenarioGroup
									title="Built-in presets"
									description="Policy packs that ship with c15t."
									group="preset"
									activeId={params.scenarioId}
									onSelect={selectScenario}
								/>
								<ScenarioGroup
									title="Custom examples"
									description="Overrides that show how far policy packs can be shaped."
									group="custom"
									activeId={params.scenarioId}
									onSelect={selectScenario}
								/>
							</div>

							{/* Manual location override */}
							<div className="space-y-3">
								<p className="label-pixel text-muted-foreground">
									Location override
								</p>
								<div className="flex flex-wrap items-end gap-3">
									<div className="space-y-1.5">
										<Label htmlFor="country" className="text-xs">
											Country
										</Label>
										<Input
											id="country"
											value={params.country}
											onChange={(event) =>
												navigate({
													country: event.target.value.toUpperCase(),
												})
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
											value={params.region}
											onChange={(event) =>
												navigate({ region: event.target.value.toUpperCase() })
											}
											placeholder="CA"
											maxLength={3}
											className="w-20 rounded-full border-border/80 font-mono shadow-none"
										/>
									</div>
									<p className="pb-2 text-muted-foreground text-xs">
										Pretend the visitor is somewhere else without changing the
										scenario.
									</p>
								</div>
							</div>

							<VideoDemo inline />
						</section>

						{/* Live status */}
						<section className="space-y-6 border-border/80 border-t pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
							<div className="space-y-2">
								<p className="label-pixel text-muted-foreground">
									Current scenario
								</p>
								<h2 className="font-semibold text-2xl tracking-tight">
									{scenario.label}
								</h2>
								<p className="text-muted-foreground text-sm leading-6">
									{scenario.description}
								</p>
							</div>

							<LiveStatus mode={params.mode} />
						</section>
					</div>

					<ConsentBanner />
					<ConsentDialog />
					<IABConsentBanner trapFocus={false} scrollLock={false} />
					<IABConsentDialog />
				</ConsentManagerProvider>
			</div>
		</main>
	);
}

function PillButton({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				'rounded-full border px-4 py-2 text-left text-sm transition',
				active
					? 'border-foreground bg-foreground text-background'
					: 'border-border text-foreground hover:border-foreground/40'
			)}
		>
			{children}
		</button>
	);
}

function ScenarioGroup({
	title,
	description,
	group,
	activeId,
	onSelect,
}: {
	title: string;
	description: string;
	group: 'preset' | 'custom';
	activeId: string;
	onSelect: (id: string) => void;
}) {
	const scenarios = demoScenarios.filter(
		(scenario) => scenario.group === group
	);

	return (
		<div className="space-y-3">
			<div>
				<p className="font-medium text-sm">{title}</p>
				<p className="text-muted-foreground text-xs">{description}</p>
			</div>
			<div className="flex flex-wrap gap-2">
				{scenarios.map((scenario) => {
					const isActive = scenario.id === activeId;
					return (
						<button
							key={scenario.id}
							type="button"
							onClick={() => onSelect(scenario.id)}
							className={cn(
								'rounded-full border px-4 py-2 text-left text-sm transition',
								isActive
									? 'border-foreground bg-foreground text-background'
									: 'border-border text-foreground hover:border-foreground/40'
							)}
						>
							<span>{scenario.label}</span>
							<span
								className={cn(
									'ml-2 font-mono text-[11px]',
									isActive ? 'text-background/70' : 'text-muted-foreground'
								)}
							>
								{scenario.country}
								{scenario.region ? `-${scenario.region}` : ''}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
