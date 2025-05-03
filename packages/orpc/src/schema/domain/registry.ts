import { getWithHooks } from '~/pkgs/data-model';
import type { Where } from '~/pkgs/db-adapters';
import { DoubleTieError, ERROR_CODES } from '~/pkgs/results';
import type { GenericEndpointContext, RegistryContext } from '~/pkgs/types';

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
 * The domain registry manages domain entities that represent websites or applications
 * where consent can be collected. Domains have verification status, active status,
 * and can specify allowed origins for cross-domain operations.
 *
 * @param params - Registry context parameters
 * @param params.adapter - The database adapter used for direct database operations
 * @param params.ctx - Additional context properties containing hooks and options
 * @returns An object containing type-safe domain operations
 *
 * @example
 * ```ts
 * const registry = domainRegistry({
 *   adapter: databaseAdapter,
 *   hooks: customHooks,
 *   options: validationOptions
 * });
 *
 * // Create a new domain
 * const domain = await registry.createDomain({
 *   name: 'example.com',
 *   description: 'Example company website',
 *   isVerified: true,
 *   allowedOrigins: ['https://app.example.com']
 * });
 * ```
 *
 * @see {@link RegistryContext} For details on the context parameters
 * @see {@link Domain} For the structure of domain objects
 */
export function domainRegistry({ adapter, ...ctx }: RegistryContext) {
	const { createWithHooks } = getWithHooks(adapter, ctx);
	const registry = {
		/**
		 * Creates a new domain record in the database.
		 *
		 * This method creates a domain entity that represents a website or application
		 * where consent can be collected. It automatically sets creation and update
		 * timestamps and applies any configured hooks during the creation process.
		 *
		 * @param domain - Domain data to create (without id and timestamps)
		 * @param domain.name - Unique domain name (e.g., 'example.com')
		 * @param domain.description - Optional description of the domain's purpose
		 * @param domain.isActive - Whether the domain is currently active
		 * @param domain.isVerified - Whether domain ownership has been verified
		 * @param domain.allowedOrigins - Array of origins allowed to access this domain's data
		 * @param context - Optional endpoint context for hooks execution
		 * @returns Promise resolving to the created domain with all fields populated
		 * @throws {Error} When the creation operation fails or returns null
		 * @throws May also throw errors if hooks prevent creation or if validation fails
		 *
		 * @example
		 * ```ts
		 * // Create a new active and verified domain
		 * const newDomain = await registry.createDomain({
		 *   name: 'example.org',
		 *   description: 'Example organization website',
		 *   isActive: true,
		 *   isVerified: true,
		 *   allowedOrigins: ['https://app.example.org', 'https://admin.example.org']
		 * });
		 * ```
		 *
		 * @see {@link Domain} For the complete structure of domain objects
		 * @see {@link GenericEndpointContext} For details on the context object
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
				throw new DoubleTieError(
					'Failed to create domain - operation returned null',
					{
						code: ERROR_CODES.INTERNAL_SERVER_ERROR,
						status: 500,
					}
				);
			}

			return createdDomain as Domain;
		},

		/**
		 * Finds an existing domain or creates a new one if needed.
		 *
		 * This method attempts to find a domain with the specified name. If not found,
		 * it automatically creates a new domain with default settings and the given name.
		 * This is useful for ensuring a domain exists before associating other entities with it.
		 *
		 * @param name - The domain name to find or create
		 * @param context - Optional endpoint context for hooks execution
		 * @returns Promise resolving to the existing or newly created domain
		 * @throws {DoubleTieError} If domain creation fails
		 *
		 * @example
		 * ```ts
		 * // Find or create a domain for 'example.net'
		 * const domain = await registry.findOrCreateDomain('example.net');
		 * console.log(`Using domain: ${domain.name} (${domain.id})`);
		 * console.log(`Domain was ${domain.createdAt === domain.updatedAt ? 'newly created' : 'existing'}`);
		 * ```
		 *
		 * @see {@link findDomainByName} For the underlying lookup method
		 * @see {@link createDomain} For the underlying creation method
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
				throw new DoubleTieError('Failed to create domain', {
					code: ERROR_CODES.INTERNAL_SERVER_ERROR,
					status: 503,
				});
			}

			return domain;
		},

		/**
		 * Finds all domains matching the specified criteria.
		 *
		 * This method retrieves domains from the database, with optional filtering by name
		 * and active status. Results are sorted alphabetically by name and validated
		 * against the schema before being returned.
		 *
		 * @param params - Optional parameters to filter the results
		 * @param params.name - Optional domain name to filter by
		 * @param params.includeInactive - When true, includes inactive domains in the results
		 * @returns Promise resolving to an array of validated domain objects
		 *
		 * @example
		 * ```ts
		 * // Get all active domains
		 * const activeDomains = await registry.findDomains();
		 *
		 * // Get all domains including inactive ones
		 * const allDomains = await registry.findDomains({ includeInactive: true });
		 *
		 * // Find domains with a specific name
		 * const specificDomains = await registry.findDomains({ name: 'example.com' });
		 * ```
		 *
		 * @see {@link FindDomainParams} For details on filter parameters
		 * @see {@link Domain} For the structure of returned domain objects
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
		 *
		 * This is a convenience method that wraps findDomains with a name filter
		 * and returns the first matching active domain, or null if none is found.
		 *
		 * @param name - The domain name to search for
		 * @returns Promise resolving to the domain object if found, null otherwise
		 *
		 * @example
		 * ```ts
		 * // Find a domain by name
		 * const domain = await registry.findDomain('example.com');
		 * if (domain) {
		 *   console.log(`Found domain: ${domain.name}`);
		 * } else {
		 *   console.log('Domain not found or inactive');
		 * }
		 * ```
		 *
		 * @see {@link findDomains} For the underlying search method
		 * @see {@link Domain} For the structure of the returned domain object
		 */
		findDomain: async (name: string) => {
			const domains = await registry.findDomains({
				name,
				includeInactive: false,
			});
			return domains[0] || null;
		},

		/**
		 * Finds a domain by its name, including inactive domains.
		 *
		 * This method directly queries the database for a domain with the exact
		 * name specified, regardless of active status. The resulting domain is
		 * validated against the schema before being returned.
		 *
		 * @param name - The domain name to search for
		 * @returns Promise resolving to the validated domain object if found, null otherwise
		 *
		 * @example
		 * ```ts
		 * // Find a domain by name (even if inactive)
		 * const domain = await registry.findDomainByName('example.com');
		 * if (domain) {
		 *   console.log(`Found domain: ${domain.name} (${domain.isActive ? 'active' : 'inactive'})`);
		 * } else {
		 *   console.log('Domain not found');
		 * }
		 * ```
		 *
		 * @see {@link Domain} For the structure of the returned domain object
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
	};

	return registry;
}
