/**
 * Resolves a `workspace:` protocol range to a publishable version range.
 *
 * `workspace:*` resolves to the **exact** workspace version, with no range
 * operator. That exactness is load-bearing for the `c15t` umbrella package:
 * its shims re-export subpaths that must exist in the scoped package the
 * exports map was generated from, so the published umbrella must pin
 * `@c15t/core`, `@c15t/react`, and `@c15t/nextjs` to the versions it was
 * released with — a `^`/`~` range could let a fresh install resolve a scoped
 * package whose exports have drifted from the umbrella's committed map.
 * `workspace-protocol.test.ts` locks both this mapping and the umbrella's
 * use of `workspace:*`.
 *
 * @param value - The dependency range as written in the workspace manifest.
 * @param resolvedVersion - The current version of the workspace package.
 * @returns The range to publish.
 */
export function resolveWorkspaceProtocol(
	value: string,
	resolvedVersion: string
): string {
	if (value === 'workspace:*') {
		return resolvedVersion;
	}
	if (value === 'workspace:^') {
		return `^${resolvedVersion}`;
	}
	if (value === 'workspace:~') {
		return `~${resolvedVersion}`;
	}
	if (value.startsWith('workspace:')) {
		return value.replace('workspace:', '');
	}
	return value;
}
