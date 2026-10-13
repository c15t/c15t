import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildRegistry, scanImports, toNextSource } from '../build-registry';
import { frameworks, itemName, styles, uiItems } from '../items';

const appDir = path.resolve(import.meta.dirname, '../..');
const baseUrl = 'https://registry.test/r';

interface BuiltItem {
	name: string;
	registryDependencies: string[];
	dependencies: string[];
	files: { path: string; content: string; target?: string }[];
}

describe('toNextSource', () => {
	it('points c15t/react and its headless entry at c15t/next', () => {
		const source = [
			'import { useConsentDraft } from "c15t/react"',
			'import { useTranslations } from "c15t/react/headless"',
			'import { Button } from "@/components/ui/button"',
		].join('\n');

		expect(toNextSource(source, 'banner.tsx')).toBe(
			[
				'import { useConsentDraft } from "c15t/next"',
				'import { useTranslations } from "c15t/next/headless"',
				'import { Button } from "@/components/ui/button"',
			].join('\n')
		);
	});

	it.each(['c15t/react/iab', '@c15t/react', 'c15t/next'])(
		'rejects %s, which has no Next.js twin',
		(spec) => {
			expect(() =>
				toNextSource(`import { x } from "${spec}"`, 'banner.tsx')
			).toThrow(`banner.tsx imports ${spec}`);
		}
	);
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

	it('gives Next.js items c15t/next imports and React items c15t/react ones', () => {
		for (const { name } of uiItems) {
			const next = item('radix-nova', itemName('next', name));
			const react = item('radix-nova', itemName('react', name));
			for (const { content } of next?.files ?? []) {
				expect(content).not.toMatch(/["']c15t\/react/u);
			}
			for (const { content } of react?.files ?? []) {
				expect(content).not.toMatch(/["']c15t\/next/u);
			}
		}
	});

	it('marks every UI file as a client component', () => {
		for (const { name } of uiItems) {
			for (const { content, path: file } of item(
				'aria-nova',
				itemName('next', name)
			)?.files ?? []) {
				expect(content.startsWith('"use client"'), file).toBe(true);
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
