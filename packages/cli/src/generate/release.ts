import { version as cliVersion } from './version.ts';

/**
 * Whether a package belongs to c15t and should be installed from the same
 * release line as the CLI.
 *
 * @param name - Bare package name, without a version specifier.
 * @returns `true` for `c15t` and every `@c15t/*` package.
 */
export const isC15tPackage = function isC15tPackage(name: string): boolean {
	return name === 'c15t' || name.startsWith('@c15t/');
};

/**
 * Strip a version specifier from a dependency request.
 *
 * @param dependency - A request such as `c15t`, `c15t@alpha` or
 * `@c15t/scripts@3.0.0`.
 * @returns The package name, such as `c15t` or `@c15t/scripts`.
 */
export const dependencyName = function dependencyName(
	dependency: string
): string {
	const separator = dependency.indexOf('@', 1);
	return separator === -1 ? dependency : dependency.slice(0, separator);
};

/**
 * Packages that `scripts/tegami.ts` releases as one linked group, so they
 * share a major version. The CLI cannot import repository scripts, so the
 * list is copied here; `c15t-release.test.ts` fails when the two drift.
 */
export const LINKED_C15T_PACKAGES: ReadonlySet<string> = new Set([
	'c15t',
	'@c15t/backend',
	'@c15t/cli',
	'@c15t/core',
	'@c15t/dev-tools',
	'@c15t/iab',
	'@c15t/nextjs',
	'@c15t/node-sdk',
	'@c15t/react',
	'@c15t/tanstack-start',
	'@c15t/translations',
]);

/**
 * The npm specifier that selects the c15t release this CLI generates code
 * for. Prereleases use their dist-tag (`3.0.0-alpha.3` becomes `alpha`,
 * a canary snapshot becomes `canary`) because the linked packages do not
 * all share one version number. Stable releases use their major version,
 * so an older CLI keeps installing the API it writes code against.
 *
 * Pass `name` for a specific package: on a stable CLI, packages outside the
 * linked release group version on their own and get `latest` instead of
 * the CLI's major.
 *
 * @param version - CLI version. Defaults to the CLI that published this source.
 * @param name - Package the specifier is for. Defaults to a linked package.
 * @returns A dist-tag or a major version range.
 *
 * @example
 * ```ts
 * c15tReleaseSpecifier('3.0.0-alpha.3'); // 'alpha'
 * c15tReleaseSpecifier('3.2.1'); // '3'
 * c15tReleaseSpecifier('3.2.1', '@c15t/ui'); // 'latest'
 * ```
 */
export const c15tReleaseSpecifier = function c15tReleaseSpecifier(
	version: string = cliVersion,
	name = 'c15t'
): string {
	const separator = version.indexOf('-');
	if (separator !== -1) {
		const [tag = 'latest'] = version.slice(separator + 1).split(/[.-]/u);
		return tag;
	}
	if (!LINKED_C15T_PACKAGES.has(name)) {
		return 'latest';
	}
	const [major = version] = version.split('.');
	return major;
};

/**
 * Pin a c15t dependency to the CLI's release line. Other packages and
 * requests that already carry a version are returned unchanged.
 *
 * @param dependency - Package name to install.
 * @param version - CLI version. Defaults to the CLI that published this source.
 * @returns For example `c15t@alpha` for `c15t` from a `3.0.0-alpha.3` CLI.
 */
export const withC15tRelease = function withC15tRelease(
	dependency: string,
	version: string = cliVersion
): string {
	if (dependencyName(dependency) !== dependency) {
		return dependency;
	}
	if (!isC15tPackage(dependency)) {
		return dependency;
	}
	return `${dependency}@${c15tReleaseSpecifier(version, dependency)}`;
};

/**
 * Describe the release-line specifiers for an agent installing c15t.
 *
 * @param version - CLI version. Defaults to the CLI that published this source.
 * @returns One sentence naming the specifier for each kind of c15t package.
 *
 * @example
 * ```ts
 * describeC15tRelease('3.0.0-alpha.3');
 * // 'Install every c15t package with the @alpha dist-tag.'
 * ```
 */
export const describeC15tRelease = function describeC15tRelease(
	version: string = cliVersion
): string {
	const linked = c15tReleaseSpecifier(version, 'c15t');
	const other = c15tReleaseSpecifier(version, '@c15t/ui');
	if (linked === other) {
		return `Install every c15t package with the @${linked} dist-tag.`;
	}
	return `Install ${[...LINKED_C15T_PACKAGES].join(', ')} with @${linked}, and other @c15t packages with @${other}.`;
};
