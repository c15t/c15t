import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const cjsPath = join(
	import.meta.dirname,
	'..',
	'dist',
	'postcss-tailwind3.cjs'
);

writeFileSync(
	cjsPath,
	`"use strict";

const C15T_UI_DIST_STYLES_PATH = /(?:^|[\\\\/])(?:node_modules[\\\\/]@c15t[\\\\/]ui|packages[\\\\/]ui)[\\\\/]dist[\\\\/]styles[\\\\/](?:v3[\\\\/])?[^\\\\/]+\\.css$/;

function isC15tUiStylesheetPath(filePath) {
\treturn C15T_UI_DIST_STYLES_PATH.test(filePath);
}

/**
 * Tailwind 3 compatibility plugin for c15t v3 styles.
 *
 * Tailwind 3's PostCSS plugin hijacks \`@layer components\`: it errors when a
 * standalone stylesheet contains \`@layer components\` without a matching
 * \`@tailwind components\` directive in the same processing graph, and it also
 * tree-shakes layer contents against the Tailwind content scan. c15t's hashed
 * CSS Module classes (\`c15t-ui-*\`) are generated into dist class maps and never
 * appear verbatim in application source, so Tailwind 3 can purge the component
 * rules. This plugin unwraps \`@layer\` blocks only inside built \`@c15t/ui\`
 * stylesheet files before Tailwind runs, restoring Tailwind 3's v2-era
 * semantics: c15t base styles win by specificity, and overrides use
 * important-modifier utilities such as \`!bg-blue-600\` or c15t theme slots.
 */
function c15tTailwind3() {
\treturn {
\t\tpostcssPlugin: 'c15t-tailwind3',
\t\tOnce(root) {
\t\t\tconst file = root.source?.input?.file ?? '';
\t\t\tif (!isC15tUiStylesheetPath(file)) {
\t\t\t\treturn;
\t\t\t}

\t\t\troot.walkAtRules('layer', (rule) => {
\t\t\t\tif (rule.nodes && rule.nodes.length > 0) {
\t\t\t\t\trule.replaceWith(...rule.nodes);
\t\t\t\t\treturn;
\t\t\t\t}

\t\t\t\trule.remove();
\t\t\t});
\t\t},
\t};
}

c15tTailwind3.postcss = true;
c15tTailwind3.default = c15tTailwind3;
c15tTailwind3.c15tTailwind3 = c15tTailwind3;
c15tTailwind3.isC15tUiStylesheetPath = isC15tUiStylesheetPath;

module.exports = c15tTailwind3;
`,
	'utf8'
);

console.log('Generated dist/postcss-tailwind3.cjs');
