import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import JSON5 from 'json5';
import type {
	Heading,
	Parent,
	PhrasingContent,
	RootContent,
	Table,
} from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import * as ts from 'typescript';
import { u } from 'unist-builder';
import {
	createHeading,
	createInlineCode,
	createJsxComponentProcessor,
	createLink,
	createListItem,
	createParagraph,
	createTable,
	createTableRow,
	createText,
	createUnorderedList,
	getAttributeValue,
	hasName,
	type MdxNode,
	normalizeWhitespace,
} from '../../remark-libs';
import type { ObjectType } from './types';
import {
	buildWorkspacePathMappings,
	createWorkspaceCompilerHost,
	findWorkspaceRoot,
} from './workspace-resolver';

let __tsCompilerOptions: ts.CompilerOptions | null = null;
const __tsProgramByRootFile = new Map<
	string,
	{
		program: ts.Program;
		checker: ts.TypeChecker;
		sourceFile: ts.SourceFile;
	}
>();

// Per-workspace shared program — avoids recreating a full TS program for every
// AutoTypeTable. Transitive dependencies resolved for file A are reused when
// file B is requested from the same workspace.
const __workspacePrograms = new Map<
	string,
	{
		rootFiles: Set<string>;
		options: ts.CompilerOptions;
		program: ts.Program;
		checker: ts.TypeChecker;
	}
>();

function getTypeScriptCompilerOptions(): ts.CompilerOptions {
	if (__tsCompilerOptions) {
		return __tsCompilerOptions;
	}

	// Try to resolve tsconfig.json path relative to current working directory
	// This handles both local development and serverless environments
	const tsConfigPath = resolve(process.cwd(), 'tsconfig.json');

	// Read and parse tsconfig.json if it exists
	let compilerOptions: ts.CompilerOptions = {
		target: ts.ScriptTarget.ESNext,
		module: ts.ModuleKind.ESNext,
		jsx: ts.JsxEmit.ReactJSX,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		allowJs: true,
		skipLibCheck: true,
		strict: true,
		esModuleInterop: true,
		resolveJsonModule: true,
		isolatedModules: true,
	};

	if (existsSync(tsConfigPath)) {
		try {
			const configFile = ts.readConfigFile(tsConfigPath, (path) =>
				readFileSync(path, 'utf-8')
			);
			const parsedConfig = ts.parseJsonConfigFileContent(
				configFile.config,
				ts.sys,
				process.cwd()
			);
			compilerOptions = { ...compilerOptions, ...parsedConfig.options };
		} catch {
			// Fallback to default options if tsconfig parsing fails
		}
	}

	__tsCompilerOptions = compilerOptions;
	return compilerOptions;
}

function getTypeScriptProgramForFile(rootFilePath: string): {
	program: ts.Program;
	checker: ts.TypeChecker;
	sourceFile: ts.SourceFile;
} | null {
	const cached = __tsProgramByRootFile.get(rootFilePath);
	if (cached) {
		return cached;
	}

	const baseOptions = getTypeScriptCompilerOptions();
	const workspaceRoot = findWorkspaceRoot(rootFilePath);

	// Non-workspace path: one program per file (original behaviour)
	if (!workspaceRoot) {
		const host = ts.createCompilerHost(baseOptions, true);
		const program = ts.createProgram([rootFilePath], baseOptions, host);
		const sourceFile = program.getSourceFile(rootFilePath);
		if (!sourceFile) return null;
		const checker = program.getTypeChecker();
		const value = { program, checker, sourceFile };
		__tsProgramByRootFile.set(rootFilePath, value);
		return value;
	}

	// Workspace path: share one ts.Program per workspace.
	// The first call creates it; later calls reuse it — most files are already
	// loaded as transitive dependencies so there's no extra resolution cost.
	const ws = __workspacePrograms.get(workspaceRoot);

	if (ws) {
		// Fast path: file already loaded as a transitive dependency
		const sourceFile = ws.program.getSourceFile(rootFilePath);
		if (sourceFile) {
			const value = { program: ws.program, checker: ws.checker, sourceFile };
			__tsProgramByRootFile.set(rootFilePath, value);
			return value;
		}

		// File not yet in the program — add it as an additional root and rebuild
		// incrementally, passing the old program so TS reuses parsed source files.
		ws.rootFiles.add(rootFilePath);
		const host = createWorkspaceCompilerHost(ws.options, workspaceRoot);
		const program = ts.createProgram(
			[...ws.rootFiles],
			ws.options,
			host,
			ws.program // oldProgram — enables incremental reuse
		);
		ws.program = program;
		ws.checker = program.getTypeChecker();

		const sourceFile2 = program.getSourceFile(rootFilePath);
		if (!sourceFile2) return null;
		const value = { program, checker: ws.checker, sourceFile: sourceFile2 };
		__tsProgramByRootFile.set(rootFilePath, value);
		return value;
	}

	// First file in this workspace — create the program from scratch
	const paths = buildWorkspacePathMappings(workspaceRoot);
	const compilerOptions = {
		...baseOptions,
		baseUrl: baseOptions.baseUrl || workspaceRoot,
		paths: { ...baseOptions.paths, ...paths },
	};
	const host = createWorkspaceCompilerHost(compilerOptions, workspaceRoot);
	const rootFiles = new Set([rootFilePath]);
	const program = ts.createProgram([rootFilePath], compilerOptions, host);
	const checker = program.getTypeChecker();

	__workspacePrograms.set(workspaceRoot, {
		rootFiles,
		options: compilerOptions,
		program,
		checker,
	});

	const sourceFile = program.getSourceFile(rootFilePath);
	if (!sourceFile) return null;
	const value = { program, checker, sourceFile };
	__tsProgramByRootFile.set(rootFilePath, value);
	return value;
}

type TypeTableOptions = {
	/** When true, include the description column in the output table. */
	includeDescriptions?: boolean;
	/** When true, include the default value column in the output table. */
	includeDefaults?: boolean;
	/** When true, include the required status column in the output table. */
	includeRequired?: boolean;
	/** Base path to resolve relative file paths for AutoTypeTable components. */
	basePath?: string;
};

const TABLE_HEADING_DEPTH = 3 as const;

// Precompiled regex for import type resolution
const IMPORT_TYPE_PATTERN = /import\(["']([^"']+)["']\)\.(\w+)/;

// Precompiled regex for JSDoc extraction
const JSDOC_PATTERN = /\/\*\*[\s\S]*?\*\//;

const TRAILING_SLASHES_PATTERN = /\/+$/;

type ParsedProperty = {
	name: string;
	property: ObjectType;
};

type NestedSectionTracker = {
	seenKeys: Set<string>;
	explicitTypeNames: Set<string>;
};

type DetailParts = {
	inline: string;
	bullets: string[];
};

type JSDocSeeInfo = {
	url?: string;
	label?: string;
};

/**
 * Parse a JavaScript object literal from an MDX attribute value expression.
 * This handles the type object that gets passed to the TypeTable component.
 */
function parseTypeObject(
	raw: string | null
): Record<string, ObjectType> | null {
	if (!raw) {
		return null;
	}

	const trimmed = raw.trim();

	try {
		// Use JSON5 for robust parsing of JavaScript-like object literals
		const parsed = JSON5.parse(trimmed);

		// Validate the structure
		if (
			typeof parsed === 'object' &&
			parsed !== null &&
			!Array.isArray(parsed)
		) {
			// Check if it looks like a valid ObjectType record
			const isValid = Object.values(parsed).every(
				(value) =>
					typeof value === 'object' && value !== null && 'type' in value
			);

			return isValid ? (parsed as Record<string, ObjectType>) : null;
		}

		return null;
	} catch {
		return null;
	}
}

// Use shared createTableCell and createTableRow functions from remark-libs

function getNodeText(
	value: ObjectType['description'] | ObjectType['typeDescription']
) {
	if (!value) {
		return '';
	}
	return typeof value === 'string' ? value : String(value);
}

function splitDetailParts(value: string | null | undefined): DetailParts {
	if (!value) {
		return { inline: '-', bullets: [] };
	}

	const normalized = value
		.replace(/&#xA;/g, '\n')
		.replace(/\r\n/g, '\n')
		.trim();
	const lines = normalized
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
	if (lines.length === 0) {
		return { inline: '-', bullets: [] };
	}

	const bulletLines = lines.filter((line) => /^[-*]\s+/.test(line));
	const nonBulletLines = lines.filter((line) => !/^[-*]\s+/.test(line));
	const summaryLines = nonBulletLines.filter(
		(line) =>
			!/:\s*$/.test(line) &&
			!/^example use cases:?$/i.test(line) &&
			!/^this is useful for:?$/i.test(line) &&
			!/^use ['"`]/i.test(line)
	);
	const summary = normalizeWhitespace(summaryLines.join(' '));

	if (bulletLines.length === 0) {
		return { inline: normalizeWhitespace(normalized), bullets: [] };
	}

	const bulletItems = bulletLines.map((line) =>
		normalizeWhitespace(line.replace(/^[-*]\s+/, ''))
	);
	const shortBullets =
		bulletItems.length <= 4 && bulletItems.every((item) => item.length <= 60);

	if (shortBullets) {
		const prefix = summary.length > 0 ? `${summary} Options:` : 'Options:';
		return {
			inline: normalizeWhitespace(`${prefix} ${bulletItems.join('; ')}`),
			bullets: [],
		};
	}

	const optionBullets = bulletItems.filter((item) =>
		/^(['"`].+['"`]|\d+):/.test(item)
	);

	if (
		optionBullets.length > 0 &&
		optionBullets.length <= 3 &&
		optionBullets.every((item) => item.length <= 80)
	) {
		const prefix = summary.length > 0 ? `${summary} Options:` : 'Options:';
		return {
			inline: normalizeWhitespace(`${prefix} ${optionBullets.join('; ')}`),
			bullets: bulletItems.filter((item) => !optionBullets.includes(item)),
		};
	}

	return {
		inline: summary.length > 0 ? summary : (bulletItems[0] ?? '-'),
		bullets: summary.length > 0 ? bulletItems : bulletItems.slice(1),
	};
}

function formatPropertyDescription(property: ObjectType): string {
	const parts: string[] = [];

	if (property.description) {
		parts.push(getNodeText(property.description));
	}

	if (property.typeDescription) {
		parts.push(getNodeText(property.typeDescription));
	}

	return splitDetailParts(parts.join('\n').trim()).inline || '-';
}

function normalizeLinkTarget(url: string): string {
	if (url.startsWith('http://') || url.startsWith('https://')) {
		return url;
	}
	if (url.startsWith('//')) {
		return `https:${url}`;
	}
	if (url.startsWith('://')) {
		return `https${url}`;
	}
	if (url.startsWith('/')) {
		return `https://v2.c15t.com${url}`;
	}
	return url;
}

function formatPropertyType(property: ObjectType): string | PhrasingContent[] {
	let type = property.type;

	if (property.deprecated) {
		type = `~~${type}~~ (deprecated)`;
	}

	const compactType = summarizeTypeLabel(type, property) || '-';
	if (property.typeDescriptionLink) {
		return [
			createLink(
				normalizeLinkTarget(property.typeDescriptionLink),
				compactType
			),
		];
	}

	return compactType;
}

function formatPropertyDefault(property: ObjectType): string {
	return splitDetailParts(
		property.default === '' ? '-' : (property.default ?? '-')
	).inline;
}

function formatPropertyRequired(property: ObjectType): string {
	return property.required ? '✅ Required' : 'Optional';
}

function compactTableText(value: string | null | undefined) {
	return splitDetailParts(value).inline;
}

function normalizeTypeName(type: string): string | null {
	const normalized = normalizeWhitespace(type)
		.replace(/\s*\|\s*undefined/g, '')
		.replace(/\s*\|\s*null/g, '')
		.replace(/\[\]$/, '')
		.trim();

	const wrappedMatch = normalized.match(
		/^(?:Partial|Readonly|Required|Pick|Omit)<(.+)>$/
	);
	if (wrappedMatch?.[1]) {
		return normalizeTypeName(wrappedMatch[1]);
	}

	const typeNameMatch = normalized.match(/[A-Z][A-Za-z0-9_]+$/);
	return typeNameMatch?.[0] ?? null;
}

function summarizeTypeLabel(type: string, property?: ObjectType): string {
	const normalized = normalizeWhitespace(type);
	const compact = compactTableText(type);
	const namedType = normalizeTypeName(normalized);

	if (namedType) {
		const suffixes: string[] = [];
		if (/\|\s*undefined/.test(normalized)) {
			suffixes.push('undefined');
		}
		if (/\|\s*null/.test(normalized)) {
			suffixes.push('null');
		}
		const suffixText = suffixes.length > 0 ? ` | ${suffixes.join(' | ')}` : '';
		return `${namedType}${suffixText}`;
	}

	const isLargeAnonymousType =
		normalized.length > 80 ||
		(normalized.includes('{') && (normalized.match(/;/g) ?? []).length >= 2);

	if (property?.nestedProperties || isLargeAnonymousType) {
		const arrayPrefix =
			/^(?:ReadonlyArray|Array)</.test(normalized) ||
			/\[\](?:\s*\|\s*(?:undefined|null))*$/.test(normalized)
				? 'Array<Object>'
				: 'Object';
		const suffixes: string[] = [];
		if (/\|\s*undefined/.test(normalized)) {
			suffixes.push('undefined');
		}
		if (/\|\s*null/.test(normalized)) {
			suffixes.push('null');
		}
		const suffixText = suffixes.length > 0 ? ` | ${suffixes.join(' | ')}` : '';
		return `${arrayPrefix}${suffixText}`;
	}

	return compact;
}

function getPreviousHeading(parent: Parent, index: number): Heading | null {
	for (let current = index - 1; current >= 0; current -= 1) {
		const sibling = parent.children[current];
		if (!sibling) {
			continue;
		}
		if (sibling.type === 'heading') {
			return sibling;
		}
		if (sibling.type !== 'definition') {
			break;
		}
	}
	return null;
}

function getHeadingText(heading: Heading): string {
	return normalizeWhitespace(
		heading.children
			.map((child) => ('value' in child ? String(child.value) : ''))
			.join('')
	);
}

function shouldEmitHeading(
	parent: Parent | undefined,
	index: number | undefined,
	headingText: string | null
): boolean {
	if (!parent || typeof index !== 'number' || !headingText) {
		return true;
	}
	const previousHeading = getPreviousHeading(parent, index);
	return (
		!previousHeading ||
		getHeadingText(previousHeading) !== normalizeWhitespace(headingText)
	);
}

// Use shared createHeading and createParagraph functions from remark-libs

/**
 * Resolve a type name by checking if it's an imported type and extracting just the name
 */
function resolveTypeName(
	type: ts.Type,
	checker: ts.TypeChecker,
	sourceFile?: ts.SourceFile,
	typeBeingExtracted?: string
): string {
	const fullTypeText = checker.typeToString(
		type,
		undefined,
		ts.TypeFormatFlags.NoTruncation
	);

	// Check if this is an imported type (contains 'import("...")')
	const importMatch = fullTypeText.match(IMPORT_TYPE_PATTERN);
	if (importMatch) {
		const importPath = importMatch.at(1);
		const importedTypeName = importMatch.at(2);
		if (importPath === undefined || importedTypeName === undefined) {
			return fullTypeText;
		}

		// If this is the type we're currently extracting, just return the type name
		if (typeBeingExtracted && importedTypeName === typeBeingExtracted) {
			return importedTypeName;
		}

		// If we have a source file and the import path points to the same file,
		// just return the type name without the import
		if (sourceFile && importPath.includes(sourceFile.fileName)) {
			return importedTypeName;
		}

		// For external imports, return just the type name
		return importedTypeName;
	}

	// For local types or built-in types, return the full text
	return fullTypeText;
}

function extractJSDocDescription(
	node: ts.Node,
	sourceFile: ts.SourceFile
): string {
	// Get JSDoc comments from the node
	const jsDocComments = ts.getJSDocCommentsAndTags(node);

	for (const doc of jsDocComments) {
		if (ts.isJSDoc(doc)) {
			const comment = doc.comment;
			if (typeof comment === 'string') {
				return comment.trim();
			}
			if (Array.isArray(comment)) {
				return comment
					.map((c) => (typeof c === 'string' ? c : c.text))
					.join(' ')
					.trim();
			}
		}
	}

	// Fallback: extract from source text
	const fullText = sourceFile.text.substring(
		node.getFullStart(),
		node.getStart()
	);
	const jsDocMatch = fullText.match(JSDOC_PATTERN);
	if (jsDocMatch) {
		return jsDocMatch[0]
			.replace(/\/\*\*|\*\//g, '')
			.replace(/\*\s*/g, '')
			.trim();
	}

	return '';
}

function extractJSDocDefault(node: ts.Node): string {
	const jsDocTags = ts.getJSDocTags(node);
	for (const tag of jsDocTags) {
		if (tag.tagName && tag.tagName.text === 'default') {
			const comment = tag.comment;
			if (typeof comment === 'string') {
				return comment.trim();
			}
			if (Array.isArray(comment)) {
				return comment
					.map((c) => (typeof c === 'string' ? c : c.text))
					.join(' ')
					.trim();
			}
		}
	}
	return '';
}

function extractJSDocSee(node: ts.Node): JSDocSeeInfo | null {
	const jsDocTags = ts.getJSDocTags(node);
	for (const tag of jsDocTags) {
		if (tag.tagName && tag.tagName.text === 'see') {
			const parts: string[] = [];

			// TypeScript's parser treats the protocol of a bare URL
			// (e.g. "https") as a JSDocNameReference on @see tags.
			// Reconstruct the full URL by prepending the name text.
			const seeTag = tag as ts.JSDocSeeTag;
			if (seeTag.name && 'name' in seeTag.name) {
				const nameEntity = (seeTag.name as { name: ts.EntityName }).name;
				if (ts.isIdentifier(nameEntity)) {
					parts.push(nameEntity.text);
				}
			}

			const comment = tag.comment;
			if (typeof comment === 'string') {
				parts.push(comment);
			} else if (Array.isArray(comment)) {
				parts.push(
					comment.map((c) => (typeof c === 'string' ? c : c.text)).join('')
				);
			}

			const result = parts.join('').trim();
			if (result) {
				const match = result.match(
					/^(https?:\/\/\S+|:\/\/\S+|\/\/\S+|\/\S+)(?:\s*-\s*|\s+)?(.*)$/
				);
				if (!match) {
					return { label: result };
				}

				const [, rawUrl, rawLabel] = match;
				const url = rawUrl
					? rawUrl.replace(/^https?:\/\/(?:www\.)?c15t\.com/, '')
					: undefined;
				const label = rawLabel?.trim() || undefined;
				return { url, label };
			}
		}
	}
	return null;
}

// Built-in Object prototype methods that should be filtered out of nested properties
const OBJECT_PROTOTYPE_MEMBERS = new Set([
	'toString',
	'valueOf',
	'hasOwnProperty',
	'isPrototypeOf',
	'propertyIsEnumerable',
	'toLocaleString',
	'constructor',
]);

/**
 * Check if a declaration comes from TypeScript's built-in lib files
 * (lib.es5.d.ts, lib.dom.d.ts, etc.) rather than user or third-party code.
 */
function isBuiltinLibDeclaration(node: ts.Node): boolean {
	const sf = node.getSourceFile();
	return sf.isDeclarationFile && sf.fileName.includes('/typescript/lib/');
}

/**
 * Resolve nested properties from a referenced type (1 level deep).
 * Unwraps array types and `T | undefined` unions, then extracts properties
 * from class/interface types. Filters out inherited Object prototype members.
 */
function resolveNestedProperties(
	type: ts.Type,
	checker: ts.TypeChecker,
	sourceFile: ts.SourceFile,
	parentTypeName?: string
): Record<string, ObjectType> | undefined {
	let unwrapped = type;

	// Skip any/unknown — no meaningful nested properties can be resolved
	if (unwrapped.getFlags() & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
		return undefined;
	}

	// Iteratively peel wrapper types so that combinations like
	// `Script[] | undefined` or `Promise<Foo | undefined> | undefined`
	// are fully unwrapped before we inspect properties.
	const MAX_UNWRAP = 5;
	for (let i = 0; i < MAX_UNWRAP; i++) {
		const prev = unwrapped;

		// 1. Strip `| undefined | null` unions first
		if (unwrapped.isUnion()) {
			const nonTrivial = unwrapped.types.filter(
				(t) =>
					!(
						t.getFlags() &
						(ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Void)
					)
			);
			if (nonTrivial.length === 1) {
				unwrapped = nonTrivial[0]!;
			} else if (nonTrivial.length > 1) {
				// Multi-type union (not just T | undefined) — stop unwrapping
				break;
			}
		}

		// 2. Unwrap array types: T[], Array<T>, ReadonlyArray<T>
		if (checker.isArrayType(unwrapped)) {
			const typeArgs = (unwrapped as ts.TypeReference).typeArguments;
			if (typeArgs && typeArgs.length > 0) {
				unwrapped = typeArgs[0]!;
			}
		} else {
			const sym = unwrapped.getSymbol();
			const symName = sym?.getName();
			if (symName === 'ReadonlyArray' || symName === 'Array') {
				const typeArgs = (unwrapped as ts.TypeReference).typeArguments;
				if (typeArgs && typeArgs.length > 0) {
					unwrapped = typeArgs[0]!;
				}
			}
		}

		// 3. Unwrap Promise<T>
		const sym = unwrapped.getSymbol();
		if (sym?.getName() === 'Promise') {
			const typeArgs = (unwrapped as ts.TypeReference).typeArguments;
			if (typeArgs && typeArgs.length > 0) {
				unwrapped = typeArgs[0]!;
			}
		}

		// Nothing changed — done
		if (unwrapped === prev) break;
	}

	// Skip primitives, any, unknown, and function types
	if (
		unwrapped.getFlags() &
		(ts.TypeFlags.String |
			ts.TypeFlags.Number |
			ts.TypeFlags.Boolean |
			ts.TypeFlags.Undefined |
			ts.TypeFlags.Null |
			ts.TypeFlags.Void |
			ts.TypeFlags.Any |
			ts.TypeFlags.Unknown |
			ts.TypeFlags.StringLiteral |
			ts.TypeFlags.NumberLiteral |
			ts.TypeFlags.BooleanLiteral)
	) {
		return undefined;
	}

	// For callback types like `(info: ScriptCallbackInfo) => void`,
	// unwrap to the first parameter's type so its properties are shown.
	const callSigs = unwrapped.getCallSignatures();
	if (callSigs.length > 0) {
		const sig = callSigs[0]!;
		const params = sig.getParameters();
		if (params.length === 1) {
			const paramType = checker.getTypeOfSymbolAtLocation(
				params[0]!,
				sourceFile
			);
			return resolveNestedProperties(
				paramType,
				checker,
				sourceFile,
				parentTypeName
			);
		}
		return undefined;
	}

	// Guard against circular references
	const typeName = checker.typeToString(unwrapped);
	if (parentTypeName && typeName === parentTypeName) {
		return undefined;
	}

	// Only resolve if the type has properties (class/interface/object)
	const properties = unwrapped.getProperties();
	if (properties.length === 0) {
		return undefined;
	}

	// Only keep data properties (PropertySignature / PropertyDeclaration) from
	// user code. Filters out Object prototype members, symbol-named properties
	// (e.g. @@unscopables), built-in methods, and properties declared only in
	// TypeScript's lib files (e.g. Array.length).
	const userProperties = properties.filter((prop) => {
		const name = prop.getName();
		if (OBJECT_PROTOTYPE_MEMBERS.has(name) || name.startsWith('__@')) {
			return false;
		}
		const declarations = prop.getDeclarations();
		// Mapped types (e.g. Partial<Record<K,V>>) produce synthetic properties
		// with no declarations. Include them if they carry the Property flag.
		if (!declarations || declarations.length === 0) {
			return !!(prop.flags & ts.SymbolFlags.Property);
		}
		return declarations.some(
			(d) =>
				(ts.isPropertySignature(d) || ts.isPropertyDeclaration(d)) &&
				!isBuiltinLibDeclaration(d)
		);
	});

	if (userProperties.length === 0) {
		return undefined;
	}

	const result: Record<string, ObjectType> = {};
	for (const prop of userProperties) {
		const propType = checker.getTypeOfSymbolAtLocation(prop, sourceFile);
		let propTypeText = resolveTypeName(propType, checker, sourceFile);
		const description = extractPropertyDescription(prop, sourceFile);

		const declarations = prop.getDeclarations();

		// Fall back to declared type annotation when the compiler resolves to 'any'
		if (propTypeText === 'any' && declarations) {
			for (const d of declarations) {
				if (
					(ts.isPropertySignature(d) || ts.isPropertyDeclaration(d)) &&
					d.type
				) {
					propTypeText = d.type.getText(sourceFile);
					break;
				}
			}
		}

		const isOptional =
			declarations?.some(
				(d) => ts.isPropertySignature(d) && !!d.questionToken
			) ?? false;

		result[prop.getName()] = {
			type: propTypeText,
			description: description || undefined,
			required: !isOptional,
		};
	}

	return Object.keys(result).length > 0 ? result : undefined;
}

function extractPropertyInfo(
	property: ts.PropertySignature | ts.PropertyDeclaration,
	checker: ts.TypeChecker,
	sourceFile: ts.SourceFile,
	typeBeingExtracted?: string
): ObjectType {
	const type = checker.getTypeAtLocation(property);
	let typeText = resolveTypeName(type, checker, sourceFile, typeBeingExtracted);

	// Fall back to the declared type annotation when the compiler resolves to
	// 'any' (e.g. imported types from packages not in the program's root files)
	if (typeText === 'any' && property.type) {
		typeText = property.type.getText(sourceFile);
	}
	const isOptional = !!property.questionToken;

	// Try to get JSDoc comment
	const description = extractJSDocDescription(property, sourceFile);

	// Try to get default value from JSDoc tags
	const defaultValue = extractJSDocDefault(property);

	// Try to get @see link from JSDoc tags
	const seeInfo = extractJSDocSee(property);

	// Resolve nested properties (1 level deep) for referenced types
	const nestedProperties = resolveNestedProperties(
		type,
		checker,
		sourceFile,
		typeBeingExtracted
	);

	return {
		type: typeText,
		description: description || undefined,
		required: !isOptional,
		default: defaultValue,
		nestedProperties,
		typeDescription:
			seeInfo?.url && seeInfo.label
				? `See ${seeInfo.label}: ${normalizeLinkTarget(seeInfo.url)}`
				: undefined,
		typeDescriptionLink:
			seeInfo?.url && !seeInfo.label
				? normalizeLinkTarget(seeInfo.url)
				: undefined,
	};
}

function extractInterfaceProperties(
	interfaceDecl: ts.InterfaceDeclaration,
	checker: ts.TypeChecker,
	sourceFile: ts.SourceFile,
	typeBeingExtracted?: string
): Record<string, ObjectType> {
	const properties: Record<string, ObjectType> = {};

	for (const member of interfaceDecl.members) {
		if (ts.isPropertySignature(member)) {
			const name = member.name
				? ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)
					? member.name.text
					: ''
				: '';
			if (name) {
				properties[name] = extractPropertyInfo(
					member,
					checker,
					sourceFile,
					typeBeingExtracted
				);
			}
		}
	}

	return properties;
}

function isStaticProperty(member: ts.PropertyDeclaration): boolean {
	const modifiers = ts.getModifiers(member);
	return (
		modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword) ?? false
	);
}

function extractClassProperties(
	classDecl: ts.ClassDeclaration,
	checker: ts.TypeChecker,
	sourceFile: ts.SourceFile
): Record<string, ObjectType> {
	const properties: Record<string, ObjectType> = {};

	for (const member of classDecl.members) {
		if (ts.isPropertyDeclaration(member) && !isStaticProperty(member)) {
			const name = member.name
				? ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)
					? member.name.text
					: ''
				: '';
			if (name) {
				properties[name] = extractPropertyInfo(member, checker, sourceFile);
			}
		}
	}

	return properties;
}

/**
 * Extract JSDoc description from a property symbol
 */
function extractPropertyDescription(
	property: ts.Symbol,
	sourceFile: ts.SourceFile
): string {
	const declarations = property.getDeclarations();
	const firstDeclaration = declarations?.at(0);
	if (firstDeclaration) {
		return extractJSDocDescription(firstDeclaration, sourceFile);
	}
	return '';
}

/**
 * Extract properties from a type alias with type literal
 */
function extractTypeAliasProperties(
	typeAlias: ts.TypeAliasDeclaration,
	checker: ts.TypeChecker,
	sourceFile: ts.SourceFile,
	typeName: string
): Record<string, ObjectType> | null {
	const typeNode = typeAlias.type;

	// If it's a type literal (object type), extract properties from it
	if (typeNode && ts.isTypeLiteralNode(typeNode)) {
		const aliasType = checker.getTypeAtLocation(typeAlias);
		const typeAliasText = sourceFile.text.substring(
			typeAlias.getStart(),
			typeAlias.getEnd()
		);

		if (aliasType.isClassOrInterface()) {
			const properties: Record<string, ObjectType> = {};
			const typeProperties = aliasType.getProperties();

			for (const property of typeProperties) {
				const propertyName = property.getName();
				const propertyType = checker.getTypeOfSymbolAtLocation(
					property,
					sourceFile
				);
				let propertyTypeText = resolveTypeName(
					propertyType,
					checker,
					sourceFile,
					typeName
				);

				// Fall back to declared type annotation when the compiler resolves to 'any'
				if (propertyTypeText === 'any') {
					const propDecl = property
						.getDeclarations()
						?.find(
							(d): d is ts.PropertySignature =>
								ts.isPropertySignature(d) && !!d.type
						);
					if (propDecl?.type) {
						propertyTypeText = propDecl.type.getText(sourceFile);
					}
				}

				// Check if property is optional by examining the source text
				const isOptional =
					typeAliasText.includes(`${propertyName}?:`) ||
					typeAliasText.includes(`${propertyName} ?:`);

				const description = extractPropertyDescription(property, sourceFile);

				const nestedProperties = resolveNestedProperties(
					propertyType,
					checker,
					sourceFile,
					typeName
				);

				properties[propertyName] = {
					type: propertyTypeText,
					description: description || undefined,
					required: !isOptional,
					nestedProperties,
				};
			}

			// Only return properties if we found any
			return Object.keys(properties).length > 0 ? properties : null;
		}
	}

	return null;
}

/**
 * Extract type information from a TypeScript file using TypeScript compiler API
 */
function extractPropertiesFromSourceFile(
	sourceFile: ts.SourceFile,
	typeName: string,
	checker: ts.TypeChecker
): Record<string, ObjectType> | null {
	// Visit all nodes to find interfaces, classes, and type aliases
	let interfaceDecl: ts.InterfaceDeclaration | null = null;
	let classDecl: ts.ClassDeclaration | null = null;
	let typeAlias: ts.TypeAliasDeclaration | null = null;

	function visit(node: ts.Node) {
		if (ts.isInterfaceDeclaration(node) && node.name.text === typeName) {
			interfaceDecl = node;
		} else if (
			ts.isClassDeclaration(node) &&
			node.name &&
			node.name.text === typeName
		) {
			classDecl = node;
		} else if (ts.isTypeAliasDeclaration(node) && node.name.text === typeName) {
			typeAlias = node;
		}
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);

	// Look for interfaces first
	if (interfaceDecl) {
		return extractInterfaceProperties(
			interfaceDecl,
			checker,
			sourceFile,
			typeName
		);
	}

	// Look for classes
	if (classDecl) {
		return extractClassProperties(classDecl, checker, sourceFile);
	}

	// Look for type aliases
	if (typeAlias) {
		// Try to extract properties from type alias
		const aliasProperties = extractTypeAliasProperties(
			typeAlias,
			checker,
			sourceFile,
			typeName
		);
		if (aliasProperties) {
			return aliasProperties;
		}

		// Fallback: return the type alias itself if we couldn't extract properties
		const aliasType = checker.getTypeAtLocation(typeAlias);
		const typeText = checker.typeToString(aliasType);
		return {
			[typeName]: {
				type: typeText,
				description: `Type alias for ${typeName}`,
				required: true,
			},
		};
	}

	return null;
}

export function extractTypeFromFile(
	filePath: string,
	typeName: string,
	basePath?: string
): Record<string, ObjectType> | null {
	try {
		const normalizeAutoTypeTablePath = (
			rawPath: string,
			rawBasePath?: string
		): string => {
			if (!rawBasePath) {
				return rawPath;
			}

			// Authors commonly write `path="./packages/..."` even when `basePath` is already
			// pointing at a `.../packages` directory (e.g. `.c15t/packages`). In that case,
			// the naive resolution becomes `.../packages/packages/...` and the file can't be found.
			const basePathNormalized = rawBasePath
				.replaceAll('\\', '/')
				.replace(TRAILING_SLASHES_PATTERN, '');
			if (!basePathNormalized.endsWith('/packages')) {
				return rawPath;
			}

			const pathNormalized = rawPath.replaceAll('\\', '/');
			if (pathNormalized.startsWith('./packages/')) {
				return pathNormalized.slice('./packages/'.length);
			}
			if (pathNormalized.startsWith('packages/')) {
				return pathNormalized.slice('packages/'.length);
			}

			return rawPath;
		};

		// Resolve the file path using basePath if provided
		const normalizedPath = basePath
			? normalizeAutoTypeTablePath(filePath, basePath)
			: filePath;
		const resolvedPath = basePath
			? resolve(basePath, normalizedPath)
			: filePath;

		if (!existsSync(resolvedPath)) {
			return null;
		}

		const tsProgram = getTypeScriptProgramForFile(resolvedPath);
		if (!tsProgram) {
			return null;
		}

		return extractPropertiesFromSourceFile(
			tsProgram.sourceFile,
			typeName,
			tsProgram.checker
		);
	} catch {
		// Silently return null if file can't be found or parsed
		return null;
	}
}

function createAutoTypeTable(
	properties: ParsedProperty[],
	options: TypeTableOptions
): Table {
	const {
		includeDescriptions = true,
		includeDefaults = true,
		includeRequired = true,
	} = options;

	const headers = ['Property', 'Type'];
	if (includeDescriptions) {
		headers.push('Description');
	}
	if (includeDefaults) {
		headers.push('Default');
	}
	if (includeRequired) {
		headers.push('Required');
	}

	// Generate align array dynamically based on headers
	const align = headers.map((header) =>
		header === 'Required' ? 'center' : 'left'
	);

	const rows = properties.map(({ name, property }) => {
		const rowData = [name, formatPropertyType(property)];

		if (includeDescriptions) {
			rowData.push(formatPropertyDescription(property));
		}

		if (includeDefaults) {
			rowData.push(formatPropertyDefault(property));
		}

		if (includeRequired) {
			rowData.push(formatPropertyRequired(property));
		}

		return rowData;
	});

	return createTable(headers, rows, align);
}

function nestedSectionKey(propertyName: string, property: ObjectType): string {
	return `${propertyName}::${property.type}`;
}

function appendNestedTypeSections(
	properties: ParsedProperty[],
	content: RootContent[],
	options: TypeTableOptions,
	tracker: NestedSectionTracker
): void {
	for (const { name, property } of properties) {
		if (!property.nestedProperties) continue;
		const nestedEntries = Object.entries(property.nestedProperties);
		if (nestedEntries.length === 0) continue;
		const explicitTypeName = normalizeTypeName(property.type);
		if (explicitTypeName && tracker.explicitTypeNames.has(explicitTypeName)) {
			continue;
		}
		const sectionKey = nestedSectionKey(name, property);
		if (tracker.seenKeys.has(sectionKey)) {
			continue;
		}
		tracker.seenKeys.add(sectionKey);

		const typeName = normalizeTypeName(property.type);
		const heading: Heading = {
			type: 'heading',
			depth: (TABLE_HEADING_DEPTH + 1) as 4,
			children:
				typeName && typeName !== '-'
					? [createInlineCode(name), createText(` ${typeName}`)]
					: [createInlineCode(name)],
		};
		content.push(heading);

		const detail = splitDetailParts(getNodeText(property.description));
		const nestedDescription = detail.inline;
		if (nestedDescription && nestedDescription !== '-') {
			content.push(createParagraph(nestedDescription));
		}
		if (detail.bullets.length > 0) {
			content.push(
				createUnorderedList(
					detail.bullets.map((bullet) =>
						createListItem([createParagraph(bullet)])
					),
					false
				)
			);
		}
		const typeDetail = splitDetailParts(getNodeText(property.typeDescription));
		if (typeDetail.inline && typeDetail.inline !== '-') {
			content.push(createParagraph(typeDetail.inline));
		}

		const nestedProperties: ParsedProperty[] = nestedEntries.map(
			([nestedName, nestedProp]) => ({
				name: nestedName,
				property: nestedProp,
			})
		);
		content.push(createAutoTypeTable(nestedProperties, options));
		appendNestedTypeSections(nestedProperties, content, options, tracker);
	}
}

function addOptionalContent(
	content: RootContent[],
	title: string | null,
	description: string | null
): void {
	if (title) {
		content.push(createHeading(TABLE_HEADING_DEPTH, title));
	}
	if (description) {
		content.push(createParagraph(description));
	}
}

function processAutoTypeTableNode(
	node: MdxNode,
	options: TypeTableOptions,
	tracker: NestedSectionTracker,
	index?: number,
	parent?: Parent
): RootContent[] {
	const title =
		normalizeWhitespace(getAttributeValue(node, 'title') ?? '') || null;
	const description =
		normalizeWhitespace(getAttributeValue(node, 'description') ?? '') || null;
	const autoTypeName = getAttributeValue(node, 'name') || 'UnknownType';
	const autoTypePath = getAttributeValue(node, 'path') || 'UnknownPath';

	const content: RootContent[] = [];
	addOptionalContent(content, title, description);
	const previousHeading =
		parent && typeof index === 'number'
			? getPreviousHeading(parent, index)
			: null;
	if (
		!title &&
		shouldEmitHeading(parent, index, autoTypeName) &&
		!(
			previousHeading &&
			getHeadingText(previousHeading) === 'Options' &&
			previousHeading.depth === TABLE_HEADING_DEPTH &&
			autoTypeName.endsWith('Options')
		)
	) {
		content.push(createHeading(TABLE_HEADING_DEPTH, autoTypeName));
	}

	// Try to extract the actual type information from the TypeScript file
	const overrideBasePath =
		getAttributeValue(node, 'basePath') || options.basePath;
	const extractedType = extractTypeFromFile(
		autoTypePath,
		autoTypeName,
		overrideBasePath || options.basePath
	);

	if (extractedType && Object.keys(extractedType).length > 0) {
		// Successfully extracted type information - generate full table
		const properties: ParsedProperty[] = Object.entries(extractedType).map(
			([name, property]) => ({
				name,
				property,
			})
		);

		if (properties.length > 0) {
			const table = createAutoTypeTable(properties, options);
			content.push(table);
			appendNestedTypeSections(properties, content, options, tracker);
		}
	} else {
		// Fallback to simple info table if extraction failed
		const infoTable: Table = u(
			'table',
			{
				align: ['left', 'left'],
			},
			[
				createTableRow(['Property', 'Value']),
				createTableRow(['Type Name', `\`${autoTypeName}\``]),
				createTableRow(['Source Path', `\`${autoTypePath}\``]),
			]
		) as Table;

		content.push(infoTable);

		// Add a note about this being an AutoTypeTable
		content.push(
			createParagraph(
				`*AutoTypeTable: Could not extract \`${autoTypeName}\` from \`${autoTypePath}\`. Verify the path/name and that the file is included by your tsconfig.*`
			)
		);
	}

	return content;
}

function isValidTableNode(
	node: MdxJsxFlowElement | MdxJsxTextElement
): boolean {
	return hasName(node, 'TypeTable') || hasName(node, 'AutoTypeTable');
}

function processTypeTableNode(
	node: MdxNode,
	options: TypeTableOptions,
	tracker: NestedSectionTracker,
	index?: number,
	parent?: Parent
): RootContent[] {
	const {
		includeDescriptions = true,
		includeDefaults = true,
		includeRequired = true,
	} = options;

	// Early validation
	if (!isValidTableNode(node)) {
		return [];
	}

	// Handle AutoTypeTable components separately
	if (hasName(node, 'AutoTypeTable')) {
		return processAutoTypeTableNode(node, options, tracker, index, parent);
	}

	// Handle regular TypeTable components
	const title =
		normalizeWhitespace(getAttributeValue(node, 'title') ?? '') || null;
	const description =
		normalizeWhitespace(getAttributeValue(node, 'description') ?? '') || null;
	const typeRaw = getAttributeValue(node, 'type');

	const typeObject = parseTypeObject(typeRaw);

	if (!typeObject) {
		return [];
	}

	const properties: ParsedProperty[] = Object.entries(typeObject).map(
		([name, property]) => ({
			name,
			property,
		})
	);

	if (properties.length === 0) {
		return [];
	}

	const headers = ['Property', 'Type'];
	if (includeDescriptions) {
		headers.push('Description');
	}
	if (includeDefaults) {
		headers.push('Default');
	}
	if (includeRequired) {
		headers.push('Required');
	}

	// Generate align array dynamically based on headers
	const align = headers.map((header) =>
		header === 'Required' ? 'center' : 'left'
	);

	const rows = properties.map(({ name, property }) => {
		const rowData = [name, formatPropertyType(property)];

		if (includeDescriptions) {
			rowData.push(formatPropertyDescription(property));
		}

		if (includeDefaults) {
			rowData.push(formatPropertyDefault(property));
		}

		if (includeRequired) {
			rowData.push(formatPropertyRequired(property));
		}

		return rowData;
	});

	const tableRows = [createTableRow(headers), ...rows.map(createTableRow)];

	const table: Table = u(
		'table',
		{
			align,
		},
		tableRows
	) as Table;

	const content: RootContent[] = [];

	if (title && shouldEmitHeading(parent, index, title)) {
		content.push(createHeading(TABLE_HEADING_DEPTH, title));
	}

	if (description) {
		content.push(createParagraph(description));
	}

	content.push(table);
	appendNestedTypeSections(properties, content, options, tracker);

	return content;
}

export const remarkTypeTableToMarkdown = (
	opts: Partial<TypeTableOptions> = {}
) => {
	const defaults: TypeTableOptions = {
		includeDescriptions: true,
		includeDefaults: true,
		includeRequired: true,
		basePath: resolve(process.cwd(), '.c15t'),
	};
	const resolved = { ...defaults, ...opts };

	return (tree: import('mdast').Root) => {
		const explicitTypeNames = new Set<string>();
		for (const child of tree.children) {
			if (
				(child.type === 'mdxJsxFlowElement' ||
					child.type === 'mdxJsxTextElement') &&
				hasName(child, 'AutoTypeTable')
			) {
				const explicitName = getAttributeValue(child, 'name');
				if (explicitName) {
					explicitTypeNames.add(explicitName);
				}
			}
		}
		const tracker: NestedSectionTracker = {
			seenKeys: new Set<string>(),
			explicitTypeNames,
		};
		return createJsxComponentProcessor(
			['TypeTable', 'AutoTypeTable'],
			(node, index, parent) => {
				if (hasName(node, 'AutoTypeTable')) {
					return processAutoTypeTableNode(
						node,
						resolved,
						tracker,
						index,
						parent
					);
				}
				return processTypeTableNode(node, resolved, tracker, index, parent);
			}
		)(tree);
	};
};
