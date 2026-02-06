/**
 * Code formatting utilities
 *
 * Provides Prettier integration for formatting generated code.
 */

import { basename, dirname } from 'node:path';

/**
 * Format options
 */
export interface FormatOptions {
	/** File path (used to infer parser) */
	filepath?: string;
	/** Parser to use */
	parser?: 'typescript' | 'json' | 'css' | 'html' | 'markdown';
	/** Tab width */
	tabWidth?: number;
	/** Use tabs instead of spaces */
	useTabs?: boolean;
	/** Use single quotes */
	singleQuote?: boolean;
	/** Print semicolons */
	semi?: boolean;
	/** Trailing commas */
	trailingComma?: 'none' | 'es5' | 'all';
}

/**
 * Infer the Prettier parser from a file path
 */
function inferParser(filepath: string): string {
	const ext = filepath.split('.').pop()?.toLowerCase();

	switch (ext) {
		case 'ts':
		case 'tsx':
			return 'typescript';
		case 'js':
		case 'jsx':
		case 'mjs':
		case 'cjs':
			return 'babel';
		case 'json':
			return 'json';
		case 'css':
			return 'css';
		case 'scss':
			return 'scss';
		case 'less':
			return 'less';
		case 'html':
			return 'html';
		case 'md':
		case 'mdx':
			return 'markdown';
		case 'yaml':
		case 'yml':
			return 'yaml';
		default:
			return 'typescript';
	}
}

/**
 * Format code using Prettier
 *
 * Falls back to returning the original code if Prettier is not available.
 */
export async function formatCode(
	code: string,
	options?: FormatOptions
): Promise<string> {
	try {
		// Dynamically import prettier to avoid hard dependency
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const prettier = await import('prettier').catch(() => null);
		if (!prettier) {
			return code;
		}

		const parser =
			options?.parser ||
			(options?.filepath ? inferParser(options.filepath) : 'typescript');

		const formatted = await prettier.format(code, {
			parser,
			tabWidth: options?.tabWidth ?? 2,
			useTabs: options?.useTabs ?? true,
			singleQuote: options?.singleQuote ?? true,
			semi: options?.semi ?? true,
			trailingComma: options?.trailingComma ?? 'es5',
		});

		return formatted;
	} catch {
		// If Prettier is not available, return the original code
		return code;
	}
}

/**
 * Format TypeScript/JavaScript code
 */
export async function formatTypeScript(code: string): Promise<string> {
	return formatCode(code, { parser: 'typescript' });
}

/**
 * Format JSON
 */
export async function formatJson(data: unknown): Promise<string> {
	const code = JSON.stringify(data, null, 2);
	return formatCode(code, { parser: 'json' });
}

/**
 * Format CSS
 */
export async function formatCss(code: string): Promise<string> {
	return formatCode(code, { parser: 'css' });
}

/**
 * Basic code indentation (for when Prettier is not available)
 */
export function indent(code: string, spaces: number = 2): string {
	const indentStr = ' '.repeat(spaces);
	return code
		.split('\n')
		.map((line) => (line.trim() ? indentStr + line : line))
		.join('\n');
}

/**
 * Remove leading indentation from a template literal
 */
export function dedent(
	strings: TemplateStringsArray,
	...values: unknown[]
): string {
	// Combine the template literal
	let result = strings[0] || '';
	for (let i = 0; i < values.length; i++) {
		result += String(values[i]) + (strings[i + 1] || '');
	}

	// Split into lines
	const lines = result.split('\n');

	// Find the minimum indentation (excluding empty lines)
	let minIndent = Infinity;
	for (const line of lines) {
		if (line.trim()) {
			const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
			minIndent = Math.min(minIndent, indent);
		}
	}

	if (minIndent === Infinity) {
		minIndent = 0;
	}

	// Remove the minimum indentation from all lines
	return lines
		.map((line) => (line.trim() ? line.slice(minIndent) : ''))
		.join('\n')
		.trim();
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(str: string): string {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a string to camelCase
 */
export function camelCase(str: string): string {
	return str
		.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
		.replace(/^(.)/, (c) => c.toLowerCase());
}

/**
 * Convert a string to PascalCase
 */
export function pascalCase(str: string): string {
	const camel = camelCase(str);
	return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * Convert a string to kebab-case
 */
export function kebabCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/[\s_]+/g, '-')
		.toLowerCase();
}

/**
 * Convert a string to snake_case
 */
export function snakeCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, '$1_$2')
		.replace(/[\s-]+/g, '_')
		.toLowerCase();
}
