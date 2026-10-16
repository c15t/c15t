import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
	buildRegistry,
	scanImports,
	toFrameworkSource,
	uiC15tImports,
} from '../build-registry';
import {
	c15tEntryByFramework,
	c15tRange,
	frameworks,
	itemName,
	styles,
	uiItems,
} from '../items';

const appDir = path.resolve(import.meta.dirname, '../..');
const baseUrl = 'https://registry.test/r';

interface BuiltItem {
	name: string;
	registryDependencies: string[];
	dependencies: string[];
	files: { path: string; content: string; target?: string }[];
}

describe('toFrameworkSource', () => {
	const source = [
		'import { useConsentDraft } from "c15t/react"',
		'import { useTranslations } from "c15t/react/headless"',
		'import { Button } from "@/components/ui/button"',
	].join('\n');

	it.each([
		['next', 'c15t/next'],
		['react', 'c15t/react'],
		['tanstack-start', 'c15t/tanstack-start'],
	] as const)(
		'points %s copies at %s and its headless entry',
		(framework, entry) => {
			expect(toFrameworkSource(source, 'banner.tsx', framework)).toBe(
				[
					`import { useConsentDraft } from "${entry}"`,
					`import { useTranslations } from "${entry}/headless"`,
					'import { Button } from "@/components/ui/button"',
				].join('\n')
			);
		}
	);

	it.each([
		'c15t/react/iab',
		'@c15t/react',
		'c15t/next',
		'c15t/tanstack-start/server',
	])('rejects %s, which some framework has no twin for', (spec) => {
		for (const framework of frameworks) {
			expect(() =>
				toFrameworkSource(
					`import { x } from "${spec}"`,
					'banner.tsx',
					framework
				)
			).toThrow(`banner.tsx imports ${spec}`);
		}
	});
});

describe('scanImports', () => {
	it('finds multi-line, type-only and side-effect imports', () => {
		const source = [
			'"use client"',
			'import type { ReactNode } from "react"',
			'import {',
			'  Card,',
			'  CardTitle,',
			'} from "@/components/ui/card"',
			'import "./styles.css"',
		].join('\n');

		expect(scanImports(source).sort()).toEqual([
			'./styles.css',
			'@/components/ui/card',
			'react',
		]);
	});
});

describe('buildRegistry', () => {
	const output = buildRegistry({ appDir, baseUrl });
	const item = (style: string, name: string) =>
		output.get(`${style}/${name}.json`) as BuiltItem | undefined;

	it('writes every item and an index for every style', () => {
		for (const { name: style } of styles) {
			expect(output.has(`${style}/registry.json`)).toBe(true);
			for (const framework of frameworks) {
				for (const { name } of uiItems) {
					expect(item(style, itemName(framework, name))).toBeDefined();
				}
				expect(
					item(style, itemName(framework, 'consent-manager'))
				).toBeDefined();
			}
		}
	});

	it('links items only to built items in the same style', () => {
		for (const [file, json] of output) {
			if (file.endsWith('/registry.json')) {
				continue;
			}
			const [style] = file.split('/');
			for (const dependency of (json as BuiltItem).registryDependencies) {
				if (!dependency.startsWith('http')) {
					continue;
				}
				expect(dependency.startsWith(`${baseUrl}/${style}/`)).toBe(true);
				expect(output.has(dependency.slice(`${baseUrl}/`.length))).toBe(true);
			}
		}
	});

	it('gives each framework UI files that import only its own c15t entry', () => {
		for (const framework of frameworks) {
			const allowed = uiC15tImports.map((spec) =>
				spec.replace('c15t/react', c15tEntryByFramework[framework])
			);
			for (const { name } of uiItems) {
				const built = item('radix-nova', itemName(framework, name));
				for (const { content } of built?.files ?? []) {
					const c15t = scanImports(content).filter((spec) =>
						spec.startsWith('c15t')
					);
					expect(c15t.length).toBeGreaterThan(0);
					for (const spec of c15t) {
						expect(allowed).toContain(spec);
					}
				}
			}
		}
	});

	it('puts the c15t branding on every surface the stock UI brands', () => {
		for (const { name: style } of styles) {
			for (const framework of frameworks) {
				const branding = `${baseUrl}/${style}/${itemName(framework, 'consent-branding')}.json`;
				for (const name of [
					'consent-banner',
					'consent-dialog',
					'consent-dialog-trigger',
					'consent-sheet',
				]) {
					expect(
						item(style, itemName(framework, name))?.registryDependencies,
						`${style}/${itemName(framework, name)}`
					).toContain(branding);
				}
			}
		}
	});

	it("leaves the framework's own packages out of the dependencies", () => {
		const manager = item('radix-nova', 'tanstack-start-consent-manager');
		expect(manager?.files[0]?.content).toContain(
			'from "@tanstack/react-start"'
		);
		expect(manager?.dependencies).toEqual([`c15t@${c15tRange}`]);
	});

	it('marks every UI file as a client component', () => {
		for (const framework of frameworks) {
			for (const { name } of uiItems) {
				for (const { content, path: file } of item(
					'aria-nova',
					itemName(framework, name)
				)?.files ?? []) {
					expect(content.startsWith('"use client"'), file).toBe(true);
				}
			}
		}
	});

	it('keeps the Next.js consent manager a Server Component', () => {
		const manager = item('radix-nova', 'next-consent-manager');
		const file = manager?.files.find((entry) =>
			entry.path.endsWith('consent-manager.tsx')
		);
		expect(file?.content).toContain('resolveConsent()');
		expect(file?.content).not.toContain('"use client"');
	});

	it('installs components under components/c15t and the Next.js config at the root', () => {
		const manager = item('base-vega', 'next-consent-manager');
		expect(
			manager?.files.map(({ path: file, target }) => target ?? file)
		).toEqual([
			'~/c15t.config.ts',
			'registry/base-vega/components/c15t/consent-manager.tsx',
		]);
	});
});
