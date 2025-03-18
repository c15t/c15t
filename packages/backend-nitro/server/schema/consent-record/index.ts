import {
	createdAtField,
	defineEntity,
	idField,
	jsonField,
	stringField,
	updatedAtField,
} from '@doubletie/core';


/**
 * ConsentRecord entity definition using the new defineEntity pattern.
 *
 * This defines the schema for consent records which track all consent-related actions
 * such as when consent was given, withdrawn, updated, or expired.
 */
export const consentRecordTable = defineEntity({
	/**
	 * The name of the consent record table in the database
	 */
	name: 'consentRecord',

	/**
	 * Description of the entity and its purpose
	 */
	description:
		'A consent record is a record of when and how a subject gives or withdraws consent.',

	/**
	 * Execution order during migrations (lower numbers run first)
	 * Consent record table needs to be created after the subject and consent tables it references
	 */
	order: 4,

	/**
	 * Field definitions for the consent record table
	 */
	fields: {
		/**
		 * Unique identifier for this record
		 */
		id: idField({ required: true, prefix: 'rec' }),

		/**
		 * Reference to the subject associated with this consent record
		 */
		subjectId: stringField({ required: true }),

		/**
		 * Optional reference to the specific consent this record is about
		 * May be null for general consent actions not related to a specific consent
		 */
		consentId: stringField({ required: false }),

		/**
		 * Type of consent action this record represents
		 * Common values: 'given', 'withdrawn', 'updated', 'expired', 'requested'
		 */
		actionType: stringField({ required: true }),

		/**
		 * Additional details about the consent action
		 * May include IP address, subject agent, reason for withdrawal, etc.
		 */
		details: jsonField({ required: false }),

		/**
		 * When the consent record was created
		 * Automatically set to current time by default
		 */
		createdAt: createdAtField({ required: true }),

		/**
		 * When the consent record was last updated
		 * Automatically updated when the record changes
		 */
		updatedAt: updatedAtField({ required: true }),
	},

	/**
	 * Indexes for query optimization
	 */
	indexes: [
		{
			name: 'subject_id_index',
			fields: ['subjectId'],
		},
		{
			name: 'consent_id_index',
			fields: ['consentId'],
		},
		{
			name: 'action_type_index',
			fields: ['actionType'],
		},
		{
			name: 'created_at_index',
			fields: ['createdAt'],
		},
	],
});

// We'll set up the relationships after all tables are fully defined
// This avoids circular dependency issues
export function setupConsentRecordRelationships() {
	return consentRecordTable.withRelationships((relationships) => ({
		/**
		 * Relationship to the subject table
		 * Each consent record belongs to one subject
		 */
		subject: relationships.manyToOne(
			{
				name: 'subject',
				fields: {
					id: { type: 'string', name: 'id' },
				},
			},
			'id',
			{
				foreignKey: 'subjectId',
			}
		),

		/**
		 * Relationship to the consent table
		 * Each consent record may be associated with one consent
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
