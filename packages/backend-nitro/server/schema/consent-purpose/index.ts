import {
	booleanField,
	createdAtField,
	defineEntity,
	idField,
	stringField,
	updatedAtField,
} from '@doubletie/core';

/**
 * Consent purpose entity definition using the new defineEntity pattern.
 *
 * This defines the schema for consent purposes, which represent different reasons
 * for collecting and processing subject data, such as marketing, analytics, etc.
 */
export const consentPurposeTable = defineEntity({
	/**
	 * The name of the consent purpose table in the database
	 */
	name: 'consentPurpose',

	/**
	 * Description of the entity and its purpose
	 */
	description:
		'A consent purpose is a reason for collecting and processing subject data, such as marketing, analytics, etc.',

	/**
	 * Execution order during migrations (lower numbers run first)
	 * ConsentPurpose table needs to be created relatively early as other tables reference it
	 */
	order: 1,

	/**
	 * Field definitions for the consent purpose table
	 */
	fields: {
		/**
		 * Unique identifier for this purpose record
		 */
		id: idField({ required: true, prefix: 'pur' }),

		/**
		 * Unique code for the purpose, used for programmatic identification
		 */
		code: stringField({ required: true }),

		/**
		 * Human-readable name of the purpose
		 */
		name: stringField({ required: true }),

		/**
		 * Detailed description of the purpose, shown to subjects
		 */
		description: stringField({ required: true }),

		/**
		 * Whether this is an essential purpose that doesn't require explicit consent
		 */
		isEssential: booleanField({ required: true, defaultValue: false }),

		/**
		 * Category of data this purpose processes (e.g., 'personal', 'profile')
		 */
		dataCategory: stringField({ required: false }),

		/**
		 * Legal basis for data processing (e.g., 'consent', 'legitimate interest')
		 */
		legalBasis: stringField({ required: false }),

		/**
		 * Whether this purpose is currently active
		 */
		isActive: booleanField({ required: true, defaultValue: true }),

		/**
		 * When the purpose record was created
		 */
		createdAt: createdAtField({ required: true }),

		/**
		 * When the purpose record was last updated
		 */
		updatedAt: updatedAtField({ required: true }),
	},

	/**
	 * Indexes for query optimization
	 */
	indexes: [
		{
			name: 'code_index',
			fields: ['code'],
		},
		{
			name: 'is_active_index',
			fields: ['isActive'],
		},
	],
});
