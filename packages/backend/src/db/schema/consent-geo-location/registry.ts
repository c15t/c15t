import { getWithHooks } from '~/pkgs/data-model/hooks';
import type { GenericEndpointContext, RegistryContext } from '~/pkgs/types';
import { validateEntityOutput } from '../definition';
import type { ConsentGeoLocation } from './schema';

/**
 * Creates and returns a set of consent geo-location-related adapter methods to interact with the database.
 * These methods provide a consistent interface for creating and finding
 * geo-location records while applying hooks and enforcing data validation rules.
 *
 * @param adapter - The database adapter used for direct database operations
 * @param ctx - The context object containing the database adapter, hooks, and options
 * @returns An object containing type-safe consent geo-location operations
 *
 * @example
 * ```typescript
 * const geoLocationAdapter = createConsentGeoLocationAdapter(
 *   databaseAdapter,
 *   createWithHooks,
 *   c15tOptions
 * );
 *
 * // Create a new geo-location record
 * const geoLocation = await geoLocationAdapter.createConsentGeoLocation({
 *   consentId: 'cns_hadt8w7nngm7xmx2bn',
 *   ip: '192.168.1.1',
 *   country: 'US',
 *   city: 'New York',
 *   latitude: 40.7128,
 *   longitude: -74.0060
 * });
 * ```
 */
export function consentGeoLocationRegistry({
	adapter,
	...ctx
}: RegistryContext) {
	const { createWithHooks } = getWithHooks(adapter, ctx);

	return {
		/**
		 * Creates a new consent geo-location record in the database.
		 * Automatically sets creation timestamp and applies any
		 * configured hooks during the creation process.
		 *
		 * @param geoLocation - Geo-location data to create (without id and timestamp)
		 * @param context - Optional endpoint context for hooks
		 * @returns The created geo-location record with all fields populated
		 * @throws May throw an error if hooks prevent creation or if database operations fail
		 */
		createConsentGeoLocation: async (
			geoLocation: Omit<ConsentGeoLocation, 'id' | 'createdAt'> &
				Partial<ConsentGeoLocation>,
			context?: GenericEndpointContext
		) => {
			const createdGeoLocation = await createWithHooks({
				data: {
					createdAt: new Date(),
					...geoLocation,
				},
				model: 'consentGeoLocation',
				customFn: undefined,
				context,
			});

			if (!createdGeoLocation) {
				throw new Error(
					'Failed to create consent geo-location - operation returned null'
				);
			}

			return createdGeoLocation as ConsentGeoLocation;
		},

		/**
		 * Finds geo-location records associated with a specific consent ID.
		 * Returns geo-locations with processed output fields according to the schema configuration.
		 *
		 * @param consentId - The ID of the consent record to find geo-locations for
		 * @returns Array of geo-location records associated with the consent
		 */
		findConsentGeoLocationsByConsentId: async (consentId: string) => {
			const geoLocations = await adapter.findMany({
				model: 'consentGeoLocation',
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

			return geoLocations.map((geoLocation) =>
				validateEntityOutput('consentGeoLocation', geoLocation, ctx.options)
			);
		},

		/**
		 * Finds a geo-location record by its unique ID.
		 * Returns the geo-location with processed output fields according to the schema configuration.
		 *
		 * @param geoLocationId - The unique identifier of the geo-location record
		 * @returns The geo-location object if found, null otherwise
		 */
		findConsentGeoLocationById: async (geoLocationId: string) => {
			const geoLocation = await adapter.findOne({
				model: 'consentGeoLocation',
				where: [
					{
						field: 'id',
						value: geoLocationId,
					},
				],
			});
			return geoLocation
				? validateEntityOutput('consentGeoLocation', geoLocation, ctx.options)
				: null;
		},
	};
}
