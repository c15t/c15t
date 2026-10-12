import {
	policyBenchFixtures,
	resolvePolicyBenchPack,
} from '@c15t/benchmarking/policy-fixtures';
import type { PolicyBenchFixtureName } from '@c15t/benchmarking/policy-fixtures';
import {
	buildConsentManifestFromConfig,
	resolveInitFromManifest,
} from '@c15t/schema/types';
import type {
	ConsentManifest,
	InitOutput,
	ResolveInitFromManifestOptions,
} from '@c15t/schema/types';
import { enTranslations } from '@c15t/translations';

// Only the default locale is supplied; the resolver needs the requested one.
const baseTranslations = {
	en: enTranslations,
} as unknown as ResolveInitFromManifestOptions['baseTranslations'];

/**
 * Manifests for the fixed policy fixtures, built once per server process
 * by the installed schema package. Init responses are resolved from them
 * per request so the benchmark exercises the same producer path a
 * same-origin manifest route would, in whichever wire form the installed
 * source emits.
 */
const manifests = new Map<PolicyBenchFixtureName, Promise<ConsentManifest>>();

export const isPolicyBenchFixtureName = function isPolicyBenchFixtureName(
	value: string
): value is PolicyBenchFixtureName {
	return Object.hasOwn(policyBenchFixtures, value);
};

export const getPolicyBenchManifest = function getPolicyBenchManifest(
	name: PolicyBenchFixtureName
): Promise<ConsentManifest> {
	let manifest = manifests.get(name);
	if (!manifest) {
		const resolved = resolvePolicyBenchPack(policyBenchFixtures[name]);
		if (name === 'optout-california' && resolved.family === 'policy-rules') {
			const rule = resolved.pack[0] as { prompt: string };
			rule.prompt = 'notice';
		}
		manifest = buildConsentManifestFromConfig(resolved.manifestConfig);
		manifests.set(name, manifest);
	}
	return manifest;
};

export const resolvePolicyBenchInit = async function resolvePolicyBenchInit(
	name: PolicyBenchFixtureName
): Promise<InitOutput> {
	const fixture = policyBenchFixtures[name];
	const manifest = await getPolicyBenchManifest(name);
	return resolveInitFromManifest(
		manifest,
		{
			country: fixture.inputs.country,
			gpc: fixture.inputs.gpc,
			language: fixture.inputs.language,
			region: fixture.inputs.region,
		},
		{ baseTranslations }
	);
};
