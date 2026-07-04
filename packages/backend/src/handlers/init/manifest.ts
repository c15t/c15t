import {
	type ConsentManifest,
	createConsentManifestPolicyPack,
	createDeterministicFingerprintSync,
	createPolicyFingerprint,
	createResolvedPolicyFromConfig,
} from '@c15t/schema/types';
import type { C15TEdgeOptions } from '~/edge/types';

const DEFAULT_GVL_ENDPOINT = 'https://gvl.inth.app';

export type InitManifestOptions = Omit<C15TEdgeOptions, 'logger'>;

function buildGvlReference(
	options: InitManifestOptions
): ConsentManifest['iab'] {
	if (options.iab?.enabled !== true) {
		return undefined;
	}

	return {
		enabled: true,
		customVendors: options.iab.customVendors,
		gvl: {
			url: options.iab.endpoint ?? DEFAULT_GVL_ENDPOINT,
		},
	};
}

export async function buildConsentManifestFromOptions(
	options: InitManifestOptions
): Promise<ConsentManifest> {
	const policyPacks = options.policyPacks
		? await Promise.all(
				options.policyPacks.map(async (policy) => {
					const resolvedPolicy = createResolvedPolicyFromConfig(policy);
					const fingerprint = await createPolicyFingerprint(resolvedPolicy);
					return createConsentManifestPolicyPack({ policy, fingerprint });
				})
			)
		: undefined;

	const manifest: ConsentManifest = {
		schemaVersion: 1,
		revision: '',
		tenantId: options.tenantId,
		appName: options.appName,
		branding: options.branding || 'c15t',
		defaults: {
			disableGeoLocation: options.disableGeoLocation,
		},
		policyPacks,
		translations: {
			customTranslations: options.customTranslations,
			i18n: options.i18n,
		},
		cmpId: options.iab?.cmpId,
		iab: buildGvlReference(options),
	};

	return {
		...manifest,
		revision: createDeterministicFingerprintSync(manifest),
	};
}
