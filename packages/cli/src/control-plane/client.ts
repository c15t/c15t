import { z } from 'zod';

import { withLegacySessionNotice } from '../auth/legacy';
import { CliError } from '../core/errors';
import { runInth } from '../inth/runner';
import type { Instance } from '../types';
import type {
	ControlPlaneClientConfig,
	ControlPlaneOrganization,
	ControlPlaneRegion,
	CreateInstanceRequest,
} from './types';

const projectSchema = z.object({
	consent: z.object({ backendUrl: z.string().url().nullable() }).nullish(),
	createdAt: z.string().optional(),
	id: z.string().min(1),
	name: z.string(),
	organizationSlug: z.string().optional(),
	region: z.string().optional(),
});
const organizationSchema = z.object({
	id: z.string(),
	name: z.string(),
	slug: z.string(),
});
const regionSchema = z.object({
	id: z.string(),
	label: z.string().optional(),
	name: z.string().optional(),
});
const parseResponse = <Output>(
	schema: z.ZodType<Output>,
	value: unknown
): Output => {
	const result = schema.safeParse(value);
	if (!result.success) {
		throw new CliError('API_ERROR', {
			details: 'Invalid Inth resource data.',
		});
	}
	return result.data;
};
const mapProject = (raw: z.infer<typeof projectSchema>): Instance => {
	let status: Instance['status'] = 'inactive';
	if (raw.consent) {
		status = raw.consent.backendUrl ? 'active' : 'pending';
	}
	return {
		createdAt: raw.createdAt,
		id: raw.id,
		name: raw.name,
		organizationSlug: raw.organizationSlug,
		region: raw.region,
		status,
		url: raw.consent?.backendUrl ?? '',
	};
};

/** Hosted project operations delegated to Inth's authenticated native executable. */
export class ControlPlaneClient {
	private readonly config: ControlPlaneClientConfig;
	constructor(config: ControlPlaneClientConfig = {}) {
		this.config = config;
	}

	/** Run Inth, explaining a leftover pre-Inth c15t session when signed out. */
	private async run(args: string[]): Promise<unknown> {
		try {
			return await runInth(args, this.config);
		} catch (error) {
			throw await withLegacySessionNotice(error);
		}
	}

	private async detail(args: string[]): Promise<unknown> {
		const value = await this.run(args);
		const parsed = z
			.object({ data: z.unknown(), success: z.literal(true) })
			.safeParse(value);
		if (!parsed.success) {
			throw new CliError('API_ERROR', {
				details: 'Invalid Inth resource response.',
			});
		}
		return parsed.data.data;
	}

	private async list(args: string[], paginated: boolean): Promise<unknown[]> {
		const items: unknown[] = [];
		const seen: string[] = [];
		let cursor: string | undefined;
		do {
			// Each page depends on the preceding cursor.
			// oxlint-disable-next-line no-await-in-loop
			const value = await this.run([
				...args,
				...(cursor ? ['--cursor', cursor] : []),
			]);
			const parsed = z
				.object({
					data: z.array(z.unknown()),
					pagination: z
						.object({ hasMore: z.boolean(), nextCursor: z.string().nullable() })
						.optional(),
					success: z.literal(true),
				})
				.safeParse(value);
			if (!parsed.success) {
				throw new CliError('API_ERROR', {
					details: 'Invalid Inth list response.',
				});
			}
			items.push(...parsed.data.data);
			const page = parsed.data.pagination;
			cursor =
				paginated && page?.hasMore ? (page.nextCursor ?? undefined) : undefined;
			if (paginated && page?.hasMore && (!cursor || seen.includes(cursor))) {
				throw new CliError('API_ERROR', {
					details: 'Invalid or repeated Inth pagination cursor.',
				});
			}
			if (cursor) {
				seen.push(cursor);
			}
		} while (cursor);
		return items;
	}

	/** List all organizations available through Inth. */
	async listOrganizations(): Promise<ControlPlaneOrganization[]> {
		return parseResponse(
			z.array(organizationSchema),
			await this.list(['org', 'list'], true)
		).map((raw) => ({
			organizationId: raw.id,
			organizationName: raw.name,
			organizationSlug: raw.slug,
		}));
	}
	/** List current project regions without legacy backend-version filtering. */
	async listRegions(): Promise<ControlPlaneRegion[]> {
		return parseResponse(
			z.array(regionSchema),
			await this.list(['region', 'list'], false)
		).map((raw) => ({ id: raw.id, label: raw.label ?? raw.name ?? raw.id }));
	}
	/** List all projects in Inth's linked or selected organization. */
	async listInstances(): Promise<Instance[]> {
		const args = [
			'project',
			'list',
			...(this.config.organization
				? ['--organization', this.config.organization]
				: []),
		];
		return parseResponse(
			z.array(projectSchema),
			await this.list(args, true)
		).map(mapProject);
	}
	/** Read a project by its ID. */
	async getInstance(id: string): Promise<Instance> {
		return mapProject(
			parseResponse(projectSchema, await this.detail(['project', 'get', id]))
		);
	}
	/** Create a consent project through Inth's current provisioning command. */
	async createInstance(request: CreateInstanceRequest): Promise<Instance> {
		const { organizationSlug, region, trustedOrigins } = request.config;
		const args = [
			'project',
			'create',
			'--name',
			request.name,
			'--region',
			region,
			'--organization',
			organizationSlug,
			'--branding',
			'c15t',
		];
		if (trustedOrigins) {
			args.push('--trusted-origins', JSON.stringify(trustedOrigins));
		}
		return mapProject(parseResponse(projectSchema, await this.detail(args)));
	}
}

/** Create an adapter; authentication and token refresh remain inside Inth. */
export const createControlPlaneClient = (
	config: ControlPlaneClientConfig = {}
): Promise<ControlPlaneClient> =>
	Promise.resolve(new ControlPlaneClient(config));
/** Create an adapter in the application directory so Inth resolves its organization link. */
export const createControlPlaneClientFromConfig = (
	cwd = process.cwd()
): Promise<ControlPlaneClient> => createControlPlaneClient({ cwd });
