import { z } from 'zod';

/**
 * Zod schema for validating consent geo-location entities.
 *
 * This defines the structure and validation rules for geo-location records:
 * - Required fields: consentId, ip (IP address)
 * - Optional fields: country, region, city, latitude, longitude, timezone
 * - Default current date/time for creation and update timestamps
 *
 * @example
 * ```typescript
 * const geoLocationData = {
 *   id: 'cgl_w5qufx2a66m7xkn3ty',
 *   consentId: 'cns_hadt8w7nngm7xmx2bn',
 *   ip: '192.168.1.1',
 *   country: 'US',
 *   city: 'New York',
 *   latitude: 40.7128,
 *   longitude: -74.0060
 * };
 *
 * // Validate and parse the geo-location data
 * const validGeoLocation = consentGeoLocationSchema.parse(geoLocationData);
 * ```
 */
export const consentGeoLocationSchema = z.object({
	id: z.string(),
	consentId: z.string(),
	ip: z.string().ip(),
	country: z.string().optional(),
	region: z.string().optional(),
	city: z.string().optional(),
	latitude: z.number().min(-90).max(90).optional(),
	longitude: z.number().min(-180).max(180).optional(),
	timezone: z
		.string()
		.regex(/^[A-Za-z_]+\/[A-Za-z_]+$/)
		.optional(), // Basic IANA timezone format check
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

/**
 * Type definition for ConsentGeoLocation
 *
 * This type represents the structure of a consent geo-location record
 * as defined by the consentGeoLocationSchema. It includes all fields
 * that are part of the consent geo-location entity.
 */
export type ConsentGeoLocation = z.infer<typeof consentGeoLocationSchema>;
