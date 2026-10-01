import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
	LINKED_C15T_PACKAGES,
	c15tReleaseSpecifier,
	dependencyName,
	withC15tRelease,
} from './c15t-release';

describe('c15t release specifier', () => {
	it.each([
		['3.0.0-alpha.3', 'alpha'],
		['3.1.0-rc.1', 'rc'],
		['3.0.0-canary-0123456789abcdef0123456789abcdef01234567.0', 'canary'],
		['3.2.1', '3'],
		['4.0.0', '4'],
	])('selects %s packages with %s', (version, specifier) => {
		expect(c15tReleaseSpecifier(version)).toBe(specifier);
	});

	it.each([
		['c15t', 'c15t@alpha'],
		['@c15t/scripts', '@c15t/scripts@alpha'],
		['@c15t/svelte', '@c15t/svelte@alpha'],
		['@c15t/browser', '@c15t/browser@alpha'],
		['@c15t/backend', '@c15t/backend@alpha'],
		['svelte', 'svelte'],
		['@astrojs/svelte', '@astrojs/svelte'],
		['c15t@2.0.0', 'c15t@2.0.0'],
	])('pins %s to %s for an alpha CLI', (dependency, pinned) => {
		expect(withC15tRelease(dependency, '3.0.0-alpha.3')).toBe(pinned);
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
		['@c15t/integrations', '@c15t/integrations@latest'],
		['@c15t/svelte', '@c15t/svelte@latest'],
	])('pins %s to %s for a stable CLI', (dependency, pinned) => {
		expect(withC15tRelease(dependency, '3.2.1')).toBe(pinned);
	});

	it('keeps the dist-tag for unlinked packages on a prerelease CLI', () => {
		expect(c15tReleaseSpecifier('3.0.0-alpha.3', '@c15t/ui')).toBe('alpha');
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
