import { useRuntimeConfig } from 'nitropack/runtime';

import { serverFetch } from './local-fetch';
import { createManifestRoute } from './route-factories';

export default createManifestRoute({
	fetch: serverFetch,
	useRuntimeConfig,
});
