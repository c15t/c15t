import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import {
	AGENT_PACKAGE_METADATA,
	AGENT_PACKAGE_ORDER,
} from './package-metadata';
import type { InstalledAgentPackage, SupportedAgentPackage } from './types';

export function supportedAgentPackages(): SupportedAgentPackage[] {
	return [...AGENT_PACKAGE_ORDER];
}

export function resolveInstalledPackageRoot(
	projectRoot: string,
	packageName: SupportedAgentPackage
) {
	const requireFromProject = createRequire(join(projectRoot, 'package.json'));
	const packageJsonPath = requireFromProject.resolve(
		`${packageName}/package.json`
	);
	return dirname(packageJsonPath);
}

function hasMarkdownDocs(docsDir: string): boolean {
	if (!existsSync(docsDir)) {
		return false;
	}

	return readdirSync(docsDir, { withFileTypes: true }).some((entry) => {
		if (entry.isFile()) {
			return entry.name.endsWith('.md');
		}

		if (entry.isDirectory()) {
			return hasMarkdownDocs(join(docsDir, entry.name));
		}

		return false;
	});
}

export function discoverInstalledAgentPackages(
	projectRoot: string
): InstalledAgentPackage[] {
	return supportedAgentPackages()
		.map((packageName) => {
			try {
				const packageRoot = resolveInstalledPackageRoot(
					projectRoot,
					packageName
				);
				const docsDir = join(packageRoot, 'dist', 'docs');
				if (!hasMarkdownDocs(docsDir)) {
					return null;
				}

				return {
					packageName,
					packageRoot,
					docsDir,
					metadata: AGENT_PACKAGE_METADATA[packageName],
				} satisfies InstalledAgentPackage;
			} catch {
				return null;
			}
		})
		.filter((value): value is InstalledAgentPackage => value !== null);
}
