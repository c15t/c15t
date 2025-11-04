#!/usr/bin/env tsx
/** biome-ignore-all lint/suspicious/noConsole: this is a script */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import svgstore from 'svgstore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findProjectRoot(dir = process.cwd()): string {
	let current = dir;
	while (true) {
		if (fs.existsSync(path.join(current, 'package.json'))) {
			return current;
		}
		const parent = path.dirname(current);
		if (parent === current) {
			break;
		}
		current = parent;
	}
	throw new Error('Could not locate project root');
}

// Configuration constants
const SVG_EXTENSION_LENGTH = 4; // Length of '.svg' extension
const INPUT_DIR = 'src/icons';
const OUTPUT_ICONS_FILE = 'src/public/icons-sheet.svg';
const OUTPUT_FLAGS_FILE = 'src/public/flags-sheet.svg';

// 1️⃣ Create SVG sprite store for icons
const iconsStore = svgstore({
	copyAttrs: [
		'viewBox',
		'fill',
		'stroke',
		'stroke-width',
		'stroke-linecap',
		'stroke-linejoin',
		'style',
	],
	svgAttrs: {
		xmlns: 'http://www.w3.org/2000/svg',
		'aria-hidden': 'true',
		focusable: 'false',
	},
});

const found = new Set<string>();
const filePathsById = new Map<string, string>();

// 2️⃣ Add icons from src/public/icons/ directory (including sub-folders)
const projectRoot = findProjectRoot();
const inputDir = path.join(projectRoot, INPUT_DIR);

if (!fs.existsSync(inputDir)) {
	console.error(`❌ Input directory not found: ${inputDir}`);
	process.exit(1);
}

// Recursively walk through all files in the directory and sub-directories
function* walkSync(dir: string): Generator<string> {
	const files = fs.readdirSync(dir, { withFileTypes: true });
	for (const file of files) {
		if (file.isDirectory() || file.isSymbolicLink()) {
			// Skip hidden directories
			if (!file.name.startsWith('.')) {
				yield* walkSync(path.join(dir, file.name));
			}
		} else if (file.isFile() && file.name.endsWith('.svg')) {
			yield path.join(dir, file.name);
		}
	}
}

console.log(`📦 Building sprite sheet from ${INPUT_DIR}...`);
let iconCount = 0;

for (const filePath of walkSync(inputDir)) {
	// Use just the filename (without directory path) for the icon ID
	const fileName = path.basename(filePath);
	const id = fileName.slice(0, -SVG_EXTENSION_LENGTH);

	// Check for duplicate IDs from different file paths
	const existingPath = filePathsById.get(id);
	if (existingPath) {
		const relativeExisting = path.relative(projectRoot, existingPath);
		const relativeNew = path.relative(projectRoot, filePath);
		throw new Error(
			`Icon ID collision detected: "${id}"\n` +
				`  Existing: ${relativeExisting}\n` +
				`  New:      ${relativeNew}\n` +
				'Consider renaming one of the files or organizing them into separate subdirectories.'
		);
	}

	const svg = fs.readFileSync(filePath, 'utf8');
	iconsStore.add(id, svg); // <symbol id="my-icon">…
	found.add(id);
	filePathsById.set(id, filePath);
	iconCount++;
}

console.log(`✅ Found ${iconCount} icons to bundle`);

// 3️⃣ Write the icons sprite sheet
const iconsSprite = iconsStore.toString({ inline: true });
const iconsOutputPath = path.join(projectRoot, OUTPUT_ICONS_FILE);
const iconsOutputDir = path.dirname(iconsOutputPath);

fs.mkdirSync(iconsOutputDir, { recursive: true });
fs.writeFileSync(iconsOutputPath, iconsSprite, 'utf8');

console.log(`✅ Built icons sprite sheet: ${OUTPUT_ICONS_FILE}`);
console.log(`   Contains ${iconCount} icons`);

// 4️⃣ Note: flags-sheet.svg should already exist in src/public/
// If it needs to be built separately, add that logic here
const flagsPath = path.join(projectRoot, OUTPUT_FLAGS_FILE);
if (!fs.existsSync(flagsPath)) {
	console.warn(`⚠️  Flags sprite sheet not found at: ${OUTPUT_FLAGS_FILE}`);
	console.warn('   Ensure flags-sheet.svg exists in src/public/');
}
