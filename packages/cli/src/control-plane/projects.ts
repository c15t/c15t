import { CliError } from '../core/errors';
import { requireProjectBackendURL, resolveProject } from '../frontend/projects';
import type { Instance } from '../types';
import type { ControlPlaneClient } from './client';
import type { CreateInstanceRequest } from './types';

/** Resolve a project by ID or unambiguous name, including organization/name. */
export const resolveInstance = (
	query: string,
	instances: Instance[]
): Instance => {
	try {
		return resolveProject(query, instances);
	} catch (error) {
		throw CliError.from(error, 'INSTANCE_NOT_FOUND');
	}
};

/** Require a provisioned backend before writing application configuration. */
export const requireInstanceBackendUrl = (instance: Instance): string => {
	try {
		return requireProjectBackendURL(instance);
	} catch (error) {
		throw CliError.from(error, 'API_ERROR');
	}
};

/** Validate a project creation request before provisioning. */
export const createProject = async (
	client: ControlPlaneClient,
	request: CreateInstanceRequest
): Promise<Instance> => {
	const name = request.name.trim();
	if (!name) {
		throw new CliError('FLAG_INVALID', { details: 'Enter a project name.' });
	}
	const [organizations, regions] = await Promise.all([
		client.listOrganizations(),
		client.listRegions(),
	]);
	if (
		!organizations.some(
			(organization) =>
				organization.organizationSlug === request.config.organizationSlug ||
				organization.organizationId === request.config.organizationSlug
		)
	) {
		throw new CliError('API_ERROR', {
			details: 'The selected organization is not available to this account',
		});
	}
	if (!regions.some((region) => region.id === request.config.region)) {
		throw new CliError('API_ERROR', {
			details: 'The selected region is unavailable',
		});
	}
	const organization = organizations.find(
		(item) =>
			item.organizationSlug === request.config.organizationSlug ||
			item.organizationId === request.config.organizationSlug
	);
	return client.createInstance({
		...request,
		config: {
			...request.config,
			organizationSlug:
				organization?.organizationId ?? request.config.organizationSlug,
		},
		name,
	});
};
