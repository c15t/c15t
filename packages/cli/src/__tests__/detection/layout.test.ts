import fs from 'node:fs/promises';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock the fs module
vi.mock('node:fs/promises');

describe('layout detection', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('findLayoutFile', () => {
		test('should find standard app/layout.tsx', async () => {
			// Mock file system to have app/layout.tsx
			vi.mocked(fs.access).mockImplementation(async (path) => {
				if (String(path).endsWith('app/layout.tsx')) {
					return undefined;
				}
				throw new Error('ENOENT');
			});

			vi.mocked(fs.readdir).mockResolvedValue([]);

			const { findLayoutFile } = await import('../../detection/layout');
			const result = await findLayoutFile('/mock/project');

			expect(result).not.toBeNull();
			expect(result?.path).toBe('app/layout.tsx');
			expect(result?.type).toBe('app');
			expect(result?.hasLocaleSegment).toBe(false);
		});

		test('should find src/app/layout.tsx', async () => {
			vi.mocked(fs.access).mockImplementation(async (path) => {
				if (String(path).endsWith('src/app/layout.tsx')) {
					return undefined;
				}
				throw new Error('ENOENT');
			});

			vi.mocked(fs.readdir).mockResolvedValue([]);

			const { findLayoutFile } = await import('../../detection/layout');
			const result = await findLayoutFile('/mock/project');

			expect(result).not.toBeNull();
			expect(result?.path).toBe('src/app/layout.tsx');
			expect(result?.type).toBe('app');
		});

		test('should find locale-based layout app/[locale]/layout.tsx', async () => {
			vi.mocked(fs.access).mockImplementation(async (path) => {
				const pathStr = String(path);
				// Standard paths don't exist
				if (
					pathStr.endsWith('app/layout.tsx') ||
					pathStr.endsWith('src/app/layout.tsx')
				) {
					throw new Error('ENOENT');
				}
				// But locale-based path exists
				if (pathStr.includes('[locale]/layout.tsx')) {
					return undefined;
				}
				throw new Error('ENOENT');
			});

			vi.mocked(fs.readdir).mockImplementation(async (path) => {
				const pathStr = String(path);
				if (pathStr.endsWith('/app')) {
					return [
						{ name: '[locale]', isDirectory: () => true },
					] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
				}
				return [];
			});

			const { findLayoutFile } = await import('../../detection/layout');
			const result = await findLayoutFile('/mock/project');

			expect(result).not.toBeNull();
			expect(result?.hasLocaleSegment).toBe(true);
			expect(result?.localeSegment).toBe('[locale]');
		});

		test('should find pages/_app.tsx for pages router', async () => {
			vi.mocked(fs.access).mockImplementation(async (path) => {
				if (String(path).endsWith('pages/_app.tsx')) {
					return undefined;
				}
				throw new Error('ENOENT');
			});

			vi.mocked(fs.readdir).mockResolvedValue([]);

			const { findLayoutFile } = await import('../../detection/layout');
			const result = await findLayoutFile('/mock/project');

			expect(result).not.toBeNull();
			expect(result?.path).toBe('pages/_app.tsx');
			expect(result?.type).toBe('pages');
		});

		test('should return null when no layout found', async () => {
			vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
			vi.mocked(fs.readdir).mockResolvedValue([]);

			const { findLayoutFile } = await import('../../detection/layout');
			const result = await findLayoutFile('/mock/project');

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
