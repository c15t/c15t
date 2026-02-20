import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

type CompressionStats = {
	raw: number;
	gzip: number;
	brotli: number;
};

type MeasuredAsset = CompressionStats & {
	label: string;
	source: string;
	kind: 'local' | 'remote';
};

type BenchmarkSummary = {
	generatedAt: string;
	competitorProfile: string;
	onetrustDomainScriptId: string;
	onetrustVersion: string | null;
	onetrustDomainJsonUrl: string;
	onetrustStubUrl: string;
	iubendaCoreUrl: string;
	iubendaTcfStubUrl: string;
	iubendaSafeTcfUrl: string | null;
	assets: MeasuredAsset[];
	totals: {
		onetrustCore: CompressionStats | null;
		iubendaCore: CompressionStats | null;
		iubendaIab: CompressionStats | null;
	};
	budgetViolations: string[];
	warnings: string[];
};

const outDir =
	process.env.EMBED_BENCH_OUT_DIR ?? 'artifacts/embed-competitor-bench';
const reportPath = join(outDir, 'report.md');
const jsonPath = join(outDir, 'results.json');
const enforceBudgets = process.argv.includes('--enforce-budgets');

type CompetitorProfileId = 'cnn-codepen' | 'cdn-default';

const requestedCompetitorProfile =
	process.env.EMBED_COMPETITOR_PROFILE ?? 'cnn-codepen';

const competitorProfileDefaults: Record<
	CompetitorProfileId,
	{
		oneTrustDomainScriptId: string;
		oneTrustBaseUrl: string;
		includeOneTrustAutoBlock: boolean;
		iubendaCoreUrl: string;
		iubendaTcfStubUrl: string;
		iubendaSafeTcfUrl: string | null;
	}
> = {
	'cnn-codepen': {
		oneTrustDomainScriptId: '3d9a6f21-8e47-43f8-8d58-d86150f3e92b',
		oneTrustBaseUrl: 'https://edition.cnn.com/wbdotp',
		includeOneTrustAutoBlock: false,
		iubendaCoreUrl: 'https://cdn.iubenda.com/cs/beta/iubenda_cs.js',
		iubendaTcfStubUrl: 'https://cdn.iubenda.com/cs/tcf/beta/stub-v2.js',
		iubendaSafeTcfUrl: 'https://cdn.iubenda.com/cs/tcf/beta/safe-tcf-v2.js',
	},
	'cdn-default': {
		oneTrustDomainScriptId: 'fff8df06-1dd2-491b-88f6-01cae248cd17',
		oneTrustBaseUrl: 'https://cdn.cookielaw.org',
		includeOneTrustAutoBlock: true,
		iubendaCoreUrl: 'https://cdn.iubenda.com/cs/iubenda_cs.js',
		iubendaTcfStubUrl: 'https://cdn.iubenda.com/cs/tcf/stub-v2.js',
		iubendaSafeTcfUrl: null,
	},
};

const competitorProfile: CompetitorProfileId =
	requestedCompetitorProfile === 'cdn-default' ? 'cdn-default' : 'cnn-codepen';

const profileDefaults = competitorProfileDefaults[competitorProfile];

const oneTrustDomainScriptId =
	process.env.ONETRUST_DOMAIN_SCRIPT_ID ??
	profileDefaults.oneTrustDomainScriptId;

const oneTrustBaseUrl =
	process.env.ONETRUST_BASE_URL ?? profileDefaults.oneTrustBaseUrl;

const oneTrustDomainJsonUrl =
	process.env.ONETRUST_DOMAIN_JSON_URL ??
	`${oneTrustBaseUrl}/consent/${oneTrustDomainScriptId}/${oneTrustDomainScriptId}.json`;

const oneTrustStubUrl =
	process.env.ONETRUST_STUB_URL ??
	`${oneTrustBaseUrl}/scripttemplates/otSDKStub.js`;

const oneTrustBannerUrlOverride = process.env.ONETRUST_BANNER_URL;

const oneTrustAutoBlockUrl =
	process.env.ONETRUST_AUTOBLOCK_URL ??
	(profileDefaults.includeOneTrustAutoBlock
		? `${oneTrustBaseUrl}/consent/${oneTrustDomainScriptId}/OtAutoBlock.js`
		: '');

const iubendaCoreUrl =
	process.env.IUBENDA_CORE_URL ?? profileDefaults.iubendaCoreUrl;

const iubendaTcfStubUrl =
	process.env.IUBENDA_TCF_STUB_URL ?? profileDefaults.iubendaTcfStubUrl;

const iubendaSafeTcfUrl =
	process.env.IUBENDA_SAFE_TCF_URL ?? profileDefaults.iubendaSafeTcfUrl ?? '';

const c15tLocalAssets = [
	{
		label: 'c15t runtime (base iife)',
		source: 'examples/demo/public/c15t-embed.runtime.iife.js',
	},
	{
		label: 'c15t runtime (full iife)',
		source: 'examples/demo/public/c15t-embed.runtime-full.iife.js',
	},
	{
		label: 'c15t runtime (iab addon iife)',
		source: 'examples/demo/public/c15t-embed.runtime-iab.iife.js',
	},
];

const budgets: Record<string, number> = {
	'c15t runtime (base iife)': 70 * 1024,
	'c15t runtime (full iife)': 85 * 1024,
	'c15t runtime (iab addon iife)': 45 * 1024,
};

function computeStats(buffer: Buffer): CompressionStats {
	return {
		raw: buffer.length,
		gzip: gzipSync(buffer, { level: 9 }).length,
		brotli: brotliCompressSync(buffer, {
			params: {
				[constants.BROTLI_PARAM_QUALITY]: 11,
			},
		}).length,
	};
}

function formatBytes(bytes: number): string {
	return `${(bytes / 1024).toFixed(1)} KiB`;
}

function formatPercent(smallerPct: number): string {
	const sign = smallerPct >= 0 ? '+' : '';
	return `${sign}${smallerPct.toFixed(1)}%`;
}

function sumStats(stats: CompressionStats[]): CompressionStats {
	return stats.reduce(
		(acc, stat) => ({
			raw: acc.raw + stat.raw,
			gzip: acc.gzip + stat.gzip,
			brotli: acc.brotli + stat.brotli,
		}),
		{ raw: 0, gzip: 0, brotli: 0 }
	);
}

function percentSmaller(baseline: number, candidate: number): number {
	if (baseline === 0) {
		return 0;
	}
	return ((baseline - candidate) / baseline) * 100;
}

async function fetchBuffer(url: string): Promise<Buffer> {
	const response = await fetch(url, { redirect: 'follow' });
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}
	const arrayBuffer = await response.arrayBuffer();
	return Buffer.from(arrayBuffer);
}

async function measureRemote(
	label: string,
	url: string
): Promise<MeasuredAsset> {
	const buffer = await fetchBuffer(url);
	return {
		label,
		source: url,
		kind: 'remote',
		...computeStats(buffer),
	};
}

function measureLocal(label: string, filePath: string): MeasuredAsset {
	const buffer = readFileSync(filePath);
	return {
		label,
		source: filePath,
		kind: 'local',
		...computeStats(buffer),
	};
}

function buildStatsTableRows(assets: MeasuredAsset[]): string {
	return assets
		.map(
			(asset) =>
				`| ${asset.label} | ${formatBytes(asset.raw)} | ${formatBytes(asset.gzip)} | ${formatBytes(asset.brotli)} | ${asset.source} |`
		)
		.join('\n');
}

function getAsset(
	assets: MeasuredAsset[],
	label: string
): MeasuredAsset | undefined {
	return assets.find((asset) => asset.label === label);
}

(async () => {
	mkdirSync(outDir, { recursive: true });

	const warnings: string[] = [];
	const budgetViolations: string[] = [];
	const assets: MeasuredAsset[] = [];
	let oneTrustVersion: string | null = null;
	let oneTrustDomainJsonAsset: MeasuredAsset | null = null;
	let oneTrustStubAsset: MeasuredAsset | null = null;
	let oneTrustBannerAsset: MeasuredAsset | null = null;
	let oneTrustAutoBlockAsset: MeasuredAsset | null = null;
	let iubendaCoreAsset: MeasuredAsset | null = null;
	let iubendaTcfAsset: MeasuredAsset | null = null;
	let iubendaSafeTcfAsset: MeasuredAsset | null = null;

	if (requestedCompetitorProfile !== competitorProfile) {
		warnings.push(
			`Unknown EMBED_COMPETITOR_PROFILE "${requestedCompetitorProfile}", using "${competitorProfile}".`
		);
	}

	for (const asset of c15tLocalAssets) {
		assets.push(measureLocal(asset.label, asset.source));
	}

	try {
		const domainJsonBuffer = await fetchBuffer(oneTrustDomainJsonUrl);
		oneTrustDomainJsonAsset = {
			label: `OneTrust domain JSON (${oneTrustDomainScriptId})`,
			source: oneTrustDomainJsonUrl,
			kind: 'remote',
			...computeStats(domainJsonBuffer),
		};
		assets.push(oneTrustDomainJsonAsset);

		const domainJson = JSON.parse(domainJsonBuffer.toString('utf8')) as {
			Version?: string;
		};
		oneTrustVersion = domainJson.Version ?? null;
	} catch (error) {
		warnings.push(
			`Failed to fetch OneTrust domain JSON: ${(error as Error).message}`
		);
	}

	try {
		oneTrustStubAsset = await measureRemote(
			'OneTrust otSDKStub.js',
			oneTrustStubUrl
		);
		assets.push(oneTrustStubAsset);
	} catch (error) {
		warnings.push(
			`Failed to fetch OneTrust otSDKStub.js: ${(error as Error).message}`
		);
	}

	const oneTrustBannerUrl =
		oneTrustBannerUrlOverride && oneTrustBannerUrlOverride.length > 0
			? oneTrustBannerUrlOverride
			: oneTrustVersion
				? `${oneTrustBaseUrl}/scripttemplates/${oneTrustVersion}/otBannerSdk.js`
				: null;

	if (oneTrustBannerUrl) {
		try {
			oneTrustBannerAsset = await measureRemote(
				`OneTrust otBannerSdk.js (${oneTrustVersion ?? 'explicit'})`,
				oneTrustBannerUrl
			);
			assets.push(oneTrustBannerAsset);
		} catch (error) {
			warnings.push(
				`Failed to fetch OneTrust otBannerSdk.js: ${(error as Error).message}`
			);
		}
	} else {
		warnings.push(
			'Skipping OneTrust otBannerSdk.js because no version was available from domain JSON and ONETRUST_BANNER_URL was not set.'
		);
	}

	if (oneTrustAutoBlockUrl.length > 0) {
		try {
			oneTrustAutoBlockAsset = await measureRemote(
				`OneTrust OtAutoBlock.js (${oneTrustDomainScriptId})`,
				oneTrustAutoBlockUrl
			);
			assets.push(oneTrustAutoBlockAsset);
		} catch (error) {
			warnings.push(
				`Failed to fetch OneTrust OtAutoBlock.js: ${(error as Error).message}`
			);
		}
	}

	try {
		iubendaCoreAsset = await measureRemote(
			'Iubenda iubenda_cs.js',
			iubendaCoreUrl
		);
		assets.push(iubendaCoreAsset);
	} catch (error) {
		warnings.push(
			`Failed to fetch Iubenda core script: ${(error as Error).message}`
		);
	}

	try {
		iubendaTcfAsset = await measureRemote(
			'Iubenda TCF stub-v2.js',
			iubendaTcfStubUrl
		);
		assets.push(iubendaTcfAsset);
	} catch (error) {
		warnings.push(
			`Failed to fetch Iubenda TCF stub: ${(error as Error).message}`
		);
	}

	if (iubendaSafeTcfUrl.length > 0) {
		try {
			iubendaSafeTcfAsset = await measureRemote(
				'Iubenda safe-tcf-v2.js',
				iubendaSafeTcfUrl
			);
			assets.push(iubendaSafeTcfAsset);
		} catch (error) {
			warnings.push(
				`Failed to fetch Iubenda safe TCF script: ${(error as Error).message}`
			);
		}
	}

	for (const asset of assets) {
		const budget = budgets[asset.label];
		if (!budget) {
			continue;
		}
		if (asset.brotli > budget) {
			budgetViolations.push(
				`${asset.label} exceeded brotli budget: ${formatBytes(asset.brotli)} > ${formatBytes(budget)}`
			);
		}
	}

	const oneTrustCoreCandidates = [
		oneTrustStubAsset,
		oneTrustBannerAsset,
		oneTrustAutoBlockAsset,
		oneTrustDomainJsonAsset,
	].filter(Boolean) as MeasuredAsset[];

	const oneTrustCoreTotal =
		oneTrustCoreCandidates.length > 0 ? sumStats(oneTrustCoreCandidates) : null;

	const iubendaIabParts = [
		iubendaCoreAsset,
		iubendaTcfAsset,
		iubendaSafeTcfAsset,
	].filter(Boolean) as MeasuredAsset[];

	const iubendaIabTotal =
		iubendaIabParts.length >= 2 ? sumStats(iubendaIabParts) : null;

	const c15tBase = getAsset(assets, 'c15t runtime (base iife)');
	const c15tFull = getAsset(assets, 'c15t runtime (full iife)');

	const compareRows: string[] = [];
	if (c15tBase && oneTrustCoreTotal) {
		compareRows.push(
			`| c15t base vs OneTrust core | ${formatPercent(percentSmaller(oneTrustCoreTotal.gzip, c15tBase.gzip))} | ${formatPercent(percentSmaller(oneTrustCoreTotal.brotli, c15tBase.brotli))} |`
		);
	}
	if (c15tFull && oneTrustCoreTotal) {
		compareRows.push(
			`| c15t full vs OneTrust core | ${formatPercent(percentSmaller(oneTrustCoreTotal.gzip, c15tFull.gzip))} | ${formatPercent(percentSmaller(oneTrustCoreTotal.brotli, c15tFull.brotli))} |`
		);
	}
	if (c15tBase && iubendaCoreAsset) {
		compareRows.push(
			`| c15t base vs Iubenda core | ${formatPercent(percentSmaller(iubendaCoreAsset.gzip, c15tBase.gzip))} | ${formatPercent(percentSmaller(iubendaCoreAsset.brotli, c15tBase.brotli))} |`
		);
	}
	if (c15tFull && iubendaCoreAsset) {
		compareRows.push(
			`| c15t full vs Iubenda core | ${formatPercent(percentSmaller(iubendaCoreAsset.gzip, c15tFull.gzip))} | ${formatPercent(percentSmaller(iubendaCoreAsset.brotli, c15tFull.brotli))} |`
		);
	}
	if (c15tFull && iubendaIabTotal) {
		compareRows.push(
			`| c15t full vs Iubenda core + TCF assets | ${formatPercent(percentSmaller(iubendaIabTotal.gzip, c15tFull.gzip))} | ${formatPercent(percentSmaller(iubendaIabTotal.brotli, c15tFull.brotli))} |`
		);
	}

	const reportLines = [
		'# Embed Competitive Benchmark',
		'',
		`Generated at: ${new Date().toISOString()}`,
		`Competitor profile: ${competitorProfile}`,
		`OneTrust domain script id: ${oneTrustDomainScriptId}`,
		`OneTrust version: ${oneTrustVersion ?? 'unavailable'}`,
		`OneTrust domain JSON URL: ${oneTrustDomainJsonUrl}`,
		`OneTrust stub URL: ${oneTrustStubUrl}`,
		`Iubenda core URL: ${iubendaCoreUrl}`,
		`Iubenda TCF stub URL: ${iubendaTcfStubUrl}`,
		`Iubenda safe TCF URL: ${iubendaSafeTcfUrl || 'disabled'}`,
		'Static-size note: Iubenda values here are loader/stub assets only; use the browser benchmark report for full runtime transfer comparisons.',
		'',
		'## Asset Sizes',
		'',
		'| Asset | Raw | Gzip | Brotli | Source |',
		'|---|---:|---:|---:|---|',
		buildStatsTableRows(assets),
		'',
		'## Aggregate Totals',
		'',
		'| Group | Raw | Gzip | Brotli |',
		'|---|---:|---:|---:|',
		`| OneTrust core (stub + banner + autoblock + domain json) | ${oneTrustCoreTotal ? formatBytes(oneTrustCoreTotal.raw) : 'n/a'} | ${oneTrustCoreTotal ? formatBytes(oneTrustCoreTotal.gzip) : 'n/a'} | ${oneTrustCoreTotal ? formatBytes(oneTrustCoreTotal.brotli) : 'n/a'} |`,
		`| Iubenda core (iubenda_cs.js) | ${iubendaCoreAsset ? formatBytes(iubendaCoreAsset.raw) : 'n/a'} | ${iubendaCoreAsset ? formatBytes(iubendaCoreAsset.gzip) : 'n/a'} | ${iubendaCoreAsset ? formatBytes(iubendaCoreAsset.brotli) : 'n/a'} |`,
		`| Iubenda core + TCF assets | ${iubendaIabTotal ? formatBytes(iubendaIabTotal.raw) : 'n/a'} | ${iubendaIabTotal ? formatBytes(iubendaIabTotal.gzip) : 'n/a'} | ${iubendaIabTotal ? formatBytes(iubendaIabTotal.brotli) : 'n/a'} |`,
		'',
		'## c15t Comparison',
		'',
		'| Comparison | Gzip delta | Brotli delta |',
		'|---|---:|---:|',
		compareRows.length > 0 ? compareRows.join('\n') : '| n/a | n/a | n/a |',
		'',
		'## c15t Brotli Budgets',
		'',
		'| Bundle | Budget | Actual | Status |',
		'|---|---:|---:|---|',
		...Object.entries(budgets).map(([label, budget]) => {
			const asset = getAsset(assets, label);
			if (!asset) {
				return `| ${label} | ${formatBytes(budget)} | n/a | unavailable |`;
			}
			const ok = asset.brotli <= budget;
			return `| ${label} | ${formatBytes(budget)} | ${formatBytes(asset.brotli)} | ${ok ? 'pass' : 'fail'} |`;
		}),
		'',
	];

	if (warnings.length > 0) {
		reportLines.push(
			'## Warnings',
			'',
			...warnings.map((warning) => `- ${warning}`),
			''
		);
	}

	if (budgetViolations.length > 0) {
		reportLines.push(
			'## Budget Violations',
			'',
			...budgetViolations.map((violation) => `- ${violation}`),
			''
		);
	}

	const summary: BenchmarkSummary = {
		generatedAt: new Date().toISOString(),
		competitorProfile,
		onetrustDomainScriptId: oneTrustDomainScriptId,
		onetrustVersion: oneTrustVersion,
		onetrustDomainJsonUrl: oneTrustDomainJsonUrl,
		onetrustStubUrl: oneTrustStubUrl,
		iubendaCoreUrl,
		iubendaTcfStubUrl,
		iubendaSafeTcfUrl: iubendaSafeTcfUrl.length > 0 ? iubendaSafeTcfUrl : null,
		assets,
		totals: {
			onetrustCore: oneTrustCoreTotal,
			iubendaCore: iubendaCoreAsset ?? null,
			iubendaIab: iubendaIabTotal,
		},
		budgetViolations,
		warnings,
	};

	const report = reportLines.join('\n');
	writeFileSync(reportPath, report, 'utf8');
	writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf8');

	console.log(report);
	console.log(`\n[embed-competitor-bench] Wrote ${reportPath}`);
	console.log(`[embed-competitor-bench] Wrote ${jsonPath}`);

	if (enforceBudgets && budgetViolations.length > 0) {
		console.error('\n[embed-competitor-bench] Brotli budget check failed.');
		process.exit(1);
	}
})();
