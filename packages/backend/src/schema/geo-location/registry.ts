import { getWithHooks } from '~/pkgs/data-model';
import type { Where } from '~/pkgs/db-adapters';
import type { GenericEndpointContext, RegistryContext } from '~/pkgs/types';
import { validateEntityOutput } from '../definition';
import type { GeoLocation } from './schema';
/**
 * Creates and returns a set of geo-location-related adapter methods to interact with the database.
 * These methods provide a consistent interface for creating and finding
 * geo-location records while applying hooks and enforcing data validation rules.
 *
 * @param adapter - The database adapter used for direct database operations
 * @param ctx - The context object containing the database adapter, hooks, and options
 * @returns An object containing type-safe geo-location operations
 *
 * @example
 * ```typescript
 * const locationAdapter = createGeoLocationAdapter(
 *   databaseAdapter,
 *   createWithHooks,
 *   c15tOptions
 * );
 *
 * // Create a new geo-location record
 * const location = await locationAdapter.createGeoLocation({
 *   countryCode: 'US',
 *   countryName: 'United States',
 *   regionCode: 'CA',
 *   regionName: 'California',
 *   regulatoryZones: ['CCPA', 'CPRA']
 * });
 * ```
 */
export function geoLocationRegistry({ adapter, ...ctx }: RegistryContext) {
	const { createWithHooks } = getWithHooks(adapter, ctx);
	return {
		/**
		 * Creates a new geo-location record in the database.
		 * Automatically sets creation timestamp and applies any
		 * configured hooks during the creation process.
		 *
		 * @param location - Geo-location data to create (without id and timestamp)
		 * @param context - Optional endpoint context for hooks
		 * @returns The created geo-location record with all fields populated
		 * @throws May throw an error if hooks prevent creation or if database operations fail
		 */
		createGeoLocation: async (
			location: Omit<GeoLocation, 'id' | 'createdAt'> & Partial<GeoLocation>,
			context?: GenericEndpointContext
		) => {
			const createdLocation = await createWithHooks({
				data: {
					createdAt: new Date(),
					...location,
				},
				model: 'consentGeoLocation',
				customFn: undefined,
				context,
			});

			if (!createdLocation) {
				throw new Error(
					'Failed to create geo-location - operation returned null'
				);
			}

			return createdLocation as GeoLocation;
		},

		/**
		 * Finds all geo-location records matching the given criteria.
		 * Returns geo-locations with processed output fields according to the schema configuration.
		 *
		 * @param filter - Optional filter parameters for the query
		 * @returns Array of geo-location records matching the criteria
		 */
		findGeoLocations: async (filter?: {
			countryCode?: string;
			regionCode?: string;
		}) => {
			const whereConditions: Where<'geoLocation'> = [];

			if (filter?.countryCode) {
				whereConditions.push({
					field: 'countryCode',
					value: filter.countryCode,
				});
			}

			if (filter?.regionCode) {
				whereConditions.push({
					field: 'regionCode',
					value: filter.regionCode,
				});
			}

			const locations = await adapter.findMany({
				model: 'geoLocation',
				where: whereConditions,
				sortBy: {
					field: 'countryName',
					direction: 'asc',
				},
			});

			return locations.map((location) =>
				validateEntityOutput('consentGeoLocation', location, ctx.options)
			);
		},

		/**
		 * Finds a geo-location record by its unique ID.
		 * Returns the geo-location with processed output fields according to the schema configuration.
		 *
		 * @param locationId - The unique identifier of the geo-location record
		 * @returns The geo-location object if found, null otherwise
		 */
		findGeoLocationById: async (locationId: string) => {
			const location = await adapter.findOne({
				model: 'geoLocation',
				where: [
					{
						field: 'id',
						value: locationId,
					},
				],
			});
			return location
				? validateEntityOutput('consentGeoLocation', location, ctx.options)
				: null;
		},

		/**
		 * Finds geo-location records by country code.
		 * Returns geo-locations with processed output fields according to the schema configuration.
		 *
		 * @param countryCode - The country code to search for
		 * @returns Array of geo-location records for the specified country
		 */
		findGeoLocationsByCountry: async (countryCode: string) => {
			const locations = await adapter.findMany({
				model: 'geoLocation',
				where: [
					{
						field: 'countryCode',
						value: countryCode,
					},
				],
				sortBy: {
					field: 'regionName',
					direction: 'asc',
				},
			});

			return locations.map((location) =>
				validateEntityOutput('consentGeoLocation', location, ctx.options)
			);
		},
	};
}
