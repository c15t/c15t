import * as v from 'valibot';
import { brandingValues } from './constants';

/**
 * Schema for branding configuration
 */
export const brandingSchema = v.picklist(brandingValues);

export type Branding = v.InferOutput<typeof brandingSchema>;

// Re-export for convenience
export { brandingValues };
