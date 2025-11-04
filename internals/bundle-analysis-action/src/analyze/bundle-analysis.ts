/**
 * @packageDocumentation
 * Bundle analysis logic for comparing rsdoctor outputs.
 */
import {
	existsSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

export interface BundleStats {
	name: string;
	path: string;
	size: number;
	gzipSize?: number;
}

export interface PackageBundleData {
	packageName: string;
	baseBundles: BundleStats[];
	currentBundles: BundleStats[];
	diffs: {
		added: BundleStats[];
		removed: BundleStats[];
		changed: Array<{
			name: string;
			baseSize: number;
			currentSize: number;
			diff: number;
			diffPercent: number;
		}>;
	};
	totalBaseSize: number;
	totalCurrentSize: number;
	totalDiff: number;
	totalDiffPercent: number;
}

function findRsdoctorDataFiles(dir: string): string[] {
	const files: string[] = [];
	if (!existsSync(dir)) {
		return files;
	}

	function walk(currentDir: string) {
		const entries = readdirSync(currentDir);
		for (const entry of entries) {
			const fullPath = join(currentDir, entry);
			const stat = statSync(fullPath);
			if (stat.isDirectory()) {
				walk(fullPath);
			} else if (entry === 'rsdoctor-data.json') {
				files.push(fullPath);
			}
		}
	}

	walk(dir);
	return files;
}

function extractBundleSizes(jsonPath: string): BundleStats[] {
	try {
		const content = readFileSync(jsonPath, 'utf-8');
		const data = JSON.parse(content);
		const bundles: BundleStats[] = [];

		// Extract bundle information from rsdoctor data structure
		if (data?.data?.chunkGraph?.chunks) {
			for (const chunk of data.data.chunkGraph.chunks || []) {
				const chunkName = chunk.name || chunk.id || 'unknown';
				const chunkSize = chunk.size || 0;

				// Try to find corresponding asset for gzip size
				let gzipSize: number | undefined;
				if (data?.data?.chunkGraph?.assets && chunk.assets) {
					for (const assetId of chunk.assets) {
						const asset = data.data.chunkGraph.assets.find(
							(a: { id: string | number }) => String(a.id) === String(assetId)
						);
						if (asset?.gzipSize) {
							gzipSize = asset.gzipSize;
							break;
						}
					}
				}

				bundles.push({
					name: chunkName,
					path: jsonPath,
					size: chunkSize,
					gzipSize,
				});
			}
		}

		// Fallback: extract from assets if chunks not available
		if (bundles.length === 0 && data?.data?.chunkGraph?.assets) {
			for (const asset of data.data.chunkGraph.assets || []) {
				bundles.push({
					name: asset.path || asset.id || 'unknown',
					path: jsonPath,
					size: asset.size || 0,
					gzipSize: asset.gzipSize,
				});
			}
		}

		// Last resort: try to get from modules
		if (bundles.length === 0 && data?.data?.modules) {
			const chunkMap = new Map<string, BundleStats>();

			for (const module of data.data.modules || []) {
				const chunkNames = module.chunks || [];
				const size =
					module.size?.transformedSize || module.size?.sourceSize || 0;

				for (const chunkName of chunkNames) {
					if (!chunkMap.has(chunkName)) {
						chunkMap.set(chunkName, {
							name: chunkName,
							path: jsonPath,
							size: 0,
						});
					}
					const bundle = chunkMap.get(chunkName)!;
					bundle.size += size;
				}
			}

			bundles.push(...Array.from(chunkMap.values()));
		}

		return bundles;
	} catch (error) {
		console.error(`Error reading ${jsonPath}:`, error);
		return [];
	}
}

function compareBundles(
	baseBundles: BundleStats[],
	currentBundles: BundleStats[]
): PackageBundleData['diffs'] {
	const baseMap = new Map(baseBundles.map((b) => [b.name, b]));
	const currentMap = new Map(currentBundles.map((b) => [b.name, b]));

	const added: BundleStats[] = [];
	const removed: BundleStats[] = [];
	const changed: Array<{
		name: string;
		baseSize: number;
		currentSize: number;
		diff: number;
		diffPercent: number;
	}> = [];

	// Find added bundles
	for (const [name, bundle] of currentMap) {
		if (!baseMap.has(name)) {
			added.push(bundle);
		}
	}

	// Find removed bundles
	for (const [name, bundle] of baseMap) {
		if (!currentMap.has(name)) {
			removed.push(bundle);
		}
	}

	// Find changed bundles
	for (const [name, baseBundle] of baseMap) {
		const currentBundle = currentMap.get(name);
		if (currentBundle && baseBundle.size !== currentBundle.size) {
			const diff = currentBundle.size - baseBundle.size;
			const diffPercent = (diff / baseBundle.size) * 100;
			changed.push({
				name,
				baseSize: baseBundle.size,
				currentSize: currentBundle.size,
				diff,
				diffPercent,
			});
		}
	}

	return { added, removed, changed };
}

function analyzePackage(
	packageDir: string,
	baseDir: string,
	currentDir: string
): PackageBundleData | null {
	const packageName = packageDir.replace(/.*\//, '');
	const baseDistPath = join(baseDir, packageDir, 'dist');
	const currentDistPath = join(currentDir, packageDir, 'dist');

	const baseFiles = findRsdoctorDataFiles(baseDistPath);
	const currentFiles = findRsdoctorDataFiles(currentDistPath);

	if (baseFiles.length === 0 && currentFiles.length === 0) {
		return null;
	}

	const baseBundles: BundleStats[] = [];
	const currentBundles: BundleStats[] = [];

	for (const file of baseFiles) {
		baseBundles.push(...extractBundleSizes(file));
	}

	for (const file of currentFiles) {
		currentBundles.push(...extractBundleSizes(file));
	}

	const diffs = compareBundles(baseBundles, currentBundles);
	const totalBaseSize = baseBundles.reduce((sum, b) => sum + b.size, 0);
	const totalCurrentSize = currentBundles.reduce((sum, b) => sum + b.size, 0);
	const totalDiff = totalCurrentSize - totalBaseSize;
	const totalDiffPercent =
		totalBaseSize > 0 ? (totalDiff / totalBaseSize) * 100 : 0;

	return {
		packageName,
		baseBundles,
		currentBundles,
		diffs,
		totalBaseSize,
		totalCurrentSize,
		totalDiff,
		totalDiffPercent,
	};
}

export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
	return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function generateMarkdownReport(packages: PackageBundleData[]): string {
	let markdown = '# 📦 Bundle Size Analysis\n\n';

	if (packages.length === 0) {
		markdown += 'No bundle changes detected.\n';
		return markdown;
	}

	// Summary table
	markdown += '## Summary\n\n';
	markdown += '| Package | Base Size | Current Size | Change | % Change |\n';
	markdown += '|---------|-----------|--------------|--------|----------|\n';

	for (const pkg of packages) {
		const sign = pkg.totalDiff >= 0 ? '+' : '';
		const emoji =
			pkg.totalDiffPercent > 5
				? '🔴'
				: pkg.totalDiffPercent > 0
					? '🟡'
					: pkg.totalDiffPercent < -5
						? '🟢'
						: '⚪';
		markdown += `| ${emoji} \`${pkg.packageName}\` | ${formatBytes(pkg.totalBaseSize)} | ${formatBytes(pkg.totalCurrentSize)} | ${sign}${formatBytes(pkg.totalDiff)} | ${sign}${pkg.totalDiffPercent.toFixed(2)}% |\n`;
	}

	// Detailed changes per package
	for (const pkg of packages) {
		if (
			pkg.diffs.added.length === 0 &&
			pkg.diffs.removed.length === 0 &&
			pkg.diffs.changed.length === 0
		) {
			continue;
		}

		markdown += `\n## \`${pkg.packageName}\`\n\n`;

		if (pkg.diffs.added.length > 0) {
			markdown += '### ➕ Added Bundles\n\n';
			for (const bundle of pkg.diffs.added) {
				markdown += `- \`${bundle.name}\`: ${formatBytes(bundle.size)}\n`;
			}
			markdown += '\n';
		}

		if (pkg.diffs.removed.length > 0) {
			markdown += '### ➖ Removed Bundles\n\n';
			for (const bundle of pkg.diffs.removed) {
				markdown += `- \`${bundle.name}\`: ${formatBytes(bundle.size)}\n`;
			}
			markdown += '\n';
		}

		if (pkg.diffs.changed.length > 0) {
			markdown += '### 📊 Changed Bundles\n\n';
			markdown += '| Bundle | Base Size | Current Size | Change | % Change |\n';
			markdown += '|--------|-----------|--------------|--------|----------|\n';
			for (const change of pkg.diffs.changed) {
				const sign = change.diff >= 0 ? '+' : '';
				const emoji =
					change.diffPercent > 5
						? '🔴'
						: change.diffPercent > 0
							? '🟡'
							: change.diffPercent < -5
								? '🟢'
								: '⚪';
				markdown += `| ${emoji} \`${change.name}\` | ${formatBytes(change.baseSize)} | ${formatBytes(change.currentSize)} | ${sign}${formatBytes(change.diff)} | ${sign}${change.diffPercent.toFixed(2)}% |\n`;
			}
			markdown += '\n';
		}
	}

	markdown +=
		'\n---\n*This analysis was generated automatically by [rsdoctor](https://rsdoctor.rs/).*';

	return markdown;
}

/**
 * Analyzes bundle differences between base and current branches.
 */
export function analyzeBundles(
	baseDir: string,
	currentDir: string,
	packagesDir: string = 'packages'
): PackageBundleData[] {
	const packages: string[] = [];

	if (existsSync(packagesDir)) {
		const entries = readdirSync(packagesDir);
		for (const entry of entries) {
			const fullPath = join(packagesDir, entry);
			if (statSync(fullPath).isDirectory()) {
				packages.push(join('packages', entry));
			}
		}
	}

	const results: PackageBundleData[] = [];
	for (const pkg of packages) {
		const result = analyzePackage(pkg, baseDir, currentDir);
		if (result && (result.totalBaseSize > 0 || result.totalCurrentSize > 0)) {
			results.push(result);
		}
	}

	return results;
}

/**
 * Writes the bundle analysis report to a file.
 */
export function writeReport(
	packages: PackageBundleData[],
	outputPath: string
): void {
	const report = generateMarkdownReport(packages);
	writeFileSync(outputPath, report, 'utf-8');
}

/**
 * Calculates total bundle size change percentage across all packages.
 */
export function calculateTotalDiffPercent(
	packages: PackageBundleData[]
): number {
	if (packages.length === 0) return 0;
	const totalBase = packages.reduce((sum, p) => sum + p.totalBaseSize, 0);
	const totalCurrent = packages.reduce((sum, p) => sum + p.totalCurrentSize, 0);
	const totalDiff = totalCurrent - totalBase;
	return totalBase > 0 ? (totalDiff / totalBase) * 100 : 0;
}
