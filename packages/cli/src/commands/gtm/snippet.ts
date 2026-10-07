import type { GtmOption, GtmScriptCall } from './types';

const quote = function quote(value: string): string {
	return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
};

const formatValue = function formatValue(value: GtmOption['value']): string {
	return typeof value === 'string' ? quote(value) : String(value);
};

/** One call, wrapped when the single line would pass 72 characters. */
const formatCall = function formatCall(script: GtmScriptCall): string {
	const fields = script.options.map(
		(option) => `${option.name}: ${formatValue(option.value)}`
	);
	if (fields.length === 0) {
		return `${script.importName}({})`;
	}
	const oneLine = `${script.importName}({ ${fields.join(', ')} })`;
	if (oneLine.length <= 72) {
		return oneLine;
	}
	const body = fields.map((field) => `\t\t${field},`).join('\n');
	return `${script.importName}({\n${body}\n\t})`;
};

const formatImports = function formatImports(
	scripts: readonly GtmScriptCall[]
): string {
	const namesBySubpath = new Map<string, Set<string>>();
	for (const script of scripts) {
		const names = namesBySubpath.get(script.packageSubpath) ?? new Set();
		names.add(script.importName);
		namesBySubpath.set(script.packageSubpath, names);
	}
	return [...namesBySubpath.keys()]
		.sort()
		.map((subpath) => {
			const names = [...(namesBySubpath.get(subpath) ?? [])].sort();
			return `import { ${names.join(', ')} } from '@c15t/integrations/${subpath}';`;
		})
		.join('\n');
};

/**
 * Render the scripts module a project can register with c15t.
 *
 * @param scripts - Calls in container order. Imports are sorted separately.
 * @returns The module, or an empty string when there is nothing to register.
 */
export const renderSnippet = function renderSnippet(
	scripts: readonly GtmScriptCall[]
): string {
	if (scripts.length === 0) {
		return '';
	}
	const calls = scripts.map((script) => `\t${formatCall(script)},`).join('\n');
	return `${formatImports(scripts)}\n\nexport const scripts = [\n${calls}\n];\n`;
};
