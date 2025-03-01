import type { GenericEndpointContext, RegistryContext } from '~/types';
import { parseConsentPolicyOutput, type ConsentPolicy } from './schema';
import { getWithHooks } from '~/db/hooks';

/**
 * Creates and returns a set of consent policy-related adapter methods to interact with the database.
 * These methods provide a consistent interface for creating, finding, and updating
 * consent policy records while applying hooks and enforcing data validation rules.
 *
 * @param adapter - The database adapter used for direct database operations
 * @param ctx - The context object containing the database adapter, hooks, and options
 * @returns An object containing type-safe consent policy operations
 *
 * @example
 * ```typescript
 * const policyAdapter = createConsentPolicyAdapter(
 *   databaseAdapter,
 *   createWithHooks,
 *   updateWithHooks,
 *   c15tOptions
 * );
 *
 * // Create a new consent policy
 * const policy = await policyAdapter.createConsentPolicy({
 *   version: '1.0.0',
 *   name: 'Privacy Policy 2023',
 *   effectiveDate: new Date(),
 *   content: 'Full policy text...',
 *   contentHash: 'sha256-hash-of-content'
 * });
 * ```
 */
export function policyRegistry({ adapter, ...ctx }: RegistryContext) {
	const { createWithHooks, updateWithHooks } = getWithHooks(adapter, ctx);
	return {
		/**
		 * Creates a new consent policy record in the database.
		 * Automatically sets creation timestamp and applies any
		 * configured hooks during the creation process.
		 *
		 * @param policy - Policy data to create (without id and timestamp)
		 * @param context - Optional endpoint context for hooks
		 * @returns The created policy with all fields populated
		 * @throws May throw an error if hooks prevent creation or if database operations fail
		 */
		createConsentPolicy: async (
			policy: Omit<ConsentPolicy, 'id' | 'createdAt'> & Partial<ConsentPolicy>,
			context?: GenericEndpointContext
		) => {
			const createdPolicy = await createWithHooks({
				data: {
					createdAt: new Date(),
					// isActive: true,
					...policy,
				},
				model: 'consentPolicy',
				context,
			});

			if (!createdPolicy) {
				throw new Error(
					'Failed to create consent policy - operation returned null'
				);
			}

			return createdPolicy as ConsentPolicy;
		},

		/**
		 * Finds all active consent policies.
		 * Returns policies with processed output fields according to the schema configuration.
		 *
		 * @returns Array of active consent policies sorted by effective date
		 */
		findActiveConsentPolicies: async () => {
			const policies = await adapter.findMany<ConsentPolicy>({
				model: 'consentPolicy',
				where: [
					{
						field: 'isActive',
						value: true,
					},
				],
				sortBy: {
					field: 'effectiveDate',
					direction: 'desc',
				},
			});

			return policies.map((policy) =>
				parseConsentPolicyOutput(ctx.options, policy)
			);
		},

		/**
		 * Finds a consent policy by its unique ID.
		 * Returns the policy with processed output fields according to the schema configuration.
		 *
		 * @param policyId - The unique identifier of the policy
		 * @returns The policy object if found, null otherwise
		 */
		findConsentPolicyById: async (policyId: string) => {
			const policy = await adapter.findOne<ConsentPolicy>({
				model: 'consentPolicy',
				where: [
					{
						field: 'id',
						value: policyId,
					},
				],
			});
			return policy ? parseConsentPolicyOutput(ctx.options, policy) : null;
		},

		/**
		 * Finds a consent policy by its version string.
		 * Returns the policy with processed output fields according to the schema configuration.
		 *
		 * @param version - The version string of the policy
		 * @returns The policy object if found, null otherwise
		 */
		findConsentPolicyByVersion: async (version: string) => {
			const policy = await adapter.findOne<ConsentPolicy>({
				model: 'consentPolicy',
				where: [
					{
						field: 'version',
						value: version,
					},
				],
			});
			return policy ? parseConsentPolicyOutput(ctx.options, policy) : null;
		},

		/**
		 * Updates an existing consent policy record by ID.
		 * Applies any configured hooks during the update process and
		 * processes the output according to schema configuration.
		 *
		 * @param policyId - The unique identifier of the policy to update
		 * @param data - The fields to update on the policy record
		 * @param context - Optional endpoint context for hooks
		 * @returns The updated policy if successful, null if not found or hooks prevented update
		 */
		updateConsentPolicy: async (
			policyId: string,
			data: Partial<ConsentPolicy>,
			context?: GenericEndpointContext
		) => {
			const policy = await updateWithHooks<
				Partial<ConsentPolicy>,
				ConsentPolicy
			>({
				data,
				where: [
					{
						field: 'id',
						value: policyId,
					},
				],
				model: 'consentPolicy',
				customFn: undefined,
				context,
			});
			return policy ? parseConsentPolicyOutput(ctx.options, policy) : null;
		},
	};
}
