import type { Where, GenericEndpointContext, RegistryContext } from '~/types';
import type { Consent } from './schema';
import type {} from '~/db/hooks/types';
import { getWithHooks } from '~/db/hooks';
import { validateEntityOutput } from '../definition';

/**
 * Creates and returns a set of consent-related adapter methods to interact with the database.
 * These methods provide a consistent interface for creating, finding, and updating
 * consent records while applying hooks and enforcing data validation rules.
 *
 * @param adapter - The database adapter used for direct database operations
 * @param ctx - The context object containing the database adapter, hooks, and options
 * @returns An object containing type-safe consent operations
 *
 * @example
 * ```typescript
 * const consentAdapter = createConsentAdapter(
 *   databaseAdapter,
 *   createWithHooks,
 *   updateWithHooks,
 *   c15tOptions
 * );
 *
 * // Create a new consent record
 * const consent = await consentAdapter.createConsent({
 *   userId: 'user-123',
 *   domainId: 'domain-456',
 *   purposeIds: ['purpose-789'],
 *   status: 'active'
 * });
 * ```
 */
export function consentRegistry({ adapter, ...ctx }: RegistryContext) {
	const { createWithHooks, updateWithHooks } = getWithHooks(adapter, ctx);
	return {
		/**
		 * Creates a new consent record in the database.
		 * Automatically sets creation timestamp and applies any
		 * configured hooks during the creation process.
		 *
		 * @param consent - Consent data to create (without id and timestamp)
		 * @param context - Optional endpoint context for hooks
		 * @returns The created consent with all fields populated
		 * @throws May throw an error if hooks prevent creation or if database operations fail
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
				throw new Error('Failed to create consent - operation returned null');
			}

			return createdConsent;
		},

		/**
		 * Finds all consents matching specified filters.
		 * Returns consents with processed output fields according to the schema configuration.
		 *
		 * @param userId - Optional user ID to filter consents
		 * @param domainId - Optional domain ID to filter consents
		 * @param purposeIds - Optional array of purpose IDs to filter consents
		 * @returns Array of consents matching the criteria
		 */
		findConsents: async (
			userId?: string,
			domainId?: string,
			purposeIds?: string[]
		) => {
			const whereConditions: Where<'consent'> = [];

			if (userId) {
				whereConditions.push({
					field: 'userId',
					value: userId,
				});
			}

			if (domainId) {
				whereConditions.push({
					field: 'domainId',
					value: domainId,
				});
			}

			if (purposeIds && purposeIds.length > 0) {
				whereConditions.push({
					field: 'purposeIds',
					operator: 'contains',
					value: purposeIds,
				});
			}

			const consents = await adapter.findMany({
				model: 'consent',
				where: whereConditions,
				sortBy: {
					field: 'createdAt',
					direction: 'desc',
				},
			});

			return consents.map((consent) =>
				validateEntityOutput('consent', consent, ctx.options)
			);
		},

		/**
		 * Finds a consent by its unique ID.
		 * Returns the consent with processed output fields according to the schema configuration.
		 *
		 * @param consentId - The unique identifier of the consent
		 * @returns The consent object if found, null otherwise
		 */
		findConsentById: async (consentId: string) => {
			const consent = await adapter.findOne({
				model: 'consent',
				where: [
					{
						field: 'id',
						value: consentId,
					},
				],
			});
			return consent
				? validateEntityOutput('consent', consent, ctx.options)
				: null;
		},

		/**
		 * Finds all consents for a specific user.
		 * Returns consents with processed output fields according to the schema configuration.
		 *
		 * @param userId - The user ID to find consents for
		 * @returns Array of consents associated with the user
		 */
		findConsentsByUserId: async (userId: string) => {
			const consents = await adapter.findMany({
				model: 'consent',
				where: [
					{
						field: 'userId',
						value: userId,
					},
				],
				sortBy: {
					field: 'createdAt',
					direction: 'desc',
				},
			});
			return consents.map((consent) =>
				validateEntityOutput('consent', consent, ctx.options)
			);
		},

		/**
		 * Updates an existing consent record by ID.
		 * Applies any configured hooks during the update process and
		 * processes the output according to schema configuration.
		 *
		 * @param consentId - The unique identifier of the consent to update
		 * @param data - The fields to update on the consent record
		 * @param context - Optional endpoint context for hooks
		 * @returns The updated consent if successful, null if not found or hooks prevented update
		 */
		updateConsent: async (
			consentId: string,
			data: Partial<Consent>,
			context?: GenericEndpointContext
		) => {
			const consent = await updateWithHooks<Consent>({
				data: {
					...data,
					updatedAt: new Date(),
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

		/**
		 * Updates consent status to withdrawn.
		 * Also records the withdrawal reason if provided.
		 *
		 * @param consentId - The unique identifier of the consent to update
		 * @param withdrawalReason - Optional reason for withdrawal
		 * @param context - Optional endpoint context for hooks
		 * @returns The updated consent with withdrawn status
		 */
		updateWithdrawal: async (
			consentId: string,
			withdrawalReason?: string,
			context?: GenericEndpointContext
		) => {
			const updateData: Partial<Consent> = {
				status: 'withdrawn',
				updatedAt: new Date(),
			};

			if (withdrawalReason) {
				updateData.withdrawalReason = withdrawalReason;
			}

			const consent = await updateWithHooks<Consent>({
				data: updateData,
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

		// revokeConsent: async ({
		// 	consentId,
		// 	reason,
		// 	actor,
		// 	metadata,
		// 	context,
		// }: {
		// 	consentId: string;
		// 	reason: string;
		// 	actor: string;
		// 	metadata?: Record<string, unknown>;
		// 	context?: GenericEndpointContext;
		// }) => {
		// 	// Mark consent as inactive
		// 	const updatedConsent = await consentAdapter.updateConsent(
		// 		consentId,
		// 		{
		// 			isActive: false,
		// 		},
		// 		context
		// 	);

		// 	if (!updatedConsent) {
		// 		return null;
		// 	}

		// 	// Create withdrawal record
		// 	const withdrawal = await withdrawalAdapter.createWithdrawal(
		// 		{
		// 			consentId,
		// 			withdrawalReason: reason,
		// 			withdrawalMethod: 'api',
		// 			actor,
		// 			metadata: metadata || {},
		// 		},
		// 		context
		// 	);

		// 	return {
		// 		consent: updatedConsent,
		// 		withdrawal,
		// 	};
		// },
	};
}
