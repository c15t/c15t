import * as v from 'valibot';
import { jurisdictionCodes } from './constants';

/**
 * Schema for jurisdiction codes representing different privacy regulations
 */
export const jurisdictionCodeSchema = v.picklist(jurisdictionCodes);

export type JurisdictionCode = v.InferOutput<typeof jurisdictionCodeSchema>;

// Re-export for convenience
export { jurisdictionCodes };
