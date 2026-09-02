import type { CustomClientOptions } from '@c15t/core';
import {
	buildSubjectPostBody,
	mapInitOutputToInitResponse,
} from '@c15t/core/v3';
import type { KernelTransport } from '@c15t/core/v3';
import type { InitOutput } from '@c15t/schema/types';

import type { ProviderTransportFactory } from './types';

type EndpointHandlers = CustomClientOptions['endpointHandlers'];

const isEndpointHandlers = function isEndpointHandlers(
	value: EndpointHandlers | KernelTransport
): value is EndpointHandlers {
	return 'setConsent' in value;
};

const createEndpointTransport = function createEndpointTransport(
	endpointHandlers: EndpointHandlers
): KernelTransport {
	return {
		async init() {
			if (!endpointHandlers.init) {
				return {};
			}
			const response = await endpointHandlers.init();
			if (!response.ok || !response.data) {
				throw response.error ?? new Error('c15t custom transport: init failed');
			}
			const init = response.data as Record<string, unknown>;
			if (init.location && init.translations && init.branding) {
				return mapInitOutputToInitResponse(init as InitOutput, {});
			}
			return {
				branding:
					init.branding === 'none' ? undefined : (init.branding as never),
				cmpId: init.cmpId as never,
				consents: init.consents as never,
				customVendors: init.customVendors as never,
				gvl: init.gvl as never,
				hasConsented: init.hasConsented as never,
				location: init.location as never,
				policy: init.policy as never,
				policyDecision: init.policyDecision as never,
				policySnapshotToken: init.policySnapshotToken as never,
				resolvedOverrides: init.resolvedOverrides as never,
				subjectId: init.subjectId as never,
				translations: init.translations as never,
			};
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
				subjectId: response.data?.subjectId,
			};
		},
	};
};

/**
 * Selects a caller-supplied transport for a consent provider.
 *
 * @param handlersOrTransport - v2 endpoint handlers or a kernel transport.
 * @returns A custom provider transport factory.
 */
export const custom = function custom(
	handlersOrTransport: EndpointHandlers | KernelTransport
): ProviderTransportFactory {
	const transport = isEndpointHandlers(handlersOrTransport)
		? createEndpointTransport(handlersOrTransport)
		: handlersOrTransport;
	return Object.assign(() => transport, { kind: 'custom' as const });
};
