import { c15tReleaseSpecifier, withC15tRelease } from './release.ts';

/**
 * npm specifier for the `c15t` package on this CLI's release line: the
 * dist-tag for a prerelease CLI (`alpha`, `canary`) and the major version for
 * a stable one. Other packages can resolve differently; use
 * `getInstallSpecifier` for a specific dependency.
 */
export const packageTag = c15tReleaseSpecifier();

/**
 * Pin bare c15t package names to the CLI's release line, the same rule the
 * Node CLI uses for its own installs.
 * @param dependency Package name or an explicit package specifier.
 * @returns A release-line specifier for c15t, preserving other and explicit specifiers.
 */
export const getInstallSpecifier = (dependency: string): string =>
	withC15tRelease(dependency);
