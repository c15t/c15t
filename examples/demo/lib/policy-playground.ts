/**
 * Pure helpers behind the policy playground at `/policy`.
 *
 * The playground edits a small form, turns it into a `PolicyRule`, and
 * runs the same schema functions the runtime uses: validation,
 * normalization, fingerprinting, and geo resolution. Keeping that logic
 * here (no React) lets `policy-playground.test.ts` cover it in Node.
 */

import type {
	PolicyFingerprints,
	PolicyMatch,
	PolicyOptionalCategory,
	PolicyPrompt,
	PolicyResolution,
	PolicyRule,
	PolicyRuleModel,
	PolicyScopeMode,
	ResolvedPolicyRule,
} from '@c15t/schema/types';
import {
	createPolicyRuleFingerprints,
	inspectPolicyRules,
	normalizePolicyRule,
	POLICY_MODEL_PROMPTS,
	POLICY_OPTIONAL_CATEGORIES,
	policyRulePresets,
	resolvePolicyRules,
} from '@c15t/schema/types';
import {
	PROMPT_VARIANT_DEFAULT_POSITION,
	PROMPT_VARIANT_POSITIONS,
	resolveConsentPresentation,
} from 'c15t';
import type {
	ConsentPresentation,
	PresentationDiagnostic,
	PromptPosition,
	PromptPresentation,
	PromptVariant,
	ResolvedConsentPresentation,
} from 'c15t';

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export interface PlaygroundPreset {
	id: keyof typeof policyRulePresets;
	label: string;
	/** Location that makes the preset match. */
	country: string;
	region?: string;
	rule: PolicyRule;
}

/** Every preset that ships in `policyRulePresets`, with a matching location. */
export const playgroundPresets: PlaygroundPreset[] = [
	{
		country: 'AU',
		id: 'australiaOptOut',
		label: 'Australia opt-out',
		rule: policyRulePresets.australiaOptOut(),
	},
	{
		country: 'JP',
		id: 'japanOptOut',
		label: 'Japan opt-out',
		rule: policyRulePresets.japanOptOut(),
	},
	{
		country: 'CA',
		id: 'canadaOptIn',
		label: 'Canada opt-in',
		region: 'ON',
		rule: policyRulePresets.canadaOptIn(),
	},
	{
		country: 'CA',
		id: 'canadaOptOut',
		label: 'Canada opt-out',
		region: 'ON',
		rule: policyRulePresets.canadaOptOut(),
	},
	{
		country: 'GB',
		id: 'ukStatistics',
		label: 'UK service statistics',
		rule: policyRulePresets.ukStatistics(),
	},
	{
		country: 'MY',
		id: 'malaysiaStatistics',
		label: 'Malaysia statistics only',
		rule: policyRulePresets.malaysiaStatistics(),
	},

	{
		country: 'CN',
		id: 'chinaOptIn',
		label: 'China opt-in',
		rule: policyRulePresets.chinaOptIn(),
	},
	{
		country: 'MY',
		id: 'malaysiaOptIn',
		label: 'Malaysia opt-in',
		rule: policyRulePresets.malaysiaOptIn(),
	},
	{
		country: 'TH',
		id: 'thailandOptIn',
		label: 'Thailand opt-in',
		rule: policyRulePresets.thailandOptIn(),
	},
	{
		country: 'ID',
		id: 'indonesiaOptIn',
		label: 'Indonesia opt-in',
		rule: policyRulePresets.indonesiaOptIn(),
	},
	{
		country: 'PH',
		id: 'philippinesOptIn',
		label: 'Philippines opt-in',
		rule: policyRulePresets.philippinesOptIn(),
	},
	{
		country: 'VN',
		id: 'vietnamOptIn',
		label: 'Vietnam opt-in',
		rule: policyRulePresets.vietnamOptIn(),
	},
	{
		country: 'BN',
		id: 'bruneiOptIn',
		label: 'Brunei opt-in',
		rule: policyRulePresets.bruneiOptIn(),
	},
	{
		country: 'LA',
		id: 'laosOptIn',
		label: 'Laos opt-in',
		rule: policyRulePresets.laosOptIn(),
	},
	{
		country: 'BR',
		id: 'brazilOptIn',
		label: 'Brazil opt-in',
		rule: policyRulePresets.brazilOptIn(),
	},
	{
		country: 'CH',
		id: 'switzerlandOptIn',
		label: 'Switzerland opt-in',
		rule: policyRulePresets.switzerlandOptIn(),
	},
	{
		country: 'TR',
		id: 'turkeyOptIn',
		label: 'Türkiye opt-in',
		rule: policyRulePresets.turkeyOptIn(),
	},
	{
		country: 'CH',
		id: 'switzerlandOptOutNoPrompt',
		label: 'Switzerland no prompt',
		rule: policyRulePresets.switzerlandOptOutNoPrompt(),
	},

	{
		country: 'US',
		id: 'usPrivacyStatesOptIn',
		label: 'US privacy states opt-in',
		region: 'CO',
		rule: policyRulePresets.usPrivacyStatesOptIn(),
	},
	{
		country: 'US',
		id: 'usPrivacyStatesOptOut',
		label: 'US privacy states opt-out',
		region: 'CO',
		rule: policyRulePresets.usPrivacyStatesOptOut(),
	},
	{
		country: 'AU',
		id: 'australiaOptIn',
		label: 'Australia opt-in',
		rule: policyRulePresets.australiaOptIn(),
	},
	{
		country: 'SG',
		id: 'singaporeOptIn',
		label: 'Singapore opt-in',
		rule: policyRulePresets.singaporeOptIn(),
	},
	{
		country: 'JP',
		id: 'japanOptIn',
		label: 'Japan opt-in',
		rule: policyRulePresets.japanOptIn(),
	},
	{
		country: 'KR',
		id: 'southKoreaOptIn',
		label: 'South Korea opt-in',
		rule: policyRulePresets.southKoreaOptIn(),
	},
	{
		country: 'IN',
		id: 'indiaOptIn',
		label: 'India opt-in',
		rule: policyRulePresets.indiaOptIn(),
	},
	{
		country: 'AE',
		id: 'uaeOptIn',
		label: 'UAE opt-in',
		rule: policyRulePresets.uaeOptIn(),
	},
	{
		country: 'SA',
		id: 'saudiArabiaOptIn',
		label: 'Saudi Arabia opt-in',
		rule: policyRulePresets.saudiArabiaOptIn(),
	},
	{
		country: 'GB',
		id: 'europeOptIn',
		label: 'Europe opt-in',
		rule: policyRulePresets.europeOptIn(),
	},
	{
		country: 'FR',
		id: 'europeIab',
		label: 'Europe IAB TCF',
		rule: policyRulePresets.europeIab(),
	},
	{
		country: 'US',
		id: 'californiaOptIn',
		label: 'California opt-in',
		region: 'CA',
		rule: policyRulePresets.californiaOptIn(),
	},
	{
		country: 'US',
		id: 'californiaOptOut',
		label: 'California opt-out',
		region: 'CA',
		rule: policyRulePresets.californiaOptOut(),
	},
	{
		country: 'CA',
		id: 'quebecOptIn',
		label: 'Quebec opt-in',
		region: 'QC',
		rule: policyRulePresets.quebecOptIn(),
	},
	{
		country: 'AU',
		id: 'worldOptOutNoPrompt',
		label: 'World opt-out, no prompt',
		rule: policyRulePresets.worldOptOutNoPrompt(),
	},
	{
		country: 'US',
		id: 'worldNone',
		label: 'World none',
		region: 'SD',
		rule: policyRulePresets.worldNone(),
	},
];

/** Preset ids that make up `recommendedPolicyRules()`, what a bare `offline()` resolves. */
export const RECOMMENDED_PRESET_IDS: ReadonlySet<string> = new Set([
	'europeOptIn',
	'quebecOptIn',
	'usPrivacyStatesOptOut',
	'worldNone',
]);

/** Whether an untouched preset is already covered by the recommended pack. */
export const isRecommendedPreset = function isRecommendedPreset(
	presetId: string | null
): boolean {
	return presetId !== null && RECOMMENDED_PRESET_IDS.has(presetId);
};

export const DEFAULT_PLAYGROUND_PRESET = 'europeOptIn';

export const getPlaygroundPreset = function getPlaygroundPreset(
	id: string | null | undefined
): PlaygroundPreset {
	return (
		playgroundPresets.find((preset) => preset.id === id) ??
		(playgroundPresets.find(
			(preset) => preset.id === DEFAULT_PLAYGROUND_PRESET
		) as PlaygroundPreset)
	);
};

// ---------------------------------------------------------------------------
// Form model
// ---------------------------------------------------------------------------

/**
 * Flat, form-friendly view of the fields an author can set on a rule.
 * `toPolicyRule` turns it back into the real thing.
 */
export interface PlaygroundRuleForm {
	id: string;
	model: PolicyRuleModel;
	prompt: PolicyPrompt;
	/** Comma-separated ISO country codes. */
	matchCountries: string;
	/** Comma-separated `CC-RR` pairs, e.g. `US-CA, CA-QC`. */
	matchRegions: string;
	matchDefault: boolean;
	matchFallback: boolean;
	/** `true` means every optional category (`'*'`). */
	allCategories: boolean;
	categories: PolicyOptionalCategory[];
	scopeMode: PolicyScopeMode;
	preselected: PolicyOptionalCategory[];
	/** Whether a choice prompt also offers `customize`. */
	customize: boolean;
	/** Adds the `opt-out` right on top of the always-present ones. */
	optOutRight: boolean;
	choiceDays: number;
	noticeDays: number;
	gpcEnabled: boolean;
	gpcDeny: PolicyOptionalCategory[];
	copyRevision: string;
}

const splitList = function splitList(value: string): string[] {
	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
};

const isOptionalCategory = function isOptionalCategory(
	value: string
): value is PolicyOptionalCategory {
	return (POLICY_OPTIONAL_CATEGORIES as readonly string[]).includes(value);
};

const toOptionalCategories = function toOptionalCategories(
	values: readonly string[] | undefined
): PolicyOptionalCategory[] {
	return (values ?? []).filter(isOptionalCategory);
};

const parseRegions = function parseRegions(
	value: string
): { country: string; region: string }[] {
	return splitList(value).flatMap((pair) => {
		const [country, region] = pair.split('-').map((part) => part.trim());
		return country && region ? [{ country, region }] : [];
	});
};

/** Build the form view of a rule. Unknown extras (proof, review) are kept by `toPolicyRule`. */
export const fromPolicyRule = function fromPolicyRule(
	rule: PolicyRule
): PlaygroundRuleForm {
	const categories = rule.categories ?? ['*'];
	const allCategories = categories.includes('*');
	return {
		allCategories,
		categories: allCategories
			? [...POLICY_OPTIONAL_CATEGORIES]
			: toOptionalCategories(categories),
		choiceDays: rule.validity?.choiceDays ?? 365,
		copyRevision: rule.copyRevision ?? '',
		customize: rule.actions ? rule.actions.includes('customize') : true,
		gpcDeny: toOptionalCategories(rule.privacySignals?.gpc?.denyCategories),
		gpcEnabled: Boolean(rule.privacySignals?.gpc),
		id: rule.id,
		matchCountries: (rule.match.countries ?? []).join(', '),
		matchDefault: rule.match.isDefault === true,
		matchFallback: rule.match.fallback === true,
		matchRegions: (rule.match.regions ?? [])
			.map((region) => `${region.country}-${region.region}`)
			.join(', '),
		model: rule.model,
		noticeDays: rule.validity?.noticeDays ?? 365,
		optOutRight: rule.rights?.includes('opt-out') ?? false,
		preselected: toOptionalCategories(rule.preselectedCategories),
		prompt: rule.prompt,
		scopeMode: rule.scopeMode ?? 'permissive',
	};
};

const buildMatch = function buildMatch(form: PlaygroundRuleForm): PolicyMatch {
	const match: PolicyMatch = {};
	const countries = splitList(form.matchCountries).map((country) =>
		country.toUpperCase()
	);
	const regions = parseRegions(form.matchRegions).map((region) => ({
		country: region.country.toUpperCase(),
		region: region.region.toUpperCase(),
	}));
	if (countries.length > 0) {
		match.countries = countries;
	}
	if (regions.length > 0) {
		match.regions = regions;
	}
	if (form.matchDefault) {
		match.isDefault = true;
	}
	if (form.matchFallback) {
		match.fallback = true;
	}
	return match;
};

/**
 * Turn the form into an author-facing `PolicyRule`.
 *
 * @param form - Edited fields.
 * @param base - Rule the form was loaded from. Its `proof`, `review`,
 * `i18n` and `legacyMaterial` are carried over untouched since the form
 * does not edit them.
 */
export const toPolicyRule = function toPolicyRule(
	form: PlaygroundRuleForm,
	base?: PolicyRule
): PolicyRule {
	const rule: PolicyRule = {
		id: form.id.trim(),
		match: buildMatch(form),
		model: form.model,
		prompt: form.prompt,
	};
	rule.categories = form.allCategories ? ['*'] : [...form.categories];
	rule.scopeMode = form.scopeMode;
	// A none rule owes no preference form, so it never preselects anything.
	if (form.preselected.length > 0 && form.model !== 'none') {
		rule.preselectedCategories = [...form.preselected];
	}
	if (form.prompt === 'choice') {
		rule.actions = form.customize
			? ['accept', 'reject', 'customize']
			: ['accept', 'reject'];
	}
	if (form.optOutRight) {
		rule.rights = ['opt-out'];
	}
	rule.validity = { choiceDays: form.choiceDays, noticeDays: form.noticeDays };
	if (form.gpcEnabled) {
		rule.privacySignals = { gpc: { denyCategories: [...form.gpcDeny] } };
	}
	const copyRevision = form.copyRevision.trim();
	if (copyRevision) {
		rule.copyRevision = copyRevision;
	}
	if (base?.proof) {
		rule.proof = { ...base.proof };
	}
	if (base?.i18n) {
		rule.i18n = { ...base.i18n };
	}
	if (base?.review) {
		rule.review = structuredClone(base.review);
	}
	if (base?.legacyMaterial) {
		rule.legacyMaterial = structuredClone(base.legacyMaterial);
	}
	return rule;
};

/** Prompts the schema accepts for a model. */
export const promptsForModel = function promptsForModel(
	model: PolicyRuleModel
): readonly PolicyPrompt[] {
	return POLICY_MODEL_PROMPTS[model];
};

// ---------------------------------------------------------------------------
// Presentation form
// ---------------------------------------------------------------------------

/**
 * Host presentation the playground applies to the prompt. `auto` uses the
 * demo's per-policy shape (`presentationForRule`) when the rule has one,
 * and otherwise leaves the field to the resolver.
 */
export interface PlaygroundPresentationForm {
	variant: PromptVariant | 'auto';
	position: PromptPosition | 'auto';
	/** `false` leaves blocking to the variant; `wall` always blocks. */
	blocking: boolean;
}

export const DEFAULT_PRESENTATION_FORM: PlaygroundPresentationForm = {
	blocking: false,
	position: 'auto',
	variant: 'auto',
};

export const PROMPT_VARIANTS = [
	'floating',
	'bar',
	'widget',
	'wall',
] as const satisfies readonly PromptVariant[];

export const VARIANT_HINTS: Record<PromptVariant, string> = {
	bar: 'Full-width edge bar.',
	floating:
		'Card in a corner or edge center. The resolver default for every prompt.',
	wall: 'Centered blocker with a backdrop, scroll lock and focus trap.',
	widget: 'Compact chip in a corner.',
};

/** Variant the resolver picks when the host sets none: a floating card for every prompt. */
export const defaultVariantFor = function defaultVariantFor(
	_prompt: PolicyPrompt
): PromptVariant {
	return 'floating';
};

/**
 * Positions the position select may offer. With `auto` the list follows
 * the variant the resolver would pick for the prompt.
 */
export const positionOptionsFor = function positionOptionsFor(
	variant: PromptVariant | 'auto',
	prompt: PolicyPrompt,
	autoVariant: PromptVariant = defaultVariantFor(prompt)
): readonly PromptPosition[] {
	const resolved = variant === 'auto' ? autoVariant : variant;
	return PROMPT_VARIANT_POSITIONS[resolved];
};

/** Position the resolver fills for a variant when the host sets none. */
export const defaultPositionFor = function defaultPositionFor(
	variant: PromptVariant | 'auto',
	prompt: PolicyPrompt,
	autoVariant: PromptVariant = defaultVariantFor(prompt)
): PromptPosition {
	const resolved = variant === 'auto' ? autoVariant : variant;
	return PROMPT_VARIANT_DEFAULT_POSITION[resolved];
};

/**
 * Change the variant and drop a position the new variant does not accept,
 * so the form never asks the resolver for an invalid pair.
 */
export const setPresentationVariant = function setPresentationVariant(
	form: PlaygroundPresentationForm,
	variant: PromptVariant | 'auto',
	prompt: PolicyPrompt,
	autoVariant: PromptVariant = defaultVariantFor(prompt)
): PlaygroundPresentationForm {
	const allowed = positionOptionsFor(variant, prompt, autoVariant);
	const position =
		form.position !== 'auto' && allowed.includes(form.position)
			? form.position
			: 'auto';
	return { ...form, position, variant };
};

/** Host `presentation` for the provider, or `undefined` when every field is auto. */
export const toPromptPresentation = function toPromptPresentation(
	form: PlaygroundPresentationForm
): PromptPresentation | undefined {
	const prompt: PromptPresentation = {};
	if (form.variant !== 'auto') {
		prompt.variant = form.variant;
	}
	if (form.position !== 'auto') {
		prompt.position = form.position;
	}
	if (form.blocking) {
		prompt.blocking = true;
	}
	return Object.keys(prompt).length > 0 ? prompt : undefined;
};

/** Full `ConsentPresentation` for the provider, or `undefined` when empty. */
export const toConsentPresentation = function toConsentPresentation(
	form: PlaygroundPresentationForm
): ConsentPresentation | undefined {
	const prompt = toPromptPresentation(form);
	return prompt ? { prompt } : undefined;
};

// ---------------------------------------------------------------------------
// Per-policy presentation (demo only)
// ---------------------------------------------------------------------------

/**
 * Prompt shape this demo uses for each shipped preset, keyed by resolved
 * rule id. Presentation is host configuration: it never enters the policy
 * or its fingerprints, so a host can give every regime its own shape
 * without re-prompting anyone.
 */
export const DEMO_PRESENTATION_BY_RULE: Record<
	string,
	ConsentPresentation['prompt']
> = {
	// This example places the California choice in a centered card.
	california_opt_in: { position: 'bottom-center', variant: 'floating' },
	// No prompt, so no banner: the trigger toolbar is the persistent route.
	california_opt_out: undefined,
	// A dismissible corner card is the common GDPR treatment.
	europe_opt_in: { position: 'bottom-left', variant: 'floating' },
	// This example uses a wall for Quebec.
	quebec_opt_in: { variant: 'wall' },
	// A none rule owes no prompt and no rights, so no consent UI renders.
	world_none: undefined,
	// No prompt here either.
	world_opt_out_no_prompt: undefined,
	// IAB has its own surfaces; variants do not apply.
	// europe_iab: unmapped on purpose.
};

/**
 * Shape for any notice prompt, including a preset edited to `notice` in the
 * playground. A small bottom-left card with the opt-out button and OK; the trigger toolbar keeps the bottom-right corner, so the two never
 * overlap.
 */
export const DEMO_NOTICE_PRESENTATION: PromptPresentation = {
	position: 'bottom-left',
	variant: 'floating',
};

/**
 * Prompt presentation this demo applies to a rule, or `undefined` when the
 * rule has no mapped shape. A notice prompt takes precedence over the id
 * map so an edited preset keeps the notice treatment.
 */
export const presentationForRule = function presentationForRule(
	rule: Pick<PolicyRule, 'id' | 'prompt'>
): PromptPresentation | undefined {
	if (rule.prompt === 'notice') {
		return DEMO_NOTICE_PRESENTATION;
	}
	return DEMO_PRESENTATION_BY_RULE[rule.id];
};

/** Variant the playground's `auto` picks: the demo map, else the resolver. */
export const autoVariantFor = function autoVariantFor(
	rule: Pick<PolicyRule, 'id' | 'prompt'>
): PromptVariant {
	return presentationForRule(rule)?.variant ?? defaultVariantFor(rule.prompt);
};

/**
 * Host presentation for the provider: the demo's per-policy shape with
 * manual form fields layered on top. A manual variant discards the mapped
 * position, which may not fit the new variant, so the resolver picks the
 * variant's default instead.
 */
export const resolvePlaygroundPresentation =
	function resolvePlaygroundPresentation(
		form: PlaygroundPresentationForm,
		rule: Pick<PolicyRule, 'id' | 'prompt'>
	): ConsentPresentation | undefined {
		const demo = presentationForRule(rule);
		const manual = toPromptPresentation(form) ?? {};
		const prompt: PromptPresentation = {};
		const variant = manual.variant ?? demo?.variant;
		if (variant) {
			prompt.variant = variant;
		}
		const position =
			manual.position ?? (manual.variant ? undefined : demo?.position);
		if (position) {
			prompt.position = position;
		}
		const blocking = manual.blocking ?? demo?.blocking;
		if (blocking !== undefined) {
			prompt.blocking = blocking;
		}
		return Object.keys(prompt).length > 0 ? { prompt } : undefined;
	};

// ---------------------------------------------------------------------------
// Inspection
// ---------------------------------------------------------------------------

export interface PlaygroundSimulation {
	country: string;
	region: string;
	/** Defaults to `true` for `iab` rules so the addon requirement does not mask other issues. */
	iabEnabled?: boolean;
}

export interface PlaygroundInspection {
	errors: string[];
	warnings: string[];
	/** Null when the rule fails validation. */
	resolved: ResolvedPolicyRule | null;
	/** Null when the rule fails validation. */
	fingerprints: PolicyFingerprints | null;
	/** What `offline({ policyRules: [rule] })` would resolve for the simulated location. */
	resolution: PolicyResolution;
	/**
	 * Prompt surface the stock banner would render under the host
	 * presentation. Null when the rule fails validation.
	 */
	presentation: ResolvedConsentPresentation | null;
	/** Presentation findings: invalid positions, blocking a notice, and so on. */
	presentationDiagnostics: PresentationDiagnostic[];
}

/**
 * Run validation, normalization, fingerprinting and geo matching on one
 * rule, and resolve the prompt surface under the host presentation.
 */
export const inspectPlaygroundRule = function inspectPlaygroundRule(
	rule: PolicyRule,
	simulation: PlaygroundSimulation,
	presentation?: ConsentPresentation
): PlaygroundInspection {
	// Validate an IAB rule as if the IAB addon were mounted, so the preset
	// shows its real shape. The playground runtime itself runs without it.
	const iabEnabled = simulation.iabEnabled ?? rule.model === 'iab';
	const { errors, warnings } = inspectPolicyRules([rule], { iabEnabled });
	let resolved: ResolvedPolicyRule | null = null;
	let fingerprints: PolicyFingerprints | null = null;
	if (errors.length === 0) {
		try {
			resolved = normalizePolicyRule(rule);
			fingerprints = createPolicyRuleFingerprints(
				resolved,
				rule.legacyMaterial
			);
		} catch (error) {
			errors.push(error instanceof Error ? error.message : String(error));
		}
	}
	const resolution = resolvePolicyRules({
		countryCode: simulation.country.trim().toUpperCase() || null,
		iabEnabled,
		regionCode: simulation.region.trim().toUpperCase() || null,
		rules: [rule],
	});
	const surface = resolved
		? resolveConsentPresentation({
				policy: resolved,
				presentation,
				surface: 'prompt',
			})
		: null;
	return {
		errors,
		fingerprints,
		presentation: surface,
		presentationDiagnostics: surface?.diagnostics ?? [],
		resolution,
		resolved,
		warnings,
	};
};

/** Human-readable summary of a rule's `match` block. */
export const describeMatch = function describeMatch(
	match: PolicyMatch
): string {
	const parts: string[] = [];
	if (match.regions?.length) {
		parts.push(
			`regions ${match.regions.map((region) => `${region.country}-${region.region}`).join(', ')}`
		);
	}
	if (match.countries?.length) {
		const { countries } = match;
		parts.push(
			countries.length > 6
				? `${countries.length} countries (${countries.slice(0, 4).join(', ')}, …)`
				: `countries ${countries.join(', ')}`
		);
	}
	if (match.fallback) {
		parts.push('fallback when location is unknown');
	}
	if (match.isDefault) {
		parts.push('default when nothing else matches');
	}
	return parts.length > 0 ? parts.join(' · ') : 'matches nothing';
};

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

const stripForSnippet = function stripForSnippet(rule: PolicyRule): PolicyRule {
	const { legacyMaterial: _legacy, review: _review, ...rest } = rule;
	return rest;
};

const indent = function indent(value: string, spaces: number): string {
	const pad = ' '.repeat(spaces);
	return value
		.split('\n')
		.map((line, index) => (index === 0 ? line : `${pad}${line}`))
		.join('\n');
};

/**
 * The snippet a developer would paste to run this rule. When the rule is
 * an untouched preset the snippet calls the preset factory instead of
 * inlining it.
 */
export interface ProviderSnippetOptions {
	/**
	 * Render the floating trigger toolbar, the persistent route back to
	 * preferences. It shows once the prompt is answered so it never sits
	 * under the banner.
	 */
	toolbar?: boolean;
	/**
	 * The rule is part of the recommended pack, so the snippet calls
	 * `offline()` with no `policyRules` and lets the defaults apply.
	 */
	recommended?: boolean;
}

const RECOMMENDED_PACK_COMMENT = `// offline() with no policyRules applies the recommended pack: EU/UK and
// Quebec opt-in (Europe also covers an unknown location), US privacy states
// opt-out, and none elsewhere. Pass policyRules to replace it.`;

export const buildProviderSnippet = function buildProviderSnippet(
	rule: PolicyRule,
	presetId: string | null,
	presentation?: ConsentPresentation,
	options: ProviderSnippetOptions = {}
): string {
	const recommended = Boolean(options.recommended && presetId);
	const ruleSource = presetId
		? `policyRulePresets.${presetId}()`
		: indent(JSON.stringify(stripForSnippet(rule), null, 2), 2);
	const presetImport =
		presetId && !recommended
			? "import { policyRulePresets } from 'c15t';\n"
			: '';
	// Presentation is host configuration: it never touches the rule or its
	// fingerprints, so it sits on the provider, not in the policy pack.
	const presentationOption = presentation
		? `, presentation: ${JSON.stringify(presentation)}`
		: '';
	const componentImports = options.toolbar
		? 'ConsentBanner, ConsentDialog, ConsentDialogTriggerToolbar, ConsentProvider, offline'
		: 'ConsentBanner, ConsentDialog, ConsentProvider, offline';
	const toolbarLine = options.toolbar
		? '\n    <ConsentDialogTriggerToolbar showWhen="after-prompt" />'
		: '';
	const rulesBlock = recommended
		? `${RECOMMENDED_PACK_COMMENT}\n`
		: `// Region matches beat country matches. Array order breaks ties.
const policyRules = [
  ${ruleSource},
];
`;
	const mode = recommended ? 'offline()' : 'offline({ policyRules })';
	return `${presetImport}import { ${componentImports} } from 'c15t/react';

${rulesBlock}
export const Providers = ({ children }) => (
  <ConsentProvider options={{ mode: ${mode}${presentationOption} }}>
    {children}
    <ConsentBanner />
    <ConsentDialog />${toolbarLine}
  </ConsentProvider>
);`;
};

/** Backend counterpart: the same rules served by `@c15t/backend`. */
export const buildBackendSnippet = function buildBackendSnippet(
	rule: PolicyRule,
	presetId: string | null,
	options: Pick<ProviderSnippetOptions, 'recommended'> = {}
): string {
	if (options.recommended && presetId) {
		return `import { recommendedPolicyRules } from '@c15t/schema';
import { defineConfig } from '@c15t/backend';

// The same pack offline() applies by default, served from the backend.
export default defineConfig({
  database: { dialect: 'postgres', url: process.env.DATABASE_URL },
  manifest: {
    appName: 'my-app',
    policyRules: recommendedPolicyRules(),
  },
});`;
	}
	const ruleSource = presetId
		? `policyRulePresets.${presetId}()`
		: indent(JSON.stringify(stripForSnippet(rule), null, 2), 4);
	const presetImport = presetId
		? "import { policyRulePresets } from '@c15t/schema';\n"
		: '';
	return `${presetImport}import { defineConfig } from '@c15t/backend';

export default defineConfig({
  database: { dialect: 'postgres', url: process.env.DATABASE_URL },
  manifest: {
    appName: 'my-app',
    policyRules: [
      ${ruleSource},
    ],
  },
});`;
};
