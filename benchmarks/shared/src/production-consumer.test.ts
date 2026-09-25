import { describe, expect, it } from 'vitest';

import {
	consumerPackageJson,
	consumerScenarios,
	interleaveArms,
	packedTarballName,
	parseConsumerArm,
	workspaceDependencyClosure,
} from './production-consumer';
import type { WorkspacePackageInfo } from './production-consumer';

describe('parseConsumerArm', () => {
	it.each([
		['head=workspace', { kind: 'workspace' }],
		['base=root:/src/c15t', { kind: 'root', path: '/src/c15t' }],
		['a=tarballs:/tmp/a', { dir: '/tmp/a', kind: 'tarballs' }],
		['alpha2=npm:3.0.0-alpha.2', { kind: 'npm', version: '3.0.0-alpha.2' }],
	])('parses %s', (spec, source) => {
		expect(parseConsumerArm(spec).source).toEqual(source);
	});

	it.each(['workspace', 'Head=workspace', 'a=root:', 'a=git:main'])(
		'rejects %s',
		(spec) => {
			expect(() => parseConsumerArm(spec)).toThrow('Invalid');
		}
	);
});

describe('workspaceDependencyClosure', () => {
	const packages = new Map<string, WorkspacePackageInfo>(
		[
			{
				dependencies: { '@c15t/react': 'workspace:*', react: '^19' },
				dir: 'c15t',
				name: 'c15t',
				version: '3.0.0',
			},
			{
				dependencies: { '@c15t/core': 'workspace:*' },
				dir: 'react',
				name: '@c15t/react',
				peerDependencies: { react: '^19' },
				version: '3.0.0',
			},
			{ dir: 'core', name: '@c15t/core', version: '3.0.0' },
			{ dir: 'cli', name: '@c15t/cli', version: '3.0.0' },
		].map((info) => [info.name, info])
	);

	it('follows workspace specifiers only', () => {
		expect(
			workspaceDependencyClosure(packages, 'c15t').map((info) => info.name)
		).toEqual(['c15t', '@c15t/react', '@c15t/core']);
	});

	it('throws for an unknown root', () => {
		expect(() => workspaceDependencyClosure(packages, 'nope')).toThrow(
			'not found'
		);
	});
});

describe('packedTarballName', () => {
	it('matches pack output for scoped and unscoped names', () => {
		expect(packedTarballName('@c15t/core', '3.0.0-alpha.2')).toBe(
			'c15t-core-3.0.0-alpha.2.tgz'
		);
		expect(packedTarballName('c15t', '3.0.0-alpha.2')).toBe(
			'c15t-3.0.0-alpha.2.tgz'
		);
	});
});

describe('consumerPackageJson', () => {
	const versions = {
		nextVersion: '16.2.10',
		reactVersion: '19.2.7',
		typesNodeVersion: '22.19.11',
		typesReactDomVersion: '19.2.3',
		typesReactVersion: '19.2.17',
		typescriptVersion: '6.0.3',
	};

	it('installs c15t from its tarball and overrides every scoped package', () => {
		const manifest = consumerPackageJson({
			...versions,
			tarballs: new Map([
				['c15t', '/t/c15t.tgz'],
				['@c15t/core', '/t/core.tgz'],
			]),
		});
		expect(manifest.dependencies).toMatchObject({
			c15t: 'file:/t/c15t.tgz',
			next: '16.2.10',
		});
		expect(manifest.overrides).toEqual({ '@c15t/core': 'file:/t/core.tgz' });
	});

	it('installs a published version without overrides', () => {
		const manifest = consumerPackageJson({
			...versions,
			c15tVersion: '3.0.0-alpha.2',
		});
		expect(manifest.dependencies).toMatchObject({ c15t: '3.0.0-alpha.2' });
		expect(manifest.overrides).toEqual({});
	});

	it('requires the umbrella tarball', () => {
		expect(() =>
			consumerPackageJson({
				...versions,
				tarballs: new Map([['@c15t/core', '/t/core.tgz']]),
			})
		).toThrow('no c15t package');
	});
});

describe('consumerScenarios', () => {
	it('gives every cold state its own scenario', () => {
		const states = consumerScenarios.map((scenario) => [
			scenario.name,
			scenario.coldState.browserCache,
			scenario.coldState.sdkManifestCache,
			scenario.coldState.frameworkProcess,
			scenario.coldState.cdnEdge,
		]);
		expect(states).toEqual([
			['fresh', 'cold', 'warm', 'warm', 'not-measured'],
			['fresh-warm-browser-cache', 'warm', 'warm', 'warm', 'not-measured'],
			['fresh-cold-sdk-manifest', 'cold', 'cold', 'warm', 'not-measured'],
			['fresh-cold-process', 'cold', 'cold', 'cold', 'not-measured'],
			['saved-consent-accept', 'cold', 'warm', 'warm', 'not-measured'],
			['saved-consent-reject', 'cold', 'warm', 'warm', 'not-measured'],
		]);
	});
});

describe('interleaveArms', () => {
	it('alternates arm order between iterations', () => {
		expect(interleaveArms(['a', 'b'], 0)).toEqual(['a', 'b']);
		expect(interleaveArms(['a', 'b'], 1)).toEqual(['b', 'a']);
	});
});
