import { useRuntimeConfig } from 'nitropack/runtime';

import { serverFetch } from './local-fetch';
import { createInitRoute } from './route-factories';

export default createInitRoute({
	fetch: serverFetch,
	useRuntimeConfig,
});
