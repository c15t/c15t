/**
 * Schema Re-exports
 *
 * This file re-exports the schema tables directly from their original locations.
 * It serves as the central hub for accessing all schema definitions.
 */

// Export the parser functions
export {
	parseInputData,
	parseEntityOutputData,
	getAllFields,
} from './parser';

// Export the complete schema tables directly from their source locations
export * from '~/schema/subject';
export * from '~/schema/consent';
export * from '~/schema/consent-policy';
export * from '~/schema/consent-purpose';
export * from '~/schema/consent-record';
export * from '~/schema/consent-withdrawal';
export * from '~/schema/consent-geo-location';
export * from '~/schema/geo-location';
export * from '~/schema/domain';
export * from '~/schema/audit-log';
