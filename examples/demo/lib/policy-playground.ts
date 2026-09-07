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
];

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
	if (form.preselected.length > 0) {
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
 * Host presentation the playground applies to the prompt. `auto` leaves a
 * field to the resolver, which picks from the prompt kind: a notice
 * becomes a bottom bar, a choice a floating bottom-left card.
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
	bar: 'Full-width edge bar. The default for a notice.',
	floating: 'Card in a corner or edge center. The default for a choice prompt.',
	wall: 'Centered blocker with a backdrop, scroll lock and focus trap.',
	widget: 'Compact chip in a corner.',
};

/** Variant the resolver picks when the host sets none. */
export const defaultVariantFor = function defaultVariantFor(
	prompt: PolicyPrompt
): PromptVariant {
	return prompt === 'notice' ? 'bar' : 'floating';
};

/**
 * Positions the position select may offer. With `auto` the list follows
 * the variant the resolver would pick for the prompt.
 */
export const positionOptionsFor = function positionOptionsFor(
	variant: PromptVariant | 'auto',
	prompt: PolicyPrompt
): readonly PromptPosition[] {
	const resolved = variant === 'auto' ? defaultVariantFor(prompt) : variant;
	return PROMPT_VARIANT_POSITIONS[resolved];
};

/** Position the resolver fills for a variant when the host sets none. */
export const defaultPositionFor = function defaultPositionFor(
	variant: PromptVariant | 'auto',
	prompt: PolicyPrompt
): PromptPosition {
	const resolved = variant === 'auto' ? defaultVariantFor(prompt) : variant;
	return PROMPT_VARIANT_DEFAULT_POSITION[resolved];
};

/**
 * Change the variant and drop a position the new variant does not accept,
 * so the form never asks the resolver for an invalid pair.
 */
export const setPresentationVariant = function setPresentationVariant(
	form: PlaygroundPresentationForm,
	variant: PromptVariant | 'auto',
	prompt: PolicyPrompt
): PlaygroundPresentationForm {
	const allowed = positionOptionsFor(variant, prompt);
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
	 * preferences once a prompt is dismissed.
	 */
	toolbar?: boolean;
}

export const buildProviderSnippet = function buildProviderSnippet(
	rule: PolicyRule,
	presetId: string | null,
	presentation?: ConsentPresentation,
	options: ProviderSnippetOptions = {}
): string {
	const ruleSource = presetId
		? `policyRulePresets.${presetId}()`
		: indent(JSON.stringify(stripForSnippet(rule), null, 2), 2);
	const presetImport = presetId
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
		? '\n    <ConsentDialogTriggerToolbar />'
		: '';
	return `${presetImport}import { ${componentImports} } from 'c15t/react';

// First match wins by array order, so put specific rules before broad ones.
const policyRules = [
  ${ruleSource},
];

export const Providers = ({ children }) => (
  <ConsentProvider options={{ mode: offline({ policyRules })${presentationOption} }}>
    {children}
    <ConsentBanner />
    <ConsentDialog />${toolbarLine}
  </ConsentProvider>
);`;
};

/** Backend counterpart: the same rules served by `@c15t/backend`. */
export const buildBackendSnippet = function buildBackendSnippet(
	rule: PolicyRule,
	presetId: string | null
): string {
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
