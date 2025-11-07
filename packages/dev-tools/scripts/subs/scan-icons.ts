#!/usr/bin/env tsx
/** biome-ignore-all lint/suspicious/noConsole: this is a script */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const SVG_EXTENSION_LENGTH = 4; // Length of '.svg' extension
const ICONS_DIR = 'src/icons';
const FLAGS_SHEET = 'src/public/flags-sheet.svg';
const TYPES_FILE = 'src/components/icons/types.ts';
const ICON_NAME_PATTERN =
	/\/\/ @generated BEGIN IconName[\s\S]*?\/\/ @generated END IconName/;

function scanIcons(): string[] {
	const projectRoot = findProjectRoot();
	const iconsDir = path.join(projectRoot, ICONS_DIR);

	if (!fs.existsSync(iconsDir)) {
		console.error(`❌ Icons directory not found: ${iconsDir}`);
		process.exit(1);
	}

	const iconNames: string[] = [];
	const files = fs.readdirSync(iconsDir);

	for (const file of files) {
		if (file.endsWith('.svg')) {
			const iconName = file.slice(0, -SVG_EXTENSION_LENGTH);
			iconNames.push(iconName);
		}
	}

	return iconNames.sort();
}

function scanFlags(): string[] {
	const projectRoot = findProjectRoot();
	const flagsPath = path.join(projectRoot, FLAGS_SHEET);

	if (!fs.existsSync(flagsPath)) {
		console.warn(`⚠️  Flags sheet not found: ${flagsPath}`);
		return [];
	}

	const content = fs.readFileSync(flagsPath, 'utf8');
	const flagNames: string[] = [];

	// Extract symbol IDs from the SVG sprite sheet
	// Match <symbol id="FLAG_CODE"> patterns
	const symbolRegex = /<symbol\s+id=["']([^"']+)["']/g;
	let match = symbolRegex.exec(content);
	while (match !== null) {
		const flagName = match[1];
		if (flagName) {
			flagNames.push(flagName);
		}
		match = symbolRegex.exec(content);
	}

	return flagNames.sort();
}

function updateTypesFile(iconNames: string[]): void {
	const projectRoot = findProjectRoot();
	const typesPath = path.join(projectRoot, TYPES_FILE);

	if (!fs.existsSync(typesPath)) {
		console.error(`❌ Types file not found: ${typesPath}`);
		process.exit(1);
	}

	const content = fs.readFileSync(typesPath, 'utf8');

	if (!ICON_NAME_PATTERN.test(content)) {
		console.error(
			'❌ Types file does not contain the expected pattern:\n' +
				'   // @generated BEGIN IconName\n' +
				'   // @generated END IconName'
		);
		process.exit(1);
	}

	// Generate the union type
	const iconUnion =
		iconNames.length > 0
			? iconNames.map((name) => `\t| "${name}"`).join('\n')
			: '\t| never';

	const replacement = `// @generated BEGIN IconName\nexport type IconName =\n${iconUnion};\n// @generated END IconName`;

	const updatedContent = content.replace(ICON_NAME_PATTERN, replacement);

	fs.writeFileSync(typesPath, updatedContent, 'utf8');
}

function main() {
	console.log(`🔍 Scanning icons from ${ICONS_DIR}...`);
	const iconNames = scanIcons();

	console.log(`🔍 Scanning flags from ${FLAGS_SHEET}...`);
	const flagNames = scanFlags();

	// Combine both lists
	const allIconNames = [...iconNames, ...flagNames].sort();

	if (allIconNames.length === 0) {
		console.warn('⚠️  No icons found!');
		return;
	}

	console.log(
		`✅ Found ${iconNames.length} icons and ${flagNames.length} flags`
	);
	console.log(`   Icons: ${iconNames.join(', ')}`);
	if (flagNames.length > 0) {
		console.log(
			`   Flags: ${flagNames.slice(0, 5).join(', ')}${flagNames.length > 5 ? ` ... and ${flagNames.length - 5} more` : ''}`
		);
	}

	console.log(`📝 Updating ${TYPES_FILE}...`);
	updateTypesFile(allIconNames);

	console.log(
		`✅ Updated IconName type with ${allIconNames.length} total icons`
	);
}

main();
