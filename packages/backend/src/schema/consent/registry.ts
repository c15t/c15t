import { getWithHooks } from '~/pkgs/data-model';
import { DoubleTieError, ERROR_CODES } from '~/pkgs/results';
import type { GenericEndpointContext, RegistryContext } from '~/pkgs/types';

import { validateEntityOutput } from '../definition';
import type { Consent } from './schema';

/**
 * Creates and returns a set of consent-related adapter methods to interact with the database.
 * These methods provide a consistent interface for creating, finding, and updating
 * consent records while applying hooks and enforcing data validation rules.
 *
 * The consent registry manages user consent records, tracking permissions granted by subjects
 * for specific purposes within domains. It ensures proper creation and modification of consent
 * records while maintaining data integrity and audit trails.
 *
 * @param params - Registry context parameters
 * @param params.adapter - The database adapter used for direct database operations
 * @param params.ctx - Additional context properties containing hooks and options
 * @returns An object containing type-safe consent operations
 *
 * @example
 * ```ts
 * const registry = consentRegistry({
 *   adapter: databaseAdapter,
 *   hooks: customHooks,
 *   options: validationOptions
 * });
 *
 * // Create and manage consent records
 * const consent = await registry.createConsent({
 *   subjectId: 'sub_x1pftyoufsm7xgo1kv',
 *   domainId: 'dom_x1pftyoufsm7xgo1kv',
 *   purposeIds: ['pur_e8zyhgozr3im7xj59it'],
 *   status: 'active'
 * });
 * ```
 *
 * @see {@link RegistryContext} For details on the context parameters
 * @see {@link Consent} For the structure of consent objects
 */
export function consentRegistry({ adapter, ...ctx }: RegistryContext) {
	const { createWithHooks, updateWithHooks } = getWithHooks(adapter, ctx);
	const registry = {
		/**
		 * Creates a new consent record in the database.
		 *
		 * This method creates a new consent record representing a subject's permission
		 * for specific purposes within a domain. It automatically sets the creation
		 * timestamp and applies any configured hooks during the creation process.
		 *
		 * @param consent - Consent data to create (without id and timestamp)
		 * @param consent.subjectId - Unique identifier of the subject giving consent
		 * @param consent.domainId - Domain identifier where the consent applies
		 * @param consent.purposeIds - Array of purpose identifiers covered by this consent
		 * @param consent.status - Current status of the consent (e.g., 'active', 'withdrawn')
		 * @param context - Optional endpoint context for hooks execution
		 * @returns Promise resolving to the created consent with all fields populated
		 * @throws {Error} When the creation operation fails or returns null
		 * @throws May also throw errors if hooks prevent creation or if validation fails
		 *
		 * @example
		 * ```ts
		 * // Create a new active consent
		 * const newConsent = await registry.createConsent({
		 *   subjectId: 'sub_abc123',
		 *   domainId: 'dom_xyz789',
		 *   purposeIds: ['pur_marketing', 'pur_analytics'],
		 *   status: 'active',
		 *   metadata: {
		 *     source: 'web_form',
		 *     ipAddress: '192.168.1.1'
		 *   }
		 * });
		 * ```
		 *
		 * @see {@link Consent} For the complete structure of consent objects
		 * @see {@link GenericEndpointContext} For details on the context object
		 */
		createConsent: async (
			consent: Omit<Consent, 'id' | 'createdAt'> & Partial<Consent>,
			context?: GenericEndpointContext
		) => {
			const createdConsent = await createWithHooks({
				data: {
					createdAt: new Date(),
					...consent,
				},
				model: 'consent',
				context,
			});

			if (!createdConsent) {
				throw new DoubleTieError(
					'Failed to create consent - operation returned null',
					{
						code: ERROR_CODES.INTERNAL_SERVER_ERROR,
						status: 500,
					}
				);
			}

			return createdConsent as Consent;
		},

		/**
		 * Updates an existing consent record by ID.
		 *
		 * This method modifies an existing consent record, typically used for
		 * status changes (e.g., withdrawing consent) or metadata updates.
		 * Applies configured hooks during the update process and validates
		 * the output according to schema configuration.
		 *
		 * @param consentId - The unique identifier of the consent to update
		 * @param data - The fields to update on the consent record
		 * @param data.status - New status for the consent
		 * @param data.metadata - Updated metadata information
		 * @param data.purposeIds - Modified list of purpose identifiers
		 * @param context - Optional endpoint context for hooks execution
		 * @returns Promise resolving to the updated consent if successful, null if not found
		 * @throws May throw errors if hooks prevent update or if validation fails
		 *
		 * @example
		 * ```ts
		 * // Withdraw a consent
		 * const updatedConsent = await registry.updateConsent(
		 *   'cns_abc123',
		 *   {
		 *     status: 'withdrawn',
		 *     metadata: {
		 *       withdrawalReason: 'User request',
		 *       withdrawalDate: new Date()
		 *     }
		 *   }
		 * );
		 *
		 * // Update purposes for an active consent
		 * const modifiedConsent = await registry.updateConsent(
		 *   'cns_xyz789',
		 *   {
		 *     purposeIds: ['pur_marketing'], // Remove analytics purpose
		 *     metadata: {
		 *       modificationReason: 'User preference update'
		 *     }
		 *   }
		 * );
		 * ```
		 *
		 * @see {@link Consent} For the complete structure of consent objects
		 * @see {@link GenericEndpointContext} For details on the context object
		 */
		updateConsent: async (
			consentId: string,
			data: Partial<Consent>,
			context?: GenericEndpointContext
		) => {
			const consent = await updateWithHooks<Consent>({
				data: {
					...data,
				},
				where: [
					{
						field: 'id',
						value: consentId,
					},
				],
				model: 'consent',
				context,
			});
			return consent
				? validateEntityOutput('consent', consent, ctx.options)
				: null;
		},
	};

	return registry;
}
