/**
 * The page script loads offline mode on demand.
 *
 * `createOfflineTransport` carries the recommended policy-rule pack. Hosted
 * and manifest sites never run it, so the browser client must not import it
 * statically; an offline init must still resolve its rules.
 *
 * The load-count tests share one module registry and run in order.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ProviderTransportContext } from '@c15t/core';
import { describe, expect, it, vi } from 'vitest';

import { hostedMode, offlineMode, resolveTransportFactory } from '../mode';
import { testRule } from './policy-fixture';

const offlineModule = vi.hoisted(() => ({ loads: 0 }));

// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is whether the client evaluates this module at all. The factory only counts loads and returns the real module.
vi.mock('../offline-mode', async (importOriginal) => {
	offlineModule.loads += 1;
	return await importOriginal();
});

const context: ProviderTransportContext = {
	consentCategories: ['necessary', 'measurement'],
	prefetch: {},
	translations: { language: 'en', translations: {} as never },
};

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Names that pull the offline transport or a rule pack into a bundle. */
const OFFLINE_ONLY = new Set([
	'createOfflineTransport',
	'offline',
	'policyRulePresets',
	'recommendedPolicyRules',
]);

const STATIC_IMPORT =
	/^\s*import\s+(?!type\b)(?<clause>[^'";]*?)\s*from\s*['"](?<specifier>[^'"]+)['"]/gmu;
const EXPORT_FROM =
	/^\s*export\s+(?!type\b)(?<clause>\{[^}]*\})\s*from\s*['"](?<specifier>[^'"]+)['"]/gmu;

const resolveLocal = function resolveLocal(
	from: string,
	specifier: string
): string {
	const base = resolve(dirname(from), specifier);
	return base.endsWith('.ts') ? base : `${base}.ts`;
};

/** Every static value import reachable from `entry` inside this package. */
const walk = function walk(entry: string) {
	const seen = new Set<string>();
	const edges: { file: string; specifier: string; names: string[] }[] = [];
	const visit = (file: string) => {
		if (seen.has(file)) {
			return;
		}
		seen.add(file);
		const source = readFileSync(file, 'utf8');
		for (const pattern of [STATIC_IMPORT, EXPORT_FROM]) {
			for (const match of source.matchAll(pattern)) {
				const specifier = match.groups?.specifier ?? '';
				const names = [
					...(match.groups?.clause ?? '').matchAll(
						/(?:^|[{,\s])(?!type\b)(?<name>[A-Za-z_$][\w$]*)/gu
					),
				]
					.map((name) => name.groups?.name ?? '')
					.filter((name) => name && name !== 'as');
				edges.push({ file, names, specifier });
				if (specifier.startsWith('.')) {
					visit(resolveLocal(file, specifier));
				}
			}
		}
	};
	visit(entry);
	return { edges, files: seen };
};

describe('browser client graph', () => {
	it('does not statically import offline mode or a rule pack', () => {
		const { edges, files } = walk(resolve(SRC, 'client.ts'));

		expect(files.has(resolve(SRC, 'mode.ts'))).toBe(true);
		expect(files.has(resolve(SRC, 'offline-mode.ts'))).toBe(false);
		const offenders = edges.filter(
			(edge) =>
				!edge.specifier.startsWith('.') &&
				edge.names.some((name) => OFFLINE_ONLY.has(name))
		);
		expect(offenders).toEqual([]);
	});
});

describe('offline mode on demand', () => {
	it('hosted mode never loads it', () => {
		const transport = resolveTransportFactory(hostedMode({ url: '/x' }))(
			context
		);
		expect(transport).toBeDefined();
		expect(offlineModule.loads).toBe(0);
	});

	it('an offline transport loads nothing until it inits, and saves without it', async () => {
		const transport = resolveTransportFactory(
			offlineMode({ policyRules: [testRule] })
		)(context);
		const saved = await transport.save?.({
			subjectId: 'sub_1',
		} as never);

		expect(saved).toEqual({ ok: true, subjectId: 'sub_1' });
		expect(offlineModule.loads).toBe(0);
	});

	it('an offline init loads it once and resolves the rules', async () => {
		const transport = resolveTransportFactory(
			offlineMode({ policyRules: [testRule] })
		)(context);
		const [first, second] = await Promise.all([
			transport.init?.({ overrides: {}, user: null }),
			transport.init?.({ overrides: { country: 'DE' }, user: null }),
		]);

		expect(offlineModule.loads).toBe(1);
		expect(first?.policyResolution).toMatchObject({
			policy: { id: 'test', prompt: 'choice' },
			status: 'matched',
		});
		expect(second?.location).toEqual({ countryCode: 'DE', regionCode: null });
	});
});
