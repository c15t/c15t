import type { PathLike, PathOrFileDescriptor } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	analyzeBundles,
	analyzeTransitiveImpact,
	calculateTotalDiffPercent,
	compareBundles,
	extractBundleSizes,
	formatBytes,
	generateMarkdownReport,
	setBundleAnalysisFileSystemForTests,
	writeReport,
} from './bundle-analysis';
import type {
	BundleStats,
	PackageBundleData,
	TransitiveBundleData,
} from './bundle-analysis';

const existsSync = vi.fn();
const readdirSync = vi.fn();
const readFileSync = vi.fn();
const statSync = vi.fn();
const writeFileSync = vi.fn();
const fs = {
	readdir: vi.fn(),
};

describe('bundle-analysis', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setBundleAnalysisFileSystemForTests({
			existsSync,
			readFileSync,
			readdir: fs.readdir,
			readdirSync,
			statSync,
			writeFileSync,
		});
	});

	describe('extractBundleSizes', () => {
		it('should extract bundles from chunks', () => {
			const mockData = {
				data: {
					chunkGraph: {
						assets: [
							{
								gzipSize: 512,
								id: 'asset-1',
							},
						],
						chunks: [
							{
								assets: ['asset-1'],
								id: 'chunk-1',
								name: 'main.js',
								size: 1024,
							},
							{
								id: 'chunk-2',
								name: 'vendor.js',
								size: 2048,
							},
						],
					},
				},
			};

			vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData));

			const result = extractBundleSizes('/test/rsdoctor-data.json');

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				gzipSize: 512,
				name: 'main.js',
				path: '/test/rsdoctor-data.json',
				size: 1024,
			});
			expect(result[1]).toEqual({
				gzipSize: undefined,
				name: 'vendor.js',
				path: '/test/rsdoctor-data.json',
				size: 2048,
			});
		});

		it('should include initial and entry flags when available', () => {
			const mockData = {
				data: {
					chunkGraph: {
						chunks: [
							{
								entry: true,
								initial: true,
								name: 'index',
								size: 1024,
							},
							{
								entry: false,
								initial: false,
								name: 'lazy.js',
								size: 512,
							},
						],
					},
				},
			};

			vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData));

			const result = extractBundleSizes('/test/rsdoctor-data.json');

			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({
				entry: true,
				initial: true,
				name: 'index',
				size: 1024,
			});
			expect(result[1]).toMatchObject({
				entry: false,
				initial: false,
				name: 'lazy.js',
				size: 512,
			});
		});

		it('should fallback to assets if chunks not available', () => {
			const mockData = {
				data: {
					chunkGraph: {
						assets: [
							{
								gzipSize: 512,
								id: 'asset-1',
								path: 'main.js',
								size: 1024,
							},
						],
					},
				},
			};

			vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData));

			const result = extractBundleSizes('/test/rsdoctor-data.json');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				gzipSize: 512,
				name: 'main.js',
				path: '/test/rsdoctor-data.json',
				size: 1024,
			});
		});

		it('should fallback to modules if chunks and assets not available', () => {
			const mockData = {
				data: {
					modules: [
						{
							chunks: ['chunk-1'],
							size: {
								transformedSize: 512,
							},
						},
						{
							chunks: ['chunk-1', 'chunk-2'],
							size: {
								sourceSize: 256,
							},
						},
						{
							chunks: ['chunk-2'],
							size: {
								transformedSize: 128,
							},
						},
					],
				},
			};

			vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData));

			const result = extractBundleSizes('/test/rsdoctor-data.json');

			expect(result).toHaveLength(2);
			expect(result.find((b) => b.name === 'chunk-1')).toEqual({
				name: 'chunk-1',
				path: '/test/rsdoctor-data.json',
				// 512 + 256
				size: 768,
			});
			expect(result.find((b) => b.name === 'chunk-2')).toEqual({
				name: 'chunk-2',
				path: '/test/rsdoctor-data.json',
				// 256 + 128
				size: 384,
			});
		});

		it('should return empty array on error', () => {
			vi.mocked(readFileSync).mockImplementation(() => {
				throw new Error('File not found');
			});

			const consoleSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {});

			const result = extractBundleSizes('/test/invalid.json');

			expect(result).toEqual([]);
			expect(consoleSpy).toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});

	describe('compareBundles', () => {
		const baseBundles: BundleStats[] = [
			{ name: 'main.js', path: '/base', size: 1000 },
			{ name: 'vendor.js', path: '/base', size: 2000 },
			{ name: 'removed.js', path: '/base', size: 500 },
		];

		const currentBundles: BundleStats[] = [
			// changed
			{ name: 'main.js', path: '/current', size: 1100 },
			// unchanged
			{ name: 'vendor.js', path: '/current', size: 2000 },
			// added
			{ name: 'new.js', path: '/current', size: 300 },
		];

		it('should identify added bundles', () => {
			const result = compareBundles(baseBundles, currentBundles);
			expect(result.added).toHaveLength(1);
			expect(result.added[0].name).toBe('new.js');
		});

		it('should identify removed bundles', () => {
			const result = compareBundles(baseBundles, currentBundles);
			expect(result.removed).toHaveLength(1);
			expect(result.removed[0].name).toBe('removed.js');
		});

		it('should identify changed bundles', () => {
			const result = compareBundles(baseBundles, currentBundles);
			expect(result.changed).toHaveLength(1);
			expect(result.changed[0]).toEqual({
				baseSize: 1000,
				currentSize: 1100,
				diff: 100,
				diffPercent: 10,
				name: 'main.js',
			});
		});

		it('should handle zero base size', () => {
			const base: BundleStats[] = [{ name: 'test.js', path: '/base', size: 0 }];
			const current: BundleStats[] = [
				{ name: 'test.js', path: '/current', size: 100 },
			];

			const result = compareBundles(base, current);
			expect(result.changed[0].diffPercent).toBe(0);
		});

		it('should return empty arrays when bundles are identical', () => {
			const bundles: BundleStats[] = [
				{ name: 'main.js', path: '/base', size: 1000 },
			];
			const result = compareBundles(bundles, bundles);
			expect(result.added).toHaveLength(0);
			expect(result.removed).toHaveLength(0);
			expect(result.changed).toHaveLength(0);
		});
	});

	describe('formatBytes', () => {
		it('should format zero bytes correctly', () => {
			expect(formatBytes(0)).toBe('0 B');
		});

		it('should format bytes correctly', () => {
			expect(formatBytes(1)).toBe('1.00 B');
			expect(formatBytes(500)).toBe('500.00 B');
			expect(formatBytes(1023)).toBe('1023.00 B');
		});

		it('should format kilobytes correctly', () => {
			expect(formatBytes(1024)).toBe('1.00 KB');
			expect(formatBytes(1536)).toBe('1.50 KB');
			expect(formatBytes(5120)).toBe('5.00 KB');
		});

		it('should format megabytes correctly', () => {
			expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
			expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.50 MB');
		});

		it('should format gigabytes correctly', () => {
			expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
		});

		it('should handle negative bytes', () => {
			expect(formatBytes(-1024)).toBe('-1.00 KB');
			expect(formatBytes(-512)).toBe('-512.00 B');
		});
	});

	describe('generateMarkdownReport', () => {
		it('should generate empty report when no packages', () => {
			const result = generateMarkdownReport([]);
			expect(result).toBe(
				'# 📦 Bundle Size Analysis\n\nNo bundle changes detected.\n'
			);
		});

		it('should generate compact overview and collapsed details', () => {
			const packages: PackageBundleData[] = [
				{
					baseBundles: [],
					currentBundles: [],
					diffs: {
						added: [],
						changed: [],
						removed: [],
					},
					packageName: 'test-package',
					totalBaseSize: 1024,
					totalCurrentSize: 1100,
					totalDiff: 100,
					totalDiffPercent: 10,
				},
			];

			const result = generateMarkdownReport(packages);
			expect(result).toContain('## At a Glance');
			expect(result).toContain(
				'**Metric:** Initial chunks when available (falls back to all chunks)'
			);
			expect(result).toContain('### Top Regressions');
			expect(result).toContain('All Package Deltas');
			expect(result).toContain('test-package');
			expect(result).toContain('1.00 KB');
			expect(result).toContain('10.00%');
			expect(result).toContain(
				'*This analysis was generated automatically by [rsdoctor](https://rsdoctor.rs/).*'
			);
		});

		it('should include added bundles section', () => {
			const packages: PackageBundleData[] = [
				{
					baseBundles: [],
					currentBundles: [],
					diffs: {
						added: [{ name: 'new.js', path: '/test', size: 500 }],
						changed: [],
						removed: [],
					},
					packageName: 'test-package',
					totalBaseSize: 0,
					totalCurrentSize: 500,
					totalDiff: 500,
					totalDiffPercent: 0,
				},
			];

			const result = generateMarkdownReport(packages);
			expect(result).toContain('### ➕ Added Bundles');
			expect(result).toContain('new.js');
			expect(result).toContain('500.00 B');
		});

		it('should include removed bundles section', () => {
			const packages: PackageBundleData[] = [
				{
					baseBundles: [],
					currentBundles: [],
					diffs: {
						added: [],
						changed: [],
						removed: [{ name: 'old.js', path: '/test', size: 300 }],
					},
					packageName: 'test-package',
					totalBaseSize: 300,
					totalCurrentSize: 0,
					totalDiff: -300,
					totalDiffPercent: -100,
				},
			];

			const result = generateMarkdownReport(packages);
			expect(result).toContain('### ➖ Removed Bundles');
			expect(result).toContain('old.js');
			expect(result).toContain('300.00 B');
		});

		it('should include changed bundles section', () => {
			const packages: PackageBundleData[] = [
				{
					baseBundles: [],
					currentBundles: [],
					diffs: {
						added: [],
						changed: [
							{
								baseSize: 1024,
								currentSize: 1200,
								diff: 200,
								diffPercent: 20,
								name: 'main.js',
							},
						],
						removed: [],
					},
					packageName: 'test-package',
					totalBaseSize: 1024,
					totalCurrentSize: 1200,
					totalDiff: 200,
					totalDiffPercent: 20,
				},
			];

			const result = generateMarkdownReport(packages);
			expect(result).toContain('### 📊 Changed Bundles');
			expect(result).toContain('main.js');
			expect(result).toContain('1.00 KB');
			expect(result).toContain('20.00%');
		});

		it('should include transitive impact section when provided', () => {
			const packages: PackageBundleData[] = [
				{
					baseBundles: [],
					currentBundles: [],
					diffs: { added: [], changed: [], removed: [] },
					packageName: 'core',
					totalBaseSize: 1024,
					totalCurrentSize: 2048,
					totalDiff: 1024,
					totalDiffPercent: 100,
				},
			];
			const transitive: TransitiveBundleData[] = [
				{
					includedPackageDirs: ['backend', 'core', 'translations'],
					rootPackage: 'c15t',
					totalBaseSize: 3072,
					totalCurrentSize: 4096,
					totalDiff: 1024,
					totalDiffPercent: 33.3333,
				},
			];

			const result = generateMarkdownReport(packages, transitive);

			expect(result).toContain('## Effective Transitive Impact');
			expect(result).toContain('`c15t`');
			expect(result).toContain('Transitive Package Membership');
			expect(result).toContain('`backend`, `core`, `translations`');
			expect(result).toContain('33.33%');
		});

		it('should skip packages with no changes', () => {
			const packages: PackageBundleData[] = [
				{
					baseBundles: [],
					currentBundles: [],
					diffs: {
						added: [],
						changed: [],
						removed: [],
					},
					packageName: 'no-changes',
					totalBaseSize: 1000,
					totalCurrentSize: 1000,
					totalDiff: 0,
					totalDiffPercent: 0,
				},
				{
					baseBundles: [],
					currentBundles: [],
					diffs: {
						added: [{ name: 'new.js', path: '/test', size: 500 }],
						changed: [],
						removed: [],
					},
					packageName: 'with-changes',
					totalBaseSize: 0,
					totalCurrentSize: 500,
					totalDiff: 500,
					totalDiffPercent: 0,
				},
			];

			const result = generateMarkdownReport(packages);
			// Should appear in summary
			expect(result).toContain('no-changes');
			// no-changes package should not have a bundle-level package details section
			expect(result).not.toContain('`no-changes`:');
			// with-changes package should have bundle-level details
			expect(result).toContain('`with-changes`:');
			// Should have details section for with-changes
			expect(result).toContain('<details>');
			// Should appear in details
			expect(result).toContain('with-changes');
		});
	});

	describe('analyzeBundles', () => {
		it('should return empty array when packages directory does not exist', async () => {
			vi.mocked(existsSync).mockReturnValue(false);
			const result = await analyzeBundles('/base', '/current', '/nonexistent');
			expect(result).toEqual([]);
		});

		it('should analyze packages', async () => {
			const baseData = {
				data: {
					chunkGraph: {
						chunks: [{ name: 'main.js', size: 1000 }],
					},
				},
			};

			const currentData = {
				data: {
					chunkGraph: {
						chunks: [{ name: 'main.js', size: 1100 }],
					},
				},
			};

			vi.mocked(existsSync).mockImplementation(
				(path: PathLike) =>
					String(path) === 'packages' || String(path).includes('dist')
			);

			vi.mocked(readdirSync).mockReturnValue([
				'package1',
				'package2',
			] as unknown as ReturnType<typeof readdirSync>);

			vi.mocked(statSync).mockReturnValue({
				isDirectory: () => true,
			} as unknown as ReturnType<typeof statSync>);

			// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
			vi.mocked(fs.readdir).mockImplementation(async (path: PathLike) => {
				if (String(path).includes('dist')) {
					return [
						{
							isDirectory: () => false,
							isFile: () => true,
							isSymbolicLink: () => false,
							name: 'rsdoctor-data.json',
						},
					] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
				}
				return [] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
			});

			vi.mocked(readFileSync).mockImplementation(
				(path: PathOrFileDescriptor) => {
					if (String(path).includes('base')) {
						return JSON.stringify(baseData);
					}
					return JSON.stringify(currentData);
				}
			);

			const result = await analyzeBundles('/base', '/current', 'packages');

			expect(result).toHaveLength(2);
			expect(result[0].packageName).toBe('package1');
			expect(result[1].packageName).toBe('package2');
		});

		it('should prefer initial chunks for package totals when available', async () => {
			const baseData = {
				data: {
					chunkGraph: {
						chunks: [
							{ entry: true, initial: true, name: 'index', size: 1000 },
							{ entry: false, initial: false, name: 'lazy.js', size: 500 },
						],
					},
				},
			};

			const currentData = {
				data: {
					chunkGraph: {
						chunks: [
							{ entry: true, initial: true, name: 'index', size: 1100 },
							{ entry: false, initial: false, name: 'lazy.js', size: 900 },
						],
					},
				},
			};

			vi.mocked(existsSync).mockImplementation(
				(path: PathLike) =>
					String(path) === 'packages' || String(path).includes('dist')
			);

			vi.mocked(readdirSync).mockReturnValue([
				'package1',
			] as unknown as ReturnType<typeof readdirSync>);

			vi.mocked(statSync).mockReturnValue({
				isDirectory: () => true,
			} as unknown as ReturnType<typeof statSync>);

			// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
			vi.mocked(fs.readdir).mockImplementation(async (path: PathLike) => {
				if (String(path).includes('dist')) {
					return [
						{
							isDirectory: () => false,
							isFile: () => true,
							isSymbolicLink: () => false,
							name: 'rsdoctor-data.json',
						},
					] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
				}
				return [] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
			});

			vi.mocked(readFileSync).mockImplementation(
				(path: PathOrFileDescriptor) => {
					if (String(path).includes('base')) {
						return JSON.stringify(baseData);
					}
					return JSON.stringify(currentData);
				}
			);

			const result = await analyzeBundles('/base', '/current', 'packages');

			expect(result).toHaveLength(1);
			expect(result[0].totalBaseSize).toBe(1000);
			expect(result[0].totalCurrentSize).toBe(1100);
			expect(result[0].totalDiff).toBe(100);
			expect(result[0].totalDiffPercent).toBe(10);
		});

		it('should skip packages with zero size', async () => {
			vi.mocked(existsSync).mockReturnValue(true);
			vi.mocked(readdirSync).mockReturnValue([
				'package1',
			] as unknown as ReturnType<typeof readdirSync>);
			vi.mocked(statSync).mockReturnValue({
				isDirectory: () => true,
			} as unknown as ReturnType<typeof statSync>);

			vi.mocked(fs.readdir).mockResolvedValue(
				[] as unknown as Awaited<ReturnType<typeof fs.readdir>>
			);

			const result = await analyzeBundles('/base', '/current', 'packages');
			expect(result).toEqual([]);
		});
	});

	describe('analyzeTransitiveImpact', () => {
		it('should compute transitive totals for selected roots', () => {
			vi.mocked(existsSync).mockImplementation((path: PathLike) =>
				String(path).includes('packages')
			);

			vi.mocked(readdirSync).mockImplementation((path: PathLike) => {
				const pathStr = String(path);
				if (pathStr.endsWith('packages')) {
					return [
						'core',
						'react',
						'backend',
						'translations',
					] as unknown as ReturnType<typeof readdirSync>;
				}
				return [] as unknown as ReturnType<typeof readdirSync>;
			});

			vi.mocked(statSync).mockReturnValue({
				isDirectory: () => true,
			} as unknown as ReturnType<typeof statSync>);

			vi.mocked(readFileSync).mockImplementation(
				(path: PathOrFileDescriptor) => {
					const pathStr = String(path);
					if (pathStr.endsWith('/packages/core/package.json')) {
						return JSON.stringify({
							dependencies: {
								'@c15t/backend': 'workspace:*',
								'@c15t/translations': 'workspace:*',
							},
							name: 'c15t',
						});
					}
					if (pathStr.endsWith('/packages/react/package.json')) {
						return JSON.stringify({
							dependencies: {
								c15t: 'workspace:*',
							},
							name: '@c15t/react',
						});
					}
					if (pathStr.endsWith('/packages/backend/package.json')) {
						return JSON.stringify({
							name: '@c15t/backend',
						});
					}
					if (pathStr.endsWith('/packages/translations/package.json')) {
						return JSON.stringify({
							name: '@c15t/translations',
						});
					}
					return JSON.stringify({});
				}
			);

			const packages: PackageBundleData[] = [
				{
					baseBundles: [],
					currentBundles: [],
					diffs: { added: [], changed: [], removed: [] },
					packageName: 'core',
					totalBaseSize: 100,
					totalCurrentSize: 140,
					totalDiff: 40,
					totalDiffPercent: 40,
				},
				{
					baseBundles: [],
					currentBundles: [],
					diffs: { added: [], changed: [], removed: [] },
					packageName: 'react',
					totalBaseSize: 200,
					totalCurrentSize: 260,
					totalDiff: 60,
					totalDiffPercent: 30,
				},
				{
					baseBundles: [],
					currentBundles: [],
					diffs: { added: [], changed: [], removed: [] },
					packageName: 'backend',
					totalBaseSize: 300,
					totalCurrentSize: 330,
					totalDiff: 30,
					totalDiffPercent: 10,
				},
				{
					baseBundles: [],
					currentBundles: [],
					diffs: { added: [], changed: [], removed: [] },
					packageName: 'translations',
					totalBaseSize: 50,
					totalCurrentSize: 60,
					totalDiff: 10,
					totalDiffPercent: 20,
				},
			];

			const result = analyzeTransitiveImpact(packages, '/repo', 'packages', [
				'@c15t/react',
				'c15t',
			]);

			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({
				includedPackageDirs: ['backend', 'core', 'react', 'translations'],
				rootPackage: '@c15t/react',
				totalBaseSize: 650,
				totalCurrentSize: 790,
				totalDiff: 140,
			});
			expect(result[1]).toMatchObject({
				includedPackageDirs: ['backend', 'core', 'translations'],
				rootPackage: 'c15t',
				totalBaseSize: 450,
				totalCurrentSize: 530,
				totalDiff: 80,
			});
		});

		it('should include packages from base graph when dependencies were removed', () => {
			vi.mocked(existsSync).mockImplementation((path: PathLike) =>
				String(path).includes('packages')
			);
			vi.mocked(readdirSync).mockImplementation((path: PathLike) => {
				const pathStr = String(path);
				if (pathStr.endsWith('packages')) {
					return ['core', 'backend', 'schema'] as unknown as ReturnType<
						typeof readdirSync
					>;
				}
				return [] as unknown as ReturnType<typeof readdirSync>;
			});
			vi.mocked(statSync).mockReturnValue({
				isDirectory: () => true,
			} as unknown as ReturnType<typeof statSync>);
			vi.mocked(readFileSync).mockImplementation(
				(path: PathOrFileDescriptor) => {
					const pathStr = String(path);
					if (pathStr.includes('/base/')) {
						if (pathStr.endsWith('/packages/core/package.json')) {
							return JSON.stringify({
								dependencies: {
									'@c15t/backend': 'workspace:*',
									'@c15t/schema': 'workspace:*',
								},
								name: 'c15t',
							});
						}
					}
					if (pathStr.includes('/current/')) {
						if (pathStr.endsWith('/packages/core/package.json')) {
							return JSON.stringify({
								dependencies: {
									'@c15t/backend': 'workspace:*',
								},
								name: 'c15t',
							});
						}
					}
					if (pathStr.endsWith('/packages/backend/package.json')) {
						return JSON.stringify({ name: '@c15t/backend' });
					}
					if (pathStr.endsWith('/packages/schema/package.json')) {
						return JSON.stringify({ name: '@c15t/schema' });
					}
					return JSON.stringify({});
				}
			);

			const packages: PackageBundleData[] = [
				{
					baseBundles: [],
					currentBundles: [],
					diffs: { added: [], changed: [], removed: [] },
					packageName: 'core',
					totalBaseSize: 100,
					totalCurrentSize: 110,
					totalDiff: 10,
					totalDiffPercent: 10,
				},
				{
					baseBundles: [],
					currentBundles: [],
					diffs: { added: [], changed: [], removed: [] },
					packageName: 'backend',
					totalBaseSize: 80,
					totalCurrentSize: 90,
					totalDiff: 10,
					totalDiffPercent: 12.5,
				},
				{
					baseBundles: [],
					currentBundles: [],
					diffs: { added: [], changed: [], removed: [] },
					packageName: 'schema',
					totalBaseSize: 60,
					totalCurrentSize: 0,
					totalDiff: -60,
					totalDiffPercent: -100,
				},
			];

			const result = analyzeTransitiveImpact(
				packages,
				'/current',
				'packages',
				['c15t'],
				'/base'
			);

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				includedPackageDirs: ['backend', 'core', 'schema'],
				rootPackage: 'c15t',
				totalBaseSize: 240,
				totalCurrentSize: 200,
				totalDiff: -40,
			});
		});
	});

	describe('writeReport', () => {
		it('should write report to file', () => {
			const packages: PackageBundleData[] = [
				{
					baseBundles: [],
					currentBundles: [],
					diffs: {
						added: [],
						changed: [],
						removed: [],
					},
					packageName: 'test-package',
					totalBaseSize: 1000,
					totalCurrentSize: 1100,
					totalDiff: 100,
					totalDiffPercent: 10,
				},
			];

			writeReport(packages, '/test/output.md');

			expect(writeFileSync).toHaveBeenCalledWith(
				'/test/output.md',
				expect.stringContaining('# 📦 Bundle Size Analysis'),
				'utf-8'
			);
		});

		it('should throw error on file write failure', () => {
			vi.mocked(writeFileSync).mockImplementation(() => {
				throw new Error('Permission denied');
			});

			const packages: PackageBundleData[] = [];

			expect(() => {
				writeReport(packages, '/test/output.md');
			}).toThrow('Failed to write bundle analysis report');
		});
	});

	describe('calculateTotalDiffPercent', () => {
		it('should return 0 for empty packages', () => {
			expect(calculateTotalDiffPercent([])).toBe(0);
		});

		it('should calculate total diff percent correctly', () => {
			const packages: PackageBundleData[] = [
				{
					baseBundles: [],
					currentBundles: [],
					diffs: { added: [], changed: [], removed: [] },
					packageName: 'pkg1',
					totalBaseSize: 1000,
					totalCurrentSize: 1100,
					totalDiff: 100,
					totalDiffPercent: 10,
				},
				{
					baseBundles: [],
					currentBundles: [],
					diffs: { added: [], changed: [], removed: [] },
					packageName: 'pkg2',
					totalBaseSize: 2000,
					totalCurrentSize: 2200,
					totalDiff: 200,
					totalDiffPercent: 10,
				},
			];

			// Total: 3000 base, 3300 current, 300 diff = 10%
			expect(calculateTotalDiffPercent(packages)).toBe(10);
		});

		it('should handle zero base size', () => {
			const packages: PackageBundleData[] = [
				{
					baseBundles: [],
					currentBundles: [],
					diffs: { added: [], changed: [], removed: [] },
					packageName: 'pkg1',
					totalBaseSize: 0,
					totalCurrentSize: 1000,
					totalDiff: 1000,
					totalDiffPercent: 0,
				},
			];

			expect(calculateTotalDiffPercent(packages)).toBe(0);
		});
	});
});
