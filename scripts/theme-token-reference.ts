import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Source of truth for documented `--c15t-*` variables. */
export const themeTokenSource = 'packages/ui/src/theme/types.ts';

/** Generated token table included by the customization docs. */
export const themeTokenDestination = 'docs/shared/reference/theme-tokens.mdx';

interface ThemeToken {
	variable: string;
	key: string;
	value: string;
}

const tokenPattern =
	/\/\*\* `(?<key>[a-zA-Z.]+)` \((?<value>[^)]*(?:\([^)]*\)[^)]*)*)\) \*\/\s*'(?<variable>--c15t-[a-z0-9-]+)'\?/gu;

/**
 * Reads every documented `--c15t-*` variable from `ThemeCSSVariables`.
 *
 * @throws {Error} When the interface is missing or a variable lacks its
 * `theme.key (default: …)` comment.
 */
export const readThemeTokens = function readThemeTokens(
	source: string
): ThemeToken[] {
	const start = source.indexOf('export interface ThemeCSSVariables');
	if (start === -1) {
		throw new Error('ThemeCSSVariables was not found.');
	}
	const body = source.slice(start, source.indexOf('\n}', start));
	const tokens = [...body.matchAll(tokenPattern)].map((match) => ({
		key: match.groups?.key ?? '',
		value: (match.groups?.value ?? '').replace(/^default: /u, ''),
		variable: match.groups?.variable ?? '',
	}));
	const declared = body.match(/'--c15t-[a-z0-9-]+'\?/gu)?.length ?? 0;
	if (tokens.length !== declared) {
		throw new Error(
			`${declared - tokens.length} ThemeCSSVariables entries lack a \`theme.key\` (default: …) comment.`
		);
	}
	return tokens;
};

const cell = (value: string) =>
	value.startsWith('auto-derived') || value.startsWith('`')
		? value
		: `\`${value}\``;

/** Renders the token reference as an MDX partial. */
export const renderThemeTokens = function renderThemeTokens(
	root: string
): string {
	const tokens = readThemeTokens(
		readFileSync(resolve(root, themeTokenSource), 'utf8')
	);
	return [
		`{/* Generated from ${themeTokenSource} by scripts/sync-example-docs.ts. Edit the source file. */}`,
		'',
		'| CSS variable | Theme key | Default |',
		'| --- | --- | --- |',
		...tokens.map(
			(token) =>
				`| \`${token.variable}\` | \`${token.key}\` | ${cell(token.value)} |`
		),
		'',
	].join('\n');
};
