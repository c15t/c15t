import { execFileSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { expect, it } from 'vitest';

import { replaceBenchmarkFixtures } from './benchmark-overlay';

it('removes retired routes, includes new fixtures, and preserves base product code', () => {
	const root = mkdtempSync(join(tmpdir(), 'c15t-overlay-'));
	try {
		for (const arm of ['base', 'head']) {
			const cwd = join(root, arm);
			mkdirSync(join(cwd, 'benchmarks/app'), { recursive: true });
			execFileSync('git', ['init', '--quiet'], { cwd });
			writeFileSync(join(cwd, 'product.ts'), arm);
			writeFileSync(
				join(cwd, 'benchmarks/app/package.json'),
				JSON.stringify({
					dependencies: { dependency: arm },
					scripts: { bench: arm },
				})
			);
			writeFileSync(join(cwd, 'benchmarks/app/route.ts'), arm);
			execFileSync('git', ['add', '.'], { cwd });
		}
		const base = join(root, 'base');
		const head = join(root, 'head');
		rmSync(join(head, 'benchmarks/app/route.ts'));
		writeFileSync(join(head, 'benchmarks/app/new.ts'), 'new fixture');
		replaceBenchmarkFixtures(head, base);
		expect(existsSync(join(base, 'benchmarks/app/route.ts'))).toBe(false);
		expect(readFileSync(join(base, 'benchmarks/app/new.ts'), 'utf8')).toBe(
			'new fixture'
		);
		expect(readFileSync(join(base, 'product.ts'), 'utf8')).toBe('base');
		const manifest = JSON.parse(
			readFileSync(join(base, 'benchmarks/app/package.json'), 'utf8')
		);
		expect(manifest.dependencies).toEqual({ dependency: 'base' });
		expect(manifest.scripts).toEqual({ bench: 'head' });
		writeFileSync(
			join(head, 'benchmarks/app/package.json'),
			JSON.stringify({ dependencies: { missing: '1.0.0' } })
		);
		expect(() => replaceBenchmarkFixtures(head, base)).toThrow(
			'absent from the base manifest'
		);
		// A harness only the head has is left out of the base tree: it cannot
		// be measured on both sides and must not be installed against the base
		// lockfile.
		writeFileSync(
			join(head, 'benchmarks/app/package.json'),
			JSON.stringify({ dependencies: { dependency: 'head' } })
		);
		mkdirSync(join(head, 'benchmarks/new-harness/src'), { recursive: true });
		writeFileSync(
			join(head, 'benchmarks/new-harness/package.json'),
			JSON.stringify({ dependencies: { dependency: 'head' } })
		);
		writeFileSync(join(head, 'benchmarks/new-harness/src/run.ts'), 'new');
		replaceBenchmarkFixtures(head, base);
		expect(existsSync(join(base, 'benchmarks/new-harness'))).toBe(false);
		expect(readFileSync(join(base, 'benchmarks/app/new.ts'), 'utf8')).toBe(
			'new fixture'
		);
	} finally {
		rmSync(root, { force: true, recursive: true });
	}
});

it.each([
	{ automatic: false, iabAutomatic: false },
	{ automatic: true, iabAutomatic: false },
	{ automatic: true, iabAutomatic: true },
])(
	'keeps overlaid fixtures styled, automatic=$automatic, IAB=$iabAutomatic',
	({ automatic, iabAutomatic }) => {
		const root = mkdtempSync(join(tmpdir(), 'c15t-overlay-styles-'));
		try {
			for (const arm of ['base', 'head']) {
				const cwd = join(root, arm);
				mkdirSync(cwd, { recursive: true });
				execFileSync('git', ['init', '--quiet'], { cwd });
				for (const path of [
					'benchmarks/nextjs-browser-bench/app/_bench/with-consent.css',
					'benchmarks/tanstack-start-browser-bench/src/bench/with-consent-iab.css',
					'benchmarks/sveltekit-browser-bench/src/routes/ssr/+layout.svelte',
				]) {
					const target = join(cwd, path);
					mkdirSync(dirname(target), { recursive: true });
					writeFileSync(
						target,
						path.endsWith('.css')
							? '@import "./app.css";\n'
							: '<script lang="ts">\n</script>\n<p>Measured page</p>'
					);
				}
				execFileSync('git', ['add', '.'], { cwd });
			}
			const base = join(root, 'base');
			if (automatic) {
				for (const path of [
					'packages/react/src/components/shared/surface-styles.tsx',
					'packages/svelte/src/lib/surface-styles.ts',
				]) {
					mkdirSync(dirname(join(base, path)), { recursive: true });
					writeFileSync(join(base, path), 'export {};');
				}
			}
			if (iabAutomatic) {
				const path = join(
					base,
					'packages/react/src/components/shared/iab-first-paint-sheets.ts'
				);
				mkdirSync(dirname(path), { recursive: true });
				writeFileSync(path, 'export {};');
			}
			replaceBenchmarkFixtures(join(root, 'head'), base);
			const next = readFileSync(
				join(
					base,
					'benchmarks/nextjs-browser-bench/app/_bench/with-consent.css'
				),
				'utf8'
			);
			const iab = readFileSync(
				join(
					base,
					'benchmarks/tanstack-start-browser-bench/src/bench/with-consent-iab.css'
				),
				'utf8'
			);
			const svelte = readFileSync(
				join(
					base,
					'benchmarks/sveltekit-browser-bench/src/routes/ssr/+layout.svelte'
				),
				'utf8'
			);
			expect(next.includes('@c15t/nextjs/styles.css')).toBe(!automatic);
			expect(iab.includes('@c15t/tanstack-start/styles.css')).toBe(
				!iabAutomatic
			);
			expect(iab.includes('@c15t/tanstack-start/iab/styles.css')).toBe(
				!iabAutomatic
			);
			expect(svelte.includes("import '@c15t/svelte/styles.css';")).toBe(
				!automatic
			);
			expect(svelte).toContain('<p>Measured page</p>');
		} finally {
			rmSync(root, { force: true, recursive: true });
		}
	}
);
