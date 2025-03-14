import { getWithHooks } from '~/db/hooks';
import { Where } from '~/pkgs/db-adapters/types';
import { BASE_ERROR_CODES, C15TError } from '~/pkgs/errors';
import type { GenericEndpointContext, RegistryContext } from '~/types';
import { validateEntityOutput } from '../definition';
import type { Domain } from './schema';

export interface FindDomainParams {
	name?: string;
	includeInactive?: boolean;
}

/**
 * Creates and returns a set of domain-related adapter methods to interact with the database.
 * These methods provide a consistent interface for creating, finding, and updating
 * domain records while applying hooks and enforcing data validation rules.
 *
 * @param adapter - The database adapter used for direct database operations
 * @param ctx - The context object containing the database adapter, hooks, and options
 * @returns An object containing type-safe domain operations
 *
 * @example
 * ```typescript
 * const domainAdapter = createDomainAdapter(
 *   databaseAdapter,
 *   createWithHooks,
 *   updateWithHooks,
 *   c15tOptions
 * );
 *
 * // Create a new domain
 * const domain = await domainAdapter.createDomain({
 *   name: 'example.com',
 *   description: 'Example company website',
 *   isVerified: true
 * });
 * ```
 */
export function domainRegistry({ adapter, ...ctx }: RegistryContext) {
	const { createWithHooks, updateWithHooks } = getWithHooks(adapter, ctx);
	const registry = {
		/**
		 * Creates a new domain record in the database.
		 * Automatically sets creation timestamp and applies any
		 * configured hooks during the creation process.
		 *
		 * @param domain - Domain data to create (without id and timestamp)
		 * @param context - Optional endpoint context for hooks
		 * @returns The created domain with all fields populated
		 * @throws May throw an error if hooks prevent creation or if database operations fail
		 */
		createDomain: async (
			domain: Omit<Domain, 'id' | 'createdAt' | 'updatedAt'> & Partial<Domain>,
			context?: GenericEndpointContext
		) => {
			const createdDomain = await createWithHooks({
				data: {
					...domain,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				model: 'domain',
				customFn: undefined,
				context,
			});

			if (!createdDomain) {
				throw new Error('Failed to create domain - operation returned null');
			}

			return createdDomain as Domain;
		},

		/**
		 * Finds an existing domain or creates a new one if needed.
		 *
		 * @param name - The domain name to find or create
		 * @param context - Optional endpoint context for hooks
		 * @returns The existing or newly created domain
		 * @throws APIError if domain creation fails
		 */
		findOrCreateDomain: async function (
			name: string,
			context?: GenericEndpointContext
		) {
			// Try to find existing domain
			const existingDomain = await this.findDomainByName(name);
			if (existingDomain) {
				return existingDomain;
			}

			// Create new domain if not found
			const domain = await this.createDomain(
				{
					name,
					description: `Auto-created domain for ${name}`,
					isActive: true,
					isVerified: true,
					allowedOrigins: [],
				},
				context
			);

			if (!domain) {
				throw new C15TError('Failed to create domain', {
					code: BASE_ERROR_CODES.INTERNAL_SERVER_ERROR,
					status: 503,
				});
			}

			return domain;
		},

		/**
		 * Finds all domains, optionally including inactive ones.
		 * Returns domains with processed output fields according to the schema configuration.
		 *
		 * @param params - Optional parameters to filter the results
		 * @returns Array of domains matching the criteria
		 */
		findDomains: async (params: FindDomainParams = {}) => {
			const whereConditions: Where<'domain'> = [];

			if (!params.includeInactive) {
				whereConditions.push({
					field: 'isActive',
					value: true,
				});
			}

			if (params.name) {
				whereConditions.push({
					field: 'name',
					value: params.name,
				});
			}

			const domains = await adapter.findMany({
				model: 'domain',
				where: whereConditions,
				sortBy: {
					field: 'name',
					direction: 'asc',
				},
			});

			return domains.map((domain) =>
				validateEntityOutput('domain', domain, ctx.options)
			);
		},

		/**
		 * Finds a domain by its name.
		 * Returns the domain with processed output fields according to the schema configuration.
		 *
		 * @param name - The domain name to search for
		 * @returns The domain object if found, null otherwise
		 */
		findDomain: async (name: string) => {
			const domains = await registry.findDomains({
				name,
				includeInactive: false,
			});
			return domains[0] || null;
		},

		/**
		 * Finds a domain by its unique ID.
		 * Returns the domain with processed output fields according to the schema configuration.
		 *
		 * @param domainId - The unique identifier of the domain
		 * @returns The domain object if found, null otherwise
		 */
		findDomainById: async (domainId: string) => {
			const domain = await adapter.findOne({
				model: 'domain',
				where: [
					{
						field: 'id',
						value: domainId,
					},
				],
			});
			return domain
				? validateEntityOutput('domain', domain, ctx.options)
				: null;
		},

		/**
		 * Finds a domain by its name.
		 * Returns the domain with processed output fields according to the schema configuration.
		 *
		 * @param name - The domain name to search for
		 * @returns The domain object if found, null otherwise
		 */
		findDomainByName: async (name: string) => {
			const domain = await adapter.findOne({
				model: 'domain',
				where: [
					{
						field: 'name',
						value: name,
					},
				],
			});
			return domain
				? validateEntityOutput('domain', domain, ctx.options)
				: null;
		},

		/**
		 * Updates an existing domain record by ID.
		 * Applies any configured hooks during the update process and
		 * processes the output according to schema configuration.
		 *
		 * @param domainId - The unique identifier of the domain to update
		 * @param data - The fields to update on the domain record
		 * @param context - Optional endpoint context for hooks
		 * @returns The updated domain if successful, null if not found or hooks prevented update
		 */
		updateDomain: async (
			domainId: string,
			data: Partial<Domain>,
			context?: GenericEndpointContext
		) => {
			const domain = await updateWithHooks({
				data: {
					...data,
					updatedAt: new Date(),
				},
				where: [
					{
						field: 'id',
						value: domainId,
					},
				],
				model: 'domain',
				customFn: undefined,
				context,
			});
			return domain
				? validateEntityOutput('domain', domain as Domain, ctx.options)
				: null;
		},

		/**
		 * Verifies if a domain exists and is active.
		 * Useful for checking domain validity during API requests.
		 *
		 * @param domainName - The domain name to verify
		 * @returns True if the domain exists and is active, false otherwise
		 */
		verifyDomain: async (domainName: string) => {
			const domain = await adapter.findOne({
				model: 'domain',
				where: [
					{
						field: 'name',
						value: domainName,
					},
					{
						field: 'isActive',
						value: true,
					},
				],
			});
			return !!domain;
		},
	};

	return registry;
}
