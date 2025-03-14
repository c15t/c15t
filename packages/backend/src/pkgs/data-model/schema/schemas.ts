/**
 * Schema Re-exports
 *
 * This file re-exports the schema tables directly from their original locations.
 * It serves as the central hub for accessing all schema definitions.
 */

// Export the getConsentTables function and schema type
export { getConsentTables, type C15TDBSchema } from './definition';

// Export the parser functions
export {
	parseInputData,
	parseEntityOutputData,
	getAllFields,
} from './parser';

// Export the complete schema tables directly from their source locations
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
