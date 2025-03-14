import type { Field } from '~/pkgs/data-model';
import type { C15TOptions } from '~/pkgs/types';
import { consentGeoLocationSchema } from './schema';

/**
 * Generates the database table configuration for the consent geo-location entity.
 *
 * This function creates a schema definition that includes all standard geo-location fields
 * and any additional fields from plugins or configuration. The resulting schema is used
 * for database migrations, schema validation, and query building.
 *
 * @param options - C15T configuration options that may contain geo-location table customizations
 * @param geoLocationFields - Additional fields from plugins to include in the geo-location table
 * @returns A complete table schema definition with fields, model name, and metadata
 *
 * @example
 * ```typescript
 * const geoLocationTableSchema = getConsentGeoLocationTable(c15tOptions);
 * // Use the schema for migrations or data access
 * const migrationPlans = generateMigrations(geoLocationTableSchema);
 * ```
 */
export function getConsentGeoLocationTable(
	options: C15TOptions,
	geoLocationFields?: Record<string, Field>
) {
	const consentGeoLocationConfig = options.tables?.consentGeoLocation;
	const consentConfig = options.tables?.consent;

	return {
		/**
		 * The name of the geo-location table in the database, configurable through options
		 */
		entityName: consentGeoLocationConfig?.entityName || 'consentGeoLocation',

		/**
		 * The ID prefix for the consent geo-location table
		 * Used to generate unique prefixed IDs for consent geo-locations
		 */
		entityPrefix: consentGeoLocationConfig?.entityPrefix || 'cgl',

		/**
		 * The schema for the consent geo-location table
		 */
		schema: consentGeoLocationSchema,

		/**
		 * Field definitions for the consent geo-location table
		 */
		fields: {
			/**
			 * Reference to the consent record this geo-location is associated with
			 */
			consentId: {
				type: 'string',
				required: true,
				fieldName: consentGeoLocationConfig?.fields?.consentId || 'consentId',
				references: {
					model: consentConfig?.entityName || 'consent',
					field: 'id',
				},
			},

			/**
			 * IP address from which the consent was given
			 */
			ip: {
				type: 'string',
				required: true,
				fieldName: consentGeoLocationConfig?.fields?.ip || 'ip',
			},

			/**
			 * Country code (e.g., 'US', 'DE', 'FR')
			 */
			country: {
				type: 'string',
				required: false,
				fieldName: consentGeoLocationConfig?.fields?.country || 'country',
			},

			/**
			 * Region or state (e.g., 'California', 'Bavaria')
			 */
			region: {
				type: 'string',
				required: false,
				fieldName: consentGeoLocationConfig?.fields?.region || 'region',
			},

			/**
			 * City name (e.g., 'New York', 'Berlin')
			 */
			city: {
				type: 'string',
				required: false,
				fieldName: consentGeoLocationConfig?.fields?.city || 'city',
			},

			/**
			 * Latitude coordinate
			 */
			latitude: {
				type: 'number',
				required: false,
				fieldName: consentGeoLocationConfig?.fields?.latitude || 'latitude',
			},

			/**
			 * Longitude coordinate
			 */
			longitude: {
				type: 'number',
				required: false,
				fieldName: consentGeoLocationConfig?.fields?.longitude || 'longitude',
			},

			/**
			 * Timezone identifier (e.g., 'America/New_York', 'Europe/Berlin')
			 */
			timezone: {
				type: 'string',
				required: false,
				fieldName: consentGeoLocationConfig?.fields?.timezone || 'timezone',
			},

			/**
			 * When the geo-location record was created
			 * Automatically set to current time by default
			 */
			createdAt: {
				type: 'date',
				defaultValue: () => new Date(),
				required: true,
				fieldName: consentGeoLocationConfig?.fields?.createdAt || 'createdAt',
			},

			// Include additional fields from plugins
			...(geoLocationFields || {}),

			// Include additional fields from configuration
			...(consentGeoLocationConfig?.additionalFields || {}),
		},

		/**
		 * Add indexes for better query performance
		 */
		indexes: [
			{
				name: 'consent_id_index',
				fields: ['consentId'],
			},
			{
				name: 'country_index',
				fields: ['country'],
			},
			{
				name: 'created_at_index',
				fields: ['createdAt'],
			},
		],

		/**
		 * Execution order during migrations (lower numbers run first)
		 * Geo-location table needs to be created after the consent table it references
		 */
		order: 4,
	};
}
