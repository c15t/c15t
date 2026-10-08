import { useRuntimeConfig } from 'nitropack/runtime';

import manifest from '#c15t/manifest-snapshot';

import { serverFetch } from './local-fetch';
import { createManifestRoute } from './route-factories';

export default createManifestRoute({
	fetch: serverFetch,
	manifest,
	useRuntimeConfig,
});
