import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
	LINKED_C15T_PACKAGES,
	c15tReleaseSpecifier,
	dependencyName,
	isOnC15tRelease,
	withC15tRelease,
} from './c15t-release';

describe('c15t release specifier', () => {
	it.each([
		['3.0.0-alpha.3', '3'],
		['3.1.0-rc.1', '3'],
		['3.1.0-canary.0', '3'],
		['3.2.1', '3'],
		['4.0.0', '4'],
	])('selects %s packages with %s', (version, specifier) => {
		expect(c15tReleaseSpecifier(version)).toBe(specifier);
	});

	it.each([
		['c15t', 'c15t@3'],
		['@c15t/backend', '@c15t/backend@3'],
		['@c15t/ui', '@c15t/ui@latest'],
		['@c15t/svelte', '@c15t/svelte@latest'],
		['svelte', 'svelte'],
		['@astrojs/svelte', '@astrojs/svelte'],
		['c15t@2.0.0', 'c15t@2.0.0'],
	])('pins %s to %s for a canary CLI', (dependency, pinned) => {
		expect(withC15tRelease(dependency, '3.1.0-canary.0')).toBe(pinned);
	});

	it.each([
		['c15t', 'c15t'],
		['c15t@alpha', 'c15t'],
		['@c15t/scripts', '@c15t/scripts'],
		['@c15t/scripts@3.0.0-alpha.2', '@c15t/scripts'],
	])('reads the package name from %s', (dependency, name) => {
		expect(dependencyName(dependency)).toBe(name);
	});

	it.each([
		['c15t', 'c15t@3'],
		['@c15t/react', '@c15t/react@3'],
		['@c15t/dev-tools', '@c15t/dev-tools@3'],
		['@c15t/ui', '@c15t/ui@latest'],
		['@c15t/integrations', '@c15t/integrations@3'],
		['@c15t/svelte', '@c15t/svelte@latest'],
	])('pins %s to %s for a stable CLI', (dependency, pinned) => {
		expect(withC15tRelease(dependency, '3.2.1')).toBe(pinned);
	});

	it('lists the same linked packages as scripts/tegami.ts', () => {
		const tegami = readFileSync(
			fileURLToPath(new URL('../../../../scripts/tegami.ts', import.meta.url)),
			'utf-8'
		);
		const list = /linkedPackages = new Set\(\[(?<list>[^\]]*)\]\)/u.exec(tegami)
			?.groups?.list;
		const names = [...(list ?? '').matchAll(/'(?<name>[^']+)'/gu)].map(
			(match) => match.groups?.name
		);

		expect(names.length).toBeGreaterThan(0);
		expect([...LINKED_C15T_PACKAGES].toSorted()).toEqual(names.toSorted());
	});
});

describe('declared c15t ranges', () => {
	it.each([
		['c15t', '^3.0.0-alpha.1', '3.1.0-canary.0', true],
		['c15t', '3.0.0-alpha.3', '3.1.0-canary.0', true],
		['@c15t/react', '^3.0.0', '3.1.0-canary.0', true],
		['@c15t/react', '^2.0.0', '3.1.0-canary.0', false],
		['@c15t/react', '2.0.0-rc.4', '3.1.0-canary.0', false],
		['c15t', '^3.0.0-rc.1', '3.1.0-canary.0', true],
		['@c15t/ui', '^2.1.0', '3.1.0-canary.0', true],
		['c15t', '^3.1.0', '3.2.1', true],
		['c15t', '~3.0.0-alpha.3', '3.2.1', true],
		['@c15t/react', '^2.0.0', '3.2.1', false],
		['@c15t/ui', '^2.0.0', '3.2.1', true],
		['c15t', 'workspace:*', '3.2.1', true],
		['c15t', 'link:../c15t', '3.1.0-canary.0', true],
		['c15t', 'file:../c15t.tgz', '3.1.0-canary.0', true],
		['c15t', 'latest', '3.1.0-canary.0', true],
		['c15t', 'alpha', '3.1.0-canary.0', true],
		['c15t', 'latest', '3.2.1', true],
		['c15t', 'alpha', '3.2.1', true],
		['c15t', 'npm:other-c15t@1', '3.1.0-canary.0', true],
		['c15t', '>=2.0.0 <4', '3.2.1', true],
		['c15t', '>=2 <3', '3.1.0-canary.0', false],
		['c15t', '>=2 <3', '3.2.1', false],
		['c15t', '>=2.5 <3.1', '3.2.1', true],
		['c15t', '1.0.0 - 2.9.9', '3.2.1', false],
		['c15t', '2.x', '3.2.1', false],
		['c15t', '<=2', '3.2.1', false],
		['c15t', '>2', '3.2.1', true],
		['c15t', '^2 || ^3', '3.2.1', true],
		['c15t', '*', '3.2.1', true],
		['c15t', '>= 3.0.0-alpha.1 < 4', '3.1.0-canary.0', true],
		['c15t', '^2 || >=3.0.0-alpha.1', '3.1.0-canary.0', true],
		['c15t', '>=2', '3.1.0-canary.0', true],
		['c15t', '*', '3.1.0-canary.0', true],
	])('%s@%s on a %s CLI matches: %s', (name, range, version, matches) => {
		expect(isOnC15tRelease(name, range, version)).toBe(matches);
	});
});
