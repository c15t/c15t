import {
	booleanField,
	createdAtField,
	dateField,
	defineEntity,
	idField,
	jsonField,
	stringField,
	updatedAtField,
} from '@doubletie/core';

/**
 * Consent entity definition using the new defineEntity pattern.
 *
 * This defines the schema for consents which record when and how a subject gives or withdraws consent.
 * The schema includes standard consent fields and relationships to other entities like subjects and domains.
 */
export const consentTable = defineEntity({
	/**
	 * The name of the consent table
	 */
	name: 'consent',
	/**
	 * The description of the consent table
	 */
	description:
		'A consent is a record of when and how a subject gives or withdraws consent.',
	/**
	 * Execution order during migrations (lower numbers run first)
	 * Consent table needs to be created after the subject, domain, and policy tables it references
	 */
	order: 3,
	/**
	 * Field definitions for the consent table
	 */
	fields: {
		/**
		 * Unique identifier for the consent record
		 */
		id: idField({ required: true, prefix: 'cns', idType: 'uuid' }),

		/**
		 * When the consent record was created
		 */
		createdAt: createdAtField({ required: true }),

		/**
		 * When the consent record was last updated
		 */
		updatedAt: updatedAtField({ required: true }),

		/**
		 * Reference to the subject who gave consent
		 */
		subjectId: stringField({ required: true }),

		/**
		 * Reference to the domain this consent applies to
		 */
		domainId: stringField({ required: true }),

		/**
		 * Array of consentPurpose IDs that this consent applies to
		 * Represents the many-to-many relationship between consent and purposes
		 */
		purposeIds: jsonField({ required: false }),

		/**
		 * Additional metadata about the consent
		 */
		metadata: jsonField({ required: false }),

		/**
		 * Reference to the policy version that was accepted
		 */
		policyId: stringField({ required: false }),

		/**
		 * IP address when consent was given
		 */
		ipAddress: stringField({ required: false }),

		/**
		 * Subject agent information when consent was given
		 */
		userAgent: stringField({ required: false }),

		/**
		 * Status of the consent (active, expired, withdrawn)
		 * Default: 'active'
		 */
		status: stringField({ required: true }),

		/**
		 * Reason for consentWithdrawal, if consent was withdrawn
		 */
		withdrawalReason: stringField({ required: false }),

		/**
		 * When the consent was given
		 * Automatically set to current time
		 */
		givenAt: dateField({ required: true }),

		/**
		 * When the consent expires
		 * Calculated based on givenAt + expiresIn setting
		 */
		validUntil: dateField({ required: false }),

		/**
		 * Whether the consent is active
		 * Default: true
		 */
		isActive: booleanField({ required: true }),
	},
});

// We'll set up the relationships after all tables are fully defined
// This avoids circular dependency issues
export function setupConsentRelationships() {
	// The withRelationships function returns the entity with relationships defined
	return consentTable.withRelationships((relationships) => ({
		subject: relationships.manyToOne({
			name: 'subject',
			fields: {
				id: { type: 'string', name: 'id' }
			}
		}, 'id', {
			foreignKey: 'subjectId',
		}),
		domain: relationships.manyToOne({
			name: 'domain',
			fields: {
				id: { type: 'string', name: 'id' }
			}
		}, 'id', {
			foreignKey: 'domainId',
		}),
	}));
}
