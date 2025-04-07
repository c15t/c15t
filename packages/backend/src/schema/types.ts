/**
 * Database Schema Type Definitions
 *
 * This module contains base type definitions for database schema configuration.
 * These types define the common structure of entity configurations used throughout
 * the c15t consent management system.
 */
import type { Field } from '~/pkgs/data-model';

import type { AuditLogEntityConfig } from './audit-log/types';
import type { ConsentPolicyEntityConfig } from './consent-policy/types';
import type { ConsentPurposeEntityConfig } from './consent-purpose/types';
import type { ConsentRecordEntityConfig } from './consent-record/types';
import type { ConsentEntityConfig } from './consent/types';
import type { DomainEntityConfig } from './domain/types';
import type { SubjectEntityConfig } from './subject/types';

/**
 * Base entity configuration shared by all entities
 * Provides common configuration options for database entities
 */
export interface BaseEntityConfig {
	/**
	 * Custom model name for the entity table
	 */
	entityName?: string;

	/**
	 * The ID prefix for the entity table
	 * Used to generate unique prefixed IDs
	 */
	entityPrefix?: string;

	/**
	 * Custom field names for the entity table
	 */
	fields?: Record<string, string>;

	/**
	 * Additional fields for the entity table
	 */
	additionalFields?: Record<string, Field>;
}

/**
 * Entity configuration with standard timestamps
 * Extends base configuration with created/updated timestamp fields
 */
export interface TimestampedEntityConfig extends BaseEntityConfig {
	fields?: Record<string, string> & {
		createdAt?: string;
		updatedAt?: string;
	};
}

/**
 * Entity configuration for entities with active status
 * Extends timestamped configuration with isActive field
 */
export interface ActiveEntityConfig extends TimestampedEntityConfig {
	fields?: Record<string, string> & {
		createdAt?: string;
		updatedAt?: string;
		isActive?: string;
	};
}

/**
 * Database tables configuration
 * Contains all entity table configurations in one unified object
 */
export interface TablesConfig {
	/**
	 * Subject entity configuration
	 * @default entityName: "subject", entityPrefix: "sub"
	 */
	subject?: SubjectEntityConfig;

	/**
	 * Domain configuration
	 * @default entityName: "domain", entityPrefix: "dom"
	 */
	domain?: DomainEntityConfig;

	/**
	 * ConsentPurpose entity configuration
	 * @default entityName: "consentPurpose", entityPrefix: "pur"
	 */
	consentPurpose?: ConsentPurposeEntityConfig;

	/**
	 * Consent policy configuration
	 * @default entityName: "consentPolicy", entityPrefix: "pol"
	 */
	consentPolicy?: ConsentPolicyEntityConfig;

	/**
	 * Consent configuration
	 * @default entityName: "consent", entityPrefix: "cns"
	 */
	consent?: ConsentEntityConfig;

	/**
	 * Record entity configuration
	 * @default entityName: "record", entityPrefix: "rec"
	 */
	record?: ConsentRecordEntityConfig;
	/**
	 * Audit log configuration
	 * @default entityName: "auditLog", entityPrefix: "log"
	 */
	auditLog?: AuditLogEntityConfig;
}

export type { AuditLogEntityConfig } from './audit-log/types';
export type { ConsentEntityConfig } from './consent/types';
export type { ConsentPolicyEntityConfig } from './consent-policy/types';
export type { ConsentPurposeEntityConfig } from './consent-purpose/types';
export type { ConsentRecordEntityConfig } from './consent-record/types';
export type { DomainEntityConfig } from './domain/types';
export type { SubjectEntityConfig } from './subject/types';
