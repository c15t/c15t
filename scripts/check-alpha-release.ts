import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface ReleaseManifest {
	name: string;
	private?: boolean;
	version?: string;
}

/** Reject a missing prerelease state or versions from another release channel. */
export const checkAlphaRelease = function checkAlphaRelease(
	root: string,
	beforeVersion = false
): void {
	const pre = JSON.parse(
		readFileSync(join(root, '.changeset/pre.json'), 'utf8')
	) as { mode?: string; tag?: string };
	if (pre.mode !== 'pre' || pre.tag !== 'alpha') {
		throw new Error('Alpha releases require active Changesets alpha mode.');
	}

	const packagesDir = join(root, 'packages');
	const manifests = readdirSync(packagesDir)
		.map((directory) => join(packagesDir, directory, 'package.json'))
		.filter((manifestPath) => existsSync(manifestPath))
		.map(
			(manifestPath) =>
				JSON.parse(readFileSync(manifestPath, 'utf8')) as ReleaseManifest
		)
		.filter((manifest) => !manifest.private);

	if (manifests.length === 0) {
		throw new Error('No public packages found for the alpha release.');
	}

	for (const manifest of manifests) {
		const version = manifest.version ?? '';
		const alpha = /^3\.0\.0-alpha\.(?:0|[1-9]\d*)$/u.test(version);
		const baseline = beforeVersion && /^2\.\d+\.\d+$/u.test(version);
		if (!(alpha || baseline)) {
			throw new Error(
				`${manifest.name}@${version}: expected a v3 alpha${beforeVersion ? ' or a stable 2.x versioning baseline' : ''}.`
			);
		}
	}
};

if (import.meta.main) {
	checkAlphaRelease(process.cwd(), process.argv.includes('--before-version'));
}
