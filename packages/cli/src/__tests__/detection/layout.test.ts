import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

describe('layout detection', () => {
	let projectRoot: string;

	beforeEach(async () => {
		projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'layout-detect-'));
	});

	afterEach(async () => {
		await fs.rm(projectRoot, { recursive: true, force: true });
	});

	describe('findLayoutFile', () => {
		test('should find standard app/layout.tsx', async () => {
			await fs.mkdir(path.join(projectRoot, 'app'), { recursive: true });
			await fs.writeFile(path.join(projectRoot, 'app/layout.tsx'), '');

			const { findLayoutFile } = await import('../../detection/layout');
			const result = await findLayoutFile(projectRoot);

			expect(result).not.toBeNull();
			expect(result?.path).toBe('app/layout.tsx');
			expect(result?.type).toBe('app');
			expect(result?.hasLocaleSegment).toBe(false);
		});

		test('should find src/app/layout.tsx', async () => {
			await fs.mkdir(path.join(projectRoot, 'src/app'), {
				recursive: true,
			});
			await fs.writeFile(path.join(projectRoot, 'src/app/layout.tsx'), '');

			const { findLayoutFile } = await import('../../detection/layout');
			const result = await findLayoutFile(projectRoot);

			expect(result).not.toBeNull();
			expect(result?.path).toBe('src/app/layout.tsx');
			expect(result?.type).toBe('app');
		});

		test('should find locale-based layout app/[locale]/layout.tsx', async () => {
			await fs.mkdir(path.join(projectRoot, 'app/[locale]'), {
				recursive: true,
			});
			await fs.writeFile(path.join(projectRoot, 'app/[locale]/layout.tsx'), '');

			const { findLayoutFile } = await import('../../detection/layout');
			const result = await findLayoutFile(projectRoot);

			expect(result).not.toBeNull();
			expect(result?.hasLocaleSegment).toBe(true);
			expect(result?.localeSegment).toBe('[locale]');
		});

		test('should find pages/_app.tsx for pages router', async () => {
			await fs.mkdir(path.join(projectRoot, 'pages'), { recursive: true });
			await fs.writeFile(path.join(projectRoot, 'pages/_app.tsx'), '');

			const { findLayoutFile } = await import('../../detection/layout');
			const result = await findLayoutFile(projectRoot);

			expect(result).not.toBeNull();
			expect(result?.path).toBe('pages/_app.tsx');
			expect(result?.type).toBe('pages');
		});

		test('should return null when no layout found', async () => {
			const { findLayoutFile } = await import('../../detection/layout');
			const result = await findLayoutFile(projectRoot);

			expect(result).toBeNull();
		});
	});

	describe('getComponentsDirectory', () => {
		test('should return src/components for src-based layout', async () => {
			const { getComponentsDirectory } = await import('../../detection/layout');
			const layout = {
				path: 'src/app/layout.tsx',
				type: 'app' as const,
				hasLocaleSegment: false,
				appDirectory: 'src/app',
			};

			const result = getComponentsDirectory('/mock/project', layout);
			expect(result).toContain('src');
			expect(result).toContain('components');
		});

		test('should return components for root-based layout', async () => {
			const { getComponentsDirectory } = await import('../../detection/layout');
			const layout = {
				path: 'app/layout.tsx',
				type: 'app' as const,
				hasLocaleSegment: false,
				appDirectory: 'app',
			};

			const result = getComponentsDirectory('/mock/project', layout);
			expect(result).not.toContain('src');
			expect(result).toContain('components');
		});
	});
});
