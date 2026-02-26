/**
 * Control-plane client for c15t instances.
 */

import { CLI_INFO, TIMEOUTS, URLS } from '../constants';
import { CliError } from '../core/errors';
import type { Instance } from '../types';
import type {
	ControlPlaneClientConfig,
	ControlPlaneConnectionState,
	ControlPlaneOrganization,
	ControlPlaneRegion,
	CreateInstanceRequest,
} from './types';

interface ControlPlaneApiErrorPayload {
	success: false;
	error?: {
		code?: string;
		message?: string;
		details?: unknown;
	};
}

interface ControlPlaneApiSuccessPayload<T> {
	success: true;
	data: T;
}

interface ControlPlaneInstance {
	instanceId: string;
	instanceSlug?: string;
	instanceName: string;
	organizationId?: string;
	organizationSlug?: string;
	region?:
		| string
		| {
				id?: string;
				slug?: string;
				code?: string;
		  };
	regionId?: string;
	regionSlug?: string;
	backendURL: string | null;
	dashboardURL?: string;
	backendVersion?: string;
}

function extractAwsRegion(
	value: string | null | undefined
): string | undefined {
	if (!value) {
		return undefined;
	}
	const match = value.match(/[a-z]{2}-[a-z]+-\d/);
	return match?.[0];
}

function isApiSuccessPayload<T>(
	payload: unknown
): payload is ControlPlaneApiSuccessPayload<T> {
	return (
		typeof payload === 'object' &&
		payload !== null &&
		'success' in payload &&
		(payload as { success?: unknown }).success === true &&
		'data' in payload
	);
}

async function parseJsonSafe(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return null;
	}
}

function mapControlPlaneInstance(raw: ControlPlaneInstance): Instance {
	const regionFromObject =
		typeof raw.region === 'string'
			? raw.region
			: (raw.region?.id ?? raw.region?.slug ?? raw.region?.code);
	const region =
		regionFromObject ??
		raw.regionId ??
		raw.regionSlug ??
		extractAwsRegion(raw.backendURL) ??
		extractAwsRegion(raw.dashboardURL);

	return {
		id: raw.instanceId,
		name: raw.instanceName,
		organizationSlug: raw.organizationSlug,
		region,
		url: raw.backendURL ?? raw.dashboardURL ?? '',
		createdAt: new Date(0).toISOString(),
		status: raw.backendURL ? 'active' : 'pending',
	};
}

/**
 * Client for c15t instances.
 *
 * Uses direct control-plane HTTP endpoints under /api/v1.
 */
export class ControlPlaneClient {
	private config: ControlPlaneClientConfig;
	private connected = false;

	constructor(config: ControlPlaneClientConfig) {
		this.config = {
			clientName: CLI_INFO.CONTROL_PLANE_CLIENT_NAME,
			clientVersion: CLI_INFO.VERSION,
			timeout: TIMEOUTS.CONTROL_PLANE_CONNECTION,
			...config,
		};
	}

	/**
	 * Connect the client.
	 */
	async connect(): Promise<ControlPlaneConnectionState> {
		this.connected = true;

		return {
			connected: true,
			capabilities: {
				tools: ['listInstances', 'createInstance', 'getInstance'],
			},
		};
	}

	/**
	 * Disconnect the client.
	 */
	async close(): Promise<void> {
		this.connected = false;
	}

	/**
	 * Check if connected.
	 */
	isConnected(): boolean {
		return this.connected;
	}

	private ensureConnected(): void {
		if (!this.connected) {
			throw new CliError('CONTROL_PLANE_CONNECTION_FAILED', {
				details: 'Not connected to control plane',
			});
		}
	}

	private buildUrl(path: string): string {
		return `${this.config.baseUrl}/api/v1${path}`;
	}

	private async request<T>(
		path: string,
		init?: {
			method?: 'GET' | 'POST' | 'DELETE' | 'PATCH';
			body?: unknown;
		}
	): Promise<T> {
		this.ensureConnected();

		const response = await fetch(this.buildUrl(path), {
			method: init?.method ?? 'GET',
			headers: {
				Authorization: `Bearer ${this.config.accessToken}`,
				'Content-Type': 'application/json',
			},
			body: init?.body === undefined ? undefined : JSON.stringify(init.body),
		});

		const payload = await parseJsonSafe(response);
		if (response.ok && isApiSuccessPayload<T>(payload)) {
			return payload.data;
		}

		const apiError = payload as ControlPlaneApiErrorPayload;
		const errorCode = apiError?.error?.code;
		const errorMessage = apiError?.error?.message ?? 'Request failed';

		if (response.status === 401) {
			throw new CliError('AUTH_TOKEN_INVALID', {
				details: `${response.status} ${errorMessage}`,
			});
		}

		throw new CliError('API_ERROR', {
			details: `${response.status} ${errorCode ? `${errorCode}: ` : ''}${errorMessage}`,
		});
	}

	async listOrganizations(): Promise<ControlPlaneOrganization[]> {
		return this.request<ControlPlaneOrganization[]>('/consent/organizations');
	}

	async listRegions(): Promise<ControlPlaneRegion[]> {
		return this.request<ControlPlaneRegion[]>('/consent/regions');
	}

	/**
	 * List all instances for the authenticated user.
	 */
	async listInstances(): Promise<Instance[]> {
		const raw =
			await this.request<ControlPlaneInstance[]>('/consent/instances');
		return raw.map(mapControlPlaneInstance);
	}

	/**
	 * Get a specific instance by ID.
	 */
	async getInstance(id: string): Promise<Instance> {
		const instances = await this.listInstances();
		const instance = instances.find((item) => item.id === id);
		if (!instance) {
			throw new CliError('INSTANCE_NOT_FOUND', {
				details: `Instance not found: ${id}`,
			});
		}

		return instance;
	}

	/**
	 * Create a new instance.
	 */
	async createInstance(request: CreateInstanceRequest): Promise<Instance> {
		const { organizationSlug, region, trustedOrigins } = request.config;
		if (!organizationSlug || !region) {
			throw new CliError('API_ERROR', {
				details: 'organizationSlug and region are required',
			});
		}

		const instance = await this.request<ControlPlaneInstance>(
			'/consent/instances',
			{
				method: 'POST',
				body: {
					organizationSlug,
					name: request.name,
					region,
					production: false,
					trustedOrigins: trustedOrigins ?? [],
					useV2: true,
				},
			}
		);

		return mapControlPlaneInstance(instance);
	}

	/**
	 * Delete an instance.
	 */
	async deleteInstance(id: string): Promise<void> {
		await this.request<void>(`/consent/instances/${encodeURIComponent(id)}`, {
			method: 'DELETE',
		});
	}
}

/**
 * Create and connect a client.
 */
export async function createControlPlaneClient(
	accessToken: string,
	baseUrl: string = URLS.CONSENT_IO
): Promise<ControlPlaneClient> {
	const client = new ControlPlaneClient({
		baseUrl,
		accessToken,
	});

	const state = await client.connect();
	if (!state.connected) {
		throw new CliError('CONTROL_PLANE_CONNECTION_FAILED', {
			details: state.error,
		});
	}

	return client;
}

/**
 * Create a client from stored config.
 */
export async function createControlPlaneClientFromConfig(
	baseUrl: string = URLS.CONSENT_IO
): Promise<ControlPlaneClient | null> {
	const { getAccessToken } = await import('../auth/config-store');

	const accessToken = await getAccessToken();
	if (!accessToken) {
		return null;
	}

	return createControlPlaneClient(accessToken, baseUrl);
}
