/**
 * Core types for ORM bridges
 *
 * This file provides type definitions to replace the missing imports from external sources
 */

// Basic type for entity name
export type EntityName = string;

// Basic type for entity input
export type EntityInput<T extends EntityName> = Record<string, any>;

// Basic options type to replace C15TOptions
export interface CoreOptions {
	entities?: Record<string, any>;
	config?: {
		adapter?: string;
		[key: string]: any;
	};
	[key: string]: any;
}

// Simplified field types
export type Primitive = string | number | boolean | Date | null | undefined;

export interface Field {
	defaultValue?: any;
	type?: string;
	[key: string]: any;
}

// Mock schema type
export interface DBSchema {
	[key: string]: {
		fields: Record<string, any>;
	};
}

// KyselyAdapterConfig replacement
export interface KyselyAdapterConfig {
	dialect?: string;
	[key: string]: any;
}

// Generate ID function
export function generateId(prefix?: string): string {
	const random = Math.random().toString(36).substring(2, 15);
	return prefix ? `${prefix}_${random}` : random;
}
