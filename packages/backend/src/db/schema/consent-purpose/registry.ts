import { getWithHooks } from '~/db/hooks';
import { Where } from '~/pkgs/db-adapters/types';
import type { GenericEndpointContext, RegistryContext } from '~/types';
import { validateEntityOutput } from '../definition';
import type { ConsentPurpose } from './schema';

/**
 * Creates and returns a set of consent consentPurpose-related adapter methods to interact with the database.
 * These methods provide a consistent interface for creating, finding, and updating
 * consent consentPurpose records while applying hooks and enforcing data validation rules.
 *
 * @param adapter - The database adapter used for direct database operations
 * @param ctx - The context object containing the database adapter, hooks, and options
 * @returns An object containing type-safe consent consentPurpose operations
 *
 * @example
 * ```typescript
 * const purposeAdapter = createConsentPurposeAdapter(
 *   databaseAdapter,
 *   createWithHooks,
 *   updateWithHooks,
 *   c15tOptions
 * );
 *
 * // Create a new consent consentPurpose
 * const consentPurpose = await purposeAdapter.createConsentPurpose({
 *   code: 'pur_e8zyhgozr3im7xj59it',
 *   name: 'Marketing Communications',
 *   description: 'Allow us to send you marketing materials',
 *   isEssential: false
 * });
 * ```
 */
export function consentPurposeRegistry({ adapter, ...ctx }: RegistryContext) {
	const { createWithHooks, updateWithHooks } = getWithHooks(adapter, ctx);
	return {
		/**
		 * Creates a new consent consentPurpose record in the database.
		 * Automatically sets creation and update timestamps and applies any
		 * configured hooks during the creation process.
		 *
		 * @param consentPurpose - ConsentPurpose data to create (without id and timestamps)
		 * @param context - Optional endpoint context for hooks
		 * @returns The created consentPurpose with all fields populated
		 * @throws May throw an error if hooks prevent creation or if database operations fail
		 */
		createConsentPurpose: async (
			consentPurpose: Omit<ConsentPurpose, 'id' | 'createdAt' | 'updatedAt'> &
				Partial<ConsentPurpose>,
			context?: GenericEndpointContext
		) => {
			const createdPurpose = await createWithHooks({
				data: {
					id: consentPurpose.id || '',
					createdAt: new Date(),
					updatedAt: new Date(),
					...consentPurpose,
				},
				model: 'consentPurpose',
				context,
			});

			if (!createdPurpose) {
				throw new Error(
					'Failed to create consent consentPurpose - operation returned null'
				);
			}

			return validateEntityOutput(
				'consentPurpose',
				createdPurpose,
				ctx.options
			);
		},

		/**
		 * Finds all consent purposes, optionally including inactive ones.
		 * Returns purposes with processed output fields according to the schema configuration.
		 *
		 * @param includeInactive - Whether to include inactive purposes (default: false)
		 * @returns Array of consent purposes matching the criteria
		 */
		findConsentPurposes: async (includeInactive?: boolean) => {
			const whereConditions: Where<'consentPurpose'> = [];

			if (!includeInactive) {
				whereConditions.push({
					field: 'isActive',
					value: true,
				});
			}

			const purposes = await adapter.findMany({
				model: 'consentPurpose',
				where: whereConditions,
				sortBy: {
					field: 'createdAt',
					direction: 'asc',
				},
			});

			return purposes.map((consentPurpose) =>
				validateEntityOutput('consentPurpose', consentPurpose, ctx.options)
			);
		},

		/**
		 * Finds a consent consentPurpose by its unique ID.
		 * Returns the consentPurpose with processed output fields according to the schema configuration.
		 *
		 * @param purposeId - The unique identifier of the consentPurpose
		 * @returns The consentPurpose object if found, null otherwise
		 */
		findConsentPurposeById: async (purposeId: string) => {
			const consentPurpose = await adapter.findOne({
				model: 'consentPurpose',
				where: [
					{
						field: 'id',
						value: purposeId,
					},
				],
			});
			return consentPurpose
				? validateEntityOutput('consentPurpose', consentPurpose, ctx.options)
				: null;
		},

		/**
		 * Finds a consent consentPurpose by its unique code.
		 * Returns the consentPurpose with processed output fields according to the schema configuration.
		 *
		 * @param code - The unique code of the consentPurpose
		 * @returns The consentPurpose object if found, null otherwise
		 */
		findConsentPurposeByCode: async (code: string) => {
			const consentPurpose = await adapter.findOne({
				model: 'consentPurpose',
				where: [
					{
						field: 'code',
						value: code,
					},
				],
			});
			return consentPurpose
				? validateEntityOutput('consentPurpose', consentPurpose, ctx.options)
				: null;
		},

		/**
     * 
		/**
     * 
		 * Updates an existing consent consentPurpose record by ID.
		 * Applies any configured hooks during the update process and
		 * processes the output according to schema configuration.
		 *
		 * @param purposeId - The unique identifier of the consentPurpose to update
		 * @param data - The fields to update on the consentPurpose record
		 * @param context - Optional endpoint context for hooks
		 * @returns The updated consentPurpose if successful, null if not found or hooks prevented update
		 */
		updateConsentPurpose: async (
			purposeId: string,
			data: Partial<ConsentPurpose>,
			context?: GenericEndpointContext
		) => {
			const consentPurpose = await updateWithHooks({
				data: {
					...data,
					updatedAt: new Date(),
				},
				where: [
					{
						field: 'id',
						value: purposeId,
					},
				],
				model: 'consentPurpose',
				context,
			});
			return consentPurpose
				? validateEntityOutput('consentPurpose', consentPurpose, ctx.options)
				: null;
		},
	};
}
