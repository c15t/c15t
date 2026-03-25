/**
 * Remark plugin to handle include/import MDX elements.
 * This replaces the circular re-export with an actual implementation.
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import type { Code, Root } from 'mdast';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';

// Re-export remarkLinkIcon from its own file
export { remarkLinkIcon } from './remark-link-icon';

// Regex patterns defined at top level for performance
const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;

// Shared processor for parsing included content
const sharedProcessor = remark().use(remarkMdx).use(remarkGfm);

// Simple frontmatter parser for our build pipeline
function parseFrontmatter(content: string): { content: string } {
	const match = content.match(FRONTMATTER_REGEX);

	if (!match || match[2] === undefined) {
		return { content };
	}

	return { content: match[2] };
}

function flattenNode(node: Record<string, unknown>): string {
	const children = node.children as Record<string, unknown>[] | undefined;
	const value = node.value as string | undefined;

	if (children) {
		return children
			.map((child: Record<string, unknown>) => flattenNode(child))
			.join('');
	}

	if (value) {
		return value;
	}

	return '';
}

function parseSpecifier(specifier: string): {
	file: string;
	section?: string;
} {
	const idx = specifier.lastIndexOf('#');
	if (idx === -1) {
		return { file: specifier };
	}

	return {
		file: specifier.slice(0, idx),
		section: specifier.slice(idx + 1),
	};
}

// Extract a specific <section id="..."> from a parsed MDX root
function extractSection(root: Root, sectionId: string): Root | null {
	for (const child of root.children as unknown as Record<string, unknown>[]) {
		const type = child.type as string | undefined;
		const name = (child as Record<string, unknown>).name as string | undefined;
		if (type === 'mdxJsxFlowElement' && name === 'section') {
			const attributes = (child as Record<string, unknown>).attributes as
				| Record<string, unknown>[]
				| undefined;
			const hasId = attributes?.some(
				(attr) =>
					attr &&
					(attr as Record<string, unknown>).type === 'mdxJsxAttribute' &&
					(attr as Record<string, unknown>).name === 'id' &&
					(attr as Record<string, unknown>).value === sectionId
			);
			if (hasId) {
				const children = (child as Record<string, unknown>).children as
					| Record<string, unknown>[]
					| undefined;
				return {
					type: 'root',
					children: (children ?? []) as unknown as Root['children'],
				};
			}
		}
	}
	return null;
}

// Extract attributes from MDX JSX node
function extractAttributes(
	node: Record<string, unknown>
): Record<string, string | null> {
	const params: Record<string, string | null> = {};

	const attributes = node.attributes as Record<string, unknown>[] | undefined;
	if (attributes) {
		for (const attr of attributes) {
			if (attr.type === 'mdxJsxAttribute') {
				const name = attr.name as string;
				const value = attr.value as string | null;
				params[name] = value;
			}
		}
	}

	return params;
}

// Helpers to simplify node replacement
function replaceWithParagraph(
	node: Record<string, unknown>,
	text: string
): void {
	Object.assign(node, {
		type: 'paragraph',
		children: [
			{
				type: 'text',
				value: text,
			},
		],
	});
}

function replaceWithRootChildren(
	node: Record<string, unknown>,
	children: unknown[]
): void {
	Object.assign(node, {
		type: 'root',
		children,
	});
}

/**
 * Safe parent promotion helper for include transformations.
 *
 * When including content that results in multiple top-level nodes (type: 'root'),
 * we "promote" the replacement up to the parent level if the current node is
 * inside a paragraph. This prevents nested structure issues.
 *
 * Promotion occurs when:
 * - Parent exists AND parent is a paragraph AND replacement.type === 'root'
 *
 * useParent = true means we replace the parent paragraph with the root's children,
 * effectively "flattening" the structure by promoting content up one level.
 *
 * Example:
 * Input:  <p><include> → {type: 'root', children: [{type: 'h1'}, {type: 'p'}]}</p>
 * Output: <p> becomes {type: 'h1'} and sibling {type: 'p'}
 *         (paragraph is replaced with the included content's children)
 */
function isParagraph(node: Record<string, unknown>): boolean {
	return node.type === 'paragraph';
}
function replaceTarget(
	node: Record<string, unknown>,
	parent: Record<string, unknown> | null,
	replacement:
		| { type: 'root'; children: unknown[] }
		| { type: 'paragraph'; children: unknown[] }
) {
	const useParent =
		parent && isParagraph(parent) && replacement.type === 'root';
	Object.assign(useParent ? parent : node, replacement);
}

type ParserLike = { parse: (v: string) => unknown };

function annotateNestedIncludes(root: Root, baseDir: string | null): void {
	if (!baseDir) {
		return;
	}

	const includeTagNames = ['import', 'include-c15t', 'include'];

	visit(root, (node) => {
		const record = node as unknown as Record<string, unknown>;
		const nodeType = record.type as string | undefined;
		const nodeName = record.name as string | undefined;

		if (
			(nodeType === 'mdxJsxFlowElement' || nodeType === 'mdxJsxTextElement') &&
			nodeName &&
			includeTagNames.includes(nodeName)
		) {
			const attributes =
				(record.attributes as Record<string, unknown>[] | undefined) ?? [];
			const hasBaseDir = attributes.some(
				(attr) =>
					attr &&
					(attr as Record<string, unknown>).type === 'mdxJsxAttribute' &&
					(attr as Record<string, unknown>).name === 'baseDir'
			);

			if (!hasBaseDir) {
				attributes.push({
					type: 'mdxJsxAttribute',
					name: 'baseDir',
					value: baseDir,
				});

				record.attributes = attributes;
			}
		}

		return;
	});
}

function includeContentAsMarkdown(
	node: Record<string, unknown>,
	includeFile: string,
	bodyContent: string,
	options: { section?: string; parser?: ParserLike; baseDir?: string | null }
): void {
	try {
		const chosenParser =
			options.parser ?? (sharedProcessor as unknown as ParserLike);
		let parsed = chosenParser.parse(bodyContent.trim()) as Root;

		if (options.section) {
			const extracted = extractSection(parsed, options.section);
			if (extracted) {
				parsed = extracted;
			} else {
				replaceWithParagraph(
					node,
					`[Error: Could not find section "${options.section}" in ${includeFile}]`
				);
				return;
			}
		}

		// Attach base directory metadata to any nested include/import tags so
		// that subsequent passes can resolve their relative paths correctly.
		annotateNestedIncludes(parsed, options.baseDir ?? null);

		if (parsed.children && parsed.children.length > 0) {
			replaceWithRootChildren(node, parsed.children);
		} else {
			replaceWithParagraph(node, bodyContent.trim());
		}
	} catch {
		replaceWithParagraph(node, bodyContent.trim());
	}
}

// Resolve file path with custom base paths
function resolveIncludePath(
	file: string,
	directory: string,
	params: Record<string, string | null>,
	basePaths: string[]
): string {
	const baseDir = params.baseDir;
	if (baseDir) {
		return resolve(baseDir, file);
	}

	// If 'cwd' attribute is set, use process.cwd()
	if ('cwd' in params) {
		return resolve(process.cwd(), file);
	}

	// Try relative to current directory first
	const targetPath = resolve(directory, file);
	if (existsSync(targetPath)) {
		return targetPath;
	}

	// Try provided base directories only (no heuristics)
	for (const basePath of basePaths) {
		const candidate = resolve(basePath, file);
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	// Fall back to first base path if available, otherwise directory
	if (basePaths.length > 0 && basePaths[0]) {
		return resolve(basePaths[0], file);
	}

	return resolve(directory, file);
}

// Check if node is an include node
function isIncludeNode(
	node: Record<string, unknown>,
	tagName: string
): boolean {
	const nodeType = node.type as string;
	const nodeName = node.name as string;

	return (
		(nodeType === 'mdxJsxFlowElement' || nodeType === 'mdxJsxTextElement') &&
		nodeName === tagName
	);
}

// Process a single include node
async function processIncludeNode(
	node: Record<string, unknown>,
	workingDir: string,
	basePaths: string[],
	fileData?: unknown
): Promise<void> {
	const specifier =
		flattenNode(node).trim() || (extractAttributes(node).src ?? '').trim();

	if (!specifier) {
		return;
	}

	const { file: includeFile, section } = parseSpecifier(specifier);
	const params = extractAttributes(node);

	const targetPath = resolveIncludePath(
		includeFile,
		workingDir,
		params,
		basePaths
	);

	// Register dependency with host compiler (for hot reload / rebuilds)
	const compiler = (
		fileData as
			| { _compiler?: { addDependency?: (p: string) => void } }
			| undefined
	)?._compiler;
	compiler?.addDependency?.(targetPath);

	const isCodeFile = !(
		includeFile.endsWith('.md') || includeFile.endsWith('.mdx')
	);
	const asCode = Boolean(params.lang) || isCodeFile;

	try {
		const content = await readFile(targetPath, 'utf8');

		if (asCode) {
			const lang = params.lang ?? extname(includeFile).slice(1);

			Object.assign(node, {
				type: 'code',
				lang,
				meta: params.meta,
				value: content,
				data: {},
			} satisfies Code);
			return;
		}

		// For markdown/MDX files, parse and include the content properly
		const { content: bodyContent } = parseFrontmatter(content);

		// Prefer host site's processor to preserve its plugins/transforms
		const ext = includeFile.endsWith('.md') ? 'md' : 'mdx';
		const hostProcessor = (fileData as Record<string, unknown> | undefined)
			?._processor as { getProcessor?: (kind: string) => unknown } | undefined;
		const parser = hostProcessor?.getProcessor
			? hostProcessor.getProcessor(ext)
			: sharedProcessor;

		includeContentAsMarkdown(node, includeFile, bodyContent, {
			baseDir: dirname(targetPath),
			section,
			parser: parser as ParserLike,
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		process.stderr.write(
			`Warning: Failed to include file ${targetPath}: ${errorMessage}\n`
		);

		// Replace with error message
		Object.assign(node, {
			type: 'paragraph',
			children: [
				{
					type: 'text',
					value: `[Error: Could not include file ${includeFile}]`,
				},
			],
		});
	}
}

export function remarkInclude(
	basePaths: string[] = []
): Transformer<Root, Root> {
	const TagNames = ['import', 'include-c15t', 'include'];

	return async (tree, file) => {
		const workingDir = file.path ? dirname(file.path) : process.cwd();

		// Support nested includes by repeatedly scanning the tree until no more
		// include/import nodes are found. This is safe because:
		// - Each successful include replaces the original node
		// - We don't introduce new include tags from processed content unless
		//   they are truly nested includes that still need resolution.
		//
		// A hard cap on iterations prevents accidental infinite loops in case of
		// pathological or cyclic content.
		const MAX_PASSES = 10;

		for (let pass = 0; pass < MAX_PASSES; pass += 1) {
			let foundInclude = false;
			const tasks: Promise<void>[] = [];

			visit(tree, (node, _idx, parent) => {
				const nodeRecord = node as unknown as Record<string, unknown>;
				const isMatch = TagNames.some((t) => isIncludeNode(nodeRecord, t));

				if (!isMatch) {
					return;
				}

				foundInclude = true;

				tasks.push(
					processIncludeNode(
						nodeRecord,
						workingDir,
						basePaths,
						(file as unknown as { data?: unknown })?.data
					).then(() => {
						const after = nodeRecord as unknown as {
							type?: string;
							children?: unknown[];
						};

						if (after.type === 'root' && Array.isArray(after.children)) {
							replaceTarget(
								nodeRecord,
								(parent as unknown as Record<string, unknown>) ?? null,
								{ type: 'root', children: after.children }
							);
						} else if (
							after.type === 'paragraph' &&
							Array.isArray(after.children)
						) {
							const parentRecord =
								(parent as unknown as Record<string, unknown>) ?? null;

							if (parentRecord && isParagraph(parentRecord)) {
								// Avoid nested <p><p>...</p></p> structures by promoting
								// the included paragraph's children to the parent level.
								replaceTarget(nodeRecord, parentRecord, {
									type: 'root',
									children: after.children,
								});
							}
						}
					})
				);

				// Skip traversing into this node's children; they'll be visited
				// on the next pass if they still contain includes.
				return 'skip';
			});

			if (!foundInclude) {
				// No more includes to process
				break;
			}

			await Promise.all(tasks);
		}
	};
}

// remarkRemoveImports - inlined to avoid barrel file import issues
import type { Root as MdastRoot } from 'mdast';

const IMPORT_STATEMENT_PATTERN = /^\s*import\s/m;
const EXPORT_STATEMENT_PATTERN = /^\s*export\s/m;

interface MdxEsmNode {
	type: 'mdxjsEsm';
	value?: string;
}

export function remarkRemoveImports(): Transformer<MdastRoot, MdastRoot> {
	return (tree) => {
		visit(tree, 'mdxjsEsm', (node: MdxEsmNode, index, parent) => {
			if (
				parent === null ||
				parent === undefined ||
				index === null ||
				index === undefined
			) {
				return;
			}
			const value = node.value ?? '';

			if (IMPORT_STATEMENT_PATTERN.test(value)) {
				const lines = value
					.split('\n')
					.map((line: string) => line.trim())
					.filter((line: string) => line.length > 0);

				const hasOnlyImports = lines.every((line: string) =>
					IMPORT_STATEMENT_PATTERN.test(line)
				);
				const hasExports = lines.some((line: string) =>
					EXPORT_STATEMENT_PATTERN.test(line)
				);

				if (hasOnlyImports && !hasExports) {
					parent.children.splice(index, 1);
					return index;
				}
			}
		});
	};
}
