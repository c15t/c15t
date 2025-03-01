import type { Where, GenericEndpointContext, RegistryContext } from '~/types';
import type { Domain } from './schema';
import { getWithHooks } from '~/db/hooks';
import { validateEntityOutput } from '../definition';

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
	return {
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
			domain: Omit<Domain, 'id' | 'createdAt'> & Partial<Domain>,
			context?: GenericEndpointContext
		) => {
			const createdDomain = await createWithHooks({
				data: {
					createdAt: new Date(),
					// isActive: true,
					...domain,
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
		 * Finds all domains, optionally including inactive ones.
		 * Returns domains with processed output fields according to the schema configuration.
		 *
		 * @param includeInactive - Whether to include inactive domains in the results
		 * @returns Array of domains matching the criteria
		 */
		findDomains: async (includeInactive = false) => {
			const whereConditions: Where<'domain'> = [];

			if (!includeInactive) {
				whereConditions.push({
					field: 'isActive',
					value: true,
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
}
