import { useNitroApp } from 'nitropack/runtime';

import { createServerFetch } from './server-fetch';

export const serverFetch = createServerFetch(() => useNitroApp());
