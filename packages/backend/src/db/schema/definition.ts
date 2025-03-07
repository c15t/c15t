import type { C15TOptions } from '~/types';
import type { PluginSchema } from '../core/types';
import {
	getAuditLogTable,
	getConsentGeoLocationTable,
	getConsentPolicyTable,
	getConsentTable,
	getDomainTable,
	getGeoLocationTable,
	getPurposeJunctionTable,
	getPurposeTable,
	// getGeoLocationTable,
	getRecordTable,
	getUserTable,
	getWithdrawalTable,
} from './index';
import type { InferTableShape } from './schemas';

/**
 * Retrieves all consent-related database table definitions
 *
 * This function combines the core tables with any additional tables
 * defined by plugins. It handles merging plugin-defined fields with
 * the standard tables and ensures all table definitions are properly
 * structured for use by database adapters.
 *
 * @param options - The c15t configuration options
 * @returns A complete schema mapping containing all table definitions
 *
 * @remarks
 * Each table definition includes both field definitions and the physical
 * entity name used in the database. Plugins can extend core tables by
 * defining additional fields, which will be merged with the standard fields.
 *
 * @example
 * ```typescript
 * // Get all tables with default configuration
 * const tables = getConsentTables(options);
 *
 * // Access fields for the consent table
 * const consentFields = tables.consent.fields;
 * ```
 */
export const getConsentTables = (options: C15TOptions) => {
	const pluginSchema = options.plugins?.reduce((acc, plugin) => {
		const schema = plugin.schema;
		if (!schema) {
			return acc;
		}
		for (const [key, value] of Object.entries(schema)) {
			acc[key] = {
				fields: {
					...acc[key]?.fields,
					...value.fields,
				},
				entityName: value.entityName || key,
			};
		}
		return acc;
	}, {} as PluginSchema);

	const {
		user,
		purpose,
		consentPolicy,
		domain,
		geoLocation,
		consent,
		purposeJunction,
		record,
		consentGeoLocation,
		withdrawal,
		auditLog,
		...pluginTables
	} = pluginSchema || {};

	return {
		user: getUserTable(options, user?.fields),
		purpose: getPurposeTable(options, purpose?.fields),
		consentPolicy: getConsentPolicyTable(options, consentPolicy?.fields),
		domain: getDomainTable(options, domain?.fields),
		consent: getConsentTable(options, consent?.fields),
		purposeJunction: getPurposeJunctionTable(options, purposeJunction?.fields),
		record: getRecordTable(options, record?.fields),
		consentGeoLocation: getConsentGeoLocationTable(
			options,
			consentGeoLocation?.fields
		),
		withdrawal: getWithdrawalTable(options, withdrawal?.fields),
		auditLog: getAuditLogTable(options, auditLog?.fields),
		geoLocation: getGeoLocationTable(options, geoLocation?.fields),
		...pluginTables,
	};
};

/**
 * Type representing the complete database schema for c15t
 *
 * This type captures the full structure of all tables in the database,
 * including core tables and any plugin-defined tables. It's derived from
 * the return type of `getConsentTables()`.
 *
 * @remarks
 * This is a key type for type-safety throughout the codebase, as it
 * ensures that table names and field references are validated at compile time.
 * It's used as a basis for many other type definitions in the database layer.
 *
 * @example
 * ```typescript
 * // Type-safe reference to a specific table
 * function processTable<TableName extends keyof C15TDBSchema>(
 *   tableName: TableName,
 *   data: Record<string, unknown>
 * ) {
 *   const tableFields = getConsentTables(options)[tableName].fields;
 *   // Process with type safety...
 * }
 * ```
 */
export type C15TDBSchema = ReturnType<typeof getConsentTables>;

/**
 * Type to get all output fields of a table by its name
 * This type extracts only the fields that are included in output operations,
 * automatically excluding fields marked with { returned: false }.
 * It also resolves relationships between tables.
 */
export type EntityOutputFields<TableName extends keyof C15TDBSchema> =
	InferTableShape<TableName>;

/**
 * Type to get all input fields of a table by its name
 * This type extracts only the fields that are allowed for input operations,
 * automatically excluding fields marked with { input: false }.
 */
export type EntityInputFields<TableName extends keyof C15TDBSchema> = Omit<
	InferTableShape<TableName>,
	'id' | 'createdAt' | 'updatedAt'
>;

/**
 * Validates output data against table schema using Zod
 *
 * This function validates and transforms output data according to the
 * schema definition for a specific table. It ensures that all values match
 * their expected types and excludes fields marked as not to be returned.
 *
 * @typeParam TableName - The table name from C15TDBSchema
 * @param tableName - The name of the table to validate against
 * @param data - The data to validate
 * @param options - The C15TOptions instance
 * @returns Validated and typed data
 * @throws {Error} If the table is not found or validation fails
 *
 * @remarks
 * This function is particularly useful for validating data received from
 * external sources or database adapters before processing it in application logic.
 *
 * @example
 * ```typescript
 * // Validate data retrieved from an external API
 * try {
 *   const validUserOutput = validateEntityOutput(
 *     'user',
 *     fetchedUserData,
 *     options
 *   );
 *
 *   // validUserOutput is now typed as EntityOutputFields<'user'>
 *   displayUserProfile(validUserOutput);
 * } catch (error) {
 *   console.error('Output validation failed:', error.message);
 * }
 * ```
 */
export function validateEntityOutput<TableName extends keyof C15TDBSchema>(
	tableName: TableName,
	data: Record<string, unknown>,
	options: C15TOptions
): EntityOutputFields<TableName> {
	const tables = getConsentTables(options);
	const table = tables[tableName];

	if (!table) {
		throw new Error(`Table ${tableName} not found`);
	}

	// Validate and return data using Zod schema
	return table.schema.parse(data) as EntityOutputFields<TableName>;
}
