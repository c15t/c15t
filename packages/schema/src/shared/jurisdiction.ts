import { z } from 'zod';
import { jurisdictionCodes } from './constants';

/**
 * Schema for jurisdiction codes representing different privacy regulations
 */
export const jurisdictionCodeSchema = z.enum(jurisdictionCodes);

export type JurisdictionCode = z.infer<typeof jurisdictionCodeSchema>;

// Re-export for convenience
export { jurisdictionCodes };
