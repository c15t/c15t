import type { BaseEntityConfig } from '../types';

/**
 * Consent geo location entity configuration
 * @default entityName: "consentGeoLocation", entityPrefix: "cgl"
 */
export interface ConsentGeoLocationEntityConfig extends BaseEntityConfig {
	fields?: Record<string, string> & {
		id?: string;
		/**
		 * Indicates if the domain is a pattern (e.g., "true"/"false")
		 * When true, the domain string will be interpreted as a pattern
		 */
		consentId?: string;
		/**
		 * Foreign key to geo-location entity (should be indexed)
		 */
		geoLocationId?: string;
		createdAt?: string;
	};
}
