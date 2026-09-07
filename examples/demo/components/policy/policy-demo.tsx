'use client';

import type {
	ConsentPresentation,
	ConsentSnapshot,
	PromptPosition,
	PromptPresentation,
	PromptVariant,
} from 'c15t';
import { PROMPT_VARIANT_POSITIONS } from 'c15t';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentProvider,
	hosted,
	offline,
	useInit,
	useSetActiveUI,
	useConsentDraft,
	useSetLanguage,
	useSetOverrides,
	useSnapshot,
	usePromptPresentation,
} from 'c15t/react';
import { useHeadlessConsentUI } from 'c15t/react/headless';
import {
	IABConsentBanner,
	IABConsentDialog,
	IABProvider,
} from 'c15t/react/iab';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { createDemoScripts } from '../../lib/demo-scripts';
import {
	DEFAULT_DEMO_POLICY_EXAMPLE,
	demoI18nMessages,
} from '../../lib/policies';
import {
	getScenarioById,
	getScenarioPolicyRules,
	DEMO_CMP_ID,
	DEMO_IAB_VENDOR_IDS,
} from '../../lib/scenarios';
import {
	ThemeSwitcherButton,
	useThemePreset,
} from '../consent-manager/theme-switcher';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { VideoDemo } from '../video-demo';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DemoMode = 'offline' | 'hosted';

interface LocationPreset {
	id: string;
	label: string;
	country: string;
	region?: string;
	description: string;
}

interface LocationPresetSection {
	label: string;
	description: string;
	presets: LocationPreset[];
}

interface DemoLanguageOption {
	label: string;
	value?: string;
}

interface PolicyOverrides {
	country?: string;
	region?: string;
}

/** Prompt shape chosen in the URL. Empty strings mean "let the resolver pick". */
interface SurfaceParams {
	variant: PromptVariant | '';
	position: PromptPosition | '';
	blocking: boolean;
}

const PROMPT_VARIANTS = ['floating', 'bar', 'widget', 'wall'] as const;

const isPromptVariant = function isPromptVariant(
	value: string
): value is PromptVariant {
	return (PROMPT_VARIANTS as readonly string[]).includes(value);
};

const isPromptPosition = function isPromptPosition(
	value: string
): value is PromptPosition {
	return Object.values(PROMPT_VARIANT_POSITIONS).some((positions) =>
		(positions as readonly string[]).includes(value)
	);
};

/** Layer the URL surface choice over a scenario's own presentation. */
const withSurface = function withSurface(
	presentation: ConsentPresentation | undefined,
	surface: SurfaceParams
): ConsentPresentation | undefined {
	const prompt: PromptPresentation = { ...presentation?.prompt };
	if (surface.variant) {
		prompt.variant = surface.variant;
	}
	if (surface.position) {
		prompt.position = surface.position;
	}
	if (surface.blocking) {
		prompt.blocking = true;
	}
	if (Object.keys(prompt).length === 0) {
		return presentation;
	}
	return { ...presentation, prompt };
};

const policyOverridesCache = new Map<string, PolicyOverrides>();

const createPolicyOverrides = function createPolicyOverrides(
	normalizedCountry: string,
	normalizedRegion: string
): PolicyOverrides {
	const cacheKey = `${normalizedCountry}:${normalizedRegion}`;
	const cachedOverrides = policyOverridesCache.get(cacheKey);
	if (cachedOverrides) {
		return cachedOverrides;
	}

	let overrides: PolicyOverrides;
	if (normalizedCountry && normalizedRegion) {
		overrides = {
			country: normalizedCountry,
			region: normalizedRegion,
		};
	} else if (normalizedCountry) {
		overrides = { country: normalizedCountry };
	} else if (normalizedRegion) {
		overrides = { region: normalizedRegion };
	} else {
		overrides = {};
	}

	policyOverridesCache.set(cacheKey, overrides);
	return overrides;
};

// ---------------------------------------------------------------------------
// Location presets
// ---------------------------------------------------------------------------

const locationPresetSections: LocationPresetSection[] = [
	{
		description: 'The defaults that ship with policy packs.',
		label: 'Built-in Presets',
		presets: [
			{
				country: 'GB',
				description: 'Shipped preset for Europe + UK opt-in banners',
				id: 'preset-europe-opt-in',
				label: 'Europe Opt-In',
			},
			{
				country: 'FR',
				description: 'Shipped preset for IAB TCF in Europe',
				id: 'preset-europe-iab',
				label: 'Europe IAB',
			},
			{
				country: 'US',
				description: 'Shipped preset for a compact California opt-in banner',
				id: 'preset-california-opt-in',
				label: 'California Opt-In',
				region: 'CA',
			},
			{
				country: 'US',
				description: 'Shipped preset for California opt-out with no banner',
				id: 'preset-california-opt-out',
				label: 'California Opt-Out',
				region: 'CA',
			},
			{
				country: 'CA',
				description: 'Shipped preset for Quebec opt-in requirements',
				id: 'preset-quebec-opt-in',
				label: 'Quebec Opt-In',
				region: 'QC',
			},
			{
				country: 'AU',
				description:
					'Explicit global opt-out default with no first-layer prompt',
				id: 'preset-world-no-banner',
				label: 'World No Banner',
			},
		],
	},
	{
		description: 'Overrides that show how much policy packs can be shaped.',
		label: 'Custom Examples',
		presets: [
			{
				country: 'DE',
				description: 'Strict opt-in with compact split-row actions',
				id: 'custom-de-strict',
				label: 'Germany',
			},
			{
				country: 'FR',
				description: 'Country-specific IAB TCF policy',
				id: 'custom-fr-iab',
				label: 'France',
			},
			{
				country: 'ES',
				description: 'Split-stack layout with customize on its own row',
				id: 'custom-es-split-stack',
				label: 'Spain',
			},
			{
				country: 'BR',
				description: 'Custom opt-out choice with accept, reject, and customize',
				id: 'custom-br-growth',
				label: 'Brazil',
			},
			{
				country: 'US',
				description:
					'Opt-out choice with equally prominent Accept and Reject; reject records the opt-out',
				id: 'custom-ca-do-not-sell',
				label: 'California CTA',
				region: 'CA',
			},
			{
				country: 'US',
				description:
					'Opt-out notice with a dismiss button plus opt-out and preferences links',
				id: 'custom-us-notice',
				label: 'US notice',
			},
			{
				country: 'FR',
				description:
					'Opt-in choice rendered as a centered, blocking wall prompt',
				id: 'custom-eu-wall',
				label: 'EU wall',
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

const getAllowedLanguagesForProfile = function getAllowedLanguagesForProfile(
	profile?: string
): string[] {
	const activeProfile = profile ?? 'default';
	return Object.keys(
		demoI18nMessages[activeProfile]?.translations ?? {}
	).sort();
};

// ---------------------------------------------------------------------------
// Offline policy pack (same shape as the backend config in lib/policies.ts)
// ---------------------------------------------------------------------------

// Search param helpers
// ---------------------------------------------------------------------------

const parseSearchParams = function parseSearchParams(
	searchParams: URLSearchParams
): {
	example: string;
	mode: DemoMode;
	country: string;
	region: string;
	surface: SurfaceParams;
} {
	const example = searchParams.get('example') ?? DEFAULT_DEMO_POLICY_EXAMPLE;
	const mode = searchParams.get('mode') === 'hosted' ? 'hosted' : 'offline';
	const country = (searchParams.get('country') ?? 'GB').toUpperCase();
	const region = (searchParams.get('region') ?? '').toUpperCase();
	const variant = searchParams.get('variant') ?? '';
	const position = searchParams.get('position') ?? '';
	const surface: SurfaceParams = {
		blocking: searchParams.get('blocking') === '1',
		position: isPromptPosition(position) ? position : '',
		variant: isPromptVariant(variant) ? variant : '',
	};
	return { country, example, mode, region, surface };
};

const buildSearchString = function buildSearchString(
	example: string,
	mode: DemoMode,
	country: string,
	region: string,
	surface: SurfaceParams
): string {
	const params = new URLSearchParams();
	if (example && example !== DEFAULT_DEMO_POLICY_EXAMPLE) {
		params.set('example', example);
	}
	if (mode !== 'offline') {
		params.set('mode', mode);
	}
	if (country) {
		params.set('country', country);
	}
	if (region) {
		params.set('region', region);
	}
	if (surface.variant) {
		params.set('variant', surface.variant);
	}
	if (surface.position) {
		params.set('position', surface.position);
	}
	if (surface.blocking) {
		params.set('blocking', '1');
	}
	const str = params.toString();
	return str ? `?${str}` : '';
};

const JsonBlock = ({ label, value }: { label: string; value: unknown }) => (
	<div className="space-y-2">
		<p className="label-pixel text-muted-foreground">{label}</p>
		<pre className="border-border/80 bg-muted/20 text-foreground/90 overflow-x-auto rounded-xl border p-3 font-mono text-[12px] leading-5">
			{JSON.stringify(value ?? null, null, 2)}
		</pre>
	</div>
);

// ---------------------------------------------------------------------------
// Runtime state panel
// ---------------------------------------------------------------------------

const policyActionLayout = (presentation: PromptPresentation) => ({
	blocking: presentation.blocking ?? null,
	direction: presentation.direction ?? null,
	layout: presentation.layout ?? null,
	position: presentation.position ?? null,
	uiProfile: presentation.uiProfile ?? null,
	variant: presentation.variant ?? null,
});

/** One-line summary of the resolved prompt surface for the runtime panel. */
const describeSurface = function describeSurface(surface: {
	variant: PromptVariant;
	position: PromptPosition;
	positionSource: 'host' | 'default';
	blocking: boolean;
}): string {
	return `${surface.variant} · ${surface.position} (${surface.positionSource})${surface.blocking ? ' · blocking' : ''}`;
};

const policyLanguage = function policyLanguage(snapshot: ConsentSnapshot) {
	const profile = snapshot.policyRule?.i18n?.messageProfile;
	return {
		allowed: getAllowedLanguagesForProfile(profile),
		requested: snapshot.overrides.language ?? 'auto',
		resolved: snapshot.translations?.language ?? 'en',
	};
};

const policyLocation = function policyLocation(snapshot: ConsentSnapshot) {
	return {
		country: snapshot.location?.countryCode ?? null,
		region: snapshot.location?.regionCode ?? null,
	};
};

const buildPolicySummary = function buildPolicySummary(
	snapshot: ConsentSnapshot,
	demoMode: DemoMode,
	presentation: PromptPresentation
) {
	const { policyRule: policy } = snapshot;
	return {
		actionLayout: policyActionLayout(presentation),
		categories: snapshot.policyRule.scope,
		iabEnabled: snapshot.iab?.enabled ?? false,
		id: policy?.id ?? null,
		language: policyLanguage(snapshot),
		location: policyLocation(snapshot),
		matchedBy:
			snapshot.resolution.status === 'matched'
				? snapshot.resolution.matchedBy
				: null,
		messageProfile: policy?.i18n?.messageProfile ?? 'default',
		mode: demoMode,
		model: snapshot.model,
		scopeMode: snapshot.policyRule.scopeMode,
		source: demoMode,
		uiMode: policy.prompt,
	};
};

const buildMountedRuntimeDisplay = function buildMountedRuntimeDisplay(
	snapshot: ConsentSnapshot,
	demoMode: DemoMode,
	presentation: PromptPresentation,
	surface: Parameters<typeof describeSurface>[0]
) {
	const { policyRule: policy, resolution } = snapshot;
	const policySummary = buildPolicySummary(snapshot, demoMode, presentation);
	return {
		displayAllowedLanguages: policySummary.language.allowed,
		displayLayoutText: policyActionLayout(presentation).layout
			? JSON.stringify(policyActionLayout(presentation).layout)
			: 'default',
		displayLocationCountry: snapshot.location?.countryCode ?? '--',
		displayLocationRegion: snapshot.location?.regionCode ?? '',
		displayModel: snapshot.model ?? 'none',
		displayPolicyId: policy?.id ?? 'no policy',
		displayPolicySummary: policySummary,
		displayRequestedLanguage: policySummary.language.requested,
		displayResolvedLanguage: policySummary.language.resolved,
		displayRuntimeState: {
			activeUI: snapshot.activeUI,
			effectivePermissions: snapshot.effectivePermissions,
			explicitChoice: snapshot.explicitChoice,
			noticeDismissal: snapshot.noticeDismissal,
			optOutDirectives: snapshot.optOutDirectives,
			policyPending: snapshot.policyPending,
			privacySignals: snapshot.privacySignals,
			promptRequirement: snapshot.promptRequirement,
			resolution,
		},
		displaySource: demoMode,
		displaySurfaceText: describeSurface(surface),
	};
};

const buildPlaceholderRuntimeDisplay = function buildPlaceholderRuntimeDisplay(
	demoMode: DemoMode
) {
	return {
		displayAllowedLanguages: [] as string[],
		displayLayoutText: 'default',
		displayLocationCountry: '--',
		displayLocationRegion: '',
		displayModel: 'none',
		displayPolicyId: 'no policy',
		displayPolicySummary: {
			actionLayout: {
				blocking: null,
				direction: null,
				layout: null,
				position: null,
				uiProfile: null,
				variant: null,
			},
			categories: [],
			iabEnabled: false,
			id: null,
			language: { allowed: [], requested: 'auto', resolved: 'en' },
			location: { country: null, region: null },
			matchedBy: null,
			messageProfile: 'default',
			mode: demoMode,
			model: null,
			scopeMode: null,
			source: null,
			uiMode: 'none',
		},
		displayRequestedLanguage: 'auto',
		displayResolvedLanguage: 'en',
		displayRuntimeState: {
			activeUI: 'none',
			effectivePermissions: null,
			explicitChoice: null,
			promptRequirement: null,
			resolution: null,
		},
		displaySource: 'unknown',
		displaySurfaceText: 'resolving…',
	};
};

const RuntimeInfo = ({ demoMode }: { demoMode: DemoMode }) => {
	const [mounted, setMounted] = useState(false);
	const snapshot = useSnapshot();
	const presentation = usePromptPresentation();
	const { banner } = useHeadlessConsentUI();
	const init = useInit();
	const setActiveUI = useSetActiveUI();
	const draft = useConsentDraft();
	const setLanguage = useSetLanguage();
	const setOverrides = useSetOverrides();

	useEffect(() => {
		const frame = requestAnimationFrame(() => setMounted(true));
		return () => cancelAnimationFrame(frame);
	}, []);

	const {
		displayAllowedLanguages,
		displayLayoutText,
		displayLocationCountry,
		displayLocationRegion,
		displayModel,
		displayPolicyId,
		displayPolicySummary,
		displayRequestedLanguage,
		displayResolvedLanguage,
		displayRuntimeState,
		displaySource,
		displaySurfaceText,
	} = mounted
		? buildMountedRuntimeDisplay(snapshot, demoMode, presentation, banner)
		: buildPlaceholderRuntimeDisplay(demoMode);

	return (
		<div className="space-y-6">
			<div className="grid gap-3 text-sm sm:grid-cols-2">
				<div className="border-border/70 border-b pb-2">
					<p className="label-pixel text-muted-foreground">Policy</p>
					<p className="mt-1 font-mono text-xs">{displayPolicyId}</p>
				</div>
				<div className="border-border/70 border-b pb-2">
					<p className="label-pixel text-muted-foreground">Model</p>
					<p className="mt-1 font-mono text-xs">{displayModel}</p>
				</div>
				<div className="border-border/70 border-b pb-2">
					<p className="label-pixel text-muted-foreground">Location</p>
					<p className="mt-1 font-mono text-xs">
						{displayLocationCountry}
						{displayLocationRegion ? `-${displayLocationRegion}` : ''}
					</p>
				</div>
				<div className="border-border/70 border-b pb-2">
					<p className="label-pixel text-muted-foreground">Source</p>
					<p className="mt-1 font-mono text-xs">{displaySource}</p>
				</div>
				<div className="border-border/70 border-b pb-2">
					<p className="label-pixel text-muted-foreground">Language</p>
					<p className="mt-1 font-mono text-xs">
						{displayResolvedLanguage}
						{displayRequestedLanguage === 'auto'
							? ' / auto'
							: ` / requested ${displayRequestedLanguage}`}
					</p>
				</div>
				<div className="border-border/70 border-b pb-2">
					<p className="label-pixel text-muted-foreground">Layout</p>
					<p className="mt-1 font-mono text-xs">{displayLayoutText}</p>
				</div>
				<div className="border-border/70 border-b pb-2 sm:col-span-2">
					<p className="label-pixel text-muted-foreground">Surface</p>
					<p
						className="mt-1 font-mono text-xs"
						data-testid="policy-demo-surface"
					>
						{displaySurfaceText}
					</p>
				</div>
			</div>

			<div className="space-y-2">
				<p className="label-pixel text-muted-foreground">Language</p>
				<div className="flex flex-wrap gap-2">
					{demoLanguageOptions.map((option) => {
						const isActive =
							(option.value ?? 'auto') ===
							(snapshot.overrides.language ?? 'auto');
						return (
							<Button
								key={option.label}
								variant={isActive ? 'default' : 'outline'}
								size="sm"
								className="rounded-full"
								onClick={() => {
									if (!option.value) {
										setOverrides({
											...snapshot.overrides,
											language: undefined,
										});
										void init();
										return;
									}

									setLanguage(option.value);
									void init();
								}}
							>
								{option.label}
							</Button>
						);
					})}
				</div>
				<p className="text-muted-foreground text-xs">
					Allowed for this profile: {displayAllowedLanguages.join(', ')}
				</p>
			</div>

			<div className="flex flex-wrap gap-2">
				<Button
					variant="outline"
					size="sm"
					className="rounded-full"
					onClick={() => setActiveUI('banner')}
				>
					Show Banner
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="rounded-full"
					onClick={() => setActiveUI('dialog')}
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
						draft.reset();
					}}
				>
					Reset draft
				</Button>
			</div>

			<JsonBlock
				label="Resolved policy"
				value={displayPolicySummary}
			/>
			<JsonBlock
				label="Runtime state"
				value={displayRuntimeState}
			/>
		</div>
	);
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const PolicyDemo = () => {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { theme: presetTheme } = useThemePreset();

	const {
		example,
		mode: demoMode,
		country,
		region,
		surface,
	} = parseSearchParams(searchParams);

	const normalizedCountry = country.trim().toUpperCase();
	const normalizedRegion = region.trim().toUpperCase();
	const providerKey = `${demoMode}-${normalizedCountry}-${normalizedRegion}-${surface.variant}-${surface.position}-${surface.blocking}`;

	const navigate = useCallback(
		(
			nextExample: string,
			nextMode: DemoMode,
			nextCountry: string,
			nextRegion: string,
			nextSurface: SurfaceParams
		) => {
			const search = buildSearchString(
				nextExample,
				nextMode,
				nextCountry.trim().toUpperCase(),
				nextRegion.trim().toUpperCase(),
				nextSurface
			);
			router.replace(`${pathname}${search}`, { scroll: false });
		},
		[router, pathname]
	);

	const setSurface = (patch: Partial<SurfaceParams>) => {
		const next: SurfaceParams = { ...surface, ...patch };
		// A variant change drops a position it cannot accept.
		if (
			next.variant &&
			next.position &&
			!(PROMPT_VARIANT_POSITIONS[next.variant] as readonly string[]).includes(
				next.position
			)
		) {
			next.position = '';
		}
		navigate(example, demoMode, country, region, next);
	};
	const positionOptions = surface.variant
		? PROMPT_VARIANT_POSITIONS[surface.variant]
		: ([] as readonly PromptPosition[]);

	const matchingPreset = locationPresets.find(
		(p) =>
			p.country === normalizedCountry && (p.region ?? '') === normalizedRegion
	);

	const resolvedExample = (() => {
		if (getScenarioById(example).id === example) {
			return example;
		}

		if (
			matchingPreset &&
			getScenarioById(matchingPreset.id).id === matchingPreset.id
		) {
			return matchingPreset.id;
		}

		return DEFAULT_DEMO_POLICY_EXAMPLE;
	})();

	const activePreset =
		locationPresets.find((preset) => preset.id === resolvedExample) ??
		matchingPreset;
	const activePresentation = withSurface(
		getScenarioById(resolvedExample).presentation,
		surface
	);

	const selectLocation = (preset: LocationPreset) => {
		navigate(preset.id, demoMode, preset.country, preset.region ?? '', surface);
	};

	const overrides = createPolicyOverrides(normalizedCountry, normalizedRegion);

	const categories: (
		| 'necessary'
		| 'functionality'
		| 'measurement'
		| 'marketing'
	)[] = ['necessary', 'functionality', 'measurement', 'marketing'];
	const iabConfig = {
		cmpId: DEMO_CMP_ID,
		customVendors: [
			{
				cookieMaxAgeSeconds: 31536000,
				dataCategories: [1, 2],
				id: 'demo-analytics',
				name: 'Demo Analytics',
				privacyPolicyUrl: 'https://example.com/privacy',
				purposes: [1, 8],
				usesCookies: true,
				usesNonCookieAccess: false,
			},
		],
		vendors: DEMO_IAB_VENDOR_IDS,
	};

	return (
		<main className="bg-background min-h-screen">
			<div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
				<header className="border-border/80 flex flex-col gap-6 border-b pb-8 lg:flex-row lg:items-end lg:justify-between">
					<div className="max-w-2xl space-y-3">
						<p className="label-pixel text-muted-foreground">
							c15t / example demo
						</p>
						<h1 className="max-w-[14ch] text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
							Policy-first consent flows.
						</h1>
						<p className="text-muted-foreground max-w-xl text-sm leading-6 sm:text-base">
							Switch geography, policy source, and language. This page resolves
							the active policy, shows current consent state, and turns on IAB
							TCF 2.3 when the selected policy requires it.
						</p>
					</div>

					<div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
						<nav className="flex flex-wrap gap-x-5 gap-y-2">
							<Link
								href="/policy-actions"
								className="hover:text-foreground underline-offset-4 transition hover:underline"
							>
								Policy actions
							</Link>
							<a
								href="https://c15t.com/docs"
								target="_blank"
								rel="noreferrer"
								className="hover:text-foreground underline-offset-4 transition hover:underline"
							>
								Docs
							</a>
						</nav>
						<ThemeSwitcherButton />
					</div>
				</header>

				<ConsentProvider
					key={providerKey}
					options={
						demoMode === 'hosted'
							? {
									consentCategories: categories,
									i18n: {
										messages:
											demoI18nMessages[
												getScenarioById(resolvedExample).policy.i18n
													?.messageProfile ?? 'default'
											].translations,
									},
									mode: hosted({
										headers: { 'x-c15t-demo-example': resolvedExample },
										url: '/api/self-host',
									}),
									overrides,
									presentation: activePresentation,
									scripts: createDemoScripts('demo-analytics'),
									theme: presetTheme,
								}
							: {
									consentCategories: categories,
									i18n: {
										messages:
											demoI18nMessages[
												getScenarioById(resolvedExample).policy.i18n
													?.messageProfile ?? 'default'
											].translations,
									},
									mode: offline({
										policyRules: getScenarioPolicyRules(resolvedExample),
									}),
									overrides,
									presentation: activePresentation,
									scripts: createDemoScripts('demo-analytics'),
									theme: presetTheme,
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
											navigate(example, 'offline', country, region, surface)
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
										onClick={() =>
											navigate(example, 'hosted', country, region, surface)
										}
										className={`rounded-full border px-4 py-2 text-sm transition ${
											demoMode === 'hosted'
												? 'border-foreground bg-foreground text-background'
												: 'border-border text-foreground hover:border-foreground/40'
										}`}
									>
										Hosted
									</button>
								</div>
								<p className="text-muted-foreground text-sm">
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
									<div
										key={section.label}
										className="space-y-3"
									>
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
										<Label
											htmlFor="country"
											className="text-xs"
										>
											Country
										</Label>
										<Input
											id="country"
											value={country}
											onChange={(e) =>
												navigate(
													example,
													demoMode,
													e.target.value,
													region,
													surface
												)
											}
											placeholder="DE"
											maxLength={2}
											className="border-border/80 w-20 rounded-full font-mono shadow-none"
										/>
									</div>
									<div className="space-y-1.5">
										<Label
											htmlFor="region"
											className="text-xs"
										>
											Region
										</Label>
										<Input
											id="region"
											value={region}
											onChange={(e) =>
												navigate(
													example,
													demoMode,
													country,
													e.target.value,
													surface
												)
											}
											placeholder=""
											maxLength={3}
											className="border-border/80 w-20 rounded-full font-mono shadow-none"
										/>
									</div>
								</div>
							</div>

							<div className="space-y-3">
								<p className="label-pixel text-muted-foreground">
									Prompt surface
								</p>
								<p className="text-muted-foreground text-sm">
									Host presentation layered over the scenario. A notice defaults
									to a bottom bar, a choice to a floating card; a wall always
									blocks.
								</p>
								<div className="flex flex-wrap items-end gap-3">
									<div className="space-y-1.5">
										<Label
											htmlFor="surface-variant"
											className="text-xs"
										>
											Variant
										</Label>
										<select
											id="surface-variant"
											data-testid="policy-demo-variant"
											value={surface.variant}
											onChange={(event) =>
												setSurface({
													variant: event.target.value as PromptVariant | '',
												})
											}
											className="border-input bg-background h-9 rounded-full border px-3 font-mono text-xs"
										>
											<option value="">auto</option>
											{PROMPT_VARIANTS.map((variant) => (
												<option
													key={variant}
													value={variant}
												>
													{variant}
												</option>
											))}
										</select>
									</div>
									<div className="space-y-1.5">
										<Label
											htmlFor="surface-position"
											className="text-xs"
										>
											Position
										</Label>
										<select
											id="surface-position"
											data-testid="policy-demo-position"
											value={surface.position}
											disabled={!surface.variant}
											onChange={(event) =>
												setSurface({
													position: event.target.value as PromptPosition | '',
												})
											}
											className="border-input bg-background h-9 rounded-full border px-3 font-mono text-xs disabled:opacity-50"
										>
											<option value="">auto</option>
											{positionOptions.map((position) => (
												<option
													key={position}
													value={position}
												>
													{position}
												</option>
											))}
										</select>
									</div>
									<label className="flex h-9 items-center gap-2 text-sm">
										<input
											type="checkbox"
											data-testid="policy-demo-blocking"
											checked={surface.blocking}
											onChange={(event) =>
												setSurface({ blocking: event.target.checked })
											}
											className="size-4"
										/>
										Blocking
									</label>
								</div>
							</div>

							<VideoDemo inline />
						</section>

						<section className="border-border/80 space-y-6 border-t pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
							<div className="space-y-2">
								<p className="label-pixel text-muted-foreground">
									Current scenario
								</p>
								<h2 className="text-2xl font-semibold tracking-tight">
									{activePreset?.label ?? 'Custom override'}
								</h2>
								<p className="text-muted-foreground text-sm leading-6">
									{activePreset?.description ??
										'The policy is being resolved from the manual country and region override.'}
								</p>
							</div>

							<RuntimeInfo demoMode={demoMode} />
						</section>
					</div>

					<ConsentBanner />
					<IABProvider {...iabConfig}>
						<IABConsentBanner />
						<IABConsentDialog />
					</IABProvider>
					<ConsentDialog />
				</ConsentProvider>
			</div>
		</main>
	);
};
