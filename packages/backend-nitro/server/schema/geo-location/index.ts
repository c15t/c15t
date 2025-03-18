import {
	createdAtField,
	defineEntity,
	idField,
	jsonField,
	stringField,
	updatedAtField,
} from '@doubletie/core';

/**
 * GeoLocation entity definition using the new defineEntity pattern.
 *
 * This defines the schema for geographic locations, including country and region data,
 * as well as associated regulatory zones.
 */
export const geoLocationTable = defineEntity({
	/**
	 * The name of the geo-location table in the database
	 */
	name: 'geoLocation',

	/**
	 * Description of the entity and its purpose
	 */
	description:
		'A geographic location is a specific location on the planet, including country and region data, as well as associated regulatory zones.',

	/**
	 * Execution order during migrations (lower numbers run first)
	 * Geo-location is a base entity that doesn't depend on other tables
	 */
	order: 1,

	/**
	 * Field definitions for the geo-location table
	 */
	fields: {
		/**
		 * Unique identifier for this geo-location record
		 */
		id: idField({ required: true, prefix: 'geo' }),

		/**
		 * Country code (e.g., 'US', 'DE', 'FR')
		 */
		countryCode: stringField({ required: true }),

		/**
		 * Full country name (e.g., 'United States', 'Germany', 'France')
		 */
		countryName: stringField({ required: true }),

		/**
		 * Region or state code (e.g., 'CA', 'NY', 'BY')
		 */
		regionCode: stringField({ required: false }),

		/**
		 * Full region or state name (e.g., 'California', 'New York', 'Bavaria')
		 */
		regionName: stringField({ required: false }),

		/**
		 * Array of regulatory zones that apply to this location (e.g., 'GDPR', 'CCPA')
		 * Stored as a JSON string in the database
		 */
		regulatoryZones: jsonField({ required: false }),

		/**
		 * When the geo-location record was created
		 * Automatically set to current time by default
		 */
		createdAt: createdAtField({ required: true }),

		/**
		 * When the geo-location record was last updated
		 * Automatically updated when the record changes
		 */
		updatedAt: updatedAtField({ required: true }),
	},

	/**
	 * Add indexes for better query performance
	 */
	indexes: [
		{
			name: 'country_code_index',
			fields: ['countryCode'],
		},
		{
			name: 'region_code_index',
			fields: ['regionCode'],
		},
		{
			name: 'created_at_index',
			fields: ['createdAt'],
		},
	],
});
