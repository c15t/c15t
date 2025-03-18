import {
	createdAtField,
	defineEntity,
	idField,
	jsonField,
	stringField,
	updatedAtField,
} from '@doubletie/core';

/**
 * ConsentWithdrawal entity definition using the new defineEntity pattern.
 *
 * This defines the schema for consent withdrawals, which track when and how
 * subjects withdraw their previously given consent.
 */
export const consentWithdrawalTable = defineEntity({
	/**
	 * The name of the consentWithdrawal table in the database
	 */
	name: 'consentWithdrawal',

	/**
	 * Description of the entity and its purpose
	 */
	description:
		'A consent withdrawal is a record of when and how a subject withdraws their consent.',

	/**
	 * Execution order during migrations (lower numbers run first)
	 * Withdrawal table needs to be created after the consent and subject tables it references
	 */
	order: 4,

	/**
	 * Field definitions for the consent withdrawal table
	 */
	fields: {
		/**
		 * Unique identifier for this withdrawal record
		 */
		id: idField({ required: true, prefix: 'wdr' }),

		/**
		 * Reference to the consent that was withdrawn
		 */
		consentId: stringField({ required: true }),

		/**
		 * Reference to the subject who withdrew consent
		 */
		subjectId: stringField({ required: true }),

		/**
		 * Reason provided for withdrawing consent
		 */
		withdrawalReason: stringField({ required: false }),

		/**
		 * Method by which consent was withdrawn
		 * Common values: 'subject-initiated', 'automatic-expiry', 'admin'
		 */
		withdrawalMethod: stringField({
			required: true,
			defaultValue: 'subject-initiated',
		}),

		/**
		 * IP address from which the consentWithdrawal was initiated
		 */
		ipAddress: stringField({ required: false }),

		/**
		 * Subject agent (browser/device) from which the consentWithdrawal was initiated
		 */
		userAgent: stringField({ required: false }),

		/**
		 * Additional metadata about the consentWithdrawal
		 */
		metadata: jsonField({ required: false }),

		/**
		 * When the consentWithdrawal record was created
		 * Automatically set to current time by default
		 */
		createdAt: createdAtField({ required: true }),

		/**
		 * When the consentWithdrawal record was last updated
		 * Automatically updated when the record changes
		 */
		updatedAt: updatedAtField({ required: true }),
	},

	/**
	 * Add unique constraint to ensure a consent can only be withdrawn once
	 * (If this constraint is not desired, it can be disabled in options)
	 */
	uniqueConstraints: [
		{
			name: 'unique_consent_withdrawal',
			fields: ['consentId'],
		},
	],

	/**
	 * Indexes for better query performance
	 */
	indexes: [
		{
			name: 'subject_id_index',
			fields: ['subjectId'],
		},
		{
			name: 'created_at_index',
			fields: ['createdAt'],
		},
	],
});

/**
 * Set up relationships for the consent withdrawal entity
 * 
 * This function establishes relationships between the consent withdrawal entity and
 * other entities (like consent and subject). We use this deferred approach to avoid
 * circular dependencies that can occur when importing entities directly.
 * 
 * Instead of directly importing and referencing other entity objects, we provide
 * minimal static relationship information with just the names and ID field types.
 * 
 * @returns The consent withdrawal entity with relationships fully configured
 */
export function setupConsentWithdrawalRelationships() {
	return consentWithdrawalTable.withRelationships((relationships) => ({
		/**
		 * Relationship to the consent table
		 * Each withdrawal record belongs to one consent
		 */
		consent: relationships.manyToOne({
			name: 'consent',
			fields: {
				id: { type: 'string', name: 'id' }
			}
		}, 'id', {
			foreignKey: 'consentId',
		}),

		/**
		 * Relationship to the subject table
		 * Each withdrawal record belongs to one subject
		 */
		subject: relationships.manyToOne({
			name: 'subject',
			fields: {
				id: { type: 'string', name: 'id' }
			}
		}, 'id', {
			foreignKey: 'subjectId',
		}),
	}));
}
