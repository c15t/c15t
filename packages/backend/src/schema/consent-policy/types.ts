import type { BaseEntityConfig } from '../types';

/**
 * Consent policy entity configuration
 * @default entityName: "consentPolicy", entityPrefix: "pol"
 */
export interface ConsentPolicyEntityConfig extends BaseEntityConfig {
	fields?: Record<string, string> & {
		id?: string;
		version?: string;
		name?: string;
		/**
		 * ISO format date string (e.g., "2024-04-15T00:00:00Z")
		 */
		effectiveDate?: string;
		/**
		 * ISO format date string (e.g., "2024-04-15T00:00:00Z")
		 */
		expirationDate?: string;
		content?: string;
		contentHash?: string;
		isActive?: string;
		/**
		 * ISO format date string (e.g., "2024-04-15T00:00:00Z")
		 */
		createdAt?: string;
	};
}
