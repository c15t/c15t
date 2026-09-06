import type { InitOutput } from '@c15t/schema/types';

import type {
	ConsentState,
	InitResponse,
	KernelBranding,
	KernelConfig,
	KernelIABState,
	KernelOverrides,
} from '../types';

type RichInitOutput = InitOutput &
	Partial<
		Pick<
			InitResponse,
			'consents' | 'hasConsented' | 'resolvedOverrides' | 'subjectId'
		>
	>;

const mapBranding = function mapBranding(
	branding: InitOutput['branding']
): KernelBranding | undefined {
	return branding === 'none' ? undefined : branding;
};

const mapResolvedOverrides = function mapResolvedOverrides(
	payload: Pick<InitOutput, 'location' | 'translations'>,
	headers: Record<string, string>
): KernelOverrides {
	const overrides: KernelOverrides = {
		language: payload.translations.language,
	};

	if (payload.location.countryCode) {
		overrides.country = payload.location.countryCode;
	}
	if (payload.location.regionCode) {
		overrides.region = payload.location.regionCode;
	}
	// The application override wins over the browser signal, matching
	// `gpcFromHeaders`.
	const gpcHeader = headers['x-c15t-gpc'] ?? headers['sec-gpc'];
	if (gpcHeader === '1') {
		overrides.gpc = true;
	} else if (gpcHeader === '0') {
		overrides.gpc = false;
	}

	return overrides;
};

export const mapInitOutputToInitResponse = function mapInitOutputToInitResponse(
	payload: RichInitOutput,
	headers: Record<string, string>
): InitResponse {
	const mapped: InitResponse = {
		// On the real backend, omitted `gvl` on a 200 response means IAB is not
		// active for this request. The kernel disables IAB on explicit null.
		gvl: payload.gvl ?? null,

		location: payload.location,
		resolvedOverrides: {
			...mapResolvedOverrides(payload, headers),
			...(payload.resolvedOverrides ?? {}),
		},
		translations: payload.translations,
	};

	const branding = mapBranding(payload.branding);
	if (branding !== undefined) {
		mapped.branding = branding;
	}
	if (payload.policy !== undefined) {
		mapped.policy = payload.policy;
	}
	if (payload.policyDecision !== undefined) {
		mapped.policyDecision = payload.policyDecision;
	}
	if (payload.policySnapshotToken !== undefined) {
		mapped.policySnapshotToken = payload.policySnapshotToken;
	}
	if (payload.customVendors !== undefined) {
		mapped.customVendors = payload.customVendors;
	}
	if (payload.cmpId !== undefined) {
		mapped.cmpId = payload.cmpId;
	}
	if (payload.consents !== undefined) {
		mapped.consents = payload.consents;
		// A consent-bearing init payload implies a subject who has consented
		// unless the backend explicitly says otherwise — without this, the
		// opt-in fresh-visitor defaults reset the returned values and the
		// banner re-shows. Keeps the client fold consistent with the server
		// prefetch merge, which makes the same inference.
		mapped.hasConsented = payload.hasConsented ?? true;
	} else if (payload.hasConsented !== undefined) {
		mapped.hasConsented = payload.hasConsented;
	}
	if (payload.subjectId !== undefined && payload.subjectId !== null) {
		mapped.subjectId = payload.subjectId;
	}

	return mapped;
};

export const mergeInitResponseIntoKernelConfig =
	// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
	function mergeInitResponseIntoKernelConfig(
		base: KernelConfig,
		response: InitResponse | undefined
	): KernelConfig {
		if (!response) {
			return base;
		}

		const merged: KernelConfig = { ...base };
		const derivedOverrides: KernelOverrides = {};

		if (response.location?.countryCode) {
			derivedOverrides.country = response.location.countryCode;
		}
		if (response.location?.regionCode) {
			derivedOverrides.region = response.location.regionCode;
		}
		if (response.translations?.language) {
			derivedOverrides.language = response.translations.language;
		}

		const nextOverrides = {
			...(base.initialOverrides ?? {}),
			...derivedOverrides,
			...(response.resolvedOverrides ?? {}),
		};
		if (Object.keys(nextOverrides).length > 0) {
			merged.initialOverrides = nextOverrides;
		}

		if (response.consents) {
			merged.initialConsents = {
				...(base.initialConsents ?? {}),
				...(response.consents as Partial<ConsentState>),
			};
		}
		if (response.hasConsented !== undefined) {
			merged.initialHasConsented = response.hasConsented;
		} else if (response.consents) {
			merged.initialHasConsented = true;
		}
		if (response.subjectId) {
			merged.initialSubjectId = response.subjectId;
		}
		if (response.location !== undefined) {
			merged.initialLocation = response.location;
		}
		if (response.translations !== undefined) {
			merged.initialTranslations = response.translations;
		}
		if (
			response.branding !== undefined &&
			(response.branding as KernelBranding | 'none') !== 'none'
		) {
			merged.initialBranding = response.branding;
		}
		if (response.policy !== undefined) {
			merged.initialPolicy = response.policy;
		}
		if (response.policyDecision !== undefined) {
			merged.initialPolicyDecision = response.policyDecision;
		}
		if (response.policySnapshotToken !== undefined) {
			merged.initialPolicySnapshotToken = response.policySnapshotToken;
		}
		if (
			response.gvl !== undefined ||
			response.customVendors !== undefined ||
			response.cmpId !== undefined
		) {
			const nextIab: Partial<KernelIABState> = {
				...(merged.initialIab ?? {}),
			};
			if (response.gvl !== undefined) {
				nextIab.gvl = response.gvl;
				nextIab.enabled = response.gvl !== null;
			}
			if (response.customVendors !== undefined) {
				nextIab.customVendors = response.customVendors;
			}
			if (response.cmpId !== undefined) {
				nextIab.cmpId = response.cmpId;
			}
			merged.initialIab = nextIab;
		}

		return merged;
	};

export const initResponseToKernelConfig = function initResponseToKernelConfig(
	response: InitResponse | undefined
): KernelConfig {
	return mergeInitResponseIntoKernelConfig({}, response);
};

/**
 * Lift the init-derived fields of a `KernelConfig` back into an
 * `InitResponse` — the inverse of {@link mergeInitResponseIntoKernelConfig}.
 *
 * Lets a server-prefetched config stand in for a transport's `init()`
 * result: feeding the returned response through the kernel's init path
 * applies the same policy, translations, location, branding, IAB metadata,
 * overrides, and consent state the merge folded in, and clears a
 * provisional placeholder policy the way a real init would.
 *
 * @param config - Kernel config, typically produced by a server helper such
 * as `prefetchInitialConsent()`.
 * @returns The equivalent init response, or `undefined` when the config
 * carries no resolved policy. A policy-less config (persisted consents,
 * geo, language) is a baseline rather than an init result, so callers
 * should fall through to the real transport init for the policy.
 * @example
 * ```ts
 * const response = kernelConfigToInitResponse(config);
 * const transport = response
 * 	? { init: async () => response }
 * 	: createHostedTransport({ backendURL });
 * ```
 */
export const kernelConfigToInitResponse = function kernelConfigToInitResponse(
	config: KernelConfig
): InitResponse | undefined {
	if (config.initialPolicy === undefined) {
		return undefined;
	}

	const response: InitResponse = { policy: config.initialPolicy };

	if (config.initialPolicyDecision !== undefined) {
		response.policyDecision = config.initialPolicyDecision;
	}
	if (config.initialPolicySnapshotToken !== undefined) {
		response.policySnapshotToken = config.initialPolicySnapshotToken;
	}
	if (config.initialTranslations !== undefined) {
		response.translations = config.initialTranslations;
	}
	if (config.initialLocation !== undefined) {
		response.location = config.initialLocation;
	}
	if (config.initialBranding !== undefined) {
		response.branding = config.initialBranding;
	}
	if (
		config.initialOverrides !== undefined &&
		Object.keys(config.initialOverrides).length > 0
	) {
		response.resolvedOverrides = { ...config.initialOverrides };
	}
	if (config.initialConsents !== undefined) {
		response.consents = { ...config.initialConsents };
	}
	if (config.initialHasConsented !== undefined) {
		response.hasConsented = config.initialHasConsented;
	}
	if (config.initialSubjectId) {
		response.subjectId = config.initialSubjectId;
	}

	const iab = config.initialIab;
	if (iab !== undefined) {
		if (iab.gvl !== undefined) {
			response.gvl = iab.gvl;
		}
		if (iab.customVendors !== undefined) {
			response.customVendors = iab.customVendors;
		}
		if (iab.cmpId !== undefined && iab.cmpId !== null) {
			response.cmpId = iab.cmpId;
		}
	}

	return response;
};

export const mergeInitOutputIntoKernelConfig =
	function mergeInitOutputIntoKernelConfig(
		base: KernelConfig,
		payload: RichInitOutput | undefined,
		headers: Record<string, string> = {}
	): KernelConfig {
		return mergeInitResponseIntoKernelConfig(
			base,
			payload ? mapInitOutputToInitResponse(payload, headers) : undefined
		);
	};

export const initOutputToKernelConfig = function initOutputToKernelConfig(
	payload: RichInitOutput | undefined,
	headers: Record<string, string> = {}
): KernelConfig {
	return mergeInitOutputIntoKernelConfig({}, payload, headers);
};
