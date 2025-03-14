import { getWithHooks } from '~/pkgs/data-model';
import { Where } from '~/pkgs/db-adapters';
import type { GenericEndpointContext, RegistryContext } from '~/pkgs/types';
import { validateEntityOutput } from '../definition';
import type { Withdrawal } from './schema';

/**
 * Creates and returns a set of consent withdrawal adapter methods to interact with the database.
 * These methods provide a consistent interface for creating and querying consentWithdrawal records
 * while applying hooks and enforcing data validation rules.
 *
 * @param adapter - The database adapter used for direct database operations
 * @param ctx - The context object containing the database adapter, hooks, and options
 * @returns An object containing type-safe consent withdrawal operations
 *
 * @example
 * ```typescript
 * const withdrawalAdapter = createConsentWithdrawalAdapter(
 *   databaseAdapter,
 *   createWithHooks,
 *   c15tOptions
 * );
 *
 * // Create a new consentWithdrawal record
 * const consentWithdrawal = await withdrawalAdapter.createConsentWithdrawal({
 *   consentId: 'cns_hadt8w7nngm7xmx2bn',
 *   subjectId: 'sub_x1pftyoufsm7xgo1kv',
 *   withdrawalReason: 'No longer wish to receive marketing emails',
 *   withdrawalMethod: 'subject-initiated'
 * });
 * ```
 */
export function consentWithdrawalRegistry({
	adapter,
	...ctx
}: RegistryContext) {
	const { createWithHooks } = getWithHooks(adapter, ctx);
	return {
		/**
		 * Creates a new consent withdrawal record in the database.
		 * Automatically sets creation timestamp and applies any
		 * configured hooks during the creation process.
		 *
		 * @param consentWithdrawal - Withdrawal data to create (without id and timestamp)
		 * @param context - Optional endpoint context for hooks
		 * @returns The created consentWithdrawal record with all fields populated
		 * @throws May throw an error if hooks prevent creation or if database operations fail
		 */
		createConsentWithdrawal: async (
			consentWithdrawal: Omit<Withdrawal, 'id' | 'createdAt'> &
				Partial<Withdrawal>,
			context?: GenericEndpointContext
		) => {
			const createdWithdrawal = await createWithHooks({
				data: {
					createdAt: new Date(),
					...consentWithdrawal,
				},
				model: 'consentWithdrawal',
				customFn: undefined,
				context,
			});

			if (!createdWithdrawal) {
				throw new Error(
					'Failed to create consent withdrawal - operation returned null'
				);
			}

			return validateEntityOutput(
				'consentWithdrawal',
				createdWithdrawal,
				ctx.options
			);
		},

		/**
		 * Finds all consentWithdrawal records matching specified filters.
		 * Returns consentWithdrawals with processed output fields according to the schema configuration.
		 *
		 * @param subjectId - Optional subject ID to filter consentWithdrawals
		 * @param consentId - Optional consent ID to filter consentWithdrawals
		 * @param limit - Optional maximum number of records to return
		 * @returns Array of consentWithdrawal records matching the criteria
		 */
		findConsentWithdrawals: async (
			subjectId?: string,
			consentId?: string,
			limit?: number
		) => {
			const whereConditions: Where<'consentWithdrawal'> = [];

			if (subjectId) {
				whereConditions.push({
					field: 'subjectId',
					value: subjectId,
				});
			}

			if (consentId) {
				whereConditions.push({
					field: 'consentId',
					value: consentId,
				});
			}

			const consentWithdrawals = await adapter.findMany({
				model: 'consentWithdrawal',
				where: whereConditions,
				sortBy: {
					field: 'createdAt',
					direction: 'desc',
				},
				limit,
			});

			return consentWithdrawals.map((consentWithdrawal) =>
				validateEntityOutput(
					'consentWithdrawal',
					consentWithdrawal,
					ctx.options
				)
			);
		},

		/**
		 * Finds a consentWithdrawal record by its unique ID.
		 * Returns the consentWithdrawal with processed output fields according to the schema configuration.
		 *
		 * @param withdrawalId - The unique identifier of the consentWithdrawal record
		 * @returns The consentWithdrawal object if found, null otherwise
		 */
		findConsentWithdrawalById: async (withdrawalId: string) => {
			const consentWithdrawal = await adapter.findOne({
				model: 'consentWithdrawal',
				where: [
					{
						field: 'id',
						value: withdrawalId,
					},
				],
			});
			return consentWithdrawal
				? validateEntityOutput(
						'consentWithdrawal',
						consentWithdrawal,
						ctx.options
					)
				: null;
		},

		/**
		 * Finds all consentWithdrawal records for a specific subject.
		 * Returns consentWithdrawals with processed output fields according to the schema configuration.
		 *
		 * @param subjectId - The subject ID to find consentWithdrawals for
		 * @param limit - Optional maximum number of records to return
		 * @returns Array of consentWithdrawal records associated with the subject
		 */
		findConsentWithdrawalsBySubjectId: async (
			subjectId: string,
			limit?: number
		) => {
			const consentWithdrawals = await adapter.findMany({
				model: 'consentWithdrawal',
				where: [
					{
						field: 'subjectId',
						value: subjectId,
					},
				],
				sortBy: {
					field: 'createdAt',
					direction: 'desc',
				},
				limit,
			});
			return consentWithdrawals.map((consentWithdrawal) =>
				validateEntityOutput(
					'consentWithdrawal',
					consentWithdrawal,
					ctx.options
				)
			);
		},

		/**
		 * Finds a consentWithdrawal record for a specific consent.
		 * Returns the consentWithdrawal with processed output fields according to the schema configuration.
		 * This is useful when you need to know if and why a specific consent was withdrawn.
		 *
		 * @param consentId - The consent ID to find consentWithdrawal for
		 * @returns The consentWithdrawal record if found, null otherwise
		 */
		findConsentWithdrawalByConsentId: async (consentId: string) => {
			const consentWithdrawal = await adapter.findOne({
				model: 'consentWithdrawal',
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
			return consentWithdrawal
				? validateEntityOutput(
						'consentWithdrawal',
						consentWithdrawal,
						ctx.options
					)
				: null;
		},
	};
}
