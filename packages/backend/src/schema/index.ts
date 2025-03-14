/**
 * Schema Module for c15t Consent Management System
 *
 * This module serves as the central hub for database schema definitions, validation,
 * and transformation utilities used throughout the c15t system. It defines the structure
 * of all database tables and provides tools to work with schema-compliant data.
 *
 * @remarks
 * The Schema Module is organized into three main components:
 *
 * 1. Table Definitions - Individual table schemas (subject, consent, consentPurpose, etc.)
 * 2. Schema Utilities - Functions for retrieving and working with the complete schema
 * 3. Data Parsing - Validation and transformation of input/output data
 *
 * These components work together to provide a type-safe, consistent interface for
 * interacting with the database, regardless of which database adapter is used.
 *
 * @example
 * ```typescript
 * import {
 *   getConsentTables,
 *   parseInputData,
 *   type C15TDBSchema
 * } from '@c15t/core/db/schema';
 *
 * // Get the complete schema
 * const tables = getConsentTables(options);
 *
 * // Validate input data against the subject table schema
 * const validSubjectData = parseInputData(
 *   inputData,
 *   { fields: tables.subject.fields }
 * );
 * ```
 */

// Table Definition Exports
/**
 * Table definitions for core c15t entities
 *
 * These exports provide the schema definitions for each table in the c15t database.
 * Each table definition includes field specifications, relationships, and metadata.
 */
export * from './audit-log';
export * from './consent-geo-location';
export * from './consent-policy';
export * from './consent-purpose-junction';
export * from './consent-purpose';
export * from './consent-record';
export * from './consent-withdrawal';
export * from './consent';
export * from './domain';
export * from './geo-location';
export * from './subject';

// Schema Type Exports
/**
 * Type definitions for database schema configuration
 *
 * These exports provide interfaces for configuring database entities
 * and are used throughout the application for type-safe schema definition.
 *
 * @see {@link BaseEntityConfig} - Base configuration for all entities
 * @see {@link TablesConfig} - Configuration for all database tables
 */
export * from './types';

// Schema Utility Exports
/**
 * Schema utilities for working with the complete database schema
 *
 * These exports provide functions for retrieving the complete schema and
 * working with table definitions at a higher level.
 *
 * @see {@link getConsentTables} - Main function to get the complete schema
 * @see {@link C15TDBSchema} - Type representing the complete database schema
 */
export { getConsentTables, type C15TDBSchema } from './definition';

// Schemas export
export * from './schemas';
