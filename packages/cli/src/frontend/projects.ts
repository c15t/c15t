/** A hosted project supplied by the host's authenticated API client. */
export interface HostedProject {
	id: string;
	name: string;
	organizationSlug?: string;
	region?: string;
	url: string;
	createdAt?: string;
	status: 'active' | 'inactive' | 'pending';
}

/**
 * Resolve a project by ID or an unambiguous name, including organization/name.
 * @param query Project ID, name, or organization/name.
 * @param projects Projects supplied by the host.
 * @returns The matching project without changing host state.
 * @throws {Error} When no project matches or its name is ambiguous.
 */
export const resolveProject = (
	query: string,
	projects: readonly HostedProject[]
): HostedProject => {
	const byId = projects.find((project) => project.id === query);
	if (byId) {
		return byId;
	}
	const matches = projects.filter(
		(project) =>
			project.name === query ||
			(project.organizationSlug !== undefined &&
				`${project.organizationSlug}/${project.name}` === query)
	);
	if (matches.length > 1) {
		throw new Error(
			`Project name "${query}" is ambiguous. Use an ID or organization/name.`
		);
	}
	const [project] = matches;
	if (!project) {
		throw new Error(`Project not found: ${query}`);
	}
	return project;
};

/**
 * Require a provisioned backend before generating application configuration.
 * @param project Project supplied by the host.
 * @returns Its provisioned backend URL.
 * @throws {Error} When the backend is unavailable or its URL is invalid.
 */
export const requireProjectBackendURL = (project: HostedProject): string => {
	if (project.status !== 'active' || !project.url) {
		throw new Error(
			`Project "${project.name}" is still provisioning. Wait for its backend to become ready and retry.`
		);
	}
	const url = new URL(project.url);
	if (
		(url.protocol !== 'https:' && url.protocol !== 'http:') ||
		url.username ||
		url.password
	) {
		throw new Error(
			'Use an HTTP or HTTPS backend URL without embedded credentials.'
		);
	}
	return project.url;
};

/** Project listing data. The host owns fetching and selection persistence. */
export interface ProjectListResult {
	projects: HostedProject[];
	selectedProject?: string | null;
}

/**
 * Describe the host's available projects and current selection.
 * @param projects Projects supplied by the host's API client.
 * @param selectedProject Current selected project ID, if any.
 * @returns A project listing without network or credential-store access.
 */
export const listProjects = (
	projects: readonly HostedProject[],
	selectedProject?: string | null
): ProjectListResult => ({ projects: projects.slice(), selectedProject });

/**
 * Select a project without persisting the selection.
 * @param query Project ID, name, or organization/name.
 * @param projects Projects supplied by the host's API client.
 * @returns The resolved project and its ID for the host to persist.
 * @throws {Error} When no project matches or its name is ambiguous.
 */
export const selectProject = (
	query: string,
	projects: readonly HostedProject[]
) => {
	const project = resolveProject(query, projects);
	return { project, selectedProject: project.id };
};
