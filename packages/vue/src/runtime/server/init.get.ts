import { getRequestHeaders, setResponseHeader } from 'h3';
import { defineCachedEventHandler, useRuntimeConfig } from 'nitropack/runtime';
import type { NitroRuntimeConfig } from 'nitropack/types';
import { joinURL } from 'ufo';
import type { ConsentConfig } from '../config';
import { serverFetch } from './local-fetch';
import { fetchCachedManifest, resolveManifestInit } from './manifest-mode';

type C15TNitroRuntimeConfig = NitroRuntimeConfig & {
	c15t?: Partial<ConsentConfig>;
	public: NitroRuntimeConfig['public'] & {
		c15t?: Partial<ConsentConfig>;
	};
};

export default defineCachedEventHandler(
	async (event) => {
		const runtimeConfig = useRuntimeConfig<C15TNitroRuntimeConfig>(event);
		const config = {
			...(runtimeConfig.public?.c15t ?? {}),
			...(runtimeConfig.c15t ?? {}),
		} as ConsentConfig;
		setResponseHeader(event, 'cache-control', 'private, no-store');
		const headers = getRequestHeaders(event);

		try {
			const manifest = await fetchCachedManifest({
				config,
				fetch: serverFetch,
			});
			return resolveManifestInit({
				manifest: manifest.manifest,
				headers,
			});
		} catch (cause) {
			// RFC 0001 §3 non-breaking guarantee: when the backend has no
			// /manifest (older deployments) or it fails, fall back to a
			// direct GET /init proxy with allowlisted headers instead of
			// failing the consent pipeline.
			if (!config.backendURL) {
				throw cause;
			}
			const forward: Record<string, string> = {};
			for (const key of [
				'accept-language',
				'sec-gpc',
				'x-c15t-country',
				'x-c15t-region',
				'cf-ipcountry',
				'x-vercel-ip-country',
				'x-vercel-ip-country-region',
				'x-amz-cf-ipcountry',
			]) {
				const value = headers[key];
				if (value) {
					forward[key] = value;
				}
			}
			const response = await serverFetch(joinURL(config.backendURL, '/init'), {
				headers: forward,
			});
			if (!response.ok) {
				throw cause;
			}
			return await response.json();
		}
	},
	{
		name: 'c15t-nuxt-init',
		maxAge: 0,
		shouldBypassCache: () => true,
		varies: [
			'accept-language',
			'sec-gpc',
			'x-c15t-country',
			'x-c15t-region',
			'cf-ipcountry',
			'x-vercel-ip-country',
			'x-vercel-ip-country-region',
			'x-amz-cf-ipcountry',
			'x-country-code',
			'x-region-code',
		],
	}
);
