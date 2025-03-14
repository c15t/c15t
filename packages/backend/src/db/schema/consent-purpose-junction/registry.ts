import type { GenericEndpointContext, RegistryContext } from '~/types';
import type { PurposeJunction } from './schema';

import { getWithHooks } from '~/pkgs/data-model/hooks';
import { validateEntityOutput } from '../definition';

/**
 * Creates and returns a set of consent-purpose junction adapter methods to interact with the database.
 * These methods provide a consistent interface for creating, finding, and managing
 * relationships between consents and purposes while applying hooks and enforcing data validation rules.
 *
 * @param adapter - The database adapter used for direct database operations
 * @param ctx - The context object containing the database adapter, hooks, and options
 * @returns An object containing type-safe consent-purpose junction operations
 *
 * @example
 * ```typescript
 * const junctionAdapter = createConsentPurposeJunctionAdapter(
 *   databaseAdapter,
 *   createWithHooks,
 *   updateWithHooks,
 *   c15tOptions
 * );
 *
 * // Create a new junction record
 * const junction = await junctionAdapter.createConsentPurposeJunction({
 *   consentId: 'cns_hadt8w7nngm7xmx2bn',
 *   purposeId: 'pol_tioiyf19tbkm7xn5vpx',
 *   status: 'active'
 * });
 * ```
 */
export function consentPurposeJunctionRegistry({
	adapter,
	...ctx
}: RegistryContext) {
	const { createWithHooks, updateWithHooks } = getWithHooks(adapter, ctx);
	return {
		/**
		 * Creates a new consent-purpose junction record in the database.
		 * Automatically sets creation timestamp and applies any
		 * configured hooks during the creation process.
		 *
		 * @param junction - Junction data to create (without id and timestamp)
		 * @param context - Optional endpoint context for hooks
		 * @returns The created junction record with all fields populated
		 * @throws May throw an error if hooks prevent creation or if database operations fail
		 */
		createConsentPurposeJunction: async (
			junction: Omit<PurposeJunction, 'id' | 'createdAt' | 'status'> &
				Partial<PurposeJunction>,
			context?: GenericEndpointContext
		) => {
			const createdJunction = await createWithHooks({
				data: {
					createdAt: new Date(),

					...junction,
					status: 'active',
				},
				model: 'consentPurposeJunction',
				customFn: undefined,
				context,
			});

			if (!createdJunction) {
				throw new Error(
					'Failed to create consent-purpose junction - operation returned null'
				);
			}

			return createdJunction as PurposeJunction;
		},

		/**
		 * Finds all junction records for a specific consent.
		 * Returns junctions with processed output fields according to the schema configuration.
		 *
		 * @param consentId - The consent ID to find purposes for
		 * @returns Array of junction records associated with the consent
		 */
		findConsentPurposesByConsentId: async (consentId: string) => {
			const junctions = await adapter.findMany({
				model: 'consentPurposeJunction',
				where: [
					{
						field: 'consentId',
						value: consentId,
					},
				],
				sortBy: {
					field: 'createdAt',
					direction: 'desc',
				},
			});

			return junctions.map((junction) =>
				validateEntityOutput('consentPurposeJunction', junction, ctx.options)
			);
		},

		/**
		 * Finds all junction records for a specific consentPurpose.
		 * Returns junctions with processed output fields according to the schema configuration.
		 *
		 * @param purposeId - The consentPurpose ID to find consents for
		 * @returns Array of junction records associated with the consentPurpose
		 */
		findConsentPurposesByPurposeId: async (purposeId: string) => {
			const junctions = await adapter.findMany({
				model: 'consentPurposeJunction',
				where: [
					{
						field: 'purposeId',
						value: purposeId,
					},
				],
				sortBy: {
					field: 'createdAt',
					direction: 'desc',
				},
			});

			return junctions.map((junction) =>
				validateEntityOutput('consentPurposeJunction', junction, ctx.options)
			);
		},

		/**
		 * Updates a junction record's status.
		 * Applies any configured hooks during the update process and
		 * processes the output according to schema configuration.
		 *
		 * @param junctionId - The unique identifier of the junction to update
		 * @param status - The new status value ('active' or 'withdrawn')
		 * @param context - Optional endpoint context for hooks
		 * @returns The updated junction if successful, null if not found or hooks prevented update
		 */
		updateConsentPurposeJunction: async (
			junctionId: string,
			status: 'active' | 'withdrawn',
			context?: GenericEndpointContext
		) => {
			const junction = await updateWithHooks({
				data: {
					status,
					updatedAt: new Date(),
				},
				where: [
					{
						field: 'id',
						value: junctionId,
					},
				],
				model: 'consentPurposeJunction',
				customFn: undefined,
				context,
			});
			return junction
				? validateEntityOutput('consentPurposeJunction', junction, ctx.options)
				: null;
		},

		/**
		 * Deletes all junction records for a specific consent.
		 * This effectively removes all consentPurpose connections for the consent.
		 *
		 * @param consentId - The ID of the consent to remove all consentPurpose connections for
		 * @returns True if successful, false otherwise
		 */
		deleteConsentPurposeJunctionsByConsentId: async (consentId: string) => {
			try {
				await adapter.deleteMany({
					model: 'consentPurposeJunction',
					where: [
						{
							field: 'consentId',
							value: consentId,
						},
					],
				});
				return true;
			} catch (error) {
				ctx.logger.error('Error deleting consent-purpose junctions:', error);
				return false;
			}
		},
	};
}
