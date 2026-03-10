'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type PolicyModel = 'opt-in' | 'opt-out' | 'none' | 'iab';
type PolicyMatchedBy = 'region' | 'country' | 'jurisdiction' | 'default';
type PolicyScopeMode = 'strict' | 'permissive';
type PolicyUiMode = 'none' | 'banner' | 'dialog';
type PolicyUiAction = 'accept' | 'reject' | 'customize';
type PolicyUiActionLayout = 'split' | 'inline';
type PolicyUiProfile = 'balanced' | 'compact' | 'strict';

type PolicyUiSurface = {
	allowedActions?: PolicyUiAction[];
	primaryAction?: PolicyUiAction;
	actionOrder?: PolicyUiAction[];
	actionLayout?: PolicyUiActionLayout;
	uiProfile?: PolicyUiProfile;
	scrollLock?: boolean;
};

type InitResponse = {
	jurisdiction?: string;
	location?: { countryCode: string | null; regionCode: string | null };
	translations?: { language?: string; translations?: Record<string, unknown> };
	gvl?: unknown;
	customVendors?: unknown;
	cmpId?: number;
	policy?: {
		id?: string;
		model?: PolicyModel;
		consent?: {
			expiryDays?: number;
			scopeMode?: PolicyScopeMode;
			categories?: string[];
			preselectedCategories?: string[];
		};
		ui?: {
			mode?: PolicyUiMode;
			banner?: PolicyUiSurface;
			dialog?: PolicyUiSurface;
		};
		proof?: {
			storeIp?: boolean;
			storeUserAgent?: boolean;
			storeLanguage?: boolean;
		};
	};
	policyDecision?: {
		policyId?: string;
		matchedBy?: PolicyMatchedBy;
		fingerprint?: string;
	};
	policySnapshotToken?: string;
};

type ScenarioExpectations = {
	policyId: string;
	matchedBy: PolicyMatchedBy;
	model: PolicyModel;
	uiMode?: PolicyUiMode;
	allowedActions?: PolicyUiAction[];
	actionOrder?: PolicyUiAction[];
	actionLayout?: PolicyUiActionLayout;
	scrollLock?: boolean;
	disallowedActions?: PolicyUiAction[];
	scopeMode?: PolicyScopeMode;
	categories?: string[];
	preselectedCategories?: string[];
	expiryDays?: number;
	languagePrefix?: string;
	iabPayload: boolean;
	iabTranslations: boolean;
	tokenPresent: boolean;
	proof?: {
		storeIp?: boolean;
		storeUserAgent?: boolean;
		storeLanguage?: boolean;
	};
};

type ScenarioDefinition = {
	id: string;
	label: string;
	headers: Record<string, string>;
	bannerHref: string;
	summary: string;
	expected: ScenarioExpectations;
};

type ScenarioResult =
	| {
			scenario: ScenarioDefinition;
			status: 'ok';
			data: InitResponse;
	  }
	| {
			scenario: ScenarioDefinition;
			status: 'error';
			error: string;
	  };

type CheckResult = {
	label: string;
	pass: boolean;
	expected: string;
	actual: string;
};

const scenarios: ScenarioDefinition[] = [
	{
		id: 'us-ca-en',
		label: 'US California (English)',
		headers: {
			'x-c15t-country': 'US',
			'x-c15t-region': 'CA',
			'accept-language': 'en-US',
		},
		bannerHref: '/?country=US&region=CA',
		summary:
			'Region override: opt-in banner, strict scope, inline actions ordered accept -> reject.',
		expected: {
			policyId: 'policy_us_ca',
			matchedBy: 'region',
			model: 'opt-in',
			uiMode: 'banner',
			allowedActions: ['accept', 'reject'],
			actionOrder: ['accept', 'reject'],
			actionLayout: 'inline',
			disallowedActions: ['customize'],
			scopeMode: 'strict',
			categories: ['necessary', 'measurement', 'marketing'],
			expiryDays: 365,
			languagePrefix: 'en',
			iabPayload: false,
			iabTranslations: false,
			tokenPresent: true,
			proof: {
				storeIp: true,
				storeUserAgent: true,
				storeLanguage: true,
			},
		},
	},
	{
		id: 'us-ca-es',
		label: 'US California (Spanish)',
		headers: {
			'x-c15t-country': 'US',
			'x-c15t-region': 'CA',
			'accept-language': 'es-ES',
		},
		bannerHref: '/?country=US&region=CA',
		summary:
			'Same CA region policy with Spanish language resolution from message profile.',
		expected: {
			policyId: 'policy_us_ca',
			matchedBy: 'region',
			model: 'opt-in',
			uiMode: 'banner',
			allowedActions: ['accept', 'reject'],
			actionOrder: ['accept', 'reject'],
			actionLayout: 'inline',
			disallowedActions: ['customize'],
			scopeMode: 'strict',
			categories: ['necessary', 'measurement', 'marketing'],
			expiryDays: 365,
			languagePrefix: 'es',
			iabPayload: false,
			iabTranslations: false,
			tokenPresent: true,
		},
	},
	{
		id: 'us-fl',
		label: 'US Florida',
		headers: {
			'x-c15t-country': 'US',
			'x-c15t-region': 'FL',
			'accept-language': 'en-US',
		},
		bannerHref: '/?country=US&region=FL',
		summary: 'Region override to silent experience (model none + no UI).',
		expected: {
			policyId: 'policy_us_fl',
			matchedBy: 'region',
			model: 'none',
			uiMode: 'none',
			expiryDays: undefined,
			languagePrefix: 'en',
			iabPayload: false,
			iabTranslations: false,
			tokenPresent: true,
			proof: {
				storeIp: false,
				storeUserAgent: true,
				storeLanguage: false,
			},
		},
	},
	{
		id: 'us-ny-country',
		label: 'US New York (Country Baseline)',
		headers: {
			'x-c15t-country': 'US',
			'x-c15t-region': 'NY',
			'accept-language': 'en-US',
		},
		bannerHref: '/?country=US&region=NY',
		summary:
			'Country-level US baseline: opt-out dialog with customize-only action.',
		expected: {
			policyId: 'policy_us_country',
			matchedBy: 'country',
			model: 'opt-out',
			uiMode: 'dialog',
			allowedActions: ['customize'],
			actionOrder: ['customize'],
			actionLayout: 'inline',
			disallowedActions: ['accept', 'reject'],
			scopeMode: 'strict',
			categories: ['necessary', 'functionality', 'measurement', 'marketing'],
			expiryDays: 180,
			languagePrefix: 'en',
			iabPayload: false,
			iabTranslations: false,
			tokenPresent: true,
			proof: {
				storeIp: false,
				storeUserAgent: true,
				storeLanguage: false,
			},
		},
	},
	{
		id: 'de',
		label: 'Germany (GDPR)',
		headers: {
			'x-c15t-country': 'DE',
			'accept-language': 'de-DE',
		},
		bannerHref: '/?country=DE',
		summary:
			'Country-level Germany UI demo policy: one-row layout with Reject, Accept, then Customize.',
		expected: {
			policyId: 'policy_de_opt_in',
			matchedBy: 'country',
			model: 'opt-in',
			uiMode: 'banner',
			allowedActions: ['reject', 'accept', 'customize'],
			actionOrder: ['reject', 'accept', 'customize'],
			actionLayout: 'split',
			scopeMode: 'strict',
			categories: ['necessary', 'functionality', 'experience', 'measurement'],
			expiryDays: 365,
			languagePrefix: 'de',
			iabPayload: false,
			iabTranslations: false,
			tokenPresent: true,
		},
	},
	{
		id: 'uk',
		label: 'United Kingdom',
		headers: {
			'x-c15t-country': 'GB',
			'accept-language': 'en-GB',
		},
		bannerHref: '/?country=GB',
		summary:
			'Country policy with functionality preselected on first visit; reject stays hidden, the banner locks scroll, and inline accept -> customize ordering applies.',
		expected: {
			policyId: 'policy_uk',
			matchedBy: 'country',
			model: 'opt-in',
			uiMode: 'banner',
			allowedActions: ['accept', 'customize'],
			actionOrder: ['accept', 'customize'],
			actionLayout: 'inline',
			scrollLock: true,
			disallowedActions: ['reject'],
			scopeMode: 'permissive',
			categories: [
				'necessary',
				'functionality',
				'experience',
				'measurement',
				'marketing',
			],
			preselectedCategories: ['functionality'],
			expiryDays: 365,
			languagePrefix: 'en',
			iabPayload: false,
			iabTranslations: false,
			tokenPresent: true,
		},
	},
	{
		id: 'jp-restricted',
		label: 'Japan (Restricted Purposes)',
		headers: {
			'x-c15t-country': 'JP',
			'accept-language': 'ja-JP',
		},
		bannerHref: '/?country=JP',
		summary:
			'Restricted purpose policy with split layout and customize-first ordering.',
		expected: {
			policyId: 'policy_jp_restricted',
			matchedBy: 'country',
			model: 'opt-in',
			uiMode: 'banner',
			allowedActions: ['accept', 'reject', 'customize'],
			actionOrder: ['customize', 'reject', 'accept'],
			actionLayout: 'split',
			scopeMode: 'permissive',
			categories: ['necessary', 'measurement'],
			expiryDays: 90,
			languagePrefix: 'ja',
			iabPayload: false,
			iabTranslations: false,
			tokenPresent: true,
		},
	},
	{
		id: 'br',
		label: 'Brazil (Opt-Out Strict)',
		headers: {
			'x-c15t-country': 'BR',
			'accept-language': 'pt-BR',
		},
		bannerHref: '/?country=BR',
		summary:
			'Country policy using opt-out dialog + inline ordering reject -> accept -> customize.',
		expected: {
			policyId: 'policy_br_opt_out',
			matchedBy: 'country',
			model: 'opt-out',
			uiMode: 'dialog',
			allowedActions: ['accept', 'reject', 'customize'],
			actionOrder: ['reject', 'accept', 'customize'],
			actionLayout: 'inline',
			scopeMode: 'strict',
			categories: ['necessary', 'measurement'],
			expiryDays: 120,
			languagePrefix: 'pt',
			iabPayload: false,
			iabTranslations: false,
			tokenPresent: true,
			proof: {
				storeIp: false,
				storeUserAgent: false,
				storeLanguage: true,
			},
		},
	},
	{
		id: 'fr',
		label: 'France',
		headers: {
			'x-c15t-country': 'FR',
			'accept-language': 'fr-FR',
		},
		bannerHref: '/?country=FR',
		summary:
			'Country-level IAB override should use fixed TCF UI behavior (no policy ui overrides).',
		expected: {
			policyId: 'policy_fr',
			matchedBy: 'country',
			model: 'iab',
			scopeMode: 'permissive',
			categories: ['*'],
			expiryDays: 180,
			languagePrefix: 'fr',
			iabPayload: true,
			iabTranslations: true,
			tokenPresent: true,
		},
	},
	{
		id: 'au',
		label: 'Australia',
		headers: {
			'x-c15t-country': 'AU',
			'accept-language': 'en-AU',
		},
		bannerHref: '/?country=AU',
		summary:
			'Default fallback policy: unmatched country resolves to model none and ui none.',
		expected: {
			policyId: 'policy_default_silent',
			matchedBy: 'default',
			model: 'none',
			uiMode: 'none',
			languagePrefix: 'en',
			iabPayload: false,
			iabTranslations: false,
			tokenPresent: true,
			proof: {
				storeIp: false,
				storeUserAgent: true,
				storeLanguage: false,
			},
		},
	},
];

function normalizeActions(actions?: PolicyUiAction[]): string {
	if (!actions || actions.length === 0) {
		return 'none';
	}
	return [...actions].sort().join(',');
}

function normalizeActionOrder(actions?: PolicyUiAction[]): string {
	if (!actions || actions.length === 0) {
		return 'none';
	}
	return actions.join(',');
}

function normalizeCategories(categories?: string[]): string {
	if (!categories || categories.length === 0) {
		return 'none';
	}
	return [...categories].sort().join(',');
}

function hasIabPayload(data: InitResponse): boolean {
	return data.gvl != null || data.customVendors != null || data.cmpId != null;
}

function hasIabTranslations(data: InitResponse): boolean {
	const catalog = data.translations?.translations;
	if (!catalog || typeof catalog !== 'object') {
		return false;
	}
	return Object.hasOwn(catalog, 'iab');
}

function toFlag(value: boolean | undefined): string {
	if (value === undefined) {
		return 'unset';
	}
	return value ? 'true' : 'false';
}

function getActivePolicyUiSurface(
	policy: InitResponse['policy']
): PolicyUiSurface | undefined {
	const mode = policy?.ui?.mode;
	if (mode === 'banner') {
		return policy.ui?.banner;
	}
	if (mode === 'dialog') {
		return policy.ui?.dialog;
	}
	return undefined;
}

function buildChecks(
	scenario: ScenarioDefinition,
	data: InitResponse
): CheckResult[] {
	const checks: CheckResult[] = [];
	const expected = scenario.expected;
	const activeSurface = getActivePolicyUiSurface(data.policy);

	checks.push({
		label: 'Policy ID',
		pass: data.policy?.id === expected.policyId,
		expected: expected.policyId,
		actual: data.policy?.id ?? 'none',
	});

	checks.push({
		label: 'Matched By',
		pass: data.policyDecision?.matchedBy === expected.matchedBy,
		expected: expected.matchedBy,
		actual: data.policyDecision?.matchedBy ?? 'none',
	});

	checks.push({
		label: 'Model',
		pass: data.policy?.model === expected.model,
		expected: expected.model,
		actual: data.policy?.model ?? 'none',
	});

	if (expected.uiMode) {
		checks.push({
			label: 'UI Mode',
			pass: data.policy?.ui?.mode === expected.uiMode,
			expected: expected.uiMode,
			actual: data.policy?.ui?.mode ?? 'none',
		});
	}

	if (expected.allowedActions) {
		checks.push({
			label: 'Allowed Actions',
			pass:
				normalizeActions(activeSurface?.allowedActions) ===
				normalizeActions(expected.allowedActions),
			expected: normalizeActions(expected.allowedActions),
			actual: normalizeActions(activeSurface?.allowedActions),
		});
	}

	if (expected.actionOrder) {
		checks.push({
			label: 'Action Order',
			pass:
				normalizeActionOrder(activeSurface?.actionOrder) ===
				normalizeActionOrder(expected.actionOrder),
			expected: normalizeActionOrder(expected.actionOrder),
			actual: normalizeActionOrder(activeSurface?.actionOrder),
		});
	}

	if (expected.actionLayout) {
		checks.push({
			label: 'Action Layout',
			pass: activeSurface?.actionLayout === expected.actionLayout,
			expected: expected.actionLayout,
			actual: activeSurface?.actionLayout ?? 'unset',
		});
	}

	if (expected.scrollLock !== undefined) {
		checks.push({
			label: 'Scroll Lock',
			pass: activeSurface?.scrollLock === expected.scrollLock,
			expected: expected.scrollLock ? 'on' : 'off',
			actual:
				activeSurface?.scrollLock === undefined
					? 'unset'
					: activeSurface.scrollLock
						? 'on'
						: 'off',
		});
	}

	for (const disallowedAction of expected.disallowedActions ?? []) {
		const actualActions = activeSurface?.allowedActions ?? [];
		checks.push({
			label: `Action Blocked: ${disallowedAction}`,
			pass: !actualActions.includes(disallowedAction),
			expected: 'blocked',
			actual: actualActions.includes(disallowedAction) ? 'present' : 'blocked',
		});
	}

	if (expected.scopeMode) {
		checks.push({
			label: 'Scope Mode',
			pass: data.policy?.consent?.scopeMode === expected.scopeMode,
			expected: expected.scopeMode,
			actual: data.policy?.consent?.scopeMode ?? 'unset',
		});
	}

	if (expected.categories) {
		checks.push({
			label: 'Category Scope',
			pass:
				normalizeCategories(data.policy?.consent?.categories) ===
				normalizeCategories(expected.categories),
			expected: normalizeCategories(expected.categories),
			actual: normalizeCategories(data.policy?.consent?.categories),
		});
	}

	if (expected.preselectedCategories) {
		checks.push({
			label: 'Preselected Categories',
			pass:
				normalizeCategories(data.policy?.consent?.preselectedCategories) ===
				normalizeCategories(expected.preselectedCategories),
			expected: normalizeCategories(expected.preselectedCategories),
			actual: normalizeCategories(data.policy?.consent?.preselectedCategories),
		});
	}

	if (expected.expiryDays !== undefined) {
		checks.push({
			label: 'Expiry Days',
			pass: data.policy?.consent?.expiryDays === expected.expiryDays,
			expected: String(expected.expiryDays),
			actual: data.policy?.consent?.expiryDays?.toString() ?? 'unset',
		});
	}

	if (expected.languagePrefix) {
		const language = data.translations?.language ?? '';
		checks.push({
			label: 'Language',
			pass: language.toLowerCase().startsWith(expected.languagePrefix),
			expected: `${expected.languagePrefix}*`,
			actual: language || 'unset',
		});
	}

	checks.push({
		label: 'IAB Payload',
		pass: hasIabPayload(data) === expected.iabPayload,
		expected: expected.iabPayload ? 'present' : 'absent',
		actual: hasIabPayload(data) ? 'present' : 'absent',
	});

	checks.push({
		label: 'IAB Translations',
		pass: hasIabTranslations(data) === expected.iabTranslations,
		expected: expected.iabTranslations ? 'present' : 'absent',
		actual: hasIabTranslations(data) ? 'present' : 'absent',
	});

	checks.push({
		label: 'Snapshot Token',
		pass: Boolean(data.policySnapshotToken) === expected.tokenPresent,
		expected: expected.tokenPresent ? 'present' : 'absent',
		actual: data.policySnapshotToken ? 'present' : 'absent',
	});

	if (expected.proof) {
		checks.push({
			label: 'Proof storeIp',
			pass: data.policy?.proof?.storeIp === expected.proof.storeIp,
			expected: toFlag(expected.proof.storeIp),
			actual: toFlag(data.policy?.proof?.storeIp),
		});
		checks.push({
			label: 'Proof storeUserAgent',
			pass:
				data.policy?.proof?.storeUserAgent === expected.proof.storeUserAgent,
			expected: toFlag(expected.proof.storeUserAgent),
			actual: toFlag(data.policy?.proof?.storeUserAgent),
		});
		checks.push({
			label: 'Proof storeLanguage',
			pass: data.policy?.proof?.storeLanguage === expected.proof.storeLanguage,
			expected: toFlag(expected.proof.storeLanguage),
			actual: toFlag(data.policy?.proof?.storeLanguage),
		});
	}

	return checks;
}

export function PolicyScenarioLab() {
	const [results, setResults] = useState<ScenarioResult[]>([]);
	const [loading, setLoading] = useState(true);
	const [showAllChecks, setShowAllChecks] = useState(false);

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			const responses = await Promise.all(
				scenarios.map(async (scenario): Promise<ScenarioResult> => {
					try {
						const response = await fetch('/api/self-host/init', {
							headers: scenario.headers,
							cache: 'no-store',
						});
						const data = (await response.json()) as InitResponse;
						return {
							scenario,
							status: 'ok',
							data,
						};
					} catch (error) {
						return {
							scenario,
							status: 'error',
							error: error instanceof Error ? error.message : 'Unknown error',
						};
					}
				})
			);

			if (!mounted) {
				return;
			}

			setResults(responses);
			setLoading(false);
		};

		load();
		return () => {
			mounted = false;
		};
	}, []);

	return (
		<section>
			<div className="mb-6">
				<p className="text-muted-foreground text-sm">
					Run each geo override against <code>/init</code> and compare actual
					response fields against expected policy behavior.
				</p>
			</div>

			<div className="mb-6 flex flex-wrap gap-2">
				{scenarios.map((scenario) => (
					<Link
						key={scenario.id}
						href={scenario.bannerHref}
						className="rounded-full border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted/40"
					>
						{scenario.label}
					</Link>
				))}
			</div>

			{loading ? (
				<div className="text-muted-foreground text-sm">
					Loading init responses...
				</div>
			) : (
				<>
					<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
						<p className="text-muted-foreground text-sm">
							{results.filter((result) => result.status === 'ok').length}{' '}
							scenarios loaded
						</p>
						<button
							type="button"
							onClick={() => setShowAllChecks((value) => !value)}
							className="rounded-md border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted/40"
						>
							{showAllChecks ? 'Show Mismatches Only' : 'Show All Checks'}
						</button>
					</div>
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{results.map((result) => (
							<section
								key={result.scenario.id}
								className="rounded-2xl border bg-background p-4 shadow-sm"
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<h2 className="font-semibold text-lg">
											{result.scenario.label}
										</h2>
										<p className="mt-1 text-muted-foreground text-xs">
											{result.scenario.summary}
										</p>
									</div>
									<Link
										href={result.scenario.bannerHref}
										className="shrink-0 rounded-md border px-2 py-1 text-xs hover:bg-muted/40"
									>
										Open
									</Link>
								</div>

								{result.status === 'error' ? (
									<p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">
										{result.error}
									</p>
								) : (
									<div className="mt-3 space-y-3">
										{(() => {
											const checks = buildChecks(result.scenario, result.data);
											const failedChecks = checks.filter(
												(check) => !check.pass
											);
											const visibleChecks = showAllChecks
												? checks
												: failedChecks;
											const passed = checks.length - failedChecks.length;
											const allPassed = failedChecks.length === 0;
											const activeSurface = getActivePolicyUiSurface(
												result.data.policy
											);

											return (
												<>
													<div className="flex flex-wrap items-center gap-2">
														<span
															className={`rounded-full px-2 py-1 text-[11px] font-medium ${
																allPassed
																	? 'bg-emerald-100 text-emerald-700'
																	: 'bg-amber-100 text-amber-700'
															}`}
														>
															{allPassed ? 'PASS' : 'CHECK'}
														</span>
														<span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium">
															{passed}/{checks.length}
														</span>
														<span className="rounded-full bg-muted px-2 py-1 text-[11px] font-mono">
															{result.data.policy?.id ?? 'none'}
														</span>
													</div>

													<dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border bg-muted/20 p-3 text-xs">
														<div>
															<dt className="text-muted-foreground">Matched</dt>
															<dd className="font-mono">
																{result.data.policyDecision?.matchedBy ?? 'n/a'}
															</dd>
														</div>
														<div>
															<dt className="text-muted-foreground">Model</dt>
															<dd className="font-mono">
																{result.data.policy?.model ?? 'n/a'}
															</dd>
														</div>
														<div>
															<dt className="text-muted-foreground">UI</dt>
															<dd className="font-mono">
																{result.data.policy?.ui?.mode ?? 'n/a'}
															</dd>
														</div>
														<div>
															<dt className="text-muted-foreground">
																Language
															</dt>
															<dd className="font-mono">
																{result.data.translations?.language ?? 'n/a'}
															</dd>
														</div>
														<div>
															<dt className="text-muted-foreground">Scope</dt>
															<dd className="font-mono">
																{result.data.policy?.consent?.scopeMode ??
																	'n/a'}
															</dd>
														</div>
														<div>
															<dt className="text-muted-foreground">IAB</dt>
															<dd className="font-mono">
																{hasIabPayload(result.data) ? 'on' : 'off'}
															</dd>
														</div>
													</dl>

													<div className="rounded-lg border px-3 py-2 text-xs">
														<p className="text-muted-foreground">Actions</p>
														<p className="font-mono">
															{(activeSurface?.allowedActions ?? []).join(
																', '
															) || 'none'}
														</p>
														<p className="mt-2 text-muted-foreground">
															Action order
														</p>
														<p className="font-mono">
															{(activeSurface?.actionOrder ?? []).join(', ') ||
																'none'}
														</p>
														<p className="mt-2 text-muted-foreground">
															Action layout
														</p>
														<p className="font-mono">
															{activeSurface?.actionLayout ?? 'none'}
														</p>
														<p className="mt-2 text-muted-foreground">
															Scroll lock
														</p>
														<p className="font-mono">
															{activeSurface?.scrollLock === undefined
																? 'unset'
																: activeSurface.scrollLock
																	? 'on'
																	: 'off'}
														</p>
														<p className="mt-2 text-muted-foreground">
															Category scope
														</p>
														<p className="font-mono">
															{(
																result.data.policy?.consent?.categories ?? []
															).join(', ') || 'none'}
														</p>
														<p className="mt-2 text-muted-foreground">
															Preselected
														</p>
														<p className="font-mono">
															{(
																result.data.policy?.consent
																	?.preselectedCategories ?? []
															).join(', ') || 'none'}
														</p>
													</div>

													<details className="rounded-lg border px-3 py-2">
														<summary className="cursor-pointer list-none text-xs font-medium">
															{showAllChecks
																? `All checks (${checks.length})`
																: `Mismatches (${failedChecks.length})`}
														</summary>
														<div className="mt-2 space-y-1.5">
															{visibleChecks.length === 0 ? (
																<p className="text-muted-foreground text-xs">
																	No mismatches.
																</p>
															) : (
																visibleChecks.map((check) => (
																	<div
																		key={check.label}
																		className={`rounded border px-2 py-1 text-xs ${
																			check.pass
																				? 'border-emerald-200 bg-emerald-50/60'
																				: 'border-amber-200 bg-amber-50/60'
																		}`}
																	>
																		<div className="flex items-center justify-between gap-2">
																			<span className="font-medium">
																				{check.label}
																			</span>
																			<span className="font-medium">
																				{check.pass ? 'ok' : 'mismatch'}
																			</span>
																		</div>
																		<div className="mt-1 font-mono text-[11px] text-muted-foreground">
																			exp: {check.expected} | act:{' '}
																			{check.actual}
																		</div>
																	</div>
																))
															)}
														</div>
													</details>
												</>
											);
										})()}
									</div>
								)}
							</section>
						))}
					</div>
				</>
			)}
		</section>
	);
}
