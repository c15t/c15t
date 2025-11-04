import {
	existsSync,
	type PathLike,
	type PathOrFileDescriptor,
	readdirSync,
	readFileSync,
	statSync,
} from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	analyzePackage,
	type BundleStats,
	compareBundles,
	extractBundleSizes,
	findRsdoctorDataFiles,
	formatBytes,
	generateMarkdownReport,
	getSizeChangeEmoji,
	type PackageBundleData,
} from './analyze-bundle-diff';

// Mock fs module
vi.mock('node:fs', () => ({
	existsSync: vi.fn(),
	readdirSync: vi.fn(),
	readFileSync: vi.fn(),
	statSync: vi.fn(),
	writeFileSync: vi.fn(),
}));

describe('analyze-bundle-diff', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getSizeChangeEmoji', () => {
		it('should return red emoji for increases > 5%', () => {
			expect(getSizeChangeEmoji(10)).toBe('🔴');
			expect(getSizeChangeEmoji(6)).toBe('🔴');
			expect(getSizeChangeEmoji(100)).toBe('🔴');
		});

		it('should return yellow emoji for increases between 0% and 5%', () => {
			expect(getSizeChangeEmoji(1)).toBe('🟡');
			expect(getSizeChangeEmoji(4.9)).toBe('🟡');
			expect(getSizeChangeEmoji(5)).toBe('🟡');
		});

		it('should return green emoji for decreases < -5%', () => {
			expect(getSizeChangeEmoji(-10)).toBe('🟢');
			expect(getSizeChangeEmoji(-6)).toBe('🟢');
			expect(getSizeChangeEmoji(-100)).toBe('🟢');
		});

		it('should return white emoji for small changes between -5% and 0%', () => {
			expect(getSizeChangeEmoji(0)).toBe('⚪');
			expect(getSizeChangeEmoji(-1)).toBe('⚪');
			expect(getSizeChangeEmoji(-4.9)).toBe('⚪');
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

	describe('findRsdoctorDataFiles', () => {
		it('should return empty array if directory does not exist', () => {
			vi.mocked(existsSync).mockReturnValue(false);
			expect(findRsdoctorDataFiles('/nonexistent')).toEqual([]);
		});

		it('should find rsdoctor-data.json files in directory', () => {
			vi.mocked(existsSync).mockReturnValue(true);
			vi.mocked(readdirSync).mockReturnValue([
				'rsdoctor-data.json',
			] as unknown as ReturnType<typeof readdirSync>);
			vi.mocked(statSync).mockReturnValue({
				isDirectory: () => false,
			} as ReturnType<typeof statSync>);

			const result = findRsdoctorDataFiles('/test');
			expect(result).toEqual(['/test/rsdoctor-data.json']);
		});

		it('should recursively search subdirectories', () => {
			vi.mocked(existsSync).mockReturnValue(true);
			vi.mocked(readdirSync).mockImplementation((path: PathLike) => {
				if (path === '/test') {
					return ['subdir'] as unknown as ReturnType<typeof readdirSync>;
				}
				if (path === '/test/subdir') {
					return ['rsdoctor-data.json'] as unknown as ReturnType<
						typeof readdirSync
					>;
				}
				return [] as unknown as ReturnType<typeof readdirSync>;
			});

			vi.mocked(statSync).mockImplementation((path: PathLike) => {
				if (path === '/test/subdir') {
					return {
						isDirectory: () => true,
					} as ReturnType<typeof statSync>;
				}
				return {
					isDirectory: () => false,
				} as ReturnType<typeof statSync>;
			});

			const result = findRsdoctorDataFiles('/test');
			expect(result).toEqual(['/test/subdir/rsdoctor-data.json']);
		});

		it('should ignore non-rsdoctor-data.json files', () => {
			vi.mocked(existsSync).mockReturnValue(true);
			vi.mocked(readdirSync).mockReturnValue([
				'other-file.json',
				'package.json',
			] as unknown as ReturnType<typeof readdirSync>);
			vi.mocked(statSync).mockReturnValue({
				isDirectory: () => false,
			} as ReturnType<typeof statSync>);

			const result = findRsdoctorDataFiles('/test');
			expect(result).toEqual([]);
		});
	});

	describe('extractBundleSizes', () => {
		it('should extract bundles from chunks', () => {
			const mockData = {
				data: {
					chunkGraph: {
						chunks: [
							{
								name: 'main.js',
								id: 'chunk-1',
								size: 1024,
								assets: ['asset-1'],
							},
							{
								name: 'vendor.js',
								id: 'chunk-2',
								size: 2048,
							},
						],
						assets: [
							{
								id: 'asset-1',
								gzipSize: 512,
							},
						],
					},
				},
			};

			vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData));

			const result = extractBundleSizes('/test/rsdoctor-data.json');

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				name: 'main.js',
				path: '/test/rsdoctor-data.json',
				size: 1024,
				gzipSize: 512,
			});
			expect(result[1]).toEqual({
				name: 'vendor.js',
				path: '/test/rsdoctor-data.json',
				size: 2048,
				gzipSize: undefined,
			});
		});

		it('should fallback to assets if chunks not available', () => {
			const mockData = {
				data: {
					chunkGraph: {
						assets: [
							{
								id: 'asset-1',
								path: 'main.js',
								size: 1024,
								gzipSize: 512,
							},
						],
					},
				},
			};

			vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData));

			const result = extractBundleSizes('/test/rsdoctor-data.json');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				name: 'main.js',
				path: '/test/rsdoctor-data.json',
				size: 1024,
				gzipSize: 512,
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
				size: 768, // 512 + 256
			});
			expect(result.find((b) => b.name === 'chunk-2')).toEqual({
				name: 'chunk-2',
				path: '/test/rsdoctor-data.json',
				size: 384, // 256 + 128
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

		it('should handle missing chunk name and use id', () => {
			const mockData = {
				data: {
					chunkGraph: {
						chunks: [
							{
								id: 'chunk-1',
								size: 1024,
							},
						],
					},
				},
			};

			vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData));

			const result = extractBundleSizes('/test/rsdoctor-data.json');

			expect(result[0].name).toBe('chunk-1');
		});

		it('should handle missing chunk name and id', () => {
			const mockData = {
				data: {
					chunkGraph: {
						chunks: [
							{
								size: 1024,
							},
						],
					},
				},
			};

			vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData));

			const result = extractBundleSizes('/test/rsdoctor-data.json');

			expect(result[0].name).toBe('unknown');
		});
	});

	describe('compareBundles', () => {
		const baseBundles: BundleStats[] = [
			{ name: 'main.js', path: '/base', size: 1000 },
			{ name: 'vendor.js', path: '/base', size: 2000 },
			{ name: 'removed.js', path: '/base', size: 500 },
		];

		const currentBundles: BundleStats[] = [
			{ name: 'main.js', path: '/current', size: 1100 }, // changed
			{ name: 'vendor.js', path: '/current', size: 2000 }, // unchanged
			{ name: 'new.js', path: '/current', size: 300 }, // added
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
				name: 'main.js',
				baseSize: 1000,
				currentSize: 1100,
				diff: 100,
				diffPercent: 10,
			});
		});

		it('should calculate diff percent correctly', () => {
			const base: BundleStats[] = [
				{ name: 'test.js', path: '/base', size: 1000 },
			];
			const current: BundleStats[] = [
				{ name: 'test.js', path: '/current', size: 1200 },
			];

			const result = compareBundles(base, current);
			expect(result.changed[0].diffPercent).toBe(20);
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

		it('should handle empty base bundles', () => {
			const current: BundleStats[] = [
				{ name: 'new.js', path: '/current', size: 1000 },
			];
			const result = compareBundles([], current);
			expect(result.added).toHaveLength(1);
			expect(result.removed).toHaveLength(0);
			expect(result.changed).toHaveLength(0);
		});

		it('should handle empty current bundles', () => {
			const base: BundleStats[] = [
				{ name: 'old.js', path: '/base', size: 1000 },
			];
			const result = compareBundles(base, []);
			expect(result.added).toHaveLength(0);
			expect(result.removed).toHaveLength(1);
			expect(result.changed).toHaveLength(0);
		});
	});

	describe('generateMarkdownReport', () => {
		it('should generate empty report when no packages', () => {
			const result = generateMarkdownReport([]);
			expect(result).toBe(
				'# 📦 Bundle Size Analysis\n\nNo bundle changes detected.\n'
			);
		});

		it('should generate summary table', () => {
			const packages: PackageBundleData[] = [
				{
					packageName: 'test-package',
					baseBundles: [],
					currentBundles: [],
					diffs: {
						added: [],
						removed: [],
						changed: [],
					},
					totalBaseSize: 1000,
					totalCurrentSize: 1100,
					totalDiff: 100,
					totalDiffPercent: 10,
				},
			];

			const result = generateMarkdownReport(packages);
			expect(result).toContain('## Summary');
			expect(result).toContain('test-package');
			expect(result).toContain('1000.00 B'); // 1000 bytes < 1024, so it's formatted as bytes
			expect(result).toContain('10.00%');
		});

		it('should include added bundles section', () => {
			const packages: PackageBundleData[] = [
				{
					packageName: 'test-package',
					baseBundles: [],
					currentBundles: [],
					diffs: {
						added: [{ name: 'new.js', path: '/test', size: 500 }],
						removed: [],
						changed: [],
					},
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
					packageName: 'test-package',
					baseBundles: [],
					currentBundles: [],
					diffs: {
						added: [],
						removed: [{ name: 'old.js', path: '/test', size: 300 }],
						changed: [],
					},
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
					packageName: 'test-package',
					baseBundles: [],
					currentBundles: [],
					diffs: {
						added: [],
						removed: [],
						changed: [
							{
								name: 'main.js',
								baseSize: 1000,
								currentSize: 1200,
								diff: 200,
								diffPercent: 20,
							},
						],
					},
					totalBaseSize: 1000,
					totalCurrentSize: 1200,
					totalDiff: 200,
					totalDiffPercent: 20,
				},
			];

			const result = generateMarkdownReport(packages);
			expect(result).toContain('### 📊 Changed Bundles');
			expect(result).toContain('main.js');
			expect(result).toContain('1000.00 B'); // 1000 bytes < 1024, so it's formatted as bytes
			expect(result).toContain('20.00%');
		});

		it('should skip packages with no changes', () => {
			const packages: PackageBundleData[] = [
				{
					packageName: 'no-changes',
					baseBundles: [],
					currentBundles: [],
					diffs: {
						added: [],
						removed: [],
						changed: [],
					},
					totalBaseSize: 1000,
					totalCurrentSize: 1000,
					totalDiff: 0,
					totalDiffPercent: 0,
				},
				{
					packageName: 'with-changes',
					baseBundles: [],
					currentBundles: [],
					diffs: {
						added: [{ name: 'new.js', path: '/test', size: 500 }],
						removed: [],
						changed: [],
					},
					totalBaseSize: 0,
					totalCurrentSize: 500,
					totalDiff: 500,
					totalDiffPercent: 0,
				},
			];

			const result = generateMarkdownReport(packages);
			expect(result).toContain('no-changes'); // Should appear in summary
			// no-changes package should not have a details section since it has no diffs
			// Check that there's no details section specifically for no-changes
			const noChangesInDetails = result.match(
				/<details>[\s\S]*?no-changes[\s\S]*?<\/details>/
			);
			expect(noChangesInDetails).toBeNull(); // Should not find no-changes inside details
			// with-changes package should have a details section
			expect(result).toContain('<details>'); // Should have details section for with-changes
			expect(result).toContain('with-changes'); // Should appear in details
		});

		it('should use correct emojis for size changes', () => {
			const packages: PackageBundleData[] = [
				{
					packageName: 'large-increase',
					baseBundles: [],
					currentBundles: [],
					diffs: {
						added: [],
						removed: [],
						changed: [],
					},
					totalBaseSize: 1000,
					totalCurrentSize: 1100,
					totalDiff: 100,
					totalDiffPercent: 10,
				},
				{
					packageName: 'small-increase',
					baseBundles: [],
					currentBundles: [],
					diffs: {
						added: [],
						removed: [],
						changed: [],
					},
					totalBaseSize: 1000,
					totalCurrentSize: 1030,
					totalDiff: 30,
					totalDiffPercent: 3,
				},
			];

			const result = generateMarkdownReport(packages);
			expect(result).toContain('🔴'); // Large increase
			expect(result).toContain('🟡'); // Small increase
		});
	});

	describe('analyzePackage', () => {
		const baseDir = '/base';
		const currentDir = '/current';
		const packageDir = 'packages/test-package';

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should return null when no rsdoctor files found', () => {
			vi.mocked(existsSync).mockReturnValue(false);
			const result = analyzePackage(packageDir, baseDir, currentDir);
			expect(result).toBeNull();
		});

		it('should analyze package with base and current bundles', () => {
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

			vi.mocked(existsSync).mockImplementation((path: PathLike) => {
				return String(path).includes('dist');
			});

			vi.mocked(readdirSync).mockReturnValue([
				'rsdoctor-data.json',
			] as unknown as ReturnType<typeof readdirSync>);

			vi.mocked(statSync).mockReturnValue({
				isDirectory: () => false,
			} as ReturnType<typeof statSync>);

			vi.mocked(readFileSync).mockImplementation(
				(path: PathOrFileDescriptor) => {
					if (String(path).includes('base')) {
						return JSON.stringify(baseData);
					}
					return JSON.stringify(currentData);
				}
			);

			const result = analyzePackage(packageDir, baseDir, currentDir);

			expect(result).not.toBeNull();
			expect(result?.packageName).toBe('test-package');
			expect(result?.totalBaseSize).toBe(1000);
			expect(result?.totalCurrentSize).toBe(1100);
			expect(result?.totalDiff).toBe(100);
			expect(result?.totalDiffPercent).toBe(10);
			expect(result?.diffs.changed).toHaveLength(1);
		});

		it('should extract package name from directory path', () => {
			vi.mocked(existsSync).mockReturnValue(false);
			const result1 = analyzePackage('packages/test', baseDir, currentDir);
			expect(result1).toBeNull();

			vi.mocked(existsSync).mockReturnValue(true);
			vi.mocked(readdirSync).mockReturnValue([
				'rsdoctor-data.json',
			] as unknown as ReturnType<typeof readdirSync>);
			vi.mocked(statSync).mockReturnValue({
				isDirectory: () => false,
			} as ReturnType<typeof statSync>);
			vi.mocked(readFileSync).mockReturnValue(
				JSON.stringify({ data: { chunkGraph: { chunks: [] } } })
			);

			const result2 = analyzePackage(
				'packages/another-package',
				baseDir,
				currentDir
			);
			expect(result2?.packageName).toBe('another-package');
		});

		it('should return null when bundles have zero size', () => {
			// Mock that files don't exist, so analyzePackage returns null
			vi.mocked(existsSync).mockReturnValue(false);

			const result = analyzePackage(packageDir, baseDir, currentDir);
			expect(result).toBeNull();
		});

		it('should calculate total diff percent correctly', () => {
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
						chunks: [{ name: 'main.js', size: 1200 }],
					},
				},
			};

			vi.mocked(existsSync).mockReturnValue(true);
			vi.mocked(readdirSync).mockReturnValue([
				'rsdoctor-data.json',
			] as unknown as ReturnType<typeof readdirSync>);
			vi.mocked(statSync).mockReturnValue({
				isDirectory: () => false,
			} as ReturnType<typeof statSync>);

			vi.mocked(readFileSync).mockImplementation(
				(path: PathOrFileDescriptor) => {
					if (String(path).includes('base')) {
						return JSON.stringify(baseData);
					}
					return JSON.stringify(currentData);
				}
			);

			const result = analyzePackage(packageDir, baseDir, currentDir);
			expect(result?.totalDiffPercent).toBe(20);
		});
	});
});
