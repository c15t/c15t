import { defineCachedEventHandler, useRuntimeConfig } from 'nitropack/runtime';

import { serverFetch } from './local-fetch';
import { createInitRoute } from './route-factories';

export default createInitRoute({
	defineCachedEventHandler,
	fetch: serverFetch,
	useRuntimeConfig,
});
