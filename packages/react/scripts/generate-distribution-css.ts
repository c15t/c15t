import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const packageRoot = join(import.meta.dirname, '..');
const sourceRoot = join(packageRoot, 'src');
const distRoot = join(packageRoot, 'dist');
const uiDistRoot = join(packageRoot, '..', 'ui', 'dist');

const wrapperFiles = ['styles.css', 'iab/styles.css'];
const inlinedFiles = ['styles.tw3.css', 'iab/styles.tw3.css'];

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
	const sourcePath = join(uiDistRoot, relativePath);
	const targetPath = join(distRoot, relativePath);

	if (!existsSync(sourcePath)) {
		throw new Error(`Missing UI CSS asset to inline: ${sourcePath}`);
	}

	mkdirSync(dirname(targetPath), { recursive: true });
	const sourceCss = readFileSync(sourcePath, 'utf8');
	const header = [
		'/**',
		' * @c15t/react - Tailwind 3-compatible prebuilt component styles.',
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
