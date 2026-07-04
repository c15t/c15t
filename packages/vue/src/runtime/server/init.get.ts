import { getRequestHeaders, setResponseHeader } from 'h3';
import { defineCachedEventHandler, useRuntimeConfig } from 'nitropack/runtime';
import type { NitroRuntimeConfig } from 'nitropack/types';
import type { ConsentConfig } from '../config';
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
		const manifest = await fetchCachedManifest({ config });

		setResponseHeader(event, 'cache-control', 'private, no-store');
		return resolveManifestInit({
			manifest: manifest.manifest,
			headers: getRequestHeaders(event),
		});
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
