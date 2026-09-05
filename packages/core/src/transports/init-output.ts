/**
 * Shared fold from a producer init payload to kernel initialization.
 * Versioned policy outcomes are validated before kernel construction.
 * Older producers without a policy contract fail safely. Detected GPC
 * remains separate from a developer override.
 */
import type {
	InitOutput,
	PolicyResolution,
	PolicyResolutionWire,
} from '@c15t/schema/types';
import {
	POLICY_CONTRACT_VERSION,
	readPolicyResolutionWire,
	writePolicyResolutionWire,
} from '@c15t/schema/types';

import type {
	InitResponse,
	KernelBranding,
	KernelConfig,
	KernelIABState,
	KernelOverrides,
} from '../types';

type RichInitOutput = InitOutput &
	Partial<Pick<InitResponse, 'resolvedOverrides' | 'subjectId'>>;

/** Init payload after transport protocol negotiation and record mapping. */
export type TransportInitResponse = Omit<InitResponse, 'policyResolution'> & {
	policyResolution?: PolicyResolutionWire;
};

/** Options for {@link mapInitOutputToInitResponse}. */
export interface MapInitOutputOptions {
	/**
	 * The policy contract the producer declared on its response.
	 *
	 * `undefined` permits a versioned wire body, but fails when it is absent.
	 * A declared value this client speaks marks a
	 * negotiated producer, whose response must carry `policyResolution` or is
	 * a failed payload. A declared value this client does not speak, or one it
	 * cannot parse (`null`), fails as `unsupported-contract` before the body
	 * is read at all: a body under an unknown contract is not evidence.
	 */
	producerContract?: number | null;
}

const FAILED_INVALID_PAYLOAD: PolicyResolution = {
	policy: null,
	reason: 'invalid-payload',
	status: 'failed',
};

const FAILED_UNSUPPORTED_CONTRACT: PolicyResolution = {
	policy: null,
	reason: 'unsupported-contract',
	status: 'failed',
};

const mapBranding = function mapBranding(
	branding: InitOutput['branding']
): KernelBranding | undefined {
	return branding === 'none' ? undefined : branding;
};

const mapResolvedOverrides = function mapResolvedOverrides(
	payload: Pick<InitOutput, 'location' | 'translations'>
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

	return overrides;
};

/** The `Sec-GPC` request header as a detected signal. Exact values only. */
export const mapPrivacySignals = function mapPrivacySignals(
	headers: Record<string, string>
): NonNullable<InitResponse['resolvedPrivacySignals']> | undefined {
	const value = headers['sec-gpc'];
	if (value === '1') {
		return { gpc: true };
	}
	if (value === '0') {
		return { gpc: false };
	}
	return undefined;
};

/**
 * The policy resolution wire a client should read for this payload.
 *
 * A producer declaring a contract this client does not speak fails closed
 * whatever its body says. A negotiated producer's wire passes through as-is.
 * A missing wire body fails protocol negotiation.
 */
export const resolveInitPolicyWire = function resolveInitPolicyWire(
	payload: Pick<InitOutput, 'policyResolution'>,
	options: MapInitOutputOptions = {}
): PolicyResolutionWire {
	const declared = options.producerContract;
	if (declared !== undefined && declared !== POLICY_CONTRACT_VERSION) {
		return writePolicyResolutionWire(FAILED_UNSUPPORTED_CONTRACT);
	}
	if (payload.policyResolution !== undefined) {
		// Untouched. The kernel's strict reader decides what it can represent.
		return payload.policyResolution;
	}
	if (declared !== undefined) {
		return writePolicyResolutionWire(FAILED_INVALID_PAYLOAD);
	}
	return writePolicyResolutionWire(FAILED_UNSUPPORTED_CONTRACT);
};

export const mapInitOutputToInitResponse = function mapInitOutputToInitResponse(
	payload: RichInitOutput,
	headers: Record<string, string>,
	options: MapInitOutputOptions = {}
): TransportInitResponse {
	const mapped: TransportInitResponse = {
		// On the real backend, omitted `gvl` on a 200 response means IAB is not
		// active for this request. The kernel disables IAB on explicit null.
		gvl: payload.gvl ?? null,

		location: payload.location,
		policyResolution: resolveInitPolicyWire(payload, options),
		resolvedOverrides: {
			...mapResolvedOverrides(payload),
			...(payload.resolvedOverrides ?? {}),
		},
		translations: payload.translations,
	};

	const privacySignals = mapPrivacySignals(headers);
	if (privacySignals) {
		mapped.resolvedPrivacySignals = privacySignals;
	}
	const branding = mapBranding(payload.branding);
	if (branding !== undefined) {
		mapped.branding = branding;
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
	if (payload.subjectId !== undefined && payload.subjectId !== null) {
		mapped.subjectId = payload.subjectId;
	}

	return mapped;
};

/**
 * Configuration after folding validated prefetch records and policy.
 */
export type TransportKernelConfig = KernelConfig;

export const mergeInitResponseIntoKernelConfig =
	// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
	function mergeInitResponseIntoKernelConfig(
		base: TransportKernelConfig,
		response: TransportInitResponse | undefined
	): TransportKernelConfig {
		if (!response) {
			return base;
		}

		const merged: TransportKernelConfig = { ...base };
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
		if (response.resolvedPrivacySignals !== undefined) {
			merged.initialPrivacySignals = {
				...(base.initialPrivacySignals ?? {}),
				...response.resolvedPrivacySignals,
			};
		}

		if (response.records !== undefined || response.subjectId !== undefined) {
			merged.initialRecords = { ...base.initialRecords, ...response.records };
			if (response.subjectId && response.records?.subject === undefined) {
				merged.initialRecords.subject = {
					...merged.initialRecords.subject,
					subjectId: response.subjectId,
				};
			}
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
		if (response.policyResolution !== undefined) {
			// Read here, on the server, so the kernel is constructed from a
			// resolution and never lifts or hashes anything itself.
			const resolution = readPolicyResolutionWire(response.policyResolution);
			merged.initialPolicyResolution = resolution;
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

		if (
			merged.initialPolicyResolution &&
			merged.initialPolicyResolution.status !== 'matched'
		) {
			// Clear after folding the response: a failed producer may include
			// stale legacy metadata alongside its non-matching resolution.

			delete merged.initialPolicySnapshotToken;
			delete merged.initialIab;
		}

		return merged;
	};

export const initResponseToKernelConfig = function initResponseToKernelConfig(
	response: TransportInitResponse | undefined
): TransportKernelConfig {
	return mergeInitResponseIntoKernelConfig({}, response);
};

export const mergeInitOutputIntoKernelConfig =
	function mergeInitOutputIntoKernelConfig(
		base: TransportKernelConfig,
		payload: RichInitOutput | undefined,
		headers: Record<string, string> = {},
		options: MapInitOutputOptions = {}
	): TransportKernelConfig {
		return mergeInitResponseIntoKernelConfig(
			base,
			payload
				? mapInitOutputToInitResponse(payload, headers, options)
				: undefined
		);
	};

export const initOutputToKernelConfig = function initOutputToKernelConfig(
	payload: RichInitOutput | undefined,
	headers: Record<string, string> = {},
	options: MapInitOutputOptions = {}
): TransportKernelConfig {
	return mergeInitOutputIntoKernelConfig({}, payload, headers, options);
};
