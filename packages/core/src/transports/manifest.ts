/**
 * Server-oriented manifest transport.
 *
 * This module resolves `/init` locally with `@c15t/schema` and imports every
 * translation language. Import it from `@c15t/core/transports/manifest`
 * only in server code, or load it lazily for static client-only hosts.
 */

import type {
	ConsentManifest,
	ConsentManifestGVLReference,
	GlobalVendorList,
	InitOutput,
	ResolveInitFromManifestInputs,
} from '@c15t/schema/types';
import {
	POLICY_CONTRACT_VERSION,
	resolveInitFromManifest,
} from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';
import type { BaseTranslations } from '@c15t/translations/all';

import type { PrivacyOptOut } from '../consent-record/types';
import type {
	InitContext,
	KernelOverrides,
	KernelTransport,
	KernelUser,
	SaveResult,
} from '../types';
import {
	buildDecisionAssertion,
	rememberDecisionInputs,
} from './decision-inputs';
import type { RememberedDecisionInputs } from './decision-inputs';
import { mapInitOutputToInitResponse } from './init-output';
import type { TransportInitResponse } from './init-output';
import { buildSubjectPostBody } from './subject-body';
import type { SubjectSavePayload } from './subject-body';
import {
	mapSubjectRecordToHydrationRecords,
	reviveSubjectRecord,
} from './subject-record';
import type { TransportHydrationRecords } from './subject-record';
import { c15tProtocolHeaders } from './version-header';

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
	 * Base translations used for local manifest resolution. Defaults to every
	 * language bundled by `@c15t/translations`.
	 */
	baseTranslations?: BaseTranslations;

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

	/**
	 * Clock used to validate records read from the backend. Defaults to
	 * `Date.now`. Inject for deterministic tests.
	 */
	now?: () => number;
}

/**
 * The manifest transport's full surface. Same record boundary as the hosted
 * transport, against the same backend routes.
 */
export interface ManifestKernelTransport extends KernelTransport {
	init: (ctx: InitContext) => Promise<TransportInitResponse>;
	save: (payload: SubjectSavePayload) => Promise<SaveResult>;
	identify: (user: KernelUser, subjectId: string | null) => Promise<void>;
	loadSubjectRecord: (
		subjectId: string
	) => Promise<TransportHydrationRecords | null>;
	recordPrivacyOptOut: (
		directive: PrivacyOptOut,
		subjectId: string | null
	) => Promise<void>;
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
	const model =
		payload.policyResolution?.status === 'matched'
			? payload.policyResolution.policy.model
			: undefined;
	return (
		manifest.iab?.enabled === true &&
		manifest.iab.gvl !== undefined &&
		model === 'iab'
	);
};

/**
 * A `SaveResult` from the backend's answer. Success is the HTTP status; the
 * 2.x body has no `ok` and must not be read as one.
 */
const toSaveResult = function toSaveResult(data: unknown): SaveResult {
	const subjectId =
		typeof data === 'object' &&
		data !== null &&
		typeof (data as { subjectId?: unknown }).subjectId === 'string'
			? (data as { subjectId: string }).subjectId
			: undefined;
	return subjectId === undefined ? { ok: true } : { ok: true, subjectId };
};

const defaultFetchGvl = async function defaultFetchGvl(input: {
	reference: ConsentManifestGVLReference;
	language: string;
	fetch: typeof globalThis.fetch;
}): Promise<GlobalVendorList | null> {
	const response = await input.fetch(input.reference.url, {
		headers: {
			'accept-language': input.language,
			...c15tProtocolHeaders,
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

/**
 * Build a transport that resolves `/init` locally from a consent manifest
 * and posts saves to the backend.
 *
 * Server-only by design: resolution pulls in `@c15t/schema` and every
 * translation language, so import it from
 * `@c15t/core/transports/manifest` in server code (route handlers,
 * RSC, edge) or behind a dynamic import on static client-only hosts.
 * `@c15t/core` deliberately does not re-export it. Pass
 * `baseTranslations` to ship a narrower language set.
 *
 * Saves without a signed `policySnapshotToken` carry the resolved policy
 * id, fingerprint, geo, language, and GPC signal so the backend can reject
 * a consent recorded against a stale policy.
 *
 * @param options - Manifest source, backend URL, and resolver inputs.
 * @returns A kernel transport backed by local manifest resolution.
 * @throws {Error} When neither `manifest` nor `manifestURL` is provided, or no
 * `fetch` implementation is available.
 * @example
 * ```ts
 * import { createManifestTransport } from '@c15t/core/transports/manifest';
 *
 * const transport = createManifestTransport({
 *   manifestURL: 'https://api.example.com/c15t/manifest',
 *   inputs: { country: 'DE', language: 'de', region: null },
 * });
 * ```
 */
export const createManifestTransport = function createManifestTransport(
	options: ManifestTransportOptions
): ManifestKernelTransport {
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
	const now = options.now ?? Date.now;
	const jsonHeaders = {
		accept: 'application/json',
		'content-type': 'application/json',
		...c15tProtocolHeaders,
	};
	const requireBackendURL = function requireBackendURL(what: string): string {
		if (!backendURL) {
			throw new Error(
				`createManifestTransport: \`backendURL\` is required to ${what} when using an inline manifest without \`manifestURL\`.`
			);
		}
		return backendURL;
	};
	const subjectURL = (subjectId: string): string =>
		`${requireBackendURL('read a subject')}/subjects/${encodeURIComponent(subjectId)}`;
	let manifestPromise: Promise<ConsentManifest> | undefined;
	let lastDecisionInputs: RememberedDecisionInputs | undefined =
		options.initialInit
			? rememberDecisionInputs(options.initialInit, options.inputs?.gpc)
			: undefined;

	const getManifest = function getManifest(): Promise<ConsentManifest> {
		if (options.manifest) {
			return Promise.resolve(options.manifest);
		}
		if (!manifestPromise) {
			// Cached on success only. A rejected fetch is dropped so the kernel's
			// init retry fetches again instead of replaying the same failure.
			manifestPromise = (async () => {
				try {
					const response = await fetchImpl(getDefined(options.manifestURL), {
						credentials,
						headers: {
							accept: 'application/json',
							...c15tProtocolHeaders,
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
				} catch (error) {
					manifestPromise = undefined;
					throw error;
				}
			})();
		}
		return manifestPromise;
	};

	return {
		async identify(user, subjectId): Promise<void> {
			if (!subjectId) {
				// No server subject to link. The identity stays in the kernel and
				// travels with the next save; nothing is owed to the network. Same
				// contract as the hosted transport.
				return;
			}
			const response = await fetchImpl(subjectURL(subjectId), {
				body: JSON.stringify({
					externalId: user.externalId,
					identityProvider: user.identityProvider,
				}),
				credentials,
				headers: jsonHeaders,
				method: 'PATCH',
			});
			if (!response.ok) {
				throw new Error(
					`c15t manifest transport: /subjects/:id responded ${response.status} ${response.statusText}`
				);
			}
		},

		async init(ctx: InitContext): Promise<TransportInitResponse> {
			const manifest = await getManifest();
			const inputs = mergeInputs(options.inputs, ctx.overrides);
			const payload: InitOutput = resolveInitFromManifest(manifest, inputs, {
				baseTranslations: options.baseTranslations ?? baseTranslations,
			});

			if (shouldFetchGvl(manifest, payload) && manifest.iab?.gvl) {
				const language = payload.translations.language.split('-')[0] || 'en';
				payload.gvl = await (options.fetchGvl ?? defaultFetchGvl)({
					fetch: fetchImpl,
					language,
					reference: manifest.iab.gvl,
				});
			}

			lastDecisionInputs = rememberDecisionInputs(payload, inputs.gpc);
			// Local resolution always produces the v3 wire; the manifest's own
			// schema version decides matched, lifted, or failed inside it.
			return mapInitOutputToInitResponse(payload, toHeadersFromInputs(inputs), {
				producerContract: POLICY_CONTRACT_VERSION,
			});
		},

		async loadSubjectRecord(
			subjectId
		): Promise<TransportHydrationRecords | null> {
			const response = await fetchImpl(subjectURL(subjectId), {
				credentials,
				headers: { accept: 'application/json', ...c15tProtocolHeaders },
				method: 'GET',
			});
			if (response.status === 404) {
				return null;
			}
			if (!response.ok) {
				throw new Error(
					`c15t manifest transport: /subjects/:id responded ${response.status} ${response.statusText}`
				);
			}
			const record = reviveSubjectRecord(await response.json());
			if (!record) {
				throw new Error(
					'c15t manifest transport: /subjects/:id returned an unreadable record'
				);
			}
			return mapSubjectRecordToHydrationRecords(record, { now: now() });
		},

		async recordPrivacyOptOut(directive, subjectId): Promise<void> {
			if (!subjectId) {
				return;
			}
			const response = await fetchImpl(
				`${subjectURL(subjectId)}/privacy-directives`,
				{
					body: JSON.stringify({
						categories: [...directive.categories],
						recordedAt: directive.recordedAt,
						source: directive.source,
					}),
					credentials,
					headers: jsonHeaders,
					method: 'POST',
				}
			);
			if (!response.ok) {
				throw new Error(
					`c15t manifest transport: /subjects/:id/privacy-directives responded ${response.status} ${response.statusText}`
				);
			}
		},

		async save(payload): Promise<SaveResult> {
			const response = await fetchImpl(
				`${requireBackendURL('save')}/subjects`,
				{
					body: JSON.stringify({
						...buildSubjectPostBody(payload, { domain }),
						...buildDecisionAssertion(payload, lastDecisionInputs),
					}),
					credentials,
					headers: jsonHeaders,
					method: 'POST',
				}
			);

			if (!response.ok) {
				throw new Error(
					`c15t manifest transport: /subjects responded ${response.status} ${response.statusText}`
				);
			}

			return toSaveResult(await response.json());
		},
	};
};
