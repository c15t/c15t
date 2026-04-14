/**
 * Control-plane client types
 */

/**
 * Control-plane client configuration
 */
export interface ControlPlaneClientConfig {
	/** Base URL of the control plane */
	baseUrl: string;
	/** Access token for authentication */
	accessToken: string;
	/** Client name */
	clientName?: string;
	/** Client version */
	clientVersion?: string;
	/** Request timeout in ms */
	timeout?: number;
}

/**
 * Control-plane connection state
 */
export interface ControlPlaneConnectionState {
	/** Whether connected to the service */
	connected: boolean;
	/** Server capabilities */
	capabilities?: ControlPlaneCapabilities;
	/** Error if connection failed */
	error?: string;
}

/**
 * Control-plane capabilities
 */
export interface ControlPlaneCapabilities {
	/** Supported resources */
	resources?: string[];
	/** Supported tools */
	tools?: string[];
	/** Server version */
	version?: string;
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
	role: string;
}

/**
 * Provisioning region for control-plane projects
 */
export interface ControlPlaneRegion {
	id: string;
	label: string;
	family: string;
}
