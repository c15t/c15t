import { z } from 'zod';
import { brandingValues } from './constants';

/**
 * Schema for branding configuration
 */
export const brandingSchema = z.enum(brandingValues);

export type Branding = z.infer<typeof brandingSchema>;

// Re-export for convenience
export { brandingValues };
