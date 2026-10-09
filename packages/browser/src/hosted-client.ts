import { hosted } from '@c15t/core';
import type { ProviderTransportFactory } from '@c15t/core';

import { createConsentClientWith } from './client-base';
import type { CreateConsentClientContext } from './client-base';
import type { ConsentClient, ConsentClientOptions } from './types';

const defaultHostedFactory = function defaultHostedFactory(
	backendURL: string | undefined
): ProviderTransportFactory {
	if (!backendURL) {
		throw new Error(
			'@c15t/browser/hosted: provide backendURL, data-backend-url, or a hosted() factory.'
		);
	}
	return hosted({ backendURL });
};

/**
 * Create a hosted client with no offline or manifest mode selection.
 *
 * @param options - Hosted options, including a backend URL or hosted factory.
 * @param context - Entry-point wiring.
 * @returns The client, not started.
 * @throws {Error} For another mode, manifest inputs, preset names, or no backend.
 * @internal
 */
export const createHostedConsentClient = function createHostedConsentClient(
	options: ConsentClientOptions = {},
	context: CreateConsentClientContext = {}
): ConsentClient {
	if (options.manifest !== undefined || options.manifestURL !== undefined) {
		throw new Error(
			'@c15t/browser/hosted: manifest inputs require the generic @c15t/browser entry.'
		);
	}
	const policyRules = options.policyRules?.map((rule) => {
		if (typeof rule === 'string') {
			throw new Error(
				'@c15t/browser/hosted: policy preset names require @c15t/browser/offline or the generic entry. Pass authored policy rules instead.'
			);
		}
		return rule;
	});
	const { mode } = options;
	if (
		mode !== undefined &&
		mode !== 'hosted' &&
		!(typeof mode === 'function' && mode.kind === 'hosted')
	) {
		throw new Error('@c15t/browser/hosted: only hosted mode is supported.');
	}
	const factory =
		typeof mode === 'function'
			? mode
			: defaultHostedFactory(options.backendURL);
	return createConsentClientWith(
		options,
		{ factory, name: 'hosted' },
		policyRules,
		context
	);
};
