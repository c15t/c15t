/**
 * Fixed policy fixtures shared by the policy-runtime, browser, and entry
 * benchmarks for issue #1025.
 *
 * Every fixture is expressed through the schema package's own preset
 * builders so the measured wire payload is whatever the measured source
 * produces for the same deployment configuration. The resolver below
 * detects which preset family the installed schema exports (legacy
 * `policyPackPresets` before the policy-rule contract, `policyRulePresets`
 * after it) and maps the same semantic fixture onto it. Nothing here
 * hand-writes a policy, so the base and head payloads differ only by what
 * the source emits.
 */
import * as schema from '@c15t/schema/types';
import type { ConsentManifestConfig } from '@c15t/schema/types';

export type PolicyBenchFixtureName =
	| 'optin-choice-eu'
	| 'optout-california'
	| 'optout-default-world';

export interface PolicyBenchInputs {
	country: string | null;
	region: string | null;
	language: string;
	gpc?: boolean;
}

/** Preset names in the pre-contract (`policyPackPresets`) family. */
export type LegacyPresetName =
	| 'europeOptIn'
	| 'californiaOptOut'
	| 'worldNoBanner';

/**
 * Preset names in the policy-rule family. `worldNoBanner` was renamed to
 * `worldOptOutNoPrompt` when the `none` model shortcut was removed.
 */
const RULE_PRESET_NAMES: Record<LegacyPresetName, string> = {
	californiaOptOut: 'californiaOptOut',
	europeOptIn: 'europeOptIn',
	worldNoBanner: 'worldOptOutNoPrompt',
};

export interface PolicyBenchFixture {
	name: PolicyBenchFixtureName;
	description: string;
	presets: LegacyPresetName[];
	inputs: PolicyBenchInputs;
	/** Preset the inputs are expected to match. */
	expectedPreset: LegacyPresetName;
}

export const policyBenchFixtures: Record<
	PolicyBenchFixtureName,
	PolicyBenchFixture
> = {
	'optin-choice-eu': {
		description:
			'Europe opt-in choice prompt with a world default; German visitor.',
		expectedPreset: 'europeOptIn',
		inputs: { country: 'DE', language: 'en', region: 'BE' },
		name: 'optin-choice-eu',
		presets: ['europeOptIn', 'worldNoBanner'],
	},
	'optout-california': {
		description:
			'California opt-out preset with a world default; Californian visitor.',
		expectedPreset: 'californiaOptOut',
		inputs: { country: 'US', language: 'en', region: 'CA' },
		name: 'optout-california',
		presets: ['californiaOptOut', 'worldNoBanner'],
	},
	'optout-default-world': {
		description:
			'Three-pack deployment resolving to the world default; Brazilian visitor.',
		expectedPreset: 'worldNoBanner',
		inputs: { country: 'BR', language: 'en', region: null },
		name: 'optout-default-world',
		presets: ['europeOptIn', 'californiaOptOut', 'worldNoBanner'],
	},
};

export const policyBenchFixtureNames = Object.keys(
	policyBenchFixtures
) as PolicyBenchFixtureName[];

type PresetFactory = () => unknown;
type PresetFamily = Record<string, PresetFactory>;

const readPresetFamily = function readPresetFamily(
	exportName: string
): PresetFamily | undefined {
	const candidate = (schema as Record<string, unknown>)[exportName];
	return candidate && typeof candidate === 'object'
		? (candidate as PresetFamily)
		: undefined;
};

export type PolicyContractFamily = 'legacy-policy-packs' | 'policy-rules';

export interface ResolvedPolicyBenchPack {
	family: PolicyContractFamily;
	/** Preset export names actually invoked, in pack order. */
	presetNames: string[];
	/** The pack in the shape the installed resolver accepts. */
	pack: unknown[];
	/** Manifest config carrying the pack under the field the family uses. */
	manifestConfig: ConsentManifestConfig;
}

/**
 * Resolve a fixture to a policy pack using whichever preset family the
 * installed schema package exports. Throws when neither family is
 * available so a benchmark never silently measures an empty pack.
 */
export const resolvePolicyBenchPack = function resolvePolicyBenchPack(
	fixture: PolicyBenchFixture
): ResolvedPolicyBenchPack {
	const ruleFamily = readPresetFamily('policyRulePresets');
	if (ruleFamily) {
		const presetNames = fixture.presets.map((name) => RULE_PRESET_NAMES[name]);
		const pack = presetNames.map((name) => {
			const factory = ruleFamily[name];
			if (typeof factory !== 'function') {
				throw new Error(`policyRulePresets has no preset named "${name}"`);
			}
			return factory();
		});
		return {
			family: 'policy-rules',
			manifestConfig: {
				policyRules: pack,
			} as unknown as ConsentManifestConfig,
			pack,
			presetNames,
		};
	}

	const legacyFamily = readPresetFamily('policyPackPresets');
	if (!legacyFamily) {
		throw new Error(
			'@c15t/schema/types exports neither policyRulePresets nor policyPackPresets'
		);
	}
	const pack = fixture.presets.map((name) => {
		const factory = legacyFamily[name];
		if (typeof factory !== 'function') {
			throw new Error(`policyPackPresets has no preset named "${name}"`);
		}
		return factory();
	});
	return {
		family: 'legacy-policy-packs',
		manifestConfig: { policyPacks: pack } as unknown as ConsentManifestConfig,
		pack,
		presetNames: [...fixture.presets],
	};
};

export interface SyncPolicyResolution {
	/** Which exported resolver ran. */
	resolver: 'resolvePolicyRules' | 'resolvePolicySync';
	run: () => unknown;
}

/**
 * Build the synchronous policy resolution call for a fixture using the
 * installed schema's resolver. Policy-rule packs go through
 * `resolvePolicyRules`; legacy packs go through `resolvePolicySync`.
 */
export const createSyncPolicyResolution = function createSyncPolicyResolution(
	fixture: PolicyBenchFixture,
	resolved: ResolvedPolicyBenchPack
): SyncPolicyResolution {
	const exports = schema as Record<string, unknown>;
	if (resolved.family === 'policy-rules') {
		const resolver = exports.resolvePolicyRules;
		if (typeof resolver !== 'function') {
			throw new Error(
				'policyRulePresets is exported but resolvePolicyRules is not'
			);
		}
		return {
			resolver: 'resolvePolicyRules',
			run: () =>
				resolver({
					countryCode: fixture.inputs.country,
					gpc: fixture.inputs.gpc ?? false,
					regionCode: fixture.inputs.region,
					rules: resolved.pack,
				}),
		};
	}
	const resolver = exports.resolvePolicySync;
	if (typeof resolver !== 'function') {
		throw new Error('@c15t/schema/types does not export resolvePolicySync');
	}
	return {
		resolver: 'resolvePolicySync',
		run: () =>
			resolver({
				countryCode: fixture.inputs.country,
				policies: resolved.pack,
				regionCode: fixture.inputs.region,
			}),
	};
};

/**
 * Identify the preset a resolution matched, in fixture (legacy) naming, so
 * a benchmark can assert the fixture did the intended work. Reads the
 * policy id from either resolver's result shape.
 */
export const matchedPolicyId = function matchedPolicyId(
	resolution: unknown
): string | null {
	if (!resolution || typeof resolution !== 'object') {
		return null;
	}
	const { policy, policyId } = resolution as {
		policy?: unknown;
		policyId?: unknown;
	};
	if (typeof policyId === 'string') {
		return policyId;
	}
	if (policy && typeof policy === 'object') {
		const { id } = policy as { id?: unknown };
		return typeof id === 'string' ? id : null;
	}
	return null;
};

/** Build the common opt-in browser fixture through the installed producer. */
export const buildBrowserBenchManifest = function buildBrowserBenchManifest() {
	const resolved = resolvePolicyBenchPack(
		policyBenchFixtures['optin-choice-eu']
	);
	return schema.buildConsentManifestFromConfig(resolved.manifestConfig);
};

/** Resolve the exact fixture manifest, including its policy wire version. */
export const resolveBrowserBenchInit = function resolveBrowserBenchInit(
	manifest: Awaited<ReturnType<typeof buildBrowserBenchManifest>>
) {
	return schema.resolveInitFromManifest(manifest, {
		country: 'DE',
		language: 'en',
		region: 'BE',
	});
};

/** Await the producer before serving an init response. */
export const loadBrowserBenchInit = async function loadBrowserBenchInit(
	manifest = buildBrowserBenchManifest()
) {
	return resolveBrowserBenchInit(await manifest);
};
