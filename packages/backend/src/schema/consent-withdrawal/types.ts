import type { BaseEntityConfig } from '../types';

/**
 * Withdrawal entity configuration
 * @default entityName: "consentWithdrawal", entityPrefix: "wdr"
 */
export interface ConsentWithdrawalEntityConfig extends BaseEntityConfig {
	fields?: Record<string, string> & {
		id?: string;
		consentId?: string;
		revokedAt?: string;
		revocationReason?: string;
		method?: string;
		actor?: string;
		metadata?: string;
		createdAt?: string;
	};

	/**
	 * Prevent multiple consentWithdrawals for the same consent
	 *
	 * If true, a subject can only have one consentWithdrawal record per consent,
	 * preventing multiple revocation records for the same consent.
	 * This helps maintain data integrity and clearer consent history.
	 *
	 * @default false
	 */
	preventMultipleWithdrawals?: boolean;
}
