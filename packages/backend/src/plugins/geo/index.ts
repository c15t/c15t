// /**
//  * Geo Plugin for c15t
//  *
//  * This plugin provides geolocation detection and jurisdiction-based consent management.
//  * It identifies subjects' locations based on their IP addresses and applies appropriate
//  * jurisdiction-specific consent rules based on their geography.
//  *
//  * Features:
//  * - IP-based location detection using various headers or geolocation services
//  * - Jurisdiction mapping based on country/region
//  * - Automatic application of required consent purposes based on jurisdiction
//  * - Client and server APIs for accessing location information
//  *
//  * @example
//  * ```typescript
//  * import { geo, geoClient } from '@c15t/plugins/geo';
//  *
//  * // Server-side setup
//  * const c15t = createc15t({
//  *   plugins: [
//  *     geo({
//  *       jurisdictions: [
//  *         {
//  *           code: 'GDPR',
//  *           countries: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'],
//  *           requiredPurposes: ['essential'],
//  *           defaultPurposes: []
//  *         },
//  *         {
//  *           code: 'CCPA',
//  *           countries: ['US'],
//  *           regions: { 'US': ['CA'] },
//  *           requiredPurposes: ['essential'],
//  *           defaultPurposes: ['analytics']
//  *         }
//  *       ]
//  *     })
//  *   ]
//  * });
//  *
//  * // Client-side usage
//  * const client = createc15tClient({
//  *   plugins: [geoClient()]
//  * });
//  *
//  * // Get the subject's jurisdiction
//  * const { jurisdiction, country } = await client.geo.getJurisdiction();
//  * console.log(`Subject is in ${country} under ${jurisdiction} jurisdiction`);
//  * ```
//  */

// import type { c15tClient } from '~/client';
// import { createAuthEndpoint, createAuthMiddleware } from '../../api/call';
// import type {
// 	C15TPlugin,
// 	LoggerMetadata,
// 	C15TContext,
// 	EndpointContext,
// } from ~/pkgs/types";
// import type { MiddlewareContext, MiddlewareOptions } from 'better-call';

// /**
//  * Extension of the request context with geolocation information
//  *
//  * This interface adds geographic information to request contexts
//  * when using the geo middleware.
//  */
// interface GeoContext {
// 	/**
// 	 * Geolocation information for the current request
// 	 */
// 	geo?: {
// 		/**
// 		 * IP address of the visitor, used for geolocation
// 		 */
// 		ip: string;

// 		/**
// 		 * ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'DE')
// 		 */
// 		country?: string;

// 		/**
// 		 * Region or state code within the country
// 		 * For the US, this would be the two-letter state code (e.g., 'CA' for California)
// 		 */
// 		region?: string;

// 		/**
// 		 * Source of the geolocation data (e.g., 'cloudflare-headers', 'ipapi', 'ip-only')
// 		 */
// 		source: string;
// 	};
// }

// /**
//  * Configuration options for the geo plugin
//  */
// interface GeoPluginOptions {
// 	/**
// 	 * Enable geo-targeting functionality
// 	 * When disabled, no geolocation detection will occur
// 	 *
// 	 * @default true
// 	 */
// 	enabled?: boolean;

// 	/**
// 	 * HTTP headers to check for the client's IP address, in order of preference
// 	 * The first header that contains a value will be used
// 	 *
// 	 * @default ['cf-connecting-ip', 'x-forwarded-for', 'x-real-ip']
// 	 */
// 	ipHeaders?: string[];

// 	/**
// 	 * Jurisdiction rules for different geographic regions
// 	 * Used to map countries and regions to specific consent requirements
// 	 */
// 	jurisdictions?: Array<{
// 		/**
// 		 * Unique identifier for the jurisdiction (e.g., 'GDPR', 'CCPA', 'LGPD')
// 		 */
// 		code: string;

// 		/**
// 		 * Array of ISO 3166-1 alpha-2 country codes this jurisdiction applies to
// 		 * For example: ['US'] for United States or ['DE', 'FR', 'IT'] for multiple EU countries
// 		 */
// 		countries: string[];

// 		/**
// 		 * Specific regions within countries where this jurisdiction applies
// 		 * Useful for state/province-specific regulations like CCPA in California
// 		 *
// 		 * @example
// 		 * ```
// 		 * regions: { 'US': ['CA', 'VA'] } // For California and Virginia
// 		 * ```
// 		 */
// 		regions?: Record<string, string[]>;

// 		/**
// 		 * Consent purposes that must always be accepted in this jurisdiction
// 		 * These will be automatically set to true regardless of subject choice
// 		 */
// 		requiredPurposes?: string[];

// 		/**
// 		 * Consent purposes that are enabled by default in this jurisdiction
// 		 * Subjects can still opt out of these purposes
// 		 */
// 		defaultPurposes?: string[];
// 	}>;

// 	/**
// 	 * Configuration for IP geolocation service
// 	 */
// 	geoService?: {
// 		/**
// 		 * Type of geolocation service to use
// 		 * - 'cloudflare': Use Cloudflare's country headers (automatically used if available)
// 		 * - 'maxmind': Use MaxMind GeoIP database (requires separate setup)
// 		 * - 'ipapi': Use ipapi.co service
// 		 * - 'custom': Use a custom function to resolve locations
// 		 */
// 		type: 'cloudflare' | 'maxmind' | 'ipapi' | 'custom';

// 		/**
// 		 * Custom function for geolocation lookup when type is 'custom'
// 		 *
// 		 * @param ip - The IP address to look up
// 		 * @returns Promise resolving to location data or null if not found
// 		 */
// 		getLocation?: (ip: string) => Promise<{
// 			country?: string;
// 			region?: string;
// 			city?: string;
// 		} | null>;

// 		/**
// 		 * API key for services that require authentication
// 		 */
// 		apiKey?: string;
// 	};
// }

// /**
//  * Creates a geo plugin instance for c15t
//  *
//  * This plugin adds geolocation capabilities to the consent management system,
//  * allowing for jurisdiction-specific consent rules based on subject location.
//  *
//  * @param options - Configuration options for the geo plugin
//  * @returns A configured geo plugin instance
//  */
// export const geo = (options?: GeoPluginOptions): C15TPlugin => {
// 	const ipHeaders = options?.ipHeaders || [
// 		'cf-connecting-ip',
// 		'x-forwarded-for',
// 		'x-real-ip',
// 	];

// 	// Type for the extended context with geo information
// 	type GeoEndpointContext = EndpointContext & GeoContext;

// 	/**
// 	 * Middleware that detects visitor location from IP address
// 	 * Adds geo information to the request context
// 	 */
// 	const geoMiddleware = createAuthMiddleware(
// 		async (ctx: MiddlewareContext<MiddlewareOptions>) => {
// 			// Skip if disabled
// 			if (options?.enabled === false) {
// 				return { geo: null };
// 			}

// 			// Get IP address safely
// 			let ip = 'unknown';
// 			for (const header of ipHeaders) {
// 				const headerValue = ctx.headers?.get?.(header);
// 				if (headerValue) {
// 					// Handle null or undefined headerValue
// 					ip = headerValue.split(',')[0]?.trim() || 'unknown';
// 					break;
// 				}
// 			}

// 			// Get country from Cloudflare headers if available
// 			const cfCountry = ctx.headers?.get?.('cf-ipcountry');
// 			const cfRegion = ctx.headers?.get?.('cf-region');

// 			if (cfCountry) {
// 				return {
// 					geo: {
// 						ip,
// 						country: cfCountry,
// 						region: cfRegion || undefined,
// 						source: 'cloudflare-headers',
// 					},
// 				};
// 			}

// 			// Otherwise use configured geo service
// 			if (options?.geoService) {
// 				try {
// 					let location = null;

// 					if (
// 						options.geoService.type === 'custom' &&
// 						options.geoService.getLocation
// 					) {
// 						location = await options.geoService.getLocation(ip);
// 					} else if (options.geoService.type === 'ipapi') {
// 						// Simple IP API implementation
// 						const response = await fetch(`https://ipapi.co/${ip}/json/`);
// 						if (response.ok) {
// 							const data = await response.json();
// 							location = {
// 								country: data.country_code,
// 								region: data.region_code,
// 								city: data.city,
// 							};
// 						}
// 					}
// 					// Add other geo service implementations as needed

// 					if (location) {
// 						return {
// 							geo: {
// 								ip,
// 								...location,
// 								source: options.geoService.type,
// 							},
// 						};
// 					}
// 				} catch (error) {
// 					ctx.context.logger?.error(
// 						'Error getting geolocation',
// 						error as LoggerMetadata
// 					);
// 				}
// 			}

// 			// Fallback - no location data
// 			return {
// 				geo: {
// 					ip,
// 					source: 'ip-only',
// 				},
// 			};
// 		}
// 	);

// 	return {
// 		id: 'geo',

// 		/**
// 		 * Initialize the geo plugin
// 		 *
// 		 * Sets up the plugin configuration and registers it with the c15t instance
// 		 *
// 		 * @param context - The c15t consent context
// 		 * @returns Object containing modifications to options
// 		 */
// 		init(context: C15TContext) {
// 			// Add the geo configuration to the global options
// 			context.options.geo = {
// 				...context.options.geo,
// 				enabled: options?.enabled !== false,
// 			};

// 			// Return an object with options to satisfy the return type
// 			return {
// 				options: {
// 					geo: {
// 						enabled: options?.enabled !== false,
// 					},
// 				},
// 			};
// 		},

// 		endpoints: {
// 			/**
// 			 * Endpoint that returns the detected jurisdiction for the current subject
// 			 *
// 			 * This endpoint uses geolocation to determine which jurisdiction's rules
// 			 * should apply to the current subject, based on their country and region.
// 			 *
// 			 * @example
// 			 * GET /geo/jurisdiction
// 			 * Response:
// 			 * {
// 			 *   "jurisdiction": "GDPR",
// 			 *   "country": "DE",
// 			 *   "region": null,
// 			 *   "requiredPurposes": ["essential"],
// 			 *   "defaultPurposes": []
// 			 * }
// 			 */
// 			getJurisdiction: createAuthEndpoint(
// 				'/jurisdiction',
// 				{
// 					method: 'GET',
// 					use: [geoMiddleware],
// 				},
// 				async (ctx) => {
// 					const geo = (ctx as unknown as GeoEndpointContext).geo;

// 					if (!geo || !geo.country) {
// 						return ctx.json({
// 							jurisdiction: 'UNKNOWN',
// 							country: geo?.country || 'UNKNOWN',
// 							region: geo?.region,
// 							requiredPurposes: [],
// 							defaultPurposes: [],
// 						});
// 					}

// 					// Find applicable jurisdiction
// 					let jurisdiction = 'UNKNOWN';
// 					let requiredPurposes: string[] = [];
// 					let defaultPurposes: string[] = [];

// 					if (options?.jurisdictions && options.jurisdictions.length > 0) {
// 						for (const j of options.jurisdictions) {
// 							// Check if country matches
// 							if (j.countries.includes(geo.country)) {
// 								// If regions are specified, check if region matches
// 								let regionMatch = true;
// 								if (j.regions && geo.region && j.regions[geo.country]) {
// 									// Make sure we safely check if regions[country] exists before using includes
// 									regionMatch =
// 										j.regions[geo.country]?.includes(geo.region) ?? false;
// 								}

// 								if (regionMatch) {
// 									jurisdiction = j.code;
// 									requiredPurposes = j.requiredPurposes || [];
// 									defaultPurposes = j.defaultPurposes || [];
// 									break;
// 								}
// 							}
// 						}
// 					}

// 					return ctx.json({
// 						jurisdiction,
// 						country: geo.country,
// 						region: geo.region,
// 						requiredPurposes,
// 						defaultPurposes,
// 					});
// 				}
// 			),

// 			/**
// 			 * Endpoint that returns geolocation information for the current subject
// 			 *
// 			 * This endpoint provides raw geolocation data, including IP address
// 			 * and detected country/region.
// 			 *
// 			 * @example
// 			 * GET /geo/location
// 			 * Response:
// 			 * {
// 			 *   "ip": "203.0.113.195",
// 			 *   "country": "US",
// 			 *   "region": "CA",
// 			 *   "source": "cloudflare-headers"
// 			 * }
// 			 */
// 			getGeoInfo: createAuthEndpoint(
// 				'/location',
// 				{
// 					method: 'GET',
// 					use: [geoMiddleware],
// 				},
// 				async (ctx) => {
// 					// Return the geo information that was added by the middleware
// 					const geo = (ctx as unknown as GeoEndpointContext).geo;

// 					return ctx.json({
// 						ip: geo?.ip,
// 						country: geo?.country,
// 						region: geo?.region,
// 						source: geo?.source,
// 					});
// 				}
// 			),
// 		},

// 		hooks: {
// 			/**
// 			 * Before-request hooks to apply jurisdiction rules
// 			 *
// 			 * These hooks are executed before processing consent-related requests
// 			 * and automatically apply jurisdiction-specific rules.
// 			 */
// 			before: [
// 				{
// 					/**
// 					 * Hook matcher for consent update requests
// 					 *
// 					 * @param context - Request context
// 					 * @returns Whether this hook should run for the given request
// 					 */
// 					matcher(context) {
// 						return context.path === '/update-consent';
// 					},

// 					/**
// 					 * Hook handler that applies jurisdiction-specific consent rules
// 					 *
// 					 * This enforces required consent purposes based on the subject's jurisdiction.
// 					 * For example, in GDPR regions, essential cookies would be required.
// 					 *
// 					 * @param ctx - Request context
// 					 */
// 					async handler(ctx) {
// 						// If geo plugin is enabled, apply jurisdiction-specific rules
// 						if (options?.enabled === false) {
// 							return;
// 						}

// 						// Get geo information from middleware
// 						await geoMiddleware(ctx);

// 						// Access the geo object directly from the context after middleware has run
// 						const geoInfo = (ctx as unknown as GeoEndpointContext).geo;

// 						if (!geoInfo?.country) {
// 							return;
// 						}

// 						// Find applicable jurisdiction
// 						if (options?.jurisdictions) {
// 							for (const j of options.jurisdictions) {
// 								const countryMatch = j.countries.includes(geoInfo.country);
// 								let regionMatch = true;

// 								// Check region if specified
// 								if (countryMatch && geoInfo.region && j.regions) {
// 									// Use optional chaining and nullish coalescing to safely check for region match
// 									regionMatch =
// 										j.regions[geoInfo.country]?.includes(geoInfo.region) ??
// 										false;
// 								}

// 								if (countryMatch && regionMatch) {
// 									// Apply jurisdiction-specific rules
// 									if (j.requiredPurposes && j.requiredPurposes.length > 0) {
// 										// Ensure required purposes have consent
// 										const body = ctx.body as Record<string, unknown>;
// 										if (body.preferences) {
// 											for (const purposeId of j.requiredPurposes) {
// 												(body.preferences as Record<string, boolean>)[
// 													purposeId
// 												] = true;
// 											}
// 										}
// 									}
// 									break;
// 								}
// 							}
// 						}
// 					},
// 				},
// 			],
// 		},
// 	};
// };

// /**
//  * Creates a client-side geo plugin
//  *
//  * This plugin adds geolocation methods to the c15t client instance,
//  * allowing client-side code to access subject location and jurisdiction information.
//  *
//  * @example
//  * ```typescript
//  * const client = createc15tClient({
//  *   plugins: [geoClient()]
//  * });
//  *
//  * // Get jurisdiction information
//  * const { jurisdiction, country, requiredPurposes } = await client.geo.getJurisdiction();
//  *
//  * // Get raw location data
//  * const { ip, country, region } = await client.geo.getLocation();
//  * ```
//  *
//  * @returns A client plugin with geo methods
//  */
// export const geoClient = () => {
// 	return {
// 		id: 'geo',
// 		methods: {
// 			/**
// 			 * Gets the detected jurisdiction for the current subject
// 			 *
// 			 * @returns Promise resolving to jurisdiction information
// 			 */
// 			getJurisdiction: async function (this: c15tClient) {
// 				return this.$fetch('/geo/jurisdiction', {
// 					method: 'GET',
// 				});
// 			},

// 			/**
// 			 * Gets geolocation information for the current subject
// 			 *
// 			 * @returns Promise resolving to location data
// 			 */
// 			getLocation: async function (this: c15tClient) {
// 				return this.$fetch('/geo/location', {
// 					method: 'GET',
// 				});
// 			},
// 		},
// 		$InferServerPlugin: {} as ReturnType<typeof geo>,
// 	};
// };
