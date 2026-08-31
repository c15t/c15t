import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { resolveWorkspaceProtocol } from './workspace-protocol';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('resolveWorkspaceProtocol', () => {
	it('pins workspace:* to the exact version, with no range operator', () => {
		expect(resolveWorkspaceProtocol('workspace:*', '2.2.0')).toBe('2.2.0');
		expect(
			resolveWorkspaceProtocol('workspace:*', '2.2.0-canary-20260731105620')
		).toBe('2.2.0-canary-20260731105620');
	});

	it('maps workspace:^ and workspace:~ to the matching range', () => {
		expect(resolveWorkspaceProtocol('workspace:^', '2.2.0')).toBe('^2.2.0');
		expect(resolveWorkspaceProtocol('workspace:~', '2.2.0')).toBe('~2.2.0');
	});

	it('unwraps explicit workspace ranges and passes other ranges through', () => {
		expect(resolveWorkspaceProtocol('workspace:2.0.0', '2.2.0')).toBe('2.0.0');
		expect(resolveWorkspaceProtocol('^2.2.0', '2.2.0')).toBe('^2.2.0');
	});
});

/**
 * The umbrella facade must publish with exact pins on its scoped packages:
 * its committed exports map and shims are generated from specific scoped
 * manifests, so a range would let installs drift onto scoped versions the
 * umbrella was not generated against. `workspace:*` is what resolves to an
 * exact pin at publish time (see resolveWorkspaceProtocol).
 */
describe('c15t umbrella dependencies', () => {
	const manifest = JSON.parse(
		readFileSync(join(REPO_ROOT, 'packages', 'c15t', 'package.json'), 'utf8')
	) as { dependencies?: Record<string, string>; peerDependencies?: unknown };

	it.each([
		'@c15t/core',
		'@c15t/react',
		'@c15t/nextjs',
		'@c15t/vue',
		'@c15t/ui',
	])(
		'depends on %s via workspace:* so publish pins the exact version',
		(dependency) => {
			expect(manifest.dependencies?.[dependency]).toBe('workspace:*');
		}
	);

	it('declares no peer dependencies of its own', () => {
		expect(manifest.peerDependencies).toBeUndefined();
	});
});
