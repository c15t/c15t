import {
	buildSubjectPostBody,
	c15tVersionHeaders,
	mapInitOutputToInitResponse,
} from '@c15t/core/transports';
import type { KernelTransport } from '@c15t/core/transports';
import { createStaticConsentResolver } from '@c15t/nextjs/static';
import type { StaticConsentResolverOptions } from '@c15t/nextjs/static';

/**
 * The manifest shape `@c15t/nextjs/static` resolves from. Taken from the
 * package so the fixture needs no direct `@c15t/schema` dependency.
 */
export type CompatManifest = StaticConsentResolverOptions['manifest'];

export interface StaticTransportOptions {
	/** Absolute backend URL used for `POST /subjects`. */
	backendURL: string;
	/** Manifest generated at build time by `createStaticManifestModule`. */
	manifest: CompatManifest;
	/**
	 * Optional geo endpoint for `createStaticConsentResolver`. Without one,
	 * init resolves to the strictest policy in the manifest with no location.
	 */
	geoURL?: string;
}

const resolveDomain = function resolveDomain(backendURL: string): string {
	if (typeof window !== 'undefined' && window.location?.hostname) {
		return window.location.hostname;
	}
	try {
		return new URL(backendURL).hostname;
	} catch {
		return 'localhost';
	}
};

/**
 * The `output: 'export'` path: init comes from the manifest bundled into the
 * app through `createStaticConsentResolver`, so the browser fetches nothing
 * to show the banner; only saves reach the backend.
 */
export const createStaticTransport = function createStaticTransport({
	backendURL,
	manifest,
	geoURL,
}: StaticTransportOptions): KernelTransport {
	const resolution = createStaticConsentResolver({ geoURL, manifest });
	const base = backendURL.endsWith('/') ? backendURL.slice(0, -1) : backendURL;

	return {
		async init() {
			return mapInitOutputToInitResponse(await resolution.resolved, {});
		},
		async save(payload) {
			const response = await fetch(`${base}/subjects`, {
				body: JSON.stringify(
					buildSubjectPostBody(payload, { domain: resolveDomain(base) })
				),
				credentials: 'include',
				headers: {
					accept: 'application/json',
					'content-type': 'application/json',
					...c15tVersionHeaders,
				},
				method: 'POST',
			});
			if (!response.ok) {
				throw new Error(
					`next-compat static transport: /subjects responded ${response.status} ${response.statusText}`
				);
			}
			return (await response.json()) as { ok: boolean; subjectId?: string };
		},
	};
};
