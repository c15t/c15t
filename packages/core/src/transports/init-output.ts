/**
 * The one fold from a backend `InitOutput` onto the kernel's `InitResponse`
 * and, for server prefetch, onto `KernelConfig`.
 *
 * Two boundaries live here and are kept apart on purpose:
 *
 * - **Policy resolution.** A negotiated producer sends `policyResolution`;
 *   the raw wire is passed through untouched for the kernel's strict reader.
 *   A producer that predates the contract sends only the legacy `policy`
 *   field, which is lifted here through the explicitly named legacy bridge.
 *   The two cases are told apart by what the producer declared, never by
 *   whether a field happened to be present: a negotiated producer whose
 *   response lacks `policyResolution` is an `invalid-payload` failure, so a
 *   stripped or truncated response can never leave a permissive policy in
 *   place. The lift hashes once, inside the transport's init call or the
 *   server prefetch, and never in kernel construction or render.
 * - **Privacy signals.** `Sec-GPC: 1` is a detected user-agent signal and is
 *   reported as `resolvedPrivacySignals.gpc`, separate from `overrides.gpc`,
 *   which stays the developer/test override. Only the exact value `1`
 *   counts; `0` reports an explicit absence and anything else is silence.
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
	ConsentState,
	InitResponse,
	KernelBranding,
	KernelConfig,
	KernelIABState,
	KernelOverrides,
} from '../types';
import type { TransportHydrationRecords } from './subject-record';

type RichInitOutput = InitOutput &
	Partial<Pick<InitResponse, 'consents' | 'resolvedOverrides' | 'subjectId'>>;

/**
 * Detected privacy signals reported by a transport.
 *
 * Mirrors the kernel's `InitResponse.resolvedPrivacySignals`; the local
 * declaration collapses into it once the kernel types land.
 */
export interface TransportPrivacySignals {
	/** `true` for `Sec-GPC: 1`, `false` for an explicit `0`. */
	gpc?: boolean;
}

/**
 * `InitResponse` plus the v3 fields the kernel reads.
 *
 * `policyResolution` is the raw wire; `records` are server-mapped receipts
 * for the hydration boundary. Structurally identical to the kernel's own
 * `InitResponse` extension so the two collapse when it lands.
 */
export type TransportInitResponse = InitResponse & {
	policyResolution?: PolicyResolutionWire;
	resolvedPrivacySignals?: TransportPrivacySignals;
	records?: TransportHydrationRecords;
};

/** Options for {@link mapInitOutputToInitResponse}. */
export interface MapInitOutputOptions {
	/**
	 * The policy contract the producer declared on its response.
	 *
	 * `undefined` for a producer that predates the contract, whose legacy
	 * `policy` field is lifted. A declared value this client speaks marks a
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
): TransportPrivacySignals | undefined {
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
 * The legacy field is lifted only for a producer that declared nothing; a
 * negotiated producer that omitted the field failed to produce a complete
 * response.
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
	if (payload.subjectId !== undefined && payload.subjectId !== null) {
		mapped.subjectId = payload.subjectId;
	}

	return mapped;
};

/**
 * `KernelConfig` plus the v3 seeds a prefetch can supply.
 *
 * Mirrors the kernel's `KernelConfig` additions; the local declaration
 * collapses into it once the kernel types land.
 */
export type TransportKernelConfig = KernelConfig & {
	initialPolicyResolution?: PolicyResolution;
	initialPrivacySignals?: TransportPrivacySignals;
	initialRecords?: TransportHydrationRecords;
};

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

		if (response.consents) {
			merged.initialConsents = {
				...(base.initialConsents ?? {}),
				...(response.consents as Partial<ConsentState>),
			};
		}
		if (response.subjectId) {
			merged.initialSubjectId = response.subjectId;
		}
		if (response.records !== undefined) {
			merged.initialRecords = response.records;
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

		if (
			merged.initialPolicyResolution &&
			merged.initialPolicyResolution.status !== 'matched'
		) {
			// Clear after folding the response: a failed producer may include
			// stale legacy metadata alongside its non-matching resolution.
			delete merged.initialPolicyDecision;
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
