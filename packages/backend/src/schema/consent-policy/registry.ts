import { createHash } from 'node:crypto';

import { getWithHooks } from '~/pkgs/data-model';
import type { Where } from '~/pkgs/db-adapters';
import type { GenericEndpointContext, RegistryContext } from '~/pkgs/types';

import { validateEntityOutput } from '../definition';
import type { ConsentPolicy, PolicyType } from './schema';
import { DoubleTieError, ERROR_CODES } from '~/pkgs/results';

/**
 * Generates placeholder content for a policy with its hash.
 *
 * Creates standardized temporary content for a consent policy, which includes a warning
 * that it should be replaced with actual policy terms. Also generates a SHA-256 hash
 * of this content for integrity verification.
 *
 * @param name - Policy name to include in the placeholder text
 * @param date - Generation date to include in the placeholder text
 * @returns Object containing the generated placeholder content and its SHA-256 hash
 * @returns {Object} result - Result object
 * @returns {string} result.content - Generated placeholder content
 * @returns {string} result.contentHash - SHA-256 hash of the generated content
 *
 * @example
 * ```ts
 * const { content, contentHash } = generatePolicyPlaceholder('Privacy Policy', new Date());
 * console.log(content); // "[PLACEHOLDER] This is an automatically generated version..."
 * console.log(contentHash); // "a1b2c3d4..." (SHA-256 hash)
 * ```
 *
 * @internal Used by findOrCreatePolicy to initialize placeholder content
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
 * The returned registry object contains methods for common operations on consent policies,
 * including creation, retrieval, and conditional creation. All methods validate their
 * inputs and outputs according to the schema configuration.
 *
 * @param params - Registry context parameters
 * @param params.adapter - The database adapter used for direct database operations
 * @param params.ctx - Additional context properties containing hooks and options
 * @returns An object containing type-safe consent policy operations
 *
 * @example
 * ```typescript
 * const registry = policyRegistry({
 *   adapter: databaseAdapter,
 *   hooks: customHooks,
 *   options: validationOptions
 * });
 *
 * // Use the registry methods
 * const policy = await registry.findOrCreatePolicy('privacy');
 * ```
 *
 * @see {@link RegistryContext} For details on the context parameters
 * @see {@link ConsentPolicy} For the structure of policy objects
 */
export function policyRegistry({ adapter, ...ctx }: RegistryContext) {
	const { createWithHooks } = getWithHooks(adapter, ctx);
	const registry = {
		/**
		 * Creates a new consent policy record in the database.
		 * Automatically sets creation timestamp and applies any
		 * configured hooks during the creation process.
		 *
		 * This method validates the provided policy data, assigns a creation timestamp,
		 * and stores it in the database. It uses the configured hooks system to allow
		 * for customization of the creation process.
		 *
		 * @param policy - Policy data to create (without id and timestamp)
		 * @param context - Optional endpoint context for hooks execution
		 * @returns Promise resolving to the created policy with all fields populated
		 * @throws {Error} When the creation operation fails or returns null
		 * @throws May also throw errors if hooks prevent creation or if database operations fail
		 *
		 * @example
		 * ```ts
		 * const newPolicy = await policyRegistry.createConsentPolicy({
		 *   version: '1.0.0',
		 *   type: 'privacy',
		 *   name: 'Privacy Policy',
		 *   effectiveDate: new Date(),
		 *   content: 'Full policy text...',
		 *   contentHash: 'sha256-hash-of-content',
		 *   isActive: true,
		 *   updatedAt: new Date(),
		 *   expirationDate: null
		 * });
		 * ```
		 *
		 * @see {@link ConsentPolicy} For the structure of the policy object
		 * @see {@link GenericEndpointContext} For details on the context object
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
				throw new DoubleTieError(
					'Failed to create consent policy - operation returned null',
					{
						code: ERROR_CODES.INTERNAL_SERVER_ERROR,
						status: 500,
					}
				);
			}

			return createdPolicy as ConsentPolicy;
		},

		/**
		 * Retrieves consent policies from the database based on provided filter parameters.
		 *
		 * This method queries the database for consent policies matching the specified criteria.
		 * By default, only active policies are returned unless specifically requested otherwise.
		 * Results are sorted by effective date in descending order (newest first).
		 *
		 * @param params - Optional parameters to filter the policies
		 * @param params.domainId - Optional domain identifier to filter policies by domain
		 * @param params.version - Optional version string to filter policies by specific version
		 * @param params.includeInactive - When true, includes inactive policies in the results
		 * @returns Promise resolving to an array of validated consent policy objects
		 *
		 * @example
		 * ```ts
		 * // Get all active policies
		 * const activePolicies = await policyRegistry.findPolicies();
		 *
		 * // Get all policies including inactive ones
		 * const allPolicies = await policyRegistry.findPolicies({ includeInactive: true });
		 *
		 * // Get active policies for a specific version
		 * const specificVersionPolicies = await policyRegistry.findPolicies({
		 *   version: '2.0.0'
		 * });
		 * ```
		 *
		 * @see {@link ConsentPolicy} For the structure of returned policy objects
		 */
		findPolicies: async (
			params: {
				domainId?: string;
				version?: string;
				includeInactive?: boolean;
			} = {}
		) => {
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

		/**
		 * Finds a consent policy by its unique ID.
		 * Returns the policy with processed output fields according to the schema configuration.
		 *
		 * This method queries the database for a single consent policy that matches the provided ID.
		 * The resulting policy is validated against the schema before being returned.
		 *
		 * @param policyId - The unique identifier of the policy to find
		 * @returns Promise resolving to the validated policy object if found, null otherwise
		 *
		 * @example
		 * ```ts
		 * // Find a policy by ID
		 * const policy = await policyRegistry.findConsentPolicyById('policy-123');
		 * if (policy) {
		 *   console.log(`Found policy: ${policy.name}, version ${policy.version}`);
		 * } else {
		 *   console.log('Policy not found');
		 * }
		 * ```
		 *
		 * @see {@link ConsentPolicy} For the structure of the returned policy object
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
		 * Finds the latest active policy or creates a new one if none exists.
		 * Uses a database transaction to prevent race conditions in multi-threaded environments.
		 *
		 * If multiple active policies with the same type exist, returns the most recent one
		 * based on effectiveDate. When creating a new policy, it assigns version '1.0.0'
		 * and generates placeholder content with a SHA-256 hash.
		 *
		 * @param type - The type of the policy to find/create (e.g., 'privacy', 'terms')
		 * @returns Promise resolving to the found or newly created policy object
		 * @throws {Error} If the database transaction fails to complete
		 *
		 * @example
		 * ```ts
		 * // Find or create a privacy policy
		 * const privacyPolicy = await policyRegistry.findOrCreatePolicy('privacy');
		 *
		 * // Find or create a terms of service policy
		 * const termsPolicy = await policyRegistry.findOrCreatePolicy('terms');
		 * ```
		 *
		 * @see {@link PolicyType} For the available policy types
		 * @see {@link ConsentPolicy} For the structure of the returned policy object
		 * @see {@link generatePolicyPlaceholder} For details on how placeholder content is generated
		 */
		findOrCreatePolicy: async (type: PolicyType) => {
			// Use a transaction to prevent race conditions
			return adapter.transaction({
				callback: async (txAdapter) => {
					const now = new Date();
					const txRegistry = policyRegistry({
						adapter: txAdapter,
						...ctx,
					});

					// Find latest policy with exact name match directly from database
					const rawLatestPolicy = await txAdapter.findOne({
						model: 'consentPolicy',
						where: [
							{ field: 'isActive', value: true },
							{
								field: 'type',
								value: type,
							},
						],
						sortBy: {
							field: 'effectiveDate',
							direction: 'desc',
						},
					});

					const latestPolicy = rawLatestPolicy
						? validateEntityOutput(
								'consentPolicy',
								rawLatestPolicy,
								ctx.options
							)
						: null;

					if (latestPolicy) {
						return latestPolicy;
					}

					// Generate policy content and hash
					const { content: defaultContent, contentHash } =
						generatePolicyPlaceholder(type, now);

					return txRegistry.createConsentPolicy({
						version: '1.0.0',
						type,
						name: type,
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
