import { createHash } from 'node:crypto';

import { getWithHooks } from '~/pkgs/data-model/hooks';
import { Where } from '~/pkgs/db-adapters';
import type { GenericEndpointContext, RegistryContext } from '~/types';
import { validateEntityOutput } from '../definition';
import type { ConsentPolicy } from './schema';

export interface FindPolicyParams {
	domainId?: string;
	version?: string;
	includeInactive?: boolean;
}

/**
 * Generates placeholder content for a policy with its hash.
 *
 * @param name - Policy name
 * @param date - Generation date
 * @returns Object containing content and contentHash
 */
function generatePolicyPlaceholder(name: string, date: Date) {
	const content = `[PLACEHOLDER] This is an automatically generated version of the ${name} policy.\n\nThis placeholder content should be replaced with actual policy terms before being presented to users.\n\nGenerated on: ${date.toISOString()}`;
	const contentHash = createHash('sha256').update(content).digest('hex');
	return { content, contentHash };
}

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
	const registry = {
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

		findPolicies: async (params: FindPolicyParams = {}) => {
			const whereConditions: Where<'consentPolicy'> = [];

			if (!params.includeInactive) {
				whereConditions.push({
					field: 'isActive',
					value: true,
				});
			}

			if (params.domainId) {
				whereConditions.push({
					field: 'id',
					value: params.domainId,
				});
			}

			if (params.version) {
				whereConditions.push({
					field: 'version',
					value: params.version,
				});
			}

			const policies = await adapter.findMany({
				model: 'consentPolicy',
				where: whereConditions,
				sortBy: {
					field: 'effectiveDate',
					direction: 'desc',
				},
			});

			return policies.map((policy) =>
				validateEntityOutput('consentPolicy', policy, ctx.options)
			);
		},

		findPolicy: async (domainId: string, version?: string) => {
			const policies = await registry.findPolicies({ domainId, version });
			return policies[0] || null;
		},

		/**
		 * Finds all active consent policies.
		 * Returns policies with processed output fields according to the schema configuration.
		 *
		 * @returns Array of active consent policies sorted by effective date
		 */
		findActiveConsentPolicies: async () => {
			const policies = await adapter.findMany({
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
				validateEntityOutput('consentPolicy', policy, ctx.options)
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
			const policy = await adapter.findOne({
				model: 'consentPolicy',
				where: [
					{
						field: 'id',
						value: policyId,
					},
				],
			});
			return policy
				? validateEntityOutput('consentPolicy', policy, ctx.options)
				: null;
		},

		/**
		 * Finds a consent policy by its version string.
		 * Returns the policy with processed output fields according to the schema configuration.
		 *
		 * @param version - The version string of the policy
		 * @returns The policy object if found, null otherwise
		 */
		findConsentPolicyByVersion: async (version: string) => {
			const policy = await adapter.findOne({
				model: 'consentPolicy',
				where: [
					{
						field: 'version',
						value: version,
					},
				],
			});
			return policy
				? validateEntityOutput('consentPolicy', policy, ctx.options)
				: null;
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
			return policy
				? validateEntityOutput('consentPolicy', policy, ctx.options)
				: null;
		},

		/**
		 * Finds the latest active policy or creates a new one if none exists.
		 * Uses a database transaction to prevent race conditions in multi-threaded environments.
		 *
		 * If multiple active policies with the same name exist, returns the most recent one
		 * based on effectiveDate. When creating a new policy, it assigns version '1.0.0'
		 * and generates placeholder content with a SHA-256 hash.
		 *
		 * @param name - The name of the policy to find/create
		 * @returns The policy object
		 * @throws {Error} If the transaction fails to complete
		 */
		findOrCreatePolicy: async (name: string) => {
			// Normalize name for comparison
			const normalizedSearchName = name.toLowerCase().trim();

			// Use a transaction to prevent race conditions
			return adapter.transaction({
				callback: async (txAdapter) => {
					const now = new Date();
					const txRegistry = policyRegistry({
						adapter: txAdapter,
						...ctx,
					});

					// Find latest policy with exact name match directly from database
					const matchingPolicies = await txAdapter.findMany({
						model: 'consentPolicy',
						where: [
							{ field: 'isActive', value: true },
							{
								field: 'name',
								value: normalizedSearchName,
								operator: 'ilike',
							},
						],
						sortBy: {
							field: 'effectiveDate',
							direction: 'desc',
						},
						limit: 1,
					});

					const latestPolicy = matchingPolicies[0]
						? validateEntityOutput(
								'consentPolicy',
								matchingPolicies[0],
								ctx.options
							)
						: null;

					if (latestPolicy) {
						return latestPolicy;
					}

					// Generate policy content and hash
					const { content: defaultContent, contentHash } =
						generatePolicyPlaceholder(name, now);

					return txRegistry.createConsentPolicy({
						version: '1.0.0',
						name: normalizedSearchName,
						effectiveDate: now,
						content: defaultContent,
						contentHash,
						isActive: true,
						updatedAt: now,
						expirationDate: null,
					});
				},
			});
		},
	};

	return registry;
}
