import {
	createdAtField,
	defineEntity,
	idField,
	jsonField,
	stringField,
	updatedAtField,
} from '@doubletie/core';
// Don't directly import from table files - will define relationships later

/**
 * ConsentPurposeJunction entity definition using the new defineEntity pattern.
 *
 * This defines the schema for the junction table that connects consents with purposes,
 * implementing a many-to-many relationship between them. It allows for tracking which
 * purposes a user has consented to and the status of each purpose-specific consent.
 */
export const consentPurposeJunctionTable = defineEntity({
	/**
	 * The name of the junction table in the database
	 */
	name: 'consentPurposeJunction',

	/**
	 * Description of the entity and its purpose
	 */
	description:
		'A consent purpose junction is a record of the relationship between a consent and a purpose.',

	/**
	 * Execution order during migrations (lower numbers run first)
	 * Junction table needs to be created after the consent and consentPurpose tables it references
	 */
	order: 4,

	/**
	 * Field definitions for the consent-purpose junction table
	 */
	fields: {
		/**
		 * Unique identifier for this junction record
		 */
		id: idField({ required: true, prefix: 'pjx' }),

		/**
		 * Reference to the consent record this junction is associated with
		 */
		consentId: stringField({ required: true }),

		/**
		 * Reference to the consentPurpose record this junction is associated with
		 */
		purposeId: stringField({ required: true }),

		/**
		 * Status of this specific consent-purpose relationship
		 * Values may include: 'active', 'revoked', 'expired', etc.
		 */
		status: stringField({ required: true, defaultValue: 'active' }),

		/**
		 * Additional metadata about this specific consent-purpose relationship
		 * Can store purpose-specific preferences or configuration
		 */
		metadata: jsonField({ required: false }),

		/**
		 * When the junction record was created
		 * Automatically set to current time by default
		 */
		createdAt: createdAtField({ required: true }),

		/**
		 * When the junction record was last updated
		 * Updated automatically when the record changes
		 */
		updatedAt: updatedAtField({ required: false }),
	},

	/**
	 * Add unique constraint to ensure a consentPurpose can only be associated with a consent once
	 */
	uniqueConstraints: [
		{
			name: 'unique_consent_purpose',
			fields: ['consentId', 'purposeId'],
		},
	],

	/**
	 * Indexes for query optimization
	 */
	indexes: [
		{
			name: 'consent_id_index',
			fields: ['consentId'],
		},
		{
			name: 'purpose_id_index',
			fields: ['purposeId'],
		},
		{
			name: 'status_index',
			fields: ['status'],
		},
	],
});

// We'll set up the relationships after all tables are fully defined
// This avoids circular dependency issues
export function setupConsentPurposeJunctionRelationships() {
	return consentPurposeJunctionTable.withRelationships((relationships) => ({
		/**
		 * Relationship to the consent table
		 * Each junction record belongs to one consent
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

		/**
		 * Relationship to the consentPurpose table
		 * Each junction record belongs to one purpose
		 */
		purpose: relationships.manyToOne(
			{
				name: 'consentPurpose',
				fields: {
					id: { type: 'string', name: 'id' },
				},
			},
			'id',
			{
				foreignKey: 'purposeId',
			}
		),
	}));
}
