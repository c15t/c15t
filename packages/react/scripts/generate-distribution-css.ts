import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const packageRoot = join(import.meta.dirname, '..');
const sourceRoot = join(packageRoot, '..', 'ui', 'dist');
const distRoot = join(packageRoot, 'dist');

const files = [
	'styles.css',
	'styles.tw3.css',
	'iab/styles.css',
	'iab/styles.tw3.css',
];

for (const relativePath of files) {
	const sourcePath = join(sourceRoot, relativePath);
	const targetPath = join(distRoot, relativePath);

	if (!existsSync(sourcePath)) {
		throw new Error(`Missing source CSS asset: ${sourcePath}`);
	}

	mkdirSync(dirname(targetPath), { recursive: true });
	copyFileSync(sourcePath, targetPath);
}

console.log(
	'Generated dist/styles.css, dist/styles.tw3.css, dist/iab/styles.css, and dist/iab/styles.tw3.css'
);
