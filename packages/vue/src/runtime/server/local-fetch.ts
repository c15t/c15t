import { useNitroApp as getNitroApp } from 'nitropack/runtime';

import { createServerFetch } from './server-fetch';

export const serverFetch = createServerFetch(() => getNitroApp());
