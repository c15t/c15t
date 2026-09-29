import { packageInfo } from '../package-info';

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
 * The npm specifier that selects the c15t release this CLI generates code
 * for. Prereleases use their dist-tag (`3.0.0-alpha.3` becomes `alpha`,
 * a canary snapshot becomes `canary`) because the linked packages do not
 * all share one version number. Stable releases use their major version,
 * so an older CLI keeps installing the API it writes code against.
 *
 * @param version - CLI version. Defaults to the running CLI.
 * @returns A dist-tag or a major version range.
 *
 * @example
 * ```ts
 * c15tReleaseSpecifier('3.0.0-alpha.3'); // 'alpha'
 * c15tReleaseSpecifier('3.2.1'); // '3'
 * ```
 */
export const c15tReleaseSpecifier = function c15tReleaseSpecifier(
	version: string = packageInfo.version
): string {
	const separator = version.indexOf('-');
	if (separator !== -1) {
		const [tag = 'latest'] = version.slice(separator + 1).split(/[.-]/u);
		return tag;
	}
	const [major = version] = version.split('.');
	return major;
};

/**
 * Pin a c15t dependency to the CLI's release line. Other packages and
 * requests that already carry a version are returned unchanged.
 *
 * @param dependency - Package name to install.
 * @param version - CLI version. Defaults to the running CLI.
 * @returns For example `c15t@alpha` for `c15t` from a `3.0.0-alpha.3` CLI.
 */
export const withC15tRelease = function withC15tRelease(
	dependency: string,
	version: string = packageInfo.version
): string {
	if (dependencyName(dependency) !== dependency) {
		return dependency;
	}
	if (!isC15tPackage(dependency)) {
		return dependency;
	}
	return `${dependency}@${c15tReleaseSpecifier(version)}`;
};
