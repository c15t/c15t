/**
 * Schema Re-exports
 *
 * This file re-exports the actual schema tables from their original locations
 * while preserving the ability to call functions from the new packages structure.
 */

// Re-export the schema utilities from the original schema definition
export { getConsentTables, type C15TDBSchema } from '~/db/schema/definition';

// Re-export the parser functions that we want to provide
export {
	parseInputData,
	parseEntityOutputData,
	getAllFields,
} from '~/db/schema/parser';

// Export the complete schema tables from their original location
export * from '~/db/schema/subject';
export * from '~/db/schema/consent';
export * from '~/db/schema/consent-policy';
export * from '~/db/schema/consent-purpose';
export * from '~/db/schema/consent-purpose-junction';
export * from '~/db/schema/consent-record';
export * from '~/db/schema/consent-withdrawal';
export * from '~/db/schema/consent-geo-location';
export * from '~/db/schema/geo-location';
export * from '~/db/schema/domain';
export * from '~/db/schema/audit-log';
