/**
 * Result types and the Markdown summary for the client-payload bench.
 * Kept free of Node and Playwright imports so it can be unit tested.
 */

export interface AssetResult {
	brotli: number;
	gzip: number;
	/** Whether a source map was found and used for attribution. */
	mapped: boolean;
	/** Raw bytes per module path (`@c15t/react/dist/provider.js`). */
	modules: Record<string, number>;
	/** Raw bytes per package (`@c15t/react`, `(app)`, ...). */
	packages: Record<string, number>;
	path: string;
	/**
	 * `initial`: loaded before any interaction. `dialog`: first loaded when the
	 * dialog opened. `accept`: first loaded when a fresh visitor accepted from
	 * the banner.
	 */
	phase: 'accept' | 'dialog' | 'initial';
	raw: number;
	type: 'css' | 'js';
	unmappedBytes: number;
}

export interface RouteResult {
	assets: AssetResult[];
	bannerVisible: boolean;
	dialogVisible: boolean;
	route: string;
}

export interface ArmResult {
	library: 'none' | 'v2' | 'v3';
	name: string;
	routes: RouteResult[];
	versions: Record<string, string | null>;
}

export interface PayloadResult {
	arms: ArmResult[];
	generatedAt: string;
	method: string;
	repoSha: string | null;
	v2Version: string;
	v3Source: string;
}

export interface Totals {
	brotli: number;
	count: number;
	gzip: number;
	raw: number;
}

/** Raw bytes and estimated gzip bytes for one package or module. */
export interface Share {
	gzip: number;
	raw: number;
}

/**
 * Module families checked for in initial client chunks. Each matcher runs
 * against the module path inside `node_modules`.
 */
export const BOUNDARY_CHECKS: Record<string, RegExp> = {
	'dev-tools': /^@c15t\/dev-tools\//u,
	iab: /^@c15t\/iab\/|^@iabtechlabtcf\/|\/iab[/.-]/u,
	'manifest/server fetch': /manifest-cache|transports\/manifest|node-bridge/u,
	'offline policy presets':
		/policy-rule-presets|legacy-preset-material|\/transports\/offline/u,
	'server-oriented':
		/\/(?:server|api|middleware|proxy|pages|headers|static)(?:\/|\.js$)|^next\/dist\/server\//u,
	'theme runtime':
		/^@c15t\/ui\/dist\/theme\/|^@c15t\/react\/dist\/theme-provider/u,
	'translations (non-en)':
		/^@c15t\/translations\/dist\/(?:all\.js|translations\/(?!en\.js)[^/]+\.js)/u,
	transport: /\/transports?\/|\/fetch|\/hosted|\/client\/|api-client/u,
};

/** Arm pairs diffed in the report, by package or by module. */
const ARM_COMPARISONS: [string, string, 'modules' | 'packages'][] = [
	['v2', 'v3', 'packages'],
	['v3-react', 'v3', 'modules'],
	['v3-react', 'v3-split', 'modules'],
];
const DIFF_THRESHOLD_BYTES = 150;
const REPORT_ROUTE = '/';

export const sumAssets = function sumAssets(
	assets: AssetResult[],
	predicate: (asset: AssetResult) => boolean
): Totals {
	const subset = assets.filter(predicate);
	return {
		brotli: subset.reduce((sum, asset) => sum + asset.brotli, 0),
		count: subset.length,
		gzip: subset.reduce((sum, asset) => sum + asset.gzip, 0),
		raw: subset.reduce((sum, asset) => sum + asset.raw, 0),
	};
};

/**
 * Sum per-package (or per-module) raw bytes across assets, with gzip
 * estimated as the key's share of each asset's raw bytes times its gzip size.
 */
export const shareBy = function shareBy(
	assets: AssetResult[],
	key: 'modules' | 'packages'
): Map<string, Share> {
	const shares = new Map<string, Share>();
	for (const asset of assets) {
		const add = (name: string, raw: number) => {
			const current = shares.get(name) ?? { gzip: 0, raw: 0 };
			current.raw += raw;
			current.gzip += asset.raw ? (raw / asset.raw) * asset.gzip : 0;
			shares.set(name, current);
		};
		for (const [name, raw] of Object.entries(asset[key])) {
			add(name, raw);
		}
		if (asset.unmappedBytes) {
			add(asset.mapped ? '(unmapped)' : '(no source map)', asset.unmappedBytes);
		}
	}
	return shares;
};

const isC15t = (name: string) =>
	name === 'c15t' || name.startsWith('@c15t/') || name.startsWith('c15t/');

const format = (value: number) => Math.round(value).toLocaleString('en-US');

const signed = function signed(value: number): string {
	if (value === 0) {
		return '±0';
	}
	return `${value > 0 ? '+' : '−'}${format(Math.abs(value))}`;
};

const table = (header: string[], rows: string[][]) =>
	[
		`| ${header.join(' | ')} |`,
		`| ${header.map((_, index) => (index === 0 ? '---' : '---:')).join(' | ')} |`,
		...rows.map((row) => `| ${row.join(' | ')} |`),
	].join('\n');

const assetsOf = function assetsOf(
	arm: ArmResult | undefined,
	phase: AssetResult['phase'],
	type: AssetResult['type'],
	route = REPORT_ROUTE
): AssetResult[] {
	return (
		arm?.routes
			.find((candidate) => candidate.route === route)
			?.assets.filter(
				(asset) => asset.phase === phase && asset.type === type
			) ?? []
	);
};

const routeTotalsSection = function routeTotalsSection(
	result: PayloadResult
): string[] {
	const rows: string[][] = [];
	for (const arm of result.arms) {
		for (const route of arm.routes) {
			const totals = (phase: AssetResult['phase'], type: AssetResult['type']) =>
				sumAssets(route.assets, (a) => a.phase === phase && a.type === type);
			const js = totals('initial', 'js');
			const css = totals('initial', 'css');
			const dialogJs = totals('dialog', 'js');
			const dialogCss = totals('dialog', 'css');
			const acceptJs = totals('accept', 'js');
			rows.push([
				`${arm.name} ${route.route}`,
				`${js.count} / ${format(js.raw)} / ${format(js.gzip)}`,
				`${css.count} / ${format(css.raw)} / ${format(css.gzip)}`,
				`${dialogJs.count} / ${format(dialogJs.gzip)}`,
				`${dialogCss.count} / ${format(dialogCss.gzip)}`,
				`${acceptJs.count} / ${format(acceptJs.raw)} / ${format(acceptJs.gzip)}`,
				`${route.bannerVisible ? 'yes' : 'no'} / ${route.dialogVisible ? 'yes' : 'no'}`,
			]);
		}
	}
	return [
		'## Route totals',
		'',
		table(
			[
				'Arm, route',
				'Initial JS files / raw / gzip',
				'Initial CSS files / raw / gzip',
				'Dialog JS files / gzip',
				'Dialog CSS files / gzip',
				'First accept JS files / raw / gzip',
				'Banner / dialog',
			],
			rows
		),
		'',
	];
};

const netCostSection = function netCostSection(
	result: PayloadResult
): string[] {
	const baseline = result.arms.find((arm) => arm.library === 'none');
	if (!baseline) {
		return [];
	}
	const rows: string[][] = [];
	for (const arm of result.arms.filter((candidate) => candidate !== baseline)) {
		for (const { route } of arm.routes) {
			const delta = (type: AssetResult['type']) => {
				const own = sumAssets(
					assetsOf(arm, 'initial', type, route),
					() => true
				);
				const base = sumAssets(
					assetsOf(baseline, 'initial', type, route),
					() => true
				);
				return { gzip: own.gzip - base.gzip, raw: own.raw - base.raw };
			};
			const js = delta('js');
			const css = delta('css');
			rows.push([
				`${arm.name} ${route}`,
				`${signed(js.raw)} / ${signed(js.gzip)}`,
				`${signed(css.raw)} / ${signed(css.gzip)}`,
				signed(js.gzip + css.gzip),
			]);
		}
	}
	return [
		'## Net initial cost over the no-consent baseline',
		'',
		table(
			[
				'Arm, route',
				'Initial JS raw / gzip',
				'Initial CSS raw / gzip',
				'Initial JS+CSS gzip',
			],
			rows
		),
		'',
	];
};

const packageSection = function packageSection(
	result: PayloadResult
): string[] {
	const shares = result.arms.map((arm) =>
		shareBy(assetsOf(arm, 'initial', 'js'), 'packages')
	);
	const largest = (name: string) =>
		Math.max(...shares.map((share) => share.get(name)?.raw ?? 0));
	const names = [...new Set(shares.flatMap((share) => [...share.keys()]))].sort(
		(left, right) => largest(right) - largest(left)
	);
	return [
		`## Initial JS by package (route ${REPORT_ROUTE}, raw / est. gzip)`,
		'',
		table(
			['Package', ...result.arms.map((arm) => arm.name)],
			names.map((name) => [
				name,
				...shares.map((share) => {
					const value = share.get(name);
					return value ? `${format(value.raw)} / ${format(value.gzip)}` : '–';
				}),
			])
		),
		'',
	];
};

const comparisonSection = function comparisonSection(
	result: PayloadResult
): string[] {
	const lines: string[] = [];
	for (const [from, to, key] of ARM_COMPARISONS) {
		const left = result.arms.find((arm) => arm.name === from);
		const right = result.arms.find((arm) => arm.name === to);
		if (!(left && right)) {
			continue;
		}
		const before = shareBy(assetsOf(left, 'initial', 'js'), key);
		const after = shareBy(assetsOf(right, 'initial', 'js'), key);
		const rows = [...new Set([...before.keys(), ...after.keys()])]
			.map((name) => ({
				after: after.get(name) ?? { gzip: 0, raw: 0 },
				before: before.get(name) ?? { gzip: 0, raw: 0 },
				name,
			}))
			.filter(
				(row) =>
					Math.abs(row.after.raw - row.before.raw) >= DIFF_THRESHOLD_BYTES
			)
			.sort(
				(a, b) => b.after.raw - b.before.raw - (a.after.raw - a.before.raw)
			);
		const label = key === 'packages' ? 'Package' : 'Module';
		lines.push(
			`## Initial JS ${label.toLowerCase()} diff, ${from} → ${to} (route ${REPORT_ROUTE}, |Δ raw| ≥ ${DIFF_THRESHOLD_BYTES} B)`,
			'',
			table(
				[label, from, to, 'Δ raw', 'Δ est. gzip'],
				rows.map((row) => [
					row.name,
					format(row.before.raw),
					format(row.after.raw),
					signed(row.after.raw - row.before.raw),
					signed(row.after.gzip - row.before.gzip),
				])
			),
			''
		);
	}
	return lines;
};

const moduleSection = function moduleSection(result: PayloadResult): string[] {
	const lines = ['## c15t modules by phase', ''];
	for (const arm of result.arms.filter((a) => a.library !== 'none')) {
		for (const phase of ['initial', 'dialog', 'accept'] as const) {
			const modules = [
				...shareBy(assetsOf(arm, phase, 'js'), 'modules').entries(),
			]
				.filter(([name]) => isC15t(name))
				.sort((left, right) => right[1].raw - left[1].raw);
			const raw = modules.reduce((sum, [, share]) => sum + share.raw, 0);
			const gzip = modules.reduce((sum, [, share]) => sum + share.gzip, 0);
			lines.push(
				`### ${arm.name}, ${phase}: ${modules.length} c15t modules, ${format(raw)} B raw, ~${format(gzip)} B gzip`,
				''
			);
			if (modules.length) {
				lines.push(
					table(
						['Module', 'Raw', 'Est. gzip'],
						modules.map(([name, share]) => [
							name,
							format(share.raw),
							format(share.gzip),
						])
					),
					''
				);
			}
		}
	}
	return lines;
};

const stylesheetSection = function stylesheetSection(
	result: PayloadResult
): string[] {
	const rows: string[][] = [];
	for (const arm of result.arms) {
		for (const phase of ['initial', 'dialog'] as const) {
			for (const asset of assetsOf(arm, phase, 'css')) {
				rows.push([
					arm.name,
					phase,
					asset.path.replace(/^\/_next\/static\/chunks\//u, ''),
					format(asset.raw),
					format(asset.gzip),
					Object.keys(asset.packages).join(', ') || '–',
				]);
			}
		}
	}
	return [
		`## Stylesheets (route ${REPORT_ROUTE})`,
		'',
		'Tailwind inlines `@import`ed CSS into the app stylesheet, so its source map credits the c15t aggregate to `(app)`. Compare the app stylesheet with the baseline arm to size it.',
		'',
		table(['Arm', 'Phase', 'File', 'Raw', 'Gzip', 'Mapped to'], rows),
		'',
	];
};

const boundarySection = function boundarySection(
	result: PayloadResult
): string[] {
	const rows: string[][] = [];
	for (const arm of result.arms.filter((a) => a.library !== 'none')) {
		const modules = [
			...shareBy(assetsOf(arm, 'initial', 'js'), 'modules').entries(),
		];
		for (const [family, matcher] of Object.entries(BOUNDARY_CHECKS)) {
			const hits = modules.filter(
				([name]) => isC15t(name) && matcher.test(name)
			);
			rows.push([
				arm.name,
				family,
				hits.length
					? hits
							.map(([name, share]) => `${name} (${format(share.raw)})`)
							.join('<br>')
					: 'none',
			]);
		}
	}
	return [
		`## Boundary checks (initial JS, route ${REPORT_ROUTE})`,
		'',
		table(['Arm', 'Family', 'Matching c15t modules (raw B)'], rows),
		'',
	];
};

/** Render the Markdown summary for one run. */
export const renderReport = function renderReport(
	result: PayloadResult
): string {
	const lines = [
		'# Client payload attribution',
		'',
		`Generated ${result.generatedAt}. Repo ${result.repoSha ?? 'unknown'}. v3 source: ${result.v3Source}. v2: @c15t/nextjs ${result.v2Version}.`,
		'',
		result.method,
		'',
		...routeTotalsSection(result),
		...netCostSection(result),
		...packageSection(result),
		...comparisonSection(result),
		...stylesheetSection(result),
		...boundarySection(result),
		...moduleSection(result),
	];
	return `${lines.join('\n')}\n`;
};
