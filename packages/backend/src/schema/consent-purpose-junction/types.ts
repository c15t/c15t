import type { BaseEntityConfig } from '../types';

/**
 * ConsentPurpose junction entity configuration
 * @default entityName: "consentPurposeJunction", entityPrefix: "pjx"
 */
export interface ConsentPurposeJunctionEntityConfig extends BaseEntityConfig {
	fields?: Record<string, string> & {
		id?: string;
		consentId?: string;
		purposeId?: string;
		isAccepted?: string;
	};
}
