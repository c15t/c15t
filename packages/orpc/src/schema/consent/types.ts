/**
 * Consent Entity Type Definitions
 *
 * This module contains type definitions specific to the consent entity.
 */
import type { BaseEntityConfig } from '../types';

/**
 * Consent entity configuration
 * @default entityName: "consent", entityPrefix: "cns"
 */
export interface ConsentEntityConfig extends BaseEntityConfig {
	/**
	 * Default expiration for consent in seconds
	 * @default 31536000 (1 year)
	 */
	expiresIn?: number;

	/**
	 * Time in seconds before refreshing consent data
	 * @default 86400 (24 hours)
	 */
	updateAge?: number;

	fields?: Record<string, string> & {
		id?: string;
		subjectId?: string;
		domainId?: string;
		purposeIds?: string;
		metadata?: string;
		policyId?: string;
		ipAddress?: string;
		userAgent?: string;
		status?: string;
		withdrawalReason?: string;
		givenAt?: string;
		validUntil?: string;
	};
}
