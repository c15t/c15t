/**
 * npm channel for portable v3 hosts, which do not import the Node CLI version.
 * Bare c15t packages intentionally use alpha while latest is v2. Explicit
 * version or tag specifiers are preserved.
 */
export const packageTag = 'alpha';

/**
 * Select the v3 npm channel for bare c15t package names.
 * @param dependency Package name or an explicit package specifier.
 * @returns An alpha specifier for c15t, preserving other and explicit specifiers.
 */
export const getInstallSpecifier = (dependency: string): string => {
	if (dependency === 'c15t') {
		return `c15t@${packageTag}`;
	}
	if (dependency.startsWith('@c15t/') && !dependency.includes('@', 1)) {
		return `${dependency}@${packageTag}`;
	}
	return dependency;
};

/**
 * Get the bare package name from a registry dependency specifier.
 * @param dependency Package name, optionally followed by a version or tag.
 * @returns The name used to look up dependencies in an application manifest.
 */
export const getDependencyName = (dependency: string): string => {
	const versionIndex = dependency.indexOf('@', 1);
	return versionIndex < 0 ? dependency : dependency.slice(0, versionIndex);
};
