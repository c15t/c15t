import {
	getRequestHeader,
	getRequestURL,
	sendNoContent,
	setResponseHeader,
	setResponseStatus,
} from 'h3';
import { defineCachedEventHandler, useRuntimeConfig } from 'nitropack/runtime';
import type { NitroRuntimeConfig } from 'nitropack/types';
import type { ConsentConfig } from '../config';
import { fetchCachedManifest } from './manifest-mode';

type C15TNitroRuntimeConfig = NitroRuntimeConfig & {
	c15t?: Partial<ConsentConfig>;
	public: NitroRuntimeConfig['public'] & {
		c15t?: Partial<ConsentConfig>;
	};
};

const PASSTHROUGH_HEADERS = [
	'cache-control',
	'etag',
	'last-modified',
	'vary',
	'content-language',
] as const;

export default defineCachedEventHandler(
	async (event) => {
		const runtimeConfig = useRuntimeConfig<C15TNitroRuntimeConfig>(event);
		const config = {
			...(runtimeConfig.public?.c15t ?? {}),
			...(runtimeConfig.c15t ?? {}),
		} as ConsentConfig;
		const url = getRequestURL(event);
		const manifest = await fetchCachedManifest({
			config,
			query: url.searchParams.toString(),
		});

		setResponseHeader(event, 'content-type', 'application/json');
		for (const header of PASSTHROUGH_HEADERS) {
			const value = manifest.headers[header];
			if (value) {
				setResponseHeader(event, header, value);
			}
		}

		const etag = manifest.headers.etag;
		if (etag && getRequestHeader(event, 'if-none-match') === etag) {
			setResponseStatus(event, 304);
			return sendNoContent(event, 304);
		}

		return manifest.manifest;
	},
	{
		name: 'c15t-nuxt-manifest',
		maxAge: 1,
		varies: ['accept-language', 'if-none-match'],
	}
);
