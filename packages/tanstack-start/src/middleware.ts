import { createMiddleware } from '@tanstack/react-start';

import { extractConsentRequestInputs } from './headers';
import type { ConsentRequestInputs } from './headers';
import { rememberConsentInputs } from './libs/request-inputs';

/** Options for {@link consentRequestMiddleware}. */
export interface ConsentRequestMiddlewareOptions {
	/**
	 * Override the detected country (ISO 3166-1 alpha-2). Useful for local
	 * development, where no CDN geo header exists.
	 */
	country?: string;

	/**
	 * Override the detected region code.
	 */
	region?: string;

	/**
	 * Override the negotiated language. Written back onto the request as
	 * `accept-language` when header normalization is on, so readers that
	 * only look at headers (`readInitialConsentConfig`, the init route) see
	 * the same value as `context.consent.language`.
	 */
	language?: string;

	/**
	 * Write the normalized `x-c15t-country`, `x-c15t-region`, and `sec-gpc`
	 * headers back onto the incoming request so every downstream reader
	 * (server routes, server functions, `prefetchInitialConsent`) sees one
	 * canonical set regardless of which CDN populated them.
	 *
	 * @default true
	 */
	normalizeHeaders?: boolean;
}

/** Request context contributed by {@link consentRequestMiddleware}. */
export interface ConsentRequestContext {
	/** Normalized geo, language, and GPC inputs for this request. */
	consent: ConsentRequestInputs;
}

const writeNormalizedHeaders = function writeNormalizedHeaders(
	headers: Headers,
	inputs: ConsentRequestInputs,
	language: string | undefined
): void {
	try {
		if (language) {
			headers.set('accept-language', language);
		}
		if (inputs.country) {
			headers.set('x-c15t-country', inputs.country);
		}
		if (inputs.region) {
			headers.set('x-c15t-region', inputs.region);
		}
		if (inputs.gpc !== undefined) {
			headers.set('sec-gpc', inputs.gpc ? '1' : '0');
		}
	} catch {
		// Some runtimes hand middleware an immutable Request. The inputs are
		// also remembered per request (see `rememberConsentInputs`), which is
		// what the package's own header readers consult first, so overrides
		// survive even when the headers cannot be rewritten.
	}
};

/**
 * Request middleware that normalizes consent inputs for the whole request.
 *
 * It reads the CDN geo headers (Cloudflare, Vercel, CloudFront, generic
 * proxies), `accept-language`, and `sec-gpc` through the shared extractor,
 * rewrites them onto the canonical `x-c15t-country`, `x-c15t-region`, and
 * `sec-gpc` request headers, and exposes the same values as
 * `context.consent` for server routes and server functions.
 *
 * Register it once for every request in `src/start.ts`:
 *
 * @example
 * ```ts
 * // src/start.ts
 * import { createStart } from '@tanstack/react-start';
 * import { consentRequestMiddleware } from '@c15t/tanstack-start/middleware';
 *
 * export const startInstance = createStart(() => ({
 *   requestMiddleware: [consentRequestMiddleware()],
 * }));
 * ```
 *
 * Or attach it to a single server route:
 *
 * @example
 * ```ts
 * export const Route = createFileRoute('/api/c15t/$')({
 *   server: {
 *     middleware: [consentRequestMiddleware()],
 *     handlers: createConsentServerRoute(),
 *   },
 * });
 * ```
 *
 * @param options - Overrides and header-normalization behavior.
 * @returns A TanStack Start request middleware.
 */
export const consentRequestMiddleware = function consentRequestMiddleware(
	options: ConsentRequestMiddlewareOptions = {}
) {
	return createMiddleware().server(({ next, request }) => {
		const inputs: ConsentRequestInputs = extractConsentRequestInputs(
			request.headers,
			{
				country: options.country,
				language: options.language,
				region: options.region,
			}
		);
		rememberConsentInputs(request, inputs);
		if (options.normalizeHeaders !== false) {
			writeNormalizedHeaders(request.headers, inputs, options.language);
		}
		return next({
			context: { consent: inputs } satisfies ConsentRequestContext,
		});
	});
};
