import { getWithHooks } from '~/pkgs/data-model';
import type { Where } from '~/pkgs/db-adapters';
import type { GenericEndpointContext, RegistryContext } from '~/pkgs/types';
import { validateEntityOutput } from '../definition';
import type { ConsentRecord } from './schema';

/**
 * Creates and returns a set of consent record-related adapter methods to interact with the database.
 * These methods provide a consistent interface for creating and querying consent records
 * while applying hooks and enforcing data validation rules.
 *
 * @param adapter - The database adapter used for direct database operations
 * @param ctx - The context object containing the database adapter, hooks, and options
 * @returns An object containing type-safe consent record operations
 *
 * @example
 * ```typescript
 * const recordAdapter = createRecordAdapter(
 *   databaseAdapter,
 *   createWithHooks,
 *   c15tOptions
 * );
 *
 * // Create a new consent record
 * const record = await recordAdapter.createConsentRecord({
 *   subjectId: 'sub_x1pftyoufsm7xgo1kv',
 *   consentId: 'cns_hadt8w7nngm7xmx2bn',
 *   actionType: 'given',
 *   details: { ip: '192.168.1.1', userAgent: 'Mozilla/5.0...' }
 * });
 * ```
 */
export function consentRecordRegistry({ adapter, ...ctx }: RegistryContext) {
	const { createWithHooks } = getWithHooks(adapter, ctx);
	return {
		/**
		 * Creates a new consent record in the database.
		 * Automatically sets creation timestamp and applies any
		 * configured hooks during the creation process.
		 *
		 * @param record - Consent record data to create (without id and timestamp)
		 * @param context - Optional endpoint context for hooks
		 * @returns The created consent record with all fields populated
		 * @throws May throw an error if hooks prevent creation or if database operations fail
		 */
		createConsentRecord: async (
			record: Omit<ConsentRecord, 'id' | 'createdAt' | 'updatedAt'> &
				Partial<ConsentRecord>,
			context?: GenericEndpointContext
		) => {
			const createdRecord = await createWithHooks({
				data: {
					createdAt: record.createdAt || new Date(),
					updatedAt: record.updatedAt || new Date(),
					...record,
				},
				model: 'consentRecord',
				customFn: undefined,
				context,
			});

			if (!createdRecord) {
				throw new Error(
					'Failed to create consent record - operation returned null'
				);
			}

			return createdRecord as ConsentRecord;
		},

		/**
		 * Finds all consent records matching specified filters.
		 * Returns records with processed output fields according to the schema configuration.
		 *
		 * @param subjectId - Optional subject ID to filter records
		 * @param consentId - Optional consent ID to filter records
		 * @param actionType - Optional action type to filter records
		 * @param limit - Optional maximum number of records to return
		 * @returns Array of consent records matching the criteria
		 */
		findConsentRecords: async (
			subjectId?: string,
			consentId?: string,
			actionType?: string,
			limit?: number
		) => {
			const whereConditions: Where<'consentRecord'> = [];

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

			if (actionType) {
				whereConditions.push({
					field: 'actionType',
					value: actionType,
				});
			}

			const records = await adapter.findMany({
				model: 'consentRecord',
				where: whereConditions,
				sortBy: {
					field: 'createdAt',
					direction: 'desc',
				},
				limit,
			});

			return records.map((record) =>
				validateEntityOutput('consentRecord', record, ctx.options)
			);
		},

		/**
		 * Finds a consent record by its unique ID.
		 * Returns the record with processed output fields according to the schema configuration.
		 *
		 * @param recordId - The unique identifier of the consent record
		 * @returns The consent record object if found, null otherwise
		 */
		findConsentRecordById: async (recordId: string) => {
			const record = await adapter.findOne({
				model: 'consentRecord',
				where: [
					{
						field: 'id',
						value: recordId,
					},
				],
			});
			return record
				? validateEntityOutput('consentRecord', record, ctx.options)
				: null;
		},

		/**
		 * Finds all consent records for a specific subject.
		 * Returns records with processed output fields according to the schema configuration.
		 *
		 * @param subjectId - The subject ID to find consent records for
		 * @param limit - Optional maximum number of records to return
		 * @returns Array of consent records associated with the subject
		 */
		findConsentRecordsBySubjectId: async (
			subjectId: string,
			limit?: number
		) => {
			const records = await adapter.findMany({
				model: 'consentRecord',
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
			return records.map((record) =>
				validateEntityOutput('consentRecord', record, ctx.options)
			);
		},

		/**
		 * Finds all consent records for a specific consent.
		 * Returns records with processed output fields according to the schema configuration.
		 *
		 * @param consentId - The consent ID to find records for
		 * @param limit - Optional maximum number of records to return
		 * @returns Array of consent records associated with the consent
		 */
		findConsentRecordsByConsentId: async (
			consentId: string,
			limit?: number
		) => {
			const records = await adapter.findMany({
				model: 'consentRecord',
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
				limit,
			});
			return records.map((record) =>
				validateEntityOutput('consentRecord', record, ctx.options)
			);
		},
	};
}
