import type { InitOutput } from '@c15t/schema/types';
import type { InitResponse, KernelBranding, KernelOverrides } from '../types';

function mapBranding(
	branding: InitOutput['branding']
): KernelBranding | undefined {
	return branding === 'none' ? undefined : branding;
}

function mapResolvedOverrides(
	payload: InitOutput,
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
	if (headers['sec-gpc'] === '1') {
		overrides.gpc = true;
	} else if (headers['sec-gpc'] === '0') {
		overrides.gpc = false;
	}

	return overrides;
}

export function mapInitOutputToInitResponse(
	payload: InitOutput,
	headers: Record<string, string>
): InitResponse {
	const mapped: InitResponse = {
		resolvedOverrides: mapResolvedOverrides(payload, headers),
		location: payload.location,
		translations: payload.translations,
		// On the real backend, omitted `gvl` on a 200 response means IAB is not
		// active for this request. The kernel disables IAB on explicit null.
		gvl: payload.gvl ?? null,
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

	return mapped;
}
