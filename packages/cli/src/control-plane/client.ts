import { z } from 'zod';

import {
	getControlPlaneBaseUrl,
	getControlPlaneOrigin,
} from '../auth/base-url';
import { fetchWithDeadline } from '../auth/http';
import { TIMEOUTS } from '../constants';
import { CliError } from '../core/errors';
import type { Instance } from '../types';
import type {
	ControlPlaneClientConfig,
	ControlPlaneOrganization,
	ControlPlaneRegion,
	CreateInstanceRequest,
} from './types';

const organizationSchema = z.object({
	organizationId: z.string(),
	organizationName: z.string(),
	organizationSlug: z.string(),
	role: z.string(),
});
const regionSchema = z.object({
	family: z.string(),
	id: z.string(),
	label: z.string(),
});
const instanceSchema = z.object({
	backendURL: z.string().url().nullish(),
	createdAt: z.string().optional(),
	instanceId: z.string().min(1),
	instanceName: z.string(),
	organizationSlug: z.string().optional(),
	region: z
		.union([
			z.string(),
			z.object({
				code: z.string().optional(),
				id: z.string().optional(),
				slug: z.string().optional(),
			}),
		])
		.nullish(),
	regionId: z.string().optional(),
	regionSlug: z.string().optional(),
});

const mapInstance = (raw: z.infer<typeof instanceSchema>): Instance => ({
	createdAt: raw.createdAt,
	id: raw.instanceId,
	name: raw.instanceName,
	organizationSlug: raw.organizationSlug,
	region:
		(typeof raw.region === 'string'
			? raw.region
			: (raw.region?.id ?? raw.region?.slug ?? raw.region?.code)) ??
		raw.regionId ??
		raw.regionSlug,
	status: raw.backendURL ? 'active' : 'pending',
	url: raw.backendURL ?? '',
});

/** Validated HTTP operations for hosted projects. No terminal or credential storage access. */
export class ControlPlaneClient {
	private readonly config: ControlPlaneClientConfig;

	constructor(config: ControlPlaneClientConfig) {
		getControlPlaneOrigin(config.baseUrl);
		this.config = {
			...config,
			baseUrl: config.baseUrl.replace(/\/+$/u, ''),
			timeout: config.timeout ?? TIMEOUTS.CONTROL_PLANE_CONNECTION,
		};
	}

	private async request<Output>(
		path: string,
		schema: z.ZodType<Output>,
		init?: { method?: string; body?: unknown }
	): Promise<Output> {
		let response: Response;
		try {
			response = await fetchWithDeadline(
				`${this.config.baseUrl}/api/v1${path}`,
				{
					body:
						init?.body === undefined ? undefined : JSON.stringify(init.body),
					headers: {
						Authorization: `Bearer ${this.config.accessToken}`,
						'Content-Type': 'application/json',
					},
					method: init?.method ?? 'GET',
					signal: this.config.signal,
				},
				this.config.timeout
			);
		} catch (error) {
			if (this.config.signal?.aborted) {
				throw new CliError('CANCELLED');
			}
			throw new CliError('API_ERROR', {
				details:
					error instanceof Error && error.name === 'TimeoutError'
						? 'Control-plane request timed out'
						: 'Could not reach the control plane',
			});
		}
		const payload: unknown = await response.json().catch(() => null);
		const envelope = z
			.object({ data: schema, success: z.literal(true) })
			.safeParse(payload);
		if (response.ok && envelope.success) {
			return envelope.data.data;
		}
		const failure = z
			.object({
				error: z
					.object({
						code: z.string().optional(),
						message: z.string().optional(),
					})
					.optional(),
			})
			.safeParse(payload);
		const message = failure.success ? failure.data.error?.message : undefined;
		throw new CliError(
			response.status === 401 ? 'AUTH_TOKEN_INVALID' : 'API_ERROR',
			{
				details: `${response.status} ${message ?? (response.ok ? 'Invalid control-plane response' : 'Request failed')}`,
			}
		);
	}

	/** List organizations available to the authenticated user. */
	listOrganizations(): Promise<ControlPlaneOrganization[]> {
		return this.request('/consent/organizations', z.array(organizationSchema));
	}
	/** List available provisioning regions. */
	listRegions(): Promise<ControlPlaneRegion[]> {
		return this.request('/consent/regions', z.array(regionSchema));
	}
	/** List hosted projects. Pending projects have no backend URL. */
	async listInstances(): Promise<Instance[]> {
		return (
			await this.request('/consent/instances', z.array(instanceSchema))
		).map(mapInstance);
	}
	/** Find a hosted project by ID. */
	async getInstance(id: string): Promise<Instance> {
		const instance = (await this.listInstances()).find(
			(item) => item.id === id
		);
		if (!instance) {
			throw new CliError('INSTANCE_NOT_FOUND', {
				details: `Project not found: ${id}`,
			});
		}
		return instance;
	}
	/** Create a development project in the selected organization and region. */
	async createInstance(request: CreateInstanceRequest): Promise<Instance> {
		const { organizationSlug, region, trustedOrigins } = request.config;
		if (!organizationSlug || !region) {
			throw new CliError('API_ERROR', {
				details: 'organizationSlug and region are required',
			});
		}
		return mapInstance(
			await this.request('/consent/instances', instanceSchema, {
				body: {
					name: request.name,
					organizationSlug,
					production: false,
					region,
					trustedOrigins: trustedOrigins ?? [],
					useV2: true,
				},
				method: 'POST',
			})
		);
	}
	/** Delete a hosted project by ID. */
	async deleteInstance(id: string): Promise<void> {
		await this.request(
			`/consent/instances/${encodeURIComponent(id)}`,
			z.unknown(),
			{ method: 'DELETE' }
		);
	}
}

/** Create an HTTP client with explicit credentials. */
export const createControlPlaneClient = (
	accessToken: string,
	baseUrl = getControlPlaneBaseUrl()
): Promise<ControlPlaneClient> =>
	Promise.resolve(new ControlPlaneClient({ accessToken, baseUrl }));
/** Create a client using credentials belonging to this control-plane origin. */
export const createControlPlaneClientFromConfig = async (
	baseUrl = getControlPlaneBaseUrl()
): Promise<ControlPlaneClient | null> => {
	const { getAccessToken } = await import('../auth/config-store');
	const accessToken = await getAccessToken(baseUrl);
	return accessToken ? createControlPlaneClient(accessToken, baseUrl) : null;
};
