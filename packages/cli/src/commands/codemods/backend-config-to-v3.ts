import { Node, SyntaxKind } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import {
	hasHandWrittenRules,
	POLICY_RULES_TODO,
} from './consent-provider-options';
import { runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';
import {
	addTodo,
	applyEdits,
	findProperty,
	lineIndent,
	objectLiteralFor,
	propertyKey,
	propertyRemoval,
	propertyValueText,
	TODO_MARKER,
	toTextEdit,
	UNCHANGED,
	unwrapExpression,
} from './source-edits';
import type { TextEdit, TransformResult } from './source-edits';

const ENTRY = '@c15t/backend';
/** v2 entries that exported the config helpers. */
const CONFIG_ENTRIES = new Set([ENTRY, '@c15t/backend/define-config']);
const CONFIG_CALLS = new Set(['c15tInstance', 'defineConfig']);
const CONFIG_TYPES = new Set(['C15TOptions', 'C15TConfig']);

/** v2 subpaths v3 removed; the config helpers now come from the root. */
const REMOVED_ENTRIES = new Set([
	'@c15t/backend/db/adapters',
	'@c15t/backend/db/adapters/drizzle',
	'@c15t/backend/db/adapters/kysely',
	'@c15t/backend/db/adapters/mongo',
	'@c15t/backend/db/adapters/prisma',
	'@c15t/backend/db/adapters/typeorm',
	'@c15t/backend/db/migrator',
	'@c15t/backend/db/schema',
	'@c15t/backend/edge',
	'@c15t/backend/router',
	'@c15t/backend/types',
]);

/** Top-level v2 options that live under `manifest` in v3, and their v3 names. */
const MANIFEST_KEYS: Record<string, string> = {
	appName: 'appName',
	branding: 'branding',
	customTranslations: 'customTranslations',
	i18n: 'i18n',
	policyPacks: 'policyRules',
};

const OPTION_TODOS: Record<string, string> = {
	adapter:
		"adapter was removed. Point database at the same SQL database, such as database: { dialect: 'postgres', url: process.env.DATABASE_URL }, then run c15t self-host migrate. See https://c15t.com/docs/self-host/guides/database-setup",
	background: 'background was removed. Delete it.',
	cache: 'cache.adapter moved to gvl.cache.',
	disableGeoLocation:
		'disableGeoLocation was removed. To show every visitor the same banner, configure one policy rule with match: { isDefault: true }.',
	iab: 'iab was split. enabled, cmpId and customVendors move to manifest.iab; vendorIds and endpoint move to gvl; bundled was removed.',
	logger: 'logger was replaced by observability, passed to c15tInstance().',
	tablePrefix:
		'tablePrefix was removed. Rename prefixed c15t tables before you run the migration.',
	telemetry:
		'telemetry was replaced by observability, passed to c15tInstance().',
};

const REMOVED_ENTRY_TODO =
	'This @c15t/backend entry was removed. Import defineConfig, createMigrator and policyRulePresets from @c15t/backend.';

const importedFromConfigEntry = function importedFromConfigEntry(
	node: TsMorphTypes.Node,
	names: ReadonlySet<string>
): boolean {
	return (
		node
			.getSymbol()
			?.getDeclarations()
			.some(
				(declaration) =>
					Node.isImportSpecifier(declaration) &&
					names.has(declaration.getName()) &&
					CONFIG_ENTRIES.has(
						declaration.getImportDeclaration().getModuleSpecifierValue()
					)
			) ?? false
	);
};

const objectFor = objectLiteralFor;

const findConfigObjects = function findConfigObjects(
	sourceFile: TsMorphTypes.SourceFile
): TsMorphTypes.ObjectLiteralExpression[] {
	const found = new Map<number, TsMorphTypes.ObjectLiteralExpression>();
	const add = (object: TsMorphTypes.ObjectLiteralExpression | undefined) => {
		if (object) {
			found.set(object.getStart(), object);
		}
	};
	for (const call of sourceFile.getDescendantsOfKind(
		SyntaxKind.CallExpression
	)) {
		if (importedFromConfigEntry(call.getExpression(), CONFIG_CALLS)) {
			add(objectFor(call.getArguments()[0]));
		}
	}
	for (const declaration of sourceFile.getDescendantsOfKind(
		SyntaxKind.VariableDeclaration
	)) {
		const initializer = declaration.getInitializer();
		const types = [declaration.getTypeNode()];
		if (
			initializer &&
			(Node.isSatisfiesExpression(initializer) ||
				Node.isAsExpression(initializer))
		) {
			types.push(initializer.getTypeNode());
		}
		if (
			types.some(
				(type) =>
					type &&
					Node.isTypeReference(type) &&
					importedFromConfigEntry(type.getTypeName(), CONFIG_TYPES)
			)
		) {
			add(objectFor(initializer));
		}
	}
	return [...found.values()];
};

/** The indentation one level deeper than `indent`, in the file's style. */
const deeper = function deeper(indent: string): string {
	return indent.startsWith(' ') ? `${indent}  ` : `${indent}\t`;
};

/** The property written under its v3 name, with continuation lines shifted by `shift`. */
const movedText = function movedText(
	property: TsMorphTypes.ObjectLiteralElementLike,
	shift: string,
	indent: string
): string {
	const key = propertyKey(property) ?? '';
	const next = MANIFEST_KEYS[key] ?? key;
	const value = propertyValueText(property) ?? key;
	const text = key === next ? property.getText() : `${next}: ${value}`;
	const shifted = text.split('\n').join(`\n${shift}`);
	const needsTodo =
		key === 'policyPacks' &&
		Node.isPropertyAssignment(property) &&
		hasHandWrittenRules(property.getInitializer());
	return needsTodo
		? `// ${TODO_MARKER} ${POLICY_RULES_TODO}\n${indent}${shifted}`
		: shifted;
};

/** Appends moved properties to an existing `manifest: { ... }`. */
const mergeIntoManifest = function mergeIntoManifest(
	manifest: TsMorphTypes.ObjectLiteralExpression,
	moving: TsMorphTypes.ObjectLiteralElementLike[],
	edits: TextEdit[]
): void {
	const [first] = moving;
	const last = manifest.getProperties().at(-1);
	if (!first) {
		return;
	}
	const inner = last ? lineIndent(last) : deeper(lineIndent(manifest));
	const shift = inner.slice(lineIndent(first).length);
	const entries = moving.map((property) => movedText(property, shift, inner));
	const text = manifest.getText().includes('\n')
		? entries.map((entry) => `\n${inner}${entry},`).join('')
		: entries.map((entry) => ` ${entry},`).join('');
	const sourceText = manifest.getSourceFile().getFullText();
	const comma = last
		? /^\s*,/u.exec(sourceText.slice(last.getEnd()))?.[0]
		: undefined;
	let insertAt = manifest.getStart() + 1;
	if (last) {
		insertAt = last.getEnd() + (comma?.length ?? 0);
	}
	edits.push({
		end: insertAt,
		start: insertAt,
		text: last && !comma ? `,${text}` : text,
	});
	for (const property of moving) {
		edits.push(propertyRemoval(property));
	}
};

/** Replaces the first moved property with a new `manifest` holding all of them. */
const createManifest = function createManifest(
	object: TsMorphTypes.ObjectLiteralExpression,
	moving: TsMorphTypes.ObjectLiteralElementLike[],
	edits: TextEdit[]
): void {
	const [first, ...rest] = moving;
	if (!first) {
		return;
	}
	if (object.getText().includes('\n')) {
		const indent = lineIndent(first);
		const inner = deeper(indent);
		const entries = moving.map(
			(property) =>
				`${inner}${movedText(property, inner.slice(indent.length), inner)},`
		);
		edits.push(
			toTextEdit(first, `manifest: {\n${entries.join('\n')}\n${indent}}`)
		);
	} else {
		const entries = moving.map((property) => movedText(property, '', ''));
		edits.push(toTextEdit(first, `manifest: { ${entries.join(', ')} }`));
	}
	for (const property of rest) {
		edits.push(propertyRemoval(property));
	}
};

const planManifest = function planManifest(
	object: TsMorphTypes.ObjectLiteralExpression,
	edits: TextEdit[],
	summaries: Set<string>
): number {
	const moving = object
		.getProperties()
		.filter((property) => (propertyKey(property) ?? '') in MANIFEST_KEYS);
	const [first] = moving;
	if (!first) {
		return 0;
	}
	const manifest = findProperty(object, 'manifest');
	const manifestObject =
		manifest && Node.isPropertyAssignment(manifest)
			? unwrapExpression(manifest.getInitializerOrThrow())
			: undefined;
	if (manifest && !Node.isObjectLiteralExpression(manifestObject)) {
		addTodo(
			first,
			`Move ${moving.map((property) => propertyKey(property)).join(', ')} into manifest, renaming policyPacks to policyRules.`,
			edits
		);
		return 1;
	}
	for (const property of moving) {
		const key = propertyKey(property) ?? '';
		summaries.add(`${key} -> manifest.${MANIFEST_KEYS[key] ?? key}`);
	}
	if (Node.isObjectLiteralExpression(manifestObject)) {
		mergeIntoManifest(manifestObject, moving, edits);
	} else {
		createManifest(object, moving, edits);
	}
	return moving.length;
};

const transformSourceFile = function transformSourceFile(
	sourceFile: TsMorphTypes.SourceFile
): TransformResult {
	const imports = sourceFile
		.getImportDeclarations()
		.filter((declaration) =>
			declaration.getModuleSpecifierValue().startsWith(ENTRY)
		);
	if (imports.length === 0) {
		return UNCHANGED;
	}
	const edits: TextEdit[] = [];
	const summaries = new Set<string>();
	let operations = 0;
	for (const object of findConfigObjects(sourceFile)) {
		operations += planManifest(object, edits, summaries);
		for (const property of object.getProperties()) {
			const key = propertyKey(property) ?? '';
			const todo = OPTION_TODOS[key];
			if (todo && addTodo(property, todo, edits)) {
				summaries.add(`TODO: ${key}`);
				operations += 1;
			}
		}
	}
	for (const declaration of imports) {
		const specifier = declaration.getModuleSpecifierValue();
		if (specifier === '@c15t/backend/define-config') {
			const node = declaration.getModuleSpecifier();
			const quote = node.getText().charAt(0);
			edits.push(toTextEdit(node, `${quote}${ENTRY}${quote}`));
			summaries.add(`${specifier} -> ${ENTRY}`);
			operations += 1;
		} else if (
			REMOVED_ENTRIES.has(specifier) &&
			addTodo(declaration, REMOVED_ENTRY_TODO, edits)
		) {
			summaries.add(`TODO: ${specifier}`);
			operations += 1;
		}
	}
	if (edits.length === 0) {
		return UNCHANGED;
	}
	applyEdits(sourceFile, edits);
	return { changed: true, operations, summaries: [...summaries] };
};

/**
 * Moves `policyPacks` (as `policyRules`), `branding`, `customTranslations`,
 * `i18n` and `appName` under `manifest` in a `@c15t/backend` config, and
 * marks `adapter`, `disableGeoLocation` and the other removed options with
 * `TODO(c15t v3)` comments.
 *
 * @param options - Codemod execution options.
 * @returns Changed files and non-fatal per-file errors.
 */
export const runBackendConfigToV3Codemod = function runBackendConfigToV3Codemod(
	options: CodemodRunOptions
): Promise<CodemodRunResult> {
	return runTransform(options, transformSourceFile);
};
