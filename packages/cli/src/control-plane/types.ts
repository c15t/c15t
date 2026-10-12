/**
 * Control-plane client types
 */

/**
 * Control-plane client configuration
 */
export interface ControlPlaneClientConfig {
	/** Application directory used for Inth's organization link. */
	cwd?: string;
	/** Inth organization ID override. */
	organization?: string;
	/** Optional caller cancellation. */
	signal?: AbortSignal;
}

/**
 * Create hosted project request
 */
export interface CreateInstanceRequest {
	/** Project slug */
	name: string;
	/** Project configuration */
	config: {
		/** Organization slug to create the project under */
		organizationSlug: string;
		/** Region ID for provisioning */
		region: string;
		/** Optional trusted origins */
		trustedOrigins?: string[];
	};
}

/**
 * Organization available to the authenticated control-plane user
 */
export interface ControlPlaneOrganization {
	organizationId: string;
	organizationSlug: string;
	organizationName: string;
}

/**
 * Provisioning region for control-plane projects
 */
export interface ControlPlaneRegion {
	id: string;
	label: string;
}
