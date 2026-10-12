import * as v from 'valibot';

import { hostingValues } from './constants';

/**
 * Schema for the backend operator reported on `/init` and the manifest
 */
export const hostingSchema = v.picklist(hostingValues);

export type Hosting = v.InferOutput<typeof hostingSchema>;

// Re-export for convenience
export { hostingValues };
