import { z } from 'zod';

/**
 * Zod schema for validating geo-location entities.
 *
 * This defines the structure and validation rules for geographic location records:
 * - Required fields: countryCode, countryName
 * - Optional fields: regionCode, regionName, regulatoryZones
 * - Default current date/time for creation timestamp
 *
 * @example
 * ```typescript
 * const locationData = {
 *   id: 'geo_x1pftyoufsm7xgo1kv',
 *   countryCode: 'US',
 *   countryName: 'United States',
 *   regionCode: 'CA',
 *   regionName: 'California',
 *   regulatoryZones: ['CCPA', 'CPRA']
 * };
 *
 * // Validate and parse the geo-location data
 * const validLocation = geoLocationSchema.parse(locationData);
 * ```
 */
export const geoLocationSchema = z.object({
	id: z.string(),
	countryCode: z.string().length(2).toUpperCase(),
	countryName: z.string(),
	regionCode: z.string().optional(),
	regionName: z.string().optional(),
	regulatoryZones: z
		.array(z.enum(['GDPR', 'CCPA', 'CPRA', 'LGPD', 'PIPEDA']))
		.optional(), // Add your actual regulatory zones
	createdAt: z.date().default(() => new Date()),
});

/**
 * Type definition for GeoLocation
 *
 * This type represents the structure of a geo-location entity
 * as defined by the geoLocationSchema. It includes all fields
 * that are part of the geo-location entity.
 */
export type GeoLocation = z.infer<typeof geoLocationSchema>;
