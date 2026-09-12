import { CliError } from '../core/errors';
import type { Instance } from '../types';
import { validateInstanceName } from '../utils/validation';
import type { ControlPlaneClient } from './client';
import type { CreateInstanceRequest } from './types';

/** Resolve a project by ID or unambiguous name, including organization/name. */
export const resolveInstance = (
	query: string,
	instances: Instance[]
): Instance => {
	const byId = instances.find((instance) => instance.id === query);
	if (byId) {
		return byId;
	}
	const matches = instances.filter(
		(instance) =>
			instance.name === query ||
			`${instance.organizationSlug}/${instance.name}` === query
	);
	if (matches.length > 1) {
		throw new CliError('INSTANCE_NOT_FOUND', {
			details: `Project name "${query}" is ambiguous. Use an ID or organization/name.`,
		});
	}
	const [match] = matches;
	if (!match) {
		throw new CliError('INSTANCE_NOT_FOUND', {
			details: `Project not found: ${query}`,
		});
	}
	return match;
};

/** Require a provisioned backend before writing application configuration. */
export const requireInstanceBackendUrl = (instance: Instance): string => {
	if (instance.status !== 'active' || !instance.url) {
		throw new CliError('API_ERROR', {
			details: `Project "${instance.name}" is still provisioning. Wait for its backend to become ready and retry.`,
		});
	}
	return instance.url;
};

/** Validate a project creation request before provisioning. */
export const createProject = async (
	client: ControlPlaneClient,
	request: CreateInstanceRequest
): Promise<Instance> => {
	const name = request.name.trim();
	const error = validateInstanceName(name);
	if (error) {
		throw new CliError('INSTANCE_NAME_INVALID', { details: error });
	}
	const [organizations, regions] = await Promise.all([
		client.listOrganizations(),
		client.listRegions(),
	]);
	if (
		!organizations.some(
			(organization) =>
				organization.organizationSlug === request.config.organizationSlug
		)
	) {
		throw new CliError('API_ERROR', {
			details: 'The selected organization is not available to this account',
		});
	}
	if (
		!regions.some(
			(region) => region.id === request.config.region && region.family === 'v2'
		)
	) {
		throw new CliError('API_ERROR', {
			details: 'The selected region does not support v2 provisioning',
		});
	}
	return client.createInstance({ ...request, name });
};
