/**
 * ID field creation utilities with multiple generation strategies
 */
import { z } from 'zod';
import type { SchemaField } from '../schema.types';
import { createField } from './basic-fields';
import type { DatabaseHints } from './field-hints';

// ID type and generation options
export type IdType = 'uuid' | 'nanoid' | 'prefixed' | 'incremental' | 'custom';

export interface IdFieldOptions extends Partial<Omit<SchemaField, 'type'>> {
	idType?: IdType;
	prefix?: string;
	length?: number; // For nanoid
	generator?: () => string | number; // For custom generators
	incrementStart?: number; // For incremental IDs
	databaseHints?: DatabaseHints; // Custom database hints
}

// In-memory sequence counter for incremental IDs (would be replaced by DB sequence in production)
const sequences: Record<string, number> = {};

/**
 * Creates an ID field with various generation strategies
 *
 * @param options Configuration options for the ID field
 * @returns A schema field configured for the specified ID type
 *
 * @example
 * // UUID ID field
 * idField({ idType: 'uuid' })
 *
 * @example
 * // Prefixed ID field (e.g., "user_abc123")
 * idField({ idType: 'prefixed', prefix: 'user_' })
 *
 * @example
 * // Auto-incrementing numeric ID
 * idField({ idType: 'incremental', incrementStart: 1000 })
 */
export function idField<T extends IdType = 'prefixed'>(
	options?: IdFieldOptions & { idType?: T }
): SchemaField<string, T extends 'incremental' ? number : string> {
	const {
		idType = 'prefixed' as T,
		prefix = '',
		length = 10,
		generator,
		incrementStart = 1,
		databaseHints: customHints,
		...rest
	} = options || {};

	// Determine the field type based on ID type
	const fieldType = idType === 'incremental' ? 'number' : 'string';

	// Create validator based on ID type
	let validator;
	switch (idType) {
		case 'uuid':
			validator = z.string().uuid();
			break;
		case 'nanoid':
			validator = z.string().length(length);
			break;
		case 'prefixed':
			validator = z.string().startsWith(prefix);
			break;
		case 'incremental':
			validator = z.number().int().positive();
			break;
		case 'custom':
			// Custom validators can be provided in options
			validator = options?.validator || z.string();
			break;
		default:
			validator = z.string();
	}

	// ID generator function
	const generateId = () => {
		switch (idType) {
			case 'uuid':
				// Dynamically import uuid to avoid direct dependency
				try {
					// In a real implementation, you might want to use a more efficient approach
					// than dynamic imports, depending on your bundling strategy
					const { v4: uuidv4 } = require('uuid');
					return `${prefix}${uuidv4()}`;
				} catch (e) {
					console.warn('uuid package not found, using fallback random ID');
					return `${prefix}${Math.random().toString(36).substring(2, 15)}`;
				}
			case 'nanoid':
			case 'prefixed':
				try {
					const { nanoid } = require('nanoid');
					return `${prefix}${nanoid(length)}`;
				} catch (e) {
					console.warn('nanoid package not found, using fallback random ID');
					return `${prefix}${Math.random()
						.toString(36)
						.substring(2, 2 + length)}`;
				}
			case 'incremental':
				const entityName = options?.generator ? 'custom' : 'default';
				if (!sequences[entityName]) {
					sequences[entityName] = incrementStart;
				}
				return sequences[entityName]++;
			case 'custom':
				return generator
					? generator()
					: `${prefix}${Math.random().toString(36).substring(2, 15)}`;
		}
	};

	// Generate database hints based on ID type
	const databaseHints: DatabaseHints = {
		// Common hints for all ID types
		indexed: true,
		unique: true,
		primaryKey: true,

		// Type-specific hints
		...(() => {
			switch (idType) {
				case 'uuid':
					return {
						storageType: 'uuid',
						// SQLite doesn't have a native UUID type
						sqlite: { type: 'TEXT' },
						// MySQL doesn't have a native UUID type either
						mysql: { type: 'CHAR(36)' },
						// Postgres has a native UUID type
						postgres: { type: 'UUID' },
					};

				case 'incremental':
					return {
						storageType: 'numeric',
						sqlite: {
							type: 'INTEGER',
							autoIncrement: true,
						},
						mysql: {
							type: 'BIGINT',
							unsigned: true,
							autoIncrement: true,
						},
						postgres: {
							useSerial: true,
							type: 'BIGSERIAL',
						},
					};

				case 'nanoid':
				case 'prefixed':
					return {
						storageType: 'text',
						typicalSize: 'small',
						maxSize: prefix.length + length,
						sqlite: { type: 'TEXT' },
						mysql: { type: `VARCHAR(${prefix.length + length})` },
						postgres: { type: `VARCHAR(${prefix.length + length})` },
					};

				case 'custom':
				default:
					return {
						storageType: fieldType === 'number' ? 'numeric' : 'text',
						sqlite: {
							type: fieldType === 'number' ? 'INTEGER' : 'TEXT',
						},
						mysql: {
							type: fieldType === 'number' ? 'BIGINT' : 'VARCHAR(255)',
						},
						postgres: {
							type: fieldType === 'number' ? 'BIGINT' : 'VARCHAR(255)',
						},
					};
			}
		})(),

		// Merge with any custom hints provided
		...customHints,
	};

	return createField(fieldType as any, {
		required: true,
		defaultValue: generateId,
		validator,
		primaryKey: true,
		databaseHints,
		description: `Unique identifier (${idType} format)`,
		...rest,
	}) as SchemaField<string, T extends 'incremental' ? number : string>;
}

/**
 * Creates a UUID-based ID field
 *
 * @param options Additional options for the ID field
 * @returns A schema field configured for UUID generation
 */
export function uuidField(
	options?: Omit<IdFieldOptions, 'idType'>
): SchemaField<string, string> {
	return idField({ idType: 'uuid', ...options });
}

/**
 * Creates a prefixed ID field (useful for resource types)
 *
 * @param prefix The prefix to add to the ID (e.g., 'user_', 'order_')
 * @param options Additional options for the ID field
 * @returns A schema field configured for prefixed ID generation
 */
export function prefixedIdField(
	prefix: string,
	options?: Omit<IdFieldOptions, 'idType' | 'prefix'>
): SchemaField<string, string> {
	return idField({ idType: 'prefixed', prefix, ...options });
}

/**
 * Creates an incremental numeric ID field
 *
 * @param startFrom The number to start incrementing from
 * @param options Additional options for the ID field
 * @returns A schema field configured for incremental ID generation
 */
export function incrementalIdField(
	startFrom = 1,
	options?: Omit<IdFieldOptions, 'idType' | 'incrementStart'>
): SchemaField<string, number> {
	return idField({
		idType: 'incremental',
		incrementStart: startFrom,
		...options,
	});
}
