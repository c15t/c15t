/**
 * Manifest transport — fetches or accepts a consent manifest and resolves
 * `/init` locally with @c15t/schema's shared resolver.
 */

import type {
	ConsentManifest,
	ConsentManifestGVLReference,
	GlobalVendorList,
	InitOutput,
	ResolveInitFromManifestInputs,
} from '@c15t/schema/types';
import { resolveInitFromManifest } from '@c15t/schema/types';

import type {
	InitContext,
	InitResponse,
	KernelOverrides,
	KernelTransport,
	SavePayload,
	SaveResult,
} from '../types';
import { mapInitOutputToInitResponse } from './init-output';
import { buildSubjectPostBody } from './subject-body';
import { c15tVersionHeaders } from './version-header';

const getDefined = <Value>(
	value: Value,
	message = 'Expected value to be defined'
): NonNullable<Value> => {
	if (value === null || value === undefined) {
		throw new Error(message);
	}
	return value;
};

export interface ManifestTransportOptions {
	/**
	 * URL for `GET /manifest`. Either `manifestURL` or `manifest` is required.
	 */
	manifestURL?: string;

	/**
	 * Inline manifest object. Either `manifestURL` or `manifest` is required.
	 */
	manifest?: ConsentManifest;

	/**
	 * Backend URL used for `POST /subjects`. Defaults to `manifestURL` with a
	 * trailing `/manifest` segment removed.
	 */
	backendURL?: string;

	/**
	 * Fetch implementation. Defaults to `globalThis.fetch`.
	 */
	fetch?: typeof globalThis.fetch;

	/**
	 * Optional GVL fetcher. Called only when the locally resolved policy is IAB.
	 */
	fetchGvl?: (input: {
		reference: ConsentManifestGVLReference;
		language: string;
		fetch: typeof globalThis.fetch;
	}) => Promise<GlobalVendorList | null>;

	/**
	 * Caller-provided decision inputs, usually derived from request headers on
	 * the host server/edge.
	 */
	inputs?: ResolveInitFromManifestInputs;

	/**
	 * Prefetched init output from a same-origin server route. Used to seed the
	 * asserted decision inputs sent with the first manifest-mode save.
	 */
	initialInit?: InitOutput;

	/**
	 * Request headers for fetching `manifestURL`.
	 */
	headers?: Record<string, string>;

	/**
	 * Fetch credentials mode. Defaults to `'include'`.
	 */
	credentials?: RequestCredentials;

	/**
	 * Domain sent to POST /subjects. Defaults to the browser hostname, or the
	 * backend URL hostname for absolute URLs in server runtimes.
	 */
	domain?: string;
}

interface LastDecisionInputs {
	policyId?: string;
	fingerprint?: string;
	country: string | null;
	region: string | null;
	language: string;
	gpc?: boolean;
}

const trimSlash = function trimSlash(url: string): string {
	return url.endsWith('/') ? url.slice(0, -1) : url;
};

const deriveBackendURL = function deriveBackendURL(
	options: ManifestTransportOptions
): string {
	if (options.backendURL) {
		return trimSlash(options.backendURL);
	}
	if (!options.manifestURL) {
		return '';
	}

	const withoutQuery =
		options.manifestURL.split(/[?#]/u)[0] ?? options.manifestURL;
	const trimmed = trimSlash(withoutQuery);
	return trimmed.endsWith('/manifest')
		? trimmed.slice(0, -'/manifest'.length)
		: trimmed;
};

const resolveDomain = function resolveDomain(
	backendURL: string,
	explicit: string | undefined
): string {
	if (explicit) {
		return explicit;
	}
	if (typeof window !== 'undefined' && window.location?.hostname) {
		return window.location.hostname;
	}
	try {
		return new URL(backendURL).hostname;
	} catch {
		return 'localhost';
	}
};

const toHeadersFromInputs = function toHeadersFromInputs(
	inputs: ResolveInitFromManifestInputs
): Record<string, string> {
	const headers: Record<string, string> = {};
	if (inputs.gpc === true) {
		headers['sec-gpc'] = '1';
	} else if (inputs.gpc === false) {
		headers['sec-gpc'] = '0';
	}
	return headers;
};

const mergeInputs = function mergeInputs(
	optionsInputs: ResolveInitFromManifestInputs | undefined,
	overrides: Readonly<KernelOverrides>
): ResolveInitFromManifestInputs {
	return {
		...optionsInputs,
		country: overrides.country ?? optionsInputs?.country ?? null,
		gpc: overrides.gpc ?? optionsInputs?.gpc,
		language: overrides.language ?? optionsInputs?.language ?? 'en',
		region: overrides.region ?? optionsInputs?.region ?? null,
	};
};

const shouldFetchGvl = function shouldFetchGvl(
	manifest: ConsentManifest,
	payload: InitOutput
): boolean {
	return (
		manifest.iab?.enabled === true &&
		manifest.iab.gvl !== undefined &&
		(manifest.policyPacks === undefined || payload.policy?.model === 'iab')
	);
};

const defaultFetchGvl = async function defaultFetchGvl(input: {
	reference: ConsentManifestGVLReference;
	language: string;
	fetch: typeof globalThis.fetch;
}): Promise<GlobalVendorList | null> {
	const response = await input.fetch(input.reference.url, {
		headers: {
			'accept-language': input.language,
			...c15tVersionHeaders,
		},
		method: 'GET',
	});

	if (response.status === 204) {
		return null;
	}
	if (!response.ok) {
		throw new Error(
			`c15t manifest transport: GVL responded ${response.status} ${response.statusText}`
		);
	}

	return (await response.json()) as GlobalVendorList;
};

const rememberDecision = function rememberDecision(
	payload: InitOutput,
	inputs?: ResolveInitFromManifestInputs
): LastDecisionInputs {
	return {
		country: payload.location.countryCode,
		fingerprint: payload.policyDecision?.fingerprint,
		gpc: inputs?.gpc,
		language: payload.translations.language,
		policyId: payload.policyDecision?.policyId,
		region: payload.location.regionCode,
	};
};

export const createManifestTransport = function createManifestTransport(
	options: ManifestTransportOptions
): KernelTransport {
	const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		throw new Error(
			'createManifestTransport: no fetch available. Pass `fetch` in options.'
		);
	}
	if (!options.manifest && !options.manifestURL) {
		throw new Error(
			'createManifestTransport: either `manifest` or `manifestURL` is required.'
		);
	}

	const backendURL = deriveBackendURL(options);
	const credentials = options.credentials ?? 'include';
	const domain = resolveDomain(backendURL, options.domain);
	let manifestPromise: Promise<ConsentManifest> | undefined;
	let lastDecisionInputs: LastDecisionInputs | undefined = options.initialInit
		? rememberDecision(options.initialInit, options.inputs)
		: undefined;

	// oxlint-disable-next-line require-await -- Async signature preserves the callback or public contract.
	const getManifest = async function getManifest(): Promise<ConsentManifest> {
		if (options.manifest) {
			return options.manifest;
		}
		if (!manifestPromise) {
			manifestPromise = (async () => {
				const response = await fetchImpl(getDefined(options.manifestURL), {
					credentials,
					headers: {
						accept: 'application/json',
						...c15tVersionHeaders,
						...options.headers,
					},
					method: 'GET',
				});

				if (!response.ok) {
					throw new Error(
						`c15t manifest transport: /manifest responded ${response.status} ${response.statusText}`
					);
				}

				return (await response.json()) as ConsentManifest;
			})();
		}
		return manifestPromise;
	};

	return {
		async init(ctx: InitContext): Promise<InitResponse> {
			const manifest = await getManifest();
			const inputs = mergeInputs(options.inputs, ctx.overrides);
			const payload: InitOutput = resolveInitFromManifest(manifest, inputs);

			if (shouldFetchGvl(manifest, payload) && manifest.iab?.gvl) {
				const language = payload.translations.language.split('-')[0] || 'en';
				payload.gvl = await (options.fetchGvl ?? defaultFetchGvl)({
					fetch: fetchImpl,
					language,
					reference: manifest.iab.gvl,
				});
			}

			lastDecisionInputs = rememberDecision(payload, inputs);
			return mapInitOutputToInitResponse(payload, toHeadersFromInputs(inputs));
		},

		async save(payload: SavePayload): Promise<SaveResult> {
			if (!backendURL) {
				throw new Error(
					'createManifestTransport: `backendURL` is required to save when using an inline manifest without `manifestURL`.'
				);
			}

			// Only assert decision inputs when the manifest actually resolved a
			// policy pack. Sending partial inputs (country/language without
			// policyId/fingerprint — e.g. a manifest with no packs configured)
			// is rejected by the backend as incomplete (422 STALE_POLICY).
			const shouldAssertDecisionInputs =
				!payload.policySnapshotToken &&
				Boolean(lastDecisionInputs?.policyId && lastDecisionInputs.fingerprint);
			const response = await fetchImpl(`${backendURL}/subjects`, {
				body: JSON.stringify({
					...buildSubjectPostBody(payload, { domain }),
					...(shouldAssertDecisionInputs && {
						country: lastDecisionInputs?.country,
						fingerprint: lastDecisionInputs?.fingerprint,
						gpc: lastDecisionInputs?.gpc,
						language: lastDecisionInputs?.language,
						policyId: lastDecisionInputs?.policyId,
						region: lastDecisionInputs?.region,
					}),
				}),
				credentials,
				headers: {
					accept: 'application/json',
					'content-type': 'application/json',
					...c15tVersionHeaders,
				},
				method: 'POST',
			});

			if (!response.ok) {
				throw new Error(
					`c15t manifest transport: /subjects responded ${response.status} ${response.statusText}`
				);
			}

			return (await response.json()) as SaveResult;
		},
	};
};
