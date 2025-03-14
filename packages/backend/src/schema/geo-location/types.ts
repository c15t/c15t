import type { BaseEntityConfig } from '../types';

/**
 * Geo location entity configuration
 * @default entityName: "geoLocation", entityPrefix: "geo"
 */
export interface GeoLocationEntityConfig extends BaseEntityConfig {
	fields?: Record<string, string> & {
		id?: string;
		countryCode?: string;
		countryName?: string;
		regionCode?: string;
		regionName?: string;
		// For comma-separated values
		regulatoryZones?: string;
		createdAt?: string;
	};
}
