/**
 * Database Schema Type Definitions
 *
 * This module contains base type definitions for database schema configuration.
 * These types define the common structure of entity configurations used throughout
 * the c15t consent management system.
 */
import type { Field } from '~/pkgs/data-model/fields';

import type { AuditLogEntityConfig } from './audit-log/types';
import type { ConsentGeoLocationEntityConfig } from './consent-geo-location/types';
import type { ConsentPolicyEntityConfig } from './consent-policy/types';
import type { ConsentPurposeJunctionEntityConfig } from './consent-purpose-junction/types';
import type { ConsentPurposeEntityConfig } from './consent-purpose/types';
import type { ConsentRecordEntityConfig } from './consent-record/types';
import type { ConsentWithdrawalEntityConfig } from './consent-withdrawal/types';
import type { ConsentEntityConfig } from './consent/types';
import type { DomainEntityConfig } from './domain/types';
import type { GeoLocationEntityConfig } from './geo-location/types';
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
	 * Geo location configuration
	 * @default entityName: "geoLocation", entityPrefix: "geo"
	 */
	geoLocation?: GeoLocationEntityConfig;

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
	 * ConsentPurpose junction configuration
	 * @default entityName: "consentPurposeJunction", entityPrefix: "pjx"
	 */
	consentPurposeJunction?: ConsentPurposeJunctionEntityConfig;

	/**
	 * Consent geo location configuration
	 * @default entityName: "consentGeoLocation", entityPrefix: "cgl"
	 */
	consentGeoLocation?: ConsentGeoLocationEntityConfig;

	/**
	 * Record entity configuration
	 * @default entityName: "record", entityPrefix: "rec"
	 */
	record?: ConsentRecordEntityConfig;

	/**
	 * Withdrawal configuration
	 * @default entityName: "consentWithdrawal", entityPrefix: "wdr"
	 */
	consentWithdrawal?: ConsentWithdrawalEntityConfig;

	/**
	 * Audit log configuration
	 * @default entityName: "auditLog", entityPrefix: "log"
	 */
	auditLog?: AuditLogEntityConfig;
}

export type { AuditLogEntityConfig } from './audit-log/types';
export type { ConsentEntityConfig } from './consent/types';
export type { ConsentGeoLocationEntityConfig } from './consent-geo-location/types';
export type { ConsentPolicyEntityConfig } from './consent-policy/types';
export type { ConsentPurposeEntityConfig } from './consent-purpose/types';
export type { ConsentPurposeJunctionEntityConfig } from './consent-purpose-junction/types';
export type { ConsentRecordEntityConfig } from './consent-record/types';
export type { ConsentWithdrawalEntityConfig } from './consent-withdrawal/types';
export type { DomainEntityConfig } from './domain/types';
export type { GeoLocationEntityConfig } from './geo-location/types';
export type { SubjectEntityConfig } from './subject/types';
