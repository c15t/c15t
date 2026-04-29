import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const packageRoot = join(import.meta.dirname, '..');
const sourceRoot = join(packageRoot, 'src');
const distRoot = join(packageRoot, 'dist');
const uiPackageRoot = join(packageRoot, '..', 'ui');
const uiDistRoot = join(uiPackageRoot, 'dist');

const wrapperFiles = ['styles.css', 'iab/styles.css'];
const inlinedFiles = ['styles.tw3.css', 'iab/styles.tw3.css'];

let attemptedUiCssGeneration = false;

function formatCommandOutput(label: string, output?: string | null) {
	const trimmedOutput = output?.trim();
	return trimmedOutput ? `\n${label}:\n${trimmedOutput}` : '';
}

function generateUiCssAssets(missingPath: string) {
	if (attemptedUiCssGeneration) {
		return;
	}

	attemptedUiCssGeneration = true;
	console.log(
		`Missing UI CSS asset ${missingPath}; generating @c15t/ui CSS entrypoints...`
	);

	const result = spawnSync('bun', ['scripts/generate-css-entrypoints.ts'], {
		cwd: uiPackageRoot,
		encoding: 'utf8',
	});

	if (result.error) {
		throw new Error(
			`Failed to start @c15t/ui CSS generator: ${result.error.message}`
		);
	}

	if (result.status !== 0) {
		const exitReason =
			result.signal === null
				? `exit code ${result.status}`
				: `signal ${result.signal}`;

		throw new Error(
			`Failed to generate @c15t/ui CSS entrypoints with ${exitReason}.` +
				formatCommandOutput('stdout', result.stdout) +
				formatCommandOutput('stderr', result.stderr)
		);
	}
}

function getUiCssAsset(relativePath: string) {
	const sourcePath = join(uiDistRoot, relativePath);

	if (existsSync(sourcePath)) {
		return sourcePath;
	}

	generateUiCssAssets(sourcePath);

	if (existsSync(sourcePath)) {
		return sourcePath;
	}

	throw new Error(
		`@c15t/ui CSS generator completed but did not produce ${sourcePath}`
	);
}

for (const relativePath of wrapperFiles) {
	const sourcePath = join(sourceRoot, relativePath);
	const targetPath = join(distRoot, relativePath);

	if (!existsSync(sourcePath)) {
		throw new Error(`Missing source CSS asset: ${sourcePath}`);
	}

	mkdirSync(dirname(targetPath), { recursive: true });
	copyFileSync(sourcePath, targetPath);
}

for (const relativePath of inlinedFiles) {
	const sourcePath = getUiCssAsset(relativePath);
	const targetPath = join(distRoot, relativePath);

	mkdirSync(dirname(targetPath), { recursive: true });
	const sourceCss = readFileSync(sourcePath, 'utf8');
	const header = [
		'/**',
		' * @c15t/nextjs - Tailwind 3-compatible prebuilt component styles.',
		' *',
		' * This file inlines @c15t/ui CSS so bundlers that do not follow',
		' * nested package CSS imports still include the complete stylesheet.',
		' */',
		'',
	].join('\n');
	Bun.write(targetPath, `${header}${sourceCss}`);
}

console.log(
	'Generated distribution CSS entrypoints in dist/styles.css, dist/styles.tw3.css, dist/iab/styles.css, and dist/iab/styles.tw3.css'
);
