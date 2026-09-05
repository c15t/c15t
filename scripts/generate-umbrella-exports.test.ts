import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type {
	EntryModuleInfo,
	ExportsMap,
	SourcePackage,
	UmbrellaSource,
} from './generate-umbrella-exports';
import {
	createSourcePackages,
	deriveUmbrellaArtifacts,
	detectDefaultExport,
	detectUseClient,
	UMBRELLA_SOURCES,
} from './generate-umbrella-exports';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UMBRELLA_DIR = join(REPO_ROOT, 'packages', 'c15t');

const PLAIN_ENTRY: EntryModuleInfo = {
	hasDefaultExport: false,
	isClientModule: false,
};

const fixtureSource = function fixtureSource(options: {
	config?: Partial<UmbrellaSource>;
	exports: ExportsMap;
	entryInfo?: Record<string, EntryModuleInfo>;
	wildcards?: Record<string, string[]>;
	stringWildcards?: Record<string, string[]>;
	sideEffects?: unknown;
}): SourcePackage {
	const config: UmbrellaSource = {
		directory: 'fixture',
		packageName: '@c15t/fixture',
		prefix: '',
		...options.config,
	};

	return {
		analyzeEntry: (subpath) => options.entryInfo?.[subpath] ?? PLAIN_ENTRY,
		config,
		expandStringWildcard: (subpath) => options.stringWildcards?.[subpath] ?? [],
		expandWildcard: (subpath) => options.wildcards?.[subpath] ?? [],
		exports: options.exports,
		sideEffects: options.sideEffects,
	};
};

describe('deriveUmbrellaArtifacts', () => {
	it('mounts a root package verbatim and a prefixed package under its prefix', () => {
		const artifacts = deriveUmbrellaArtifacts([
			fixtureSource({
				exports: {
					'.': { import: './dist/index.js', types: './dist-types/index.d.ts' },
					'./v3': { import: './dist/v3.js' },
				},
			}),
			fixtureSource({
				config: {
					directory: 'other',
					packageName: '@c15t/other',
					prefix: 'other',
				},
				exports: {
					'.': { import: './dist/index.js' },
					'./hooks': { import: './dist/hooks.js' },
				},
			}),
		]);

		expect(Object.keys(artifacts.exports)).toEqual([
			'.',
			'./v3',
			'./other',
			'./other/hooks',
		]);
		expect(artifacts.exports['.']).toEqual({
			import: './shims/index.js',
			types: './shims/index.d.ts',
		});
		expect(artifacts.exports['./other/hooks']).toEqual({
			import: './shims/other/hooks.js',
		});
		expect(artifacts.shimFiles['shims/other/hooks.js']).toContain(
			"export * from '@c15t/other/hooks';"
		);
		expect(artifacts.shimFiles['shims/index.js']).toContain(
			"export * from '@c15t/fixture';"
		);
	});

	it('mirrors CSS subpaths as copied dist files', () => {
		const artifacts = deriveUmbrellaArtifacts([
			fixtureSource({
				config: {
					directory: 'react',
					packageName: '@c15t/react',
					prefix: 'react',
				},
				exports: { './styles.css': './dist/styles.css' },
			}),
		]);

		expect(artifacts.exports['./react/styles.css']).toBe(
			'./dist/react/styles.css'
		);
		expect(artifacts.cssCopies).toEqual([
			{
				sourceDirectory: 'react',
				sourcePath: 'dist/styles.css',
				target: 'dist/react/styles.css',
			},
		]);
		expect(artifacts.shimFiles).toEqual({});
	});

	it('emits a shim per export condition and nothing more', () => {
		const artifacts = deriveUmbrellaArtifacts([
			fixtureSource({
				exports: {
					'./server': {
						default: './dist/server/index.js',
						import: './dist/server/index.js',
						types: './dist-types/server/index.d.ts',
					},
				},
			}),
		]);

		expect(artifacts.exports['./server']).toEqual({
			default: './shims/server.js',
			import: './shims/server.js',
			types: './shims/server.d.ts',
		});
		expect(Object.keys(artifacts.shimFiles).sort()).toEqual([
			'shims/server.d.ts',
			'shims/server.js',
		]);
		expect(artifacts.shimFiles['shims/server.js']).not.toContain('default');
		expect(artifacts.shimFiles['shims/server.js']).not.toContain('use client');
		expect(artifacts.shimFiles['shims/server.js']).toContain(
			"export * from '@c15t/fixture/server';"
		);
	});

	it('rejects require conditions — the umbrella is ESM-only', () => {
		expect(() =>
			deriveUmbrellaArtifacts([
				fixtureSource({
					exports: {
						'./server': {
							import: './dist/server/index.js',
							require: './dist/server/index.cjs',
						},
					},
				}),
			])
		).toThrow(/Unsupported export condition "require"/u);
	});

	it('forwards default exports only where the entry module has one', () => {
		const artifacts = deriveUmbrellaArtifacts([
			fixtureSource({
				entryInfo: {
					'./banner': { hasDefaultExport: true, isClientModule: false },
				},
				exports: {
					'./banner': { import: './dist/banner.js', types: './x.d.ts' },
					'./plain': { import: './dist/plain.js', types: './x.d.ts' },
				},
			}),
		]);

		expect(artifacts.shimFiles['shims/banner.js']).toContain(
			"export { default } from '@c15t/fixture/banner';"
		);
		expect(artifacts.shimFiles['shims/banner.d.ts']).toContain(
			"export { default } from '@c15t/fixture/banner';"
		);
		expect(artifacts.shimFiles['shims/plain.js']).not.toContain('default');
		expect(artifacts.shimFiles['shims/plain.d.ts']).not.toContain('default');
	});

	it("opens client entry shims with a 'use client' directive", () => {
		const artifacts = deriveUmbrellaArtifacts([
			fixtureSource({
				entryInfo: {
					'./widget': { hasDefaultExport: false, isClientModule: true },
				},
				exports: {
					'./widget': {
						import: './dist/widget.js',
						types: './x.d.ts',
					},
				},
			}),
		]);

		expect(artifacts.shimFiles['shims/widget.js']).toMatch(/^'use client';\n/u);
		expect(artifacts.shimFiles['shims/widget.d.ts']).not.toContain(
			'use client'
		);
	});

	it('keeps wildcard exports as wildcards backed by enumerated shim files', () => {
		const artifacts = deriveUmbrellaArtifacts([
			fixtureSource({
				config: {
					directory: 'react',
					packageName: '@c15t/react',
					prefix: 'react',
				},
				exports: {
					'./primitives/*': {
						default: './dist/primitives/*.js',
						import: './dist/primitives/*.js',
						types: './dist-types/primitives/*.d.ts',
					},
				},
				wildcards: { './primitives/*': ['accordion', 'button'] },
			}),
		]);

		expect(artifacts.exports['./react/primitives/*']).toEqual({
			default: './shims/react/primitives/*.js',
			import: './shims/react/primitives/*.js',
			types: './shims/react/primitives/*.d.ts',
		});
		expect(Object.keys(artifacts.shimFiles).sort()).toEqual([
			'shims/react/primitives/accordion.d.ts',
			'shims/react/primitives/accordion.js',
			'shims/react/primitives/button.d.ts',
			'shims/react/primitives/button.js',
		]);
		expect(artifacts.shimFiles['shims/react/primitives/button.js']).toContain(
			"export * from '@c15t/react/primitives/button';"
		);
	});

	it('mirrors nested wildcard modules with nested shim files', () => {
		const artifacts = deriveUmbrellaArtifacts([
			fixtureSource({
				config: {
					directory: 'react',
					packageName: '@c15t/react',
					prefix: 'react',
				},
				exports: {
					'./primitives/*': {
						import: './dist/primitives/*.js',
						types: './dist-types/primitives/*.d.ts',
					},
				},
				wildcards: { './primitives/*': ['accordion', 'nested/button'] },
			}),
		]);

		expect(Object.keys(artifacts.shimFiles).sort()).toEqual([
			'shims/react/primitives/accordion.d.ts',
			'shims/react/primitives/accordion.js',
			'shims/react/primitives/nested/button.d.ts',
			'shims/react/primitives/nested/button.js',
		]);
		expect(
			artifacts.shimFiles['shims/react/primitives/nested/button.js']
		).toContain("export * from '@c15t/react/primitives/nested/button';");
	});

	it('mirrors svelte and default conditions as shared ESM shims', () => {
		const artifacts = deriveUmbrellaArtifacts([
			fixtureSource({
				config: {
					directory: 'svelte',
					packageName: '@c15t/svelte',
					prefix: 'svelte',
				},
				exports: {
					'.': {
						default: './dist/index.js',
						svelte: './dist/index.js',
						types: './dist/index.d.ts',
					},
				},
			}),
		]);

		expect(artifacts.exports['./svelte']).toEqual({
			default: './shims/svelte.js',
			svelte: './shims/svelte.js',
			types: './shims/svelte.d.ts',
		});
		expect(Object.keys(artifacts.shimFiles).sort()).toEqual([
			'shims/svelte.d.ts',
			'shims/svelte.js',
		]);
		expect(artifacts.shimFiles['shims/svelte.js']).toContain(
			"export * from '@c15t/svelte';"
		);
	});

	it('mirrors raw string wildcards with extension-carrying shims', () => {
		const artifacts = deriveUmbrellaArtifacts([
			fixtureSource({
				config: { directory: 'vue', packageName: '@c15t/vue', prefix: 'vue' },
				entryInfo: {
					'./runtime/composables/consent.js': {
						hasDefaultExport: true,
						isClientModule: false,
					},
				},
				exports: { './runtime/*': './dist/runtime/*' },
				stringWildcards: {
					'./runtime/*': [
						'components/consent-banner.vue',
						'composables/consent.js',
					],
				},
			}),
		]);

		expect(artifacts.exports['./vue/runtime/*']).toBe('./shims/vue/runtime/*');
		expect(Object.keys(artifacts.shimFiles).sort()).toEqual([
			'shims/vue/runtime/components/consent-banner.d.vue.ts',
			'shims/vue/runtime/components/consent-banner.vue',
			'shims/vue/runtime/components/consent-banner.vue.d.ts',
			'shims/vue/runtime/composables/consent.d.ts',
			'shims/vue/runtime/composables/consent.js',
		]);

		const wrapper =
			artifacts.shimFiles['shims/vue/runtime/components/consent-banner.vue'];
		expect(wrapper).toMatch(/^<script>\n/u);
		expect(wrapper).toContain(
			"import Component from '@c15t/vue/runtime/components/consent-banner.vue';"
		);
		expect(wrapper).toContain('export default Component;');
		for (const declarationSibling of [
			'shims/vue/runtime/components/consent-banner.d.vue.ts',
			'shims/vue/runtime/components/consent-banner.vue.d.ts',
		]) {
			const declaration = artifacts.shimFiles[declarationSibling];
			// Named exports (SFC declarations carry types next to the
			// component) and the default both forward.
			expect(declaration).toContain(
				"export * from '@c15t/vue/runtime/components/consent-banner.vue';"
			);
			expect(declaration).toContain(
				"export { default } from '@c15t/vue/runtime/components/consent-banner.vue';"
			);
		}
		expect(
			artifacts.shimFiles['shims/vue/runtime/composables/consent.js']
		).toContain(
			"export { default } from '@c15t/vue/runtime/composables/consent.js';"
		);
	});

	it('rejects string wildcard modules it cannot mirror', () => {
		expect(() =>
			deriveUmbrellaArtifacts([
				fixtureSource({
					exports: { './runtime/*': './dist/runtime/*' },
					stringWildcards: { './runtime/*': ['styles/base.css'] },
				}),
			])
		).toThrow(/Unsupported string wildcard module/u);
	});

	it('rejects string wildcard exports that match no modules', () => {
		expect(() =>
			deriveUmbrellaArtifacts([
				fixtureSource({
					exports: { './runtime/*': './dist/runtime/*' },
				}),
			])
		).toThrow(/matched no modules/u);
	});

	it('rejects wildcard exports that match no modules', () => {
		expect(() =>
			deriveUmbrellaArtifacts([
				fixtureSource({
					exports: { './primitives/*': { import: './dist/primitives/*.js' } },
				}),
			])
		).toThrow(/matched no modules/u);
	});

	it('rejects colliding umbrella subpaths', () => {
		expect(() =>
			deriveUmbrellaArtifacts([
				fixtureSource({ exports: { './v3': { import: './dist/v3.js' } } }),
				fixtureSource({
					config: { packageName: '@c15t/other' },
					exports: { './v3': { import: './dist/v3.js' } },
				}),
			])
		).toThrow(/claimed twice/u);
	});

	it('rejects non-CSS string exports', () => {
		expect(() =>
			deriveUmbrellaArtifacts([
				fixtureSource({ exports: { './data.json': './dist/data.json' } }),
			])
		).toThrow(/Only CSS subpaths/u);
	});

	it('rejects export conditions it cannot mirror', () => {
		expect(() =>
			deriveUmbrellaArtifacts([
				fixtureSource({
					exports: { '.': { browser: './dist/browser.js' } },
				}),
			])
		).toThrow(/Unsupported export condition "browser"/u);
	});

	it('keeps a CSS-only sideEffects claim for CSS-only and effect-free sources', () => {
		const artifacts = deriveUmbrellaArtifacts([
			fixtureSource({
				exports: { '.': { import: './dist/index.js' } },
				sideEffects: false,
			}),
			fixtureSource({
				config: {
					directory: 'react',
					packageName: '@c15t/react',
					prefix: 'react',
				},
				exports: { '.': { import: './dist/index.js' } },
				sideEffects: ['**/*.css'],
			}),
		]);

		expect(artifacts.sideEffects).toEqual(['**/*.css']);
	});

	it('claims the shims of a source that declares no sideEffects field', () => {
		const artifacts = deriveUmbrellaArtifacts([
			fixtureSource({
				config: { directory: 'vue', packageName: '@c15t/vue', prefix: 'vue' },
				exports: { '.': { import: './dist/module.mjs' } },
			}),
		]);

		expect(artifacts.sideEffects).toEqual([
			'**/*.css',
			'shims/vue.*',
			'shims/vue/**',
		]);
	});

	it('claims every shim when a root-mounted source declares no sideEffects', () => {
		const artifacts = deriveUmbrellaArtifacts([
			fixtureSource({ exports: { '.': { import: './dist/index.js' } } }),
		]);

		expect(artifacts.sideEffects).toEqual(['**/*.css', 'shims/**']);
	});

	it('rejects sideEffects declarations it cannot mirror', () => {
		expect(() =>
			deriveUmbrellaArtifacts([
				fixtureSource({
					exports: { '.': { import: './dist/index.js' } },
					sideEffects: ['./src/register.js'],
				}),
			])
		).toThrow(/Unsupported sideEffects declaration/u);
	});
});

describe('createSourcePackages', () => {
	it('enumerates nested modules behind a conditional wildcard', () => {
		const root = mkdtempSync(join(tmpdir(), 'umbrella-wildcard-'));
		try {
			const sourceDir = join(root, 'fixture', 'src', 'primitives');
			mkdirSync(join(sourceDir, 'nested'), { recursive: true });
			mkdirSync(join(sourceDir, '__tests__'), { recursive: true });
			writeFileSync(
				join(root, 'fixture', 'package.json'),
				JSON.stringify({
					exports: {},
					name: '@c15t/fixture',
				})
			);
			writeFileSync(join(sourceDir, 'button.ts'), 'export const b = 1;\n');
			writeFileSync(
				join(sourceDir, 'nested', 'switch.tsx'),
				'export const s = 1;\n'
			);
			writeFileSync(join(sourceDir, 'nested', 'switch.test.tsx'), '');
			writeFileSync(join(sourceDir, '__tests__', 'button.test.ts'), '');
			writeFileSync(join(sourceDir, 'types.d.ts'), '');

			const sources = createSourcePackages(root, [
				{ directory: 'fixture', packageName: '@c15t/fixture', prefix: '' },
			]);
			expect(
				sources[0]?.expandWildcard('./primitives/*', {
					import: './dist/primitives/*.js',
					types: './dist-types/primitives/*.d.ts',
				})
			).toEqual(['button', 'nested/switch']);
		} finally {
			rmSync(root, { force: true, recursive: true });
		}
	});
});

describe('detectDefaultExport', () => {
	it('matches direct and re-exported default exports', () => {
		expect(detectDefaultExport('export default ConsentBanner;')).toBe(true);
		expect(detectDefaultExport("export { default } from './x';")).toBe(true);
		expect(
			detectDefaultExport("export { Banner as default } from './x';")
		).toBe(true);
	});

	it('ignores renamed default re-exports, type exports, and comments', () => {
		expect(
			detectDefaultExport("export { default as Banner } from './x';")
		).toBe(false);
		expect(
			detectDefaultExport("export type { Banner as default } from './x';")
		).toBe(false);
		expect(
			detectDefaultExport('/**\n * export default async function X() {}\n */')
		).toBe(false);
		expect(detectDefaultExport("export { Banner } from './x';")).toBe(false);
	});
});

describe('detectUseClient', () => {
	it('matches a leading directive, including after comments', () => {
		expect(detectUseClient("'use client';\nexport * from './x';")).toBe(true);
		expect(detectUseClient('/* banner */\n"use client";\n')).toBe(true);
	});

	it('ignores directives that are not in the prologue', () => {
		expect(detectUseClient("export * from './x';\n'use client';")).toBe(false);
		expect(detectUseClient("// 'use client';\nexport {};")).toBe(false);
	});
});

const listFiles = function listFiles(
	directory: string,
	prefix: string
): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const relativePath = `${prefix}/${entry.name}`;
		if (entry.isDirectory()) {
			files.push(...listFiles(join(directory, entry.name), relativePath));
		} else {
			files.push(relativePath);
		}
	}
	return files;
};

/**
 * Drift guard: the committed umbrella package must exactly match what the
 * generator derives from the scoped packages' current manifests. A scoped
 * export change without running `bun scripts/generate-umbrella-exports.ts`
 * fails here.
 */
describe('committed umbrella package', () => {
	const artifacts = deriveUmbrellaArtifacts(
		createSourcePackages(join(REPO_ROOT, 'packages'), UMBRELLA_SOURCES)
	);
	const manifest = JSON.parse(
		readFileSync(join(UMBRELLA_DIR, 'package.json'), 'utf8')
	) as {
		exports: ExportsMap;
		main: string;
		module?: string;
		types: string;
		sideEffects: unknown;
	};

	it('has the derived exports map, in order', () => {
		expect(manifest.exports).toEqual(artifacts.exports);
		expect(Object.keys(manifest.exports)).toEqual(
			Object.keys(artifacts.exports)
		);
	});

	it('claims the derived sideEffects', () => {
		expect(manifest.sideEffects).toEqual(artifacts.sideEffects);
	});

	it('points main and types at the ESM root shims', () => {
		const rootEntry = artifacts.exports['.'];
		if (typeof rootEntry === 'string') {
			throw new Error('umbrella root export must be conditional');
		}
		expect(manifest.main).toBe(rootEntry.import);
		expect(manifest.types).toBe(rootEntry.types);
		expect(manifest.module).toBeUndefined();
	});

	it('serves the same ESM entry to default-condition resolvers', () => {
		// The ESM-only manifest contract: the root entry carries a `default`
		// condition so non-import resolvers still land on the ESM shim.
		const rootEntry = manifest.exports['.'];
		if (typeof rootEntry === 'string') {
			throw new Error('umbrella root export must be conditional');
		}
		expect(rootEntry.default).toBeDefined();
		expect(rootEntry.default).toBe(rootEntry.import);
	});

	it('ships the v3 React and Next.js DevTools adapters', () => {
		expect(manifest.exports['./react/devtools']).toEqual({
			default: './shims/react/devtools.js',
			import: './shims/react/devtools.js',
			types: './shims/react/devtools.d.ts',
		});
		expect(manifest.exports['./next/devtools']).toEqual({
			default: './shims/next/devtools.js',
			import: './shims/next/devtools.js',
			types: './shims/next/devtools.d.ts',
		});
		expect(artifacts.shimFiles['shims/react/devtools.js']).toContain(
			"export * from '@c15t/react/devtools';"
		);
		expect(artifacts.shimFiles['shims/next/devtools.js']).toContain(
			"export * from '@c15t/nextjs/devtools';"
		);
	});

	it('has exactly the derived shim files on disk', () => {
		const committed = listFiles(join(UMBRELLA_DIR, 'shims'), 'shims');
		expect(committed.sort()).toEqual(Object.keys(artifacts.shimFiles).sort());

		for (const [relativePath, content] of Object.entries(artifacts.shimFiles)) {
			expect(
				readFileSync(join(UMBRELLA_DIR, relativePath), 'utf8'),
				relativePath
			).toBe(content);
		}
	});
});
