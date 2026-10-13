import type { ManifestFetch } from '@c15t/core/server';
import { defineEventHandler, serverFetch, useRuntimeConfig } from 'nuxt/server';
import type { RequestEvent } from 'nuxt/server';
import { withoutBase } from 'ufo';

import manifest from '#c15t/manifest-snapshot';

import { createConsentRouteResponder } from './consent-route-handler';

const fetchAbsolute: ManifestFetch = (input, init) => fetch(input, init);

const respond = createConsentRouteResponder<RequestEvent>({
	fetch: fetchAbsolute,
	manifest,
	useRuntimeConfig: () => useRuntimeConfig(),
});

const createLocalFetch =
	(event: RequestEvent): ManifestFetch =>
	(input, init) =>
		serverFetch(
			event,
			withoutBase(String(input), useRuntimeConfig().app.baseURL),
			{ ...init, forwardHeaders: false }
		);

export default defineEventHandler((event) =>
	respond(event, event.req, createLocalFetch(event))
);
