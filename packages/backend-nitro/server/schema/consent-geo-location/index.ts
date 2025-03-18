import {
	createdAtField,
	defineEntity,
	idField,
	numberField,
	stringField,
	updatedAtField,
} from '@doubletie/core';


/**
 * Consent geo-location entity definition using the new defineEntity pattern.
 *
 * This defines the schema for the geo-location data associated with consent records,
 * including IP address, country, region, and other geographical information.
 */
export const consentGeoLocationTable = defineEntity({
	/**
	 * The name of the geo-location table in the database
	 */
	name: 'consentGeoLocation',

	/**
	 * Description of the entity and its purpose
	 */
	description:
		'A consent geo-location is a record of the geo-location data associated with consent records, including IP address, country, region, and other geographical information.',

	/**
	 * Execution order during migrations (lower numbers run first)
	 * Geo-location table needs to be created after the consent table it references
	 */
	order: 4,

	/**
	 * Field definitions for the consent geo-location table
	 */
	fields: {
		/**
		 * Unique identifier for this geo-location record
		 */
		id: idField({ required: true, prefix: 'cgl' }),

		/**
		 * Reference to the consent record this geo-location is associated with
		 */
		consentId: stringField({
			required: true,
		}),

		/**
		 * IP address from which the consent was given
		 */
		ip: stringField({ required: true }),

		/**
		 * Country code (e.g., 'US', 'DE', 'FR')
		 */
		country: stringField({ required: false }),

		/**
		 * Region or state (e.g., 'California', 'Bavaria')
		 */
		region: stringField({ required: false }),

		/**
		 * City name (e.g., 'New York', 'Berlin')
		 */
		city: stringField({ required: false }),

		/**
		 * Latitude coordinate
		 */
		latitude: numberField({ required: false }),

		/**
		 * Longitude coordinate
		 */
		longitude: numberField({ required: false }),

		/**
		 * Timezone identifier (e.g., 'America/New_York', 'Europe/Berlin')
		 */
		timezone: stringField({ required: false }),

		/**
		 * When the geo-location record was created
		 * Automatically set to current time by default
		 */
		createdAt: createdAtField({ required: true }),

		/**
		 * When the geo-location record was updated
		 * Automatically set to current time by default
		 */
		updatedAt: updatedAtField({ required: true }),
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
});

// We'll set up the relationships after all tables are fully defined
// This avoids circular dependency issues
export function setupConsentGeoLocationRelationships() {
	return consentGeoLocationTable.withRelationships((relationships) => ({
		/**
		 * Relationship to the consent table
		 * Each geo-location record belongs to one consent
		 */
		consent: relationships.manyToOne(
			{
				name: 'consent',
				fields: {
					id: { type: 'string', name: 'id' },
				},
			},
			'id',
			{
				foreignKey: 'consentId',
			}
		),
	}));
}
