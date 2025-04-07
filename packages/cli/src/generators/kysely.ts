import { getMigrations } from '@c15t/backend/pkgs/migrations';
import type { SchemaGenerator } from './types';

// Table definition regex for create table statements
const CREATE_TABLE_REGEX = /create\s+table\s+"([^"]+)"\s+\((.*)\)/i;

// Table definition regex for create index statements
const CREATE_INDEX_REGEX =
	/create\s+index\s+"?([^"\s]+)"?\s+on\s+"?([^"\s]+)"?/i;

// SQL keyword regex patterns for boolean, date, and text fields
const NOT_NULL_REGEX = /\bnot null\b/gi;
const PRIMARY_KEY_REGEX = /\bprimary key\b/gi;
const REFERENCES_REGEX = /\breferences\b/gi;
const UNIQUE_REGEX = /\bunique\b/gi;

// SQL statement type regex patterns for other statements
const CREATE_TABLE_KEYWORD_REGEX = /\bcreate\s+table\b/gi;
const CREATE_INDEX_KEYWORD_REGEX = /\bcreate\s+index\b/gi;
const ALTER_TABLE_REGEX = /\balter\s+table\b/gi;
const INSERT_INTO_REGEX = /\binsert\s+into\b/gi;
const UPDATE_REGEX = /\bupdate\b/gi;
const DELETE_FROM_REGEX = /\bdelete\s+from\b/gi;
const SELECT_REGEX = /\bselect\b/gi;
const FROM_REGEX = /\bfrom\b/gi;
const WHERE_REGEX = /\bwhere\b/gi;
const JOIN_REGEX = /\bjoin\b/gi;
const ON_REGEX = /\bon\b/gi;
const AND_REGEX = /\band\b/gi;
const OR_REGEX = /\bor\b/gi;

// Database-specific regex patterns for boolean, date, and text fields
const BOOLEAN_FIELD_REGEX = /("is[A-Z][a-zA-Z0-9]*")\s+integer/g;
const DATE_FIELD_REGEX = /("(?:created|updated|expires)At")\s+date/gi;
const TEXT_FIELD_REGEX = /("(?:name|code|description|id)")\s+text/gi;

// Regex pattern for potentially JSON fields (metadata, config, data, settings, etc.)
const JSON_FIELD_REGEX =
	/("(?:metadata|config|data|settings|options|preferences|attributes)")\s+text/gi;

/**
 * Format SQL statements for better readability and robustness
 * @param sql The raw SQL string
 * @param databaseType The database type (sqlite, pg/postgresql, mysql)
 * @param options Additional formatting options
 * @param options.timestamp Optional fixed timestamp to use instead of generating one (useful for tests)
 * @returns Formatted SQL with proper indentation and spacing, wrapped in a transaction
 */
function formatSQL(
	sql: string,
	databaseType = 'sqlite',
	options?: { timestamp?: string }
): string {
	// Normalize database type
	const dbType = databaseType === 'pg' ? 'postgresql' : databaseType;

	// Split by semicolons to get individual statements
	const statements = sql.split(';').filter((stmt) => stmt.trim());

	// Create rollback statements (in reverse order)
	const rollbackStatements: string[] = [];

	// Format individual statements
	const formattedStatements = statements
		.map((statement) => {
			const trimmedStmt = statement.trim().toLowerCase();

			// Process create table statements
			if (trimmedStmt.startsWith('create table')) {
				// Extract table name and columns part
				const match = statement.match(CREATE_TABLE_REGEX);

				if (match) {
					const [_, tableName, columnsStr] = match;
					if (!columnsStr) {
						return `${statement.trim()};`;
					}

					// Add DROP TABLE to rollback statements
					rollbackStatements.unshift(`DROP TABLE IF EXISTS "${tableName}"`);

					// Format columns with proper indentation and grouping
					const columns = columnsStr.split(',').map((col) => col.trim());

					// Process each column for better formatting
					const formattedColumns = columns
						.map((col) => {
							// Start with basic keyword capitalization
							let formattedCol = col
								.replace(NOT_NULL_REGEX, 'NOT NULL')
								.replace(PRIMARY_KEY_REGEX, 'PRIMARY KEY')
								.replace(REFERENCES_REGEX, 'REFERENCES')
								.replace(UNIQUE_REGEX, 'UNIQUE');

							// Apply database-specific type transformations
							if (dbType === 'postgresql') {
								// Convert integer booleans to actual boolean type
								formattedCol = formattedCol
									.replace(BOOLEAN_FIELD_REGEX, '$1 boolean')
									// Convert date to timestamp
									.replace(DATE_FIELD_REGEX, '$1 timestamp with time zone')
									// PostgreSQL prefers text with explicit lengths for VARCHAR fields
									.replace(TEXT_FIELD_REGEX, '$1 varchar(255)')
									// Convert potential JSON fields to JSONB
									.replace(JSON_FIELD_REGEX, '$1 jsonb');
							} else if (dbType === 'mysql') {
								// MySQL booleans are TINYINT(1)
								formattedCol = formattedCol
									.replace(BOOLEAN_FIELD_REGEX, '$1 TINYINT(1)')
									// Date/time fields in MySQL
									.replace(DATE_FIELD_REGEX, '$1 DATETIME')
									// MySQL prefers VARCHAR with length for text fields
									.replace(TEXT_FIELD_REGEX, '$1 VARCHAR(255)')
									// Convert potential JSON fields to JSON
									.replace(JSON_FIELD_REGEX, '$1 JSON');
							}
							// SQLite is flexible with types, so we keep it as is
							// But add JSON checks and comment for clarity
							else if (dbType === 'sqlite') {
								// Add comment for json fields to indicate special handling
								formattedCol = formattedCol.replace(
									JSON_FIELD_REGEX,
									'$1 text -- stored as JSON'
								);
							}

							return formattedCol;
						})
						.map((col) => `  ${col}`)
						.join(',\n');

					// Return formatted CREATE TABLE statement with capitalized keywords and IF NOT EXISTS
					return `CREATE TABLE IF NOT EXISTS "${tableName}" (\n${formattedColumns}\n);`;
				}
			}

			// Handle other statement types (indexes, constraints, etc.)
			if (trimmedStmt.startsWith('create index')) {
				const indexMatch = statement.match(CREATE_INDEX_REGEX);
				if (indexMatch) {
					const [_, indexName] = indexMatch;
					rollbackStatements.unshift(`DROP INDEX IF EXISTS "${indexName}"`);
					return `CREATE INDEX IF NOT EXISTS "${indexName}" ${statement.substring(statement.toLowerCase().indexOf('on')).trim()};`;
				}
			}

			// Return any statements that don't match specific patterns, but capitalize common SQL keywords
			return `${statement
				.trim()
				.replace(CREATE_TABLE_KEYWORD_REGEX, 'CREATE TABLE')
				.replace(CREATE_INDEX_KEYWORD_REGEX, 'CREATE INDEX')
				.replace(ALTER_TABLE_REGEX, 'ALTER TABLE')
				.replace(INSERT_INTO_REGEX, 'INSERT INTO')
				.replace(UPDATE_REGEX, 'UPDATE')
				.replace(DELETE_FROM_REGEX, 'DELETE FROM')
				.replace(SELECT_REGEX, 'SELECT')
				.replace(FROM_REGEX, 'FROM')
				.replace(WHERE_REGEX, 'WHERE')
				.replace(JOIN_REGEX, 'JOIN')
				.replace(ON_REGEX, 'ON')
				.replace(AND_REGEX, 'AND')
				.replace(OR_REGEX, 'OR')};`;
		})
		.join('\n\n');

	// Database-specific transaction syntax
	// Only use transactions for non-D1 databases
	const useTransactions = dbType !== 'd1';
	let transactionStart = '';
	if (useTransactions) {
		if (dbType === 'mysql') {
			transactionStart = 'START TRANSACTION;';
		} else {
			transactionStart = 'BEGIN;';
		}
	}
	const transactionEnd = useTransactions ? 'COMMIT;' : '';

	// Generate timestamp for the migration, or use the provided one
	const timestamp = options?.timestamp || new Date().toISOString();

	// Construct the final migration file with header, migration, and rollback
	return `-- Migration generated by C15T (${timestamp})
-- Database type: ${dbType}
-- Description: Automatically generated schema migration
-- 
-- Wrapped in a transaction for atomicity
-- To roll back this migration, use the ROLLBACK section below

${transactionStart}
-- MIGRATION
${formattedStatements}
${transactionEnd}

-- ROLLBACK
-- Uncomment the section below to roll back this migration
/*
${transactionStart}

${rollbackStatements.join(';\n\n')};\n
${transactionEnd}
*/`;
}

interface DatabaseOptions {
	database?: {
		options?: {
			provider?: string;
			[key: string]: unknown;
		};
	};
}

/**
 * Generates SQL migration files for Kysely
 *
 * @param options - The configuration options
 * @param file - Optional output file path
 * @param adapter - Database adapter
 * @returns Object containing formatted SQL code and filename
 */
export const generateMigrations: SchemaGenerator = async ({
	options,
	file,
	adapter,
}) => {
	const { compileMigrations } = await getMigrations(options);
	const migrations = await compileMigrations();

	// Determine database type from adapter or options
	let databaseType = 'sqlite'; // Default to sqlite

	// Try to get from adapter first
	if (adapter?.options?.provider) {
		databaseType = adapter.options.provider;
	}
	// If not found in adapter, try to get from options
	else {
		const dbOptions = (options as DatabaseOptions).database?.options;
		if (dbOptions?.provider) {
			databaseType = dbOptions.provider;
		}
	}

	// Check if we're in a test environment or have a test timestamp
	const isTest = process.env.NODE_ENV === 'test' || file?.includes('test');
	// Check for test timestamp in options (allow custom property for tests)
	const testTimestamp = (options as { _testTimestamp?: string })
		?._testTimestamp;
	const formatOptions = {
		timestamp:
			testTimestamp || (isTest ? '2023-01-01T00:00:00.000Z' : undefined),
	};

	// Format the SQL for better readability
	const formattedMigrations = formatSQL(
		migrations,
		databaseType,
		formatOptions
	);

	// Generate filename with timestamp if not provided
	const generatedFileName =
		file || `./c15t_migrations/${Date.now()}_create_tables.sql`;

	return {
		code: formattedMigrations,
		fileName: generatedFileName,
	};
};
