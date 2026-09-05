import type { InitOutput, PolicyRule } from '@c15t/schema/types';
import { writePolicyResolutionWire } from '@c15t/schema/types';

import type { AllConsentNames } from '../consent/consent-types';
import type {
	KernelConfig,
	KernelTranslations,
	KernelTransport,
	KernelUser,
} from '../types';
import { createHostedTransport } from './hosted';
import { mapInitOutputToInitResponse } from './init-output';
import type { TransportInitResponse } from './init-output';
import { buildSubjectPostBody } from './subject-body';

/** Runtime values supplied by a provider to a transport factory. */
export interface ProviderTransportContext {
	/** Categories configured on the provider. */
	consentCategories?: AllConsentNames[];
	/** v3 policy rules configured on the provider. */
	policyRules?: PolicyRule[];
	/** Server-prefetched kernel configuration. */
	prefetch: KernelConfig;
	/** Translations resolved from the provider's i18n configuration. */
	translations: KernelTranslations;
}

/** Transport kind exposed through `window.c15t.mode`. */
export type ProviderTransportKind = 'hosted' | 'offline' | 'custom';

/**
 * Creates a kernel transport from provider runtime context.
 *
 * Providers require one of these as their `mode` option. Build it with
 * `hosted()`, `custom()`, or a framework adapter's `offline()` rather than
 * by hand so the `kind` property stays accurate. `kind` lets adapters
 * report the selected transport through `window.c15t.mode` without
 * importing every transport implementation.
 *
 * @param context - Provider values needed to create the transport.
 * @returns A transport for the consent kernel.
 */
export interface ProviderTransportFactory {
	(context: ProviderTransportContext): KernelTransport;
	readonly kind: ProviderTransportKind;
}

/** Options for {@link hosted}. */
export interface HostedModeOptions {
	/** Backend URL. Can be relative or absolute. */
	url: string;
	/** Domain sent when consent is saved. */
	domain?: string;
	/** Fetch implementation used for backend requests. */
	fetch?: typeof globalThis.fetch;
	/** Headers forwarded to the backend init endpoint. */
	headers?: Record<string, string>;
}

/**
 * Selects the hosted transport for a consent provider.
 *
 * @param options - Hosted backend connection options.
 * @returns A hosted provider transport factory.
 * @example
 * ```ts
 * import { hosted } from '@c15t/core';
 *
 * const mode = hosted({ url: '/api/c15t' });
 * ```
 */
export const hosted = function hosted(
	options: HostedModeOptions
): ProviderTransportFactory {
	return Object.assign(
		() =>
			createHostedTransport({
				backendURL: options.url,
				domain: options.domain,
				fetch: options.fetch,
				headers: options.headers,
			}),
		{ kind: 'hosted' as const }
	);
};

/**
 * Minimal response envelope returned by endpoint handlers.
 */
export interface EndpointResponse<ResponseType = unknown> {
	ok: boolean;
	data?: ResponseType | null;
	error?: Error | null;
}

/**
 * A single endpoint handler. Receives an optional request body and resolves
 * to a response envelope.
 */
export type EndpointHandler<
	ResponseType = unknown,
	BodyType = unknown,
> = (options?: { body?: BodyType }) => Promise<EndpointResponse<ResponseType>>;

/**
 * Caller-supplied endpoint handlers accepted by {@link custom}.
 */
export interface EndpointHandlers {
	init?: EndpointHandler<Record<string, unknown>>;
	setConsent: EndpointHandler<{ subjectId?: string }, unknown>;
	identifyUser?: EndpointHandler<
		unknown,
		KernelUser & { subjectId: string | null }
	>;
}

const isEndpointHandlers = function isEndpointHandlers(
	value: EndpointHandlers | KernelTransport
): value is EndpointHandlers {
	return 'setConsent' in value;
};

const createEndpointTransport = function createEndpointTransport(
	endpointHandlers: EndpointHandlers
): KernelTransport {
	return {
		async identify(user, subjectId) {
			if (!endpointHandlers.identifyUser) {
				return;
			}
			const response = await endpointHandlers.identifyUser({
				body: { ...user, subjectId },
			});
			if (!response.ok) {
				throw (
					response.error ?? new Error('c15t custom transport: identify failed')
				);
			}
		},
		async init() {
			if (!endpointHandlers.init) {
				// A producer with no init has no policy system. Say so explicitly:
				// a complete response that stays silent about resolution would be
				// read as a failed payload, and a missing field must never mean
				// "keep whatever policy was there".
				return {
					policyResolution: writePolicyResolutionWire({
						policy: null,
						status: 'unconfigured',
					}),
				};
			}
			const response = await endpointHandlers.init();
			if (!response.ok || !response.data) {
				throw response.error ?? new Error('c15t custom transport: init failed');
			}
			const init = response.data as Record<string, unknown>;
			if (init.location && init.translations && init.branding) {
				// An endpoint handler declares no contract; a present wire is
				// passed through and an absent one fails protocol negotiation.
				return mapInitOutputToInitResponse(init as InitOutput, {});
			}
			const mapped: TransportInitResponse = {
				branding:
					init.branding === 'none' ? undefined : (init.branding as never),
				cmpId: init.cmpId as never,
				customVendors: init.customVendors as never,
				gvl: init.gvl as never,
				location: init.location as never,
				policySnapshotToken: init.policySnapshotToken as never,
				resolvedOverrides: init.resolvedOverrides as never,
				subjectId: init.subjectId as never,
				translations: init.translations as never,
			};
			if (init.policyResolution !== undefined) {
				mapped.policyResolution = init.policyResolution as never;
			}
			return mapped;
		},
		async save(payload) {
			const response = await endpointHandlers.setConsent({
				body: buildSubjectPostBody(payload, {
					domain:
						typeof window === 'undefined'
							? 'localhost'
							: window.location.hostname,
				}),
			});
			return {
				ok: response.ok,
				...(response.data?.subjectId !== undefined && {
					subjectId: response.data.subjectId,
				}),
			};
		},
	};
};

/**
 * Selects a caller-supplied transport for a consent provider.
 *
 * @param handlersOrTransport - endpoint handlers or a kernel transport.
 * @returns A custom provider transport factory.
 * @example
 * ```ts
 * import { custom } from '@c15t/core';
 *
 * const mode = custom({
 *   async init() {
 *     return await loadInitResponse();
 *   },
 *   async save(payload) {
 *     await persist(payload);
 *     return { ok: true, subjectId: payload.subjectId };
 *   },
 * });
 * ```
 */
export const custom = function custom(
	handlersOrTransport: EndpointHandlers | KernelTransport
): ProviderTransportFactory {
	const transport = isEndpointHandlers(handlersOrTransport)
		? createEndpointTransport(handlersOrTransport)
		: handlersOrTransport;
	return Object.assign(() => transport, { kind: 'custom' as const });
};
